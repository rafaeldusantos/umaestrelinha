// A proposta montada pelo painel, do lado da loja (feature 89, `AD-070`, T09).
//
// Duas ações da function `checkout`:
//
//   get-proposal   a página `/pedido-montado` pede a proposta pelo token do link (`CON-01`). Devolve
//                  só o que a página desenha (`SEG-04`): sem hash, sem o motivo do desconto avulso,
//                  sem quem criou, sem chave de idempotência.
//   create-order   com `proposal_token`: o pedido nasce DA PROPOSTA (`PRC-03`). Itens, preços,
//                  descontos e e-mail vêm do banco, nunca do corpo; do corpo entram só o contato
//                  editável (nome, telefone, CPF), o endereço, a entrega e o meio.
//
// O link É a prova de posse dada pela Adri (`A-08`): não há desafio de código, e o pedido vai para a
// conta daquele e-mail — ou cria a conta como a da convidada (`AD-035`), que ADOTA a ficha que o
// painel criou (`A-09`, trigger `handle_new_customer`).
//
// A gravação do pedido é a RPC `create_order_from_proposal`: `orders` + `order_items` a partir das
// linhas travadas, e a proposta marcada concluída, na MESMA transação (`CON-06`).
//
// O token nunca aparece em log — nem ele, nem o hash.

import {
  proposalLinkValid,
  proposalPricing,
  type LockedProposal,
  type PublicProposal,
  type PublicProposalLine,
} from '../../../packages/core/src/proposals/index.ts'
import { guestAccessExpiry, hashAccessToken, newAccessToken } from '../../../packages/core/src/checkout/guestAccess.ts'
import { initialMaterialStatus } from '../../../packages/core/src/material/material.ts'
import { normalizeEmail } from '../../../packages/core/src/validators/email.ts'
import { PICKUP_SERVICE_ID } from '../../../packages/core/src/shipping/pickup.ts'
import { json } from '../_shared/http.ts'
import { clientIp, type RateLimiter } from '../_shared/rateLimit.ts'
import type { Deps } from './handlers.ts'

function log(entry: Record<string, unknown>) {
  console.log(JSON.stringify(entry))
}

/**
 * `SEG-04`: no máximo 30 leituras de proposta por IP a cada 5 minutos. O número é do `design.md`
 * (a spec pede "teto por IP" sem número); `buildDeps.test.ts` o crava para ele não mudar por acaso.
 */
export const PROPOSAL_READ_MAX = 30
export const PROPOSAL_READ_WINDOW_MS = 5 * 60 * 1000

/** Os textos que a página mostra como vêm. */
export const PROPOSAL_UNAVAILABLE =
  'Este link não está mais disponível. Fale comigo pelo WhatsApp que eu mando um novo.'
export const PROPOSAL_CHANGED = 'A Adri atualizou seu pedido. Confira de novo antes de concluir.'
export const ITEM_UNAVAILABLE =
  'Uma peça do seu pedido está indisponível no momento. Fale comigo pelo WhatsApp.'

/**
 * O que estas ações pedem emprestado de `handlers.ts`. Recebido por parâmetro, e não importado, para
 * o módulo não ter import circular de VALOR com o roteador.
 */
export interface ProposalHelpers {
  persistirConveniencias: (deps: Deps, customerId: string, body: any) => Promise<void>
  recusaDeRetirada: (deps: Deps, body: any) => Promise<string | null>
  idsDaMedicao: (body: any) => Record<string, unknown>
}

/**
 * As colunas da proposta que estas ações leem. **Escolhidas**: `token_hash` só aparece no filtro,
 * e `manual_discount_reason`, `created_by` e `idempotency_key` nunca saem do banco por aqui.
 */
const COLUNAS = [
  'id',
  'number',
  'status',
  'version',
  'expires_at',
  'viewed_at',
  'order_id',
  'customer_id',
  'customer_name',
  'customer_email',
  'customer_phone',
  'customer_document',
  'address_zip',
  'address_street',
  'address_number',
  'address_complement',
  'address_neighborhood',
  'address_city',
  'address_state',
  'coupon_code',
  'coupon_discount',
  'coupon_free_shipping',
  'manual_discount',
  'subtotal',
  'promotion_discount',
  'items_total',
].join(', ')

const COLUNAS_DA_LINHA = [
  'position',
  'product_id',
  'variant_id',
  'product_name',
  'product_image',
  'variant_label',
  'quantity',
  'list_price',
  'unit_price',
  'engraving_text',
  'requires_material',
  'material_kinds',
].join(', ')

const unavailable = () => json({ error: PROPOSAL_UNAVAILABLE, code: 'unavailable' }, 404)

const tokenDe = (body: any): string => (typeof body?.proposal_token === 'string' ? body.proposal_token : typeof body?.token === 'string' ? body.token : '')

async function lerPorToken(deps: Deps, token: string): Promise<{ row: any | null; error: boolean }> {
  const { data, error } = await deps.supabase
    .from('order_proposals')
    .select(COLUNAS)
    .eq('token_hash', await hashAccessToken(token))
    .maybeSingle()
  return { row: data ?? null, error: !!error }
}

async function lerLinhas(deps: Deps, proposalId: string): Promise<any[] | null> {
  const { data, error } = await deps.supabase
    .from('order_proposal_items')
    .select(COLUNAS_DA_LINHA)
    .eq('proposal_id', proposalId)
    .order('position', { ascending: true })
  if (error) return null
  return ((data ?? []) as any[]).slice().sort((a, b) => Number(a.position) - Number(b.position))
}

/**
 * `CON-09`: cada linha ainda pode ser vendida? A mesma régua da vitrine: variação pausada ou peça
 * inativa não vende; com `stock_policy = 'track'` o saldo que vale é o da variação (ou o
 * `stock_total` da peça sem variação); `none` e `backorder` nunca esgotam. Peça ou variação apagada
 * depois da montagem é indisponível — a linha continua legível pelo nome guardado nela.
 *
 * `null` quando a leitura do catálogo falha: "não sei" nunca vira "disponível".
 */
async function disponibilidade(deps: Deps, linhas: any[]): Promise<boolean[] | null> {
  const productIds = [...new Set(linhas.map((l) => String(l.product_id)))]
  const variantIds = [...new Set(linhas.map((l) => l.variant_id).filter(Boolean).map(String))]

  const { data: produtos, error: e1 } = productIds.length
    ? await deps.supabase.from('products').select('id, is_active, stock_policy, stock_total').in('id', productIds)
    : { data: [], error: null }
  const { data: variacoes, error: e2 } = variantIds.length
    ? await deps.supabase.from('product_variants').select('id, product_id, is_active, stock').in('id', variantIds)
    : { data: [], error: null }
  if (e1 || e2) return null

  const produto = new Map<string, any>((produtos ?? []).map((p: any) => [String(p.id), p]))
  const variacao = new Map<string, any>((variacoes ?? []).map((v: any) => [String(v.id), v]))

  return linhas.map((l) => {
    const p = produto.get(String(l.product_id))
    if (!p || p.is_active === false) return false
    const politica = p.stock_policy ?? 'track'
    const quantidade = Number(l.quantity) || 1
    if (l.variant_id) {
      const v = variacao.get(String(l.variant_id))
      if (!v || String(v.product_id) !== String(l.product_id) || v.is_active === false) return false
      if (politica !== 'track') return true
      return Number(v.stock ?? 0) >= quantidade
    }
    if (politica !== 'track') return true
    return Number(p.stock_total ?? 0) >= quantidade
  })
}

/** Reemite o acesso de convidada a um pedido já existente (`CON-07`, molde de `PED-04`). */
async function reemitirAcesso(deps: Deps, orderId: string): Promise<string> {
  const token = newAccessToken()
  await deps.supabase
    .from('orders')
    .update({
      guest_access_hash: await hashAccessToken(token),
      guest_access_expires_at: guestAccessExpiry(new Date(deps.now())),
    })
    .eq('id', orderId)
  return token
}

async function numeroDoPedido(deps: Deps, orderId: string): Promise<string | null> {
  const { data } = await deps.supabase.from('orders').select('order_number').eq('id', orderId).maybeSingle()
  return data?.order_number ?? null
}

const algum = (row: any, colunas: string[]) => colunas.some((c) => row[c] != null && String(row[c]).trim() !== '')

const COLUNAS_DO_ENDERECO = [
  'address_zip',
  'address_street',
  'address_number',
  'address_complement',
  'address_neighborhood',
  'address_city',
  'address_state',
] as const

/** A proposta aberta como a página a desenha (`PublicProposal`, `core/proposals`). */
function publica(row: any, linhas: any[], disponiveis: boolean[]): PublicProposal {
  const lines: PublicProposalLine[] = linhas.map((l, i) => ({
    position: Number(l.position),
    product_id: String(l.product_id),
    variant_id: l.variant_id ?? null,
    product_name: String(l.product_name ?? ''),
    product_image: l.product_image ?? null,
    variant_label: l.variant_label ?? null,
    quantity: Number(l.quantity),
    list_price: Number(l.list_price),
    unit_price: Number(l.unit_price),
    engraving_text: l.engraving_text ?? null,
    requires_material: l.requires_material === true,
    available: disponiveis[i] === true,
  }))
  const endereco = algum(row, [...COLUNAS_DO_ENDERECO])
    ? Object.fromEntries(COLUNAS_DO_ENDERECO.map((c) => [c, row[c] ?? null]))
    : null
  return {
    id: String(row.id),
    number: String(row.number ?? ''),
    version: Number(row.version),
    expires_at: String(row.expires_at),
    customer_name: String(row.customer_name ?? ''),
    customer_email: String(row.customer_email ?? ''),
    customer_phone: row.customer_phone ?? null,
    customer_document: row.customer_document ?? null,
    address: endereco as PublicProposal['address'],
    lines,
    subtotal: Number(row.subtotal),
    promotion_discount: Number(row.promotion_discount ?? 0),
    coupon_code: row.coupon_code ?? null,
    coupon_discount: Number(row.coupon_discount ?? 0),
    coupon_free_shipping: row.coupon_free_shipping === true,
    manual_discount: Number(row.manual_discount ?? 0),
    items_total: Number(row.items_total),
  }
}

// ---------------------------------------------------------------------------------------------
// get-proposal (CON-01, CON-07, CON-08, CON-09, CON-11, SEG-04)
// ---------------------------------------------------------------------------------------------

export async function getProposal(
  deps: Deps,
  req: Request,
  body: any,
  limiter: RateLimiter | null,
): Promise<Response> {
  // SEG-04, fail-closed: sem o balde, recusa — nunca "sem teto" (fecho da rodada 1, K18).
  if (!limiter) {
    log({ action: 'get-proposal', status: 'limiter_missing' })
    return json({ error: 'Não consegui abrir o seu pedido agora. Tente de novo.' }, 503)
  }
  const ip = clientIp(req)
  if (ip && !limiter.hit(ip)) {
    log({ action: 'get-proposal', status: 'rate_limited' })
    return json({ error: 'Muitas consultas. Tente de novo em alguns minutos.' }, 429)
  }

  const token = tokenDe(body)
  if (!token) return unavailable()

  const { row, error } = await lerPorToken(deps, token)
  if (error) {
    log({ action: 'get-proposal', status: 'read_failed' })
    return json({ error: 'Não consegui abrir o seu pedido agora. Tente de novo.' }, 502)
  }
  if (!row) {
    log({ action: 'get-proposal', status: 'unknown_token' })
    return unavailable()
  }

  // CON-07: concluída leva ao pedido, com o acesso de convidada reemitido — também no 2º aparelho.
  if (row.status === 'completed' && row.order_id) {
    const accessToken = await reemitirAcesso(deps, String(row.order_id))
    log({ action: 'get-proposal', status: 'completed', proposal_id: row.id })
    return json({ completed: true, order_id: row.order_id, access_token: accessToken })
  }

  // CON-08: cancelada ou vencida pelo relógio DO SERVIDOR — nenhum dado da proposta sai.
  if (row.status !== 'open' || !proposalLinkValid(row.expires_at, new Date(deps.now()))) {
    log({ action: 'get-proposal', status: 'unavailable', proposal_id: row.id })
    return unavailable()
  }

  const linhas = await lerLinhas(deps, String(row.id))
  const disponiveis = linhas ? await disponibilidade(deps, linhas) : null
  if (!linhas || !disponiveis) {
    log({ action: 'get-proposal', status: 'read_failed', proposal_id: row.id })
    return json({ error: 'Não consegui abrir o seu pedido agora. Tente de novo.' }, 502)
  }

  // CON-11: "vista pela cliente", uma vez. Falha aqui não tira a página da cliente.
  if (!row.viewed_at) {
    const { error: erroVista } = await deps.supabase.rpc('mark_order_proposal_viewed', { p_proposal_id: row.id })
    if (erroVista) log({ action: 'get-proposal', status: 'view_mark_failed', proposal_id: row.id })
  }

  log({ action: 'get-proposal', status: 'ok', proposal_id: row.id })
  return json({ proposal: publica(row, linhas, disponiveis) })
}

// ---------------------------------------------------------------------------------------------
// create-order com proposta (CON-05, CON-06, CON-09, CON-10, CON-12, PRC-03, PRC-05, A-07, A-08)
// ---------------------------------------------------------------------------------------------

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const nuloSeVazio = (v: unknown) => texto(v) || null

/** O travado das linhas e da proposta — o que `proposalPricing` precisa (`PRC-06`). */
function travado(row: any, linhas: any[]): LockedProposal {
  return {
    lines: linhas.map((l) => ({ unit_price: Number(l.unit_price), quantity: Number(l.quantity) })),
    couponDiscount: Number(row.coupon_discount ?? 0),
    couponFreeShipping: row.coupon_free_shipping === true,
    manualDiscount: Number(row.manual_discount ?? 0),
  }
}

async function lerAjuste(deps: Deps, chave: string): Promise<any> {
  const { data } = await deps.supabase.from('store_settings').select('value').eq('key', chave).maybeSingle()
  return data?.value ?? null
}

export async function createOrderFromProposal(
  deps: Deps,
  _req: Request,
  body: any,
  helpers: ProposalHelpers,
): Promise<Response> {
  const token = tokenDe(body)
  const clientRequestId = typeof body?.client_request_id === 'string' ? body.client_request_id : ''
  const versao = body?.proposal_version
  const metodo = body?.payment_method

  if (!clientRequestId) return json({ error: 'client_request_id é obrigatório.' }, 400)
  if (!Number.isInteger(versao)) return json({ error: 'proposal_version é obrigatório.' }, 400)
  if (metodo !== 'pix' && metodo !== 'card') return json({ error: 'Escolha a forma de pagamento.' }, 400)

  const { row, error } = await lerPorToken(deps, token)
  if (error) return json({ error: 'Não conseguimos criar seu pedido.' }, 500)
  if (!row) {
    log({ action: 'create-order', status: 'proposal_unknown_token' })
    return unavailable()
  }

  // CON-06/CON-07: a proposta já concluída devolve o MESMO pedido, antes de olhar versão ou estoque.
  if (row.status === 'completed' && row.order_id) {
    const accessToken = await reemitirAcesso(deps, String(row.order_id))
    log({ action: 'create-order', status: 'proposal_reused', proposal_id: row.id })
    return json({
      order_id: row.order_id,
      order_number: await numeroDoPedido(deps, String(row.order_id)),
      access_token: accessToken,
      reused: true,
    })
  }

  if (row.status !== 'open' || !proposalLinkValid(row.expires_at, new Date(deps.now()))) {
    log({ action: 'create-order', status: 'proposal_unavailable', proposal_id: row.id })
    return unavailable()
  }

  // CON-10: nunca criar o pedido com a versão velha.
  if (Number(row.version) !== versao) {
    log({ action: 'create-order', status: 'proposal_changed', proposal_id: row.id })
    return json({ error: PROPOSAL_CHANGED, code: 'proposal_changed' }, 409)
  }

  const linhas = await lerLinhas(deps, String(row.id))
  if (!linhas || linhas.length === 0) return json({ error: 'Não conseguimos criar seu pedido.' }, 500)

  const disponiveis = await disponibilidade(deps, linhas)
  if (!disponiveis) return json({ error: 'Não conseguimos criar seu pedido.' }, 500)
  const indisponiveis = linhas.filter((_, i) => !disponiveis[i]).map((l) => Number(l.position))
  if (indisponiveis.length) {
    log({ action: 'create-order', status: 'proposal_item_unavailable', proposal_id: row.id })
    return json({ error: ITEM_UNAVAILABLE, code: 'item_unavailable', positions: indisponiveis }, 422)
  }

  // A retirada no escritório tem a mesma régua do caminho de sempre (RET-12).
  if (body?.shipping_service_id === PICKUP_SERVICE_ID) {
    const recusa = await helpers.recusaDeRetirada(deps, body)
    if (recusa) {
      log({ action: 'create-order', status: 'pickup_refused', proposal_id: row.id })
      return json({ error: recusa }, 422)
    }
  }

  // PRC-05, A-11: o frete cotado da entrega escolhida, zerado pelo cupom `free_shipping` ou pela
  // faixa de frete grátis — pela MESMA `proposalPricing` que a página do link chama.
  const shipping = await lerAjuste(deps, 'shipping')
  const payment = await lerAjuste(deps, 'payment')
  const totais = proposalPricing(travado(row, linhas), {
    shipping: Math.max(0, Number(body?.shipping_cost) || 0),
    method: metodo,
    pixDiscountPercent: Number(payment?.pix_discount_percent ?? 0),
    freeShipping: shipping
      ? {
          free_shipping_enabled: shipping.free_shipping_enabled === true,
          free_shipping_threshold: Number(shipping.free_shipping_threshold ?? 0),
        }
      : null,
  })

  // O acesso de convidada é SEMPRE emitido (`CON-07`): quem conclui pelo link pode não ter sessão.
  const accessToken = newAccessToken()
  const p_order: Record<string, unknown> = {
    customer_name: nuloSeVazio(body?.customer_name),
    customer_phone: nuloSeVazio(body?.customer_phone) ?? row.customer_phone ?? null,
    customer_document: texto(body?.customer_document).replace(/\D/g, '') || row.customer_document || null,
    payment_method: metodo,
    address_zip: texto(body?.address_zip).replace(/\D/g, '') || null,
    address_street: nuloSeVazio(body?.address_street),
    address_number: nuloSeVazio(body?.address_number),
    address_complement: nuloSeVazio(body?.address_complement),
    address_neighborhood: nuloSeVazio(body?.address_neighborhood),
    address_city: nuloSeVazio(body?.address_city),
    address_state: nuloSeVazio(body?.address_state),
    shipping_service_id: body?.shipping_service_id == null ? null : String(body.shipping_service_id),
    shipping_carrier: nuloSeVazio(body?.shipping_carrier),
    shipping_method: nuloSeVazio(body?.shipping_method),
    delivery_estimate_min: nuloSeVazio(body?.delivery_estimate_min),
    delivery_estimate_max: nuloSeVazio(body?.delivery_estimate_max),
    shipping_cost: totais.shipping,
    total: totais.total,
    // `initialMaterialStatus` (core) é o dono da regra; a RPC exige o valor pronto.
    material_status: initialMaterialStatus(linhas),
    client_request_id: clientRequestId,
    guest_access_hash: await hashAccessToken(accessToken),
    guest_access_expires_at: guestAccessExpiry(new Date(deps.now())),
    ...helpers.idsDaMedicao(body),
  }

  const { data: criado, error: erroRpc } = await deps.supabase.rpc('create_order_from_proposal', {
    p_proposal_id: row.id,
    p_version: versao,
    p_order,
  })
  if (erroRpc || !criado) {
    log({ action: 'create-order', status: 'proposal_insert_failed', proposal_id: row.id })
    return json({ error: 'Não conseguimos criar seu pedido.' }, 500)
  }
  if (criado.error === 'proposal_changed') return json({ error: PROPOSAL_CHANGED, code: 'proposal_changed' }, 409)
  if (criado.error) return unavailable()

  const orderId = String(criado.order_id)

  // A corrida do segundo aparelho: a RPC devolveu o pedido que outro `create-order` acabou de criar.
  // O hash deste corpo não foi gravado — o acesso é reemitido para aquele pedido.
  if (criado.reused === true) {
    const reemitido = await reemitirAcesso(deps, orderId)
    log({ action: 'create-order', status: 'proposal_reused', proposal_id: row.id, order_id: orderId })
    return json({ order_id: orderId, order_number: criado.order_number ?? null, access_token: reemitido, reused: true })
  }

  // CON-12, daqui para baixo nada derruba a venda (CSC-07/CSC-08): o pedido existe e é pagável.
  // E-mail sem conta ganha a conta da convidada, e o trigger ADOTA a ficha do painel (A-09). E-mail com
  // conta: o pedido já está na ficha dela (a ficha com conta vence em `save_order_proposal`).
  const email = normalizeEmail(String(row.customer_email ?? ''))
  try {
    const { data: temConta } = await deps.supabase.rpc('account_exists', { p_email: email })
    if (temConta !== true) {
      await deps.supabase.auth.admin.createUser({
        email,
        email_confirm: false,
        user_metadata: { full_name: String(body?.customer_name ?? row.customer_name ?? '').trim() },
      })
    }
  } catch {
    // GoTrue fora do ar: o pedido segue órfão de conta, mas ligado à ficha, e pagável pelo token.
  }

  let customerId: string | null = row.customer_id ?? null
  if (!customerId) {
    const { data: ficha } = await deps.supabase.from('customers').select('id').eq('email', email).maybeSingle()
    customerId = ficha?.id ?? null
    if (customerId) await deps.supabase.from('orders').update({ customer_id: customerId }).eq('id', orderId)
  }
  if (customerId) await helpers.persistirConveniencias(deps, customerId, body)

  log({ action: 'create-order', status: 'created_from_proposal', proposal_id: row.id, order_id: orderId })
  return json({ order_id: orderId, order_number: criado.order_number ?? null, access_token: accessToken })
}
