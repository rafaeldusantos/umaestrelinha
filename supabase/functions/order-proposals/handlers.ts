// As portas HTTP da `order-proposals` — a proposta que o painel monta (feature 89, `AD-070`).
//
// ---------------------------------------------------------------------------------------------
// Por que esta function existe
// ---------------------------------------------------------------------------------------------
//
// As tabelas da proposta (`order_proposals`, `_items`, `_events`) têm RLS ligada e NENHUMA policy
// (`SEG-05`): para o navegador elas não existem. O painel fala com esta function, e ela é a porta
// única — a mesma decisão da `admin-users` (`AD-034`). Ler pela function, e não por uma view, é o que
// mantém o hash do token e a chave de idempotência fora de qualquer resposta.
//
// Ações (query param `action`, corpo JSON):
//
//   list      as propostas, com o estado derivado (`LNK-04`), as peças resumidas (com teto) e o `agora`
//   get       uma proposta inteira: linhas, histórico, estado e ações disponíveis
//   save      criar ou editar. O servidor RECALCULA tudo pelo banco (`PRC-01`); o total que a tela
//             mostrava é só conferido (`PRC-02`). O token do link nasce SÓ ao criar.
//   renew     link novo e prazo novo, com os preços relidos e travados de novo (`LNK-05`, `LNK-06`)
//   cancel    o link passa a dizer que o pedido não está mais disponível (`LNK-05`)
//   log-sent  "Link enviado", com o canal (`LNK-03`)
//   note      a observação interna, em qualquer status não concluído, sem subir a versão
//
// `requireAdmin` em TODA ação, antes de qualquer leitura ou escrita (`SEG-05`).
//
// ---------------------------------------------------------------------------------------------
// O token é uma credencial (`SEG-01`)
// ---------------------------------------------------------------------------------------------
//
// 32 bytes aleatórios (`newAccessToken`). O banco guarda o SHA-256 (é por ele que a `checkout` abre a
// proposta) e, com a chave `PROPOSAL_TOKEN_KEY` configurada, a CIFRA do token (`_shared/tokenCipher.ts`,
// AES-GCM): com ela o `get` devolve o token de uma proposta aberta, e o painel e o app mostram o link
// sempre, sem gerar um novo para copiar. Sem a chave, ou numa proposta gravada antes dela, o
// token existe uma vez — na resposta de criar ou de renovar — e mandar de novo é "Gerar link novo"
//. Nenhuma linha de log carrega o token, o hash ou a cifra, e nenhuma resposta leva o hash ou a
// cifra.
//
// ---------------------------------------------------------------------------------------------
// A regra NÃO mora aqui
// ---------------------------------------------------------------------------------------------
//
// O preço é de `priceProposalDraft` (`core/proposals`), a mesma função que o painel chama ao montar;
// o cupom é de `couponRefusal` (`core/coupons`), a mesma que a loja chama; o preço da linha é de
// `resolveItemPrice` (`core/pricing`), o mesmo que o `create-payment` usa. Todo import por caminho
// relativo com `.ts` explícito — o Deno não conhece os alias.

import {
  PROPOSAL_LINK_DAYS,
  lockProposal,
  priceProposalDraft,
  proposalActions,
  proposalState,
  type ManualDiscountDraft,
  type ProposalDraftPrice,
  type ProposalLine,
  type ProposalState,
} from '../../../packages/core/src/proposals/index.ts'
import { couponRefusal, couponRuleOf } from '../../../packages/core/src/coupons/rules.ts'
import type { CouponRule, ProgressivePromotion } from '../../../packages/core/src/payment/pricing.ts'
import { isPriceError, resolveItemPrice, variantLabel } from '../../../packages/core/src/pricing/index.ts'
import {
  engravingRefusal,
  hasEngraving,
  normalizeEngraving,
  requiresMaterial,
  toMaterialKinds,
} from '../../../packages/core/src/material/material.ts'
import { hashAccessToken, newAccessToken } from '../../../packages/core/src/checkout/guestAccess.ts'
import { isValidEmail, normalizeEmail } from '../../../packages/core/src/validators/email.ts'
import { adminNoteRefusal, normalizeAdminNote } from '../../../packages/core/src/orders/adminNote.ts'
import { fotoDaLinha } from '../../../packages/core/src/proposals/photo.ts'
import type { TokenCipher } from '../_shared/tokenCipher.ts'
import { json, preflight } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/auth.ts'

export interface Deps {
  // Client service-role. `any` porque o import real vem de esm.sh (Deno) e o dublê implementa só a
  // superfície usada.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
  /** Relógio injetável: prazo do link, estado derivado e cupom vencido dependem dele. */
  now: () => number
  /** A cifra do token, com a chave do secret opcional; ausente/`null`, só o hash é gravado. */
  tokenCipher?: TokenCipher | null
}

/**
 * Log estruturado, uma linha por desfecho. **Nunca recebe o token nem o hash** — um log com a
 * credencial do link é o link publicado.
 */
function log(entry: Record<string, unknown>) {
  console.log(JSON.stringify(entry))
}

const exigirAdmin = (deps: Deps, req: Request) => requireAdmin(deps, req, 'order-proposals')

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** O id da proposta, quando vem do corpo. `null` ausente ou malformado. */
function idDe(body: any): string | null {
  const id = body?.id
  return typeof id === 'string' && UUID_RE.test(id) ? id : null
}

const round2 = (n: number) => Math.round(n * 100) / 100

/** Os textos que a tela mostra como vêm (`motivoDaFalha` do painel). */
export const PRICES_CHANGED = 'Os preços mudaram enquanto você montava. Confira o resumo.'
export const VERSION_CONFLICT = 'Esta proposta mudou em outra aba. Recarreguei.'
export const NOT_EDITABLE = 'Esta proposta não pode mais ser editada.'
export const NOT_FOUND = 'Proposta não encontrada.'

/**
 * As colunas de `order_proposals` que saem desta function. **Escolhidas**, nunca `*`: `token_hash` e
 * `idempotency_key` são credencial e chave de servidor, e um `*` os levaria ao navegador do painel
 * no primeiro `select` — e de lá para qualquer extensão instalada.
 */
const COLUNAS_DA_PROPOSTA = [
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
  'coupon_id',
  'coupon_code',
  'coupon_discount',
  'coupon_free_shipping',
  'manual_discount_kind',
  'manual_discount_value',
  'manual_discount_reason',
  'manual_discount',
  'subtotal',
  'promotion_discount',
  'items_total',
  'admin_note',
  'created_by',
  'created_at',
  'updated_at',
].join(', ')

const COLUNAS_DA_LISTA = [
  'id',
  'number',
  'status',
  'version',
  'expires_at',
  'viewed_at',
  'order_id',
  'customer_name',
  'customer_email',
  'items_total',
  'created_at',
].join(', ')

/**
 * As linhas resumidas de cada proposta na `list`: o bastante para o cartão do app dizer
 * "Nome · variação" com a foto, nunca preço, gravação ou material. Com teto por proposta
 * (`LINHAS_NA_LISTA`); `lines_count` diz quantas são ao todo.
 */
const COLUNAS_DA_LINHA_NA_LISTA = ['proposal_id', 'position', 'product_name', 'product_image', 'variant_label', 'quantity'].join(', ')

/** Quantas linhas cada proposta leva na `list`. */
export const LINHAS_NA_LISTA = 4

const COLUNAS_DA_LINHA = [
  'position',
  'product_id',
  'variant_id',
  'product_name',
  'product_image',
  'variant_label',
  'variant_options',
  'quantity',
  'list_price',
  'unit_price',
  'engraving_text',
  'requires_material',
  'material_kinds',
].join(', ')

function estadoDe(row: any, now: Date): ProposalState {
  return proposalState(
    { status: row.status, expires_at: row.expires_at ?? null, viewed_at: row.viewed_at ?? null },
    now,
  )
}

// ---------------------------------------------------------------------------------------------
// A precificação pelo banco (`PRC-01`)
// ---------------------------------------------------------------------------------------------

/** O que a tela manda por linha: a escolha, nunca o preço. */
interface LinhaPedida {
  product_id: string
  variant_id: string | null
  quantity: number
  engraving_text: string | null
}

/** A linha relida do banco, com tudo o que a proposta grava. */
interface LinhaRelida extends ProposalLine {
  product_name: string
  product_image: string | null
  variant_label: string | null
  variant_options: Record<string, string> | null
  engraving_text: string | null
  requires_material: boolean
  material_kinds: string[]
}

interface Entrada {
  lines: LinhaPedida[]
  couponCode: string | null
  manual: ManualDiscountDraft | null
  email: string
}

interface Precificado {
  price: ProposalDraftPrice<LinhaRelida>
  coupon: { id: string; code: string } | null
}

type Resultado<T> = { ok: true; value: T } | { ok: false; response: Response }

/** A forma da tela para uma linha. Quantidade fora de inteiro vira `NaN` e cai na recusa de `core`. */
function linhasDoCorpo(raw: unknown): LinhaPedida[] | null {
  if (!Array.isArray(raw)) return null
  const linhas: LinhaPedida[] = []
  for (const l of raw as any[]) {
    if (!l || typeof l.product_id !== 'string' || !UUID_RE.test(l.product_id)) return null
    const variant = l.variant_id
    if (variant != null && (typeof variant !== 'string' || !UUID_RE.test(variant))) return null
    linhas.push({
      product_id: l.product_id,
      variant_id: typeof variant === 'string' ? variant : null,
      quantity: typeof l.quantity === 'number' ? l.quantity : NaN,
      engraving_text: typeof l.engraving_text === 'string' ? l.engraving_text : null,
    })
  }
  return linhas
}

function avulsoDoCorpo(raw: any): ManualDiscountDraft | null {
  if (!raw || typeof raw !== 'object') return null
  const kind = raw.kind === 'percent' ? 'percent' : raw.kind === 'amount' ? 'amount' : null
  if (!kind) return null
  return {
    kind,
    value: typeof raw.value === 'number' ? raw.value : Number(raw.value),
    reason: typeof raw.reason === 'string' ? raw.reason : '',
  }
}

/**
 * As promoções vigentes, do BANCO — a mesma leitura que o `create-payment` faz (`PRM-11`): `active` e
 * vigência decididos aqui em TypeScript, elegibilidade pela view `promotion_eligible_products`.
 *
 * // SPEC_DEVIATION: esta leitura é uma segunda escrita da que mora em `mercado-pago/handlers.ts`
 * (arquivo de outra task). A regra de "vale agora?" é a mesma linha a linha; unificá-la num
 * `_shared/promotions.ts` fica registrado no fecho da T08.
 */
async function promocoesVigentes(
  deps: Deps,
  productIds: string[],
  now: Date,
): Promise<ProgressivePromotion[]> {
  const { data: promotionRows } = await deps.supabase
    .from('promotions')
    .select(
      'id, discount_kind, scope, stacks_with_coupon, active, valid_from, valid_until, created_at, promotion_tiers(min_qty, value)',
    )

  const vivas = (promotionRows || []).filter((p: any) => {
    if (!(p.promotion_tiers || []).length) return false
    if (p.active !== true) return false
    if (p.valid_from && new Date(p.valid_from) > now) return false
    if (p.valid_until && new Date(p.valid_until) < now) return false
    return true
  })

  const elegiveis = new Map<string, string[]>()
  const comEscopo = vivas.filter((p: any) => p.scope !== 'all')
  if (comEscopo.length && productIds.length) {
    const { data: rows } = await deps.supabase
      .from('promotion_eligible_products')
      .select('promotion_id, product_id')
      .in('promotion_id', comEscopo.map((p: any) => String(p.id)))
      .in('product_id', productIds)
    for (const row of (rows || []) as any[]) {
      const key = String(row.promotion_id)
      const lista = elegiveis.get(key)
      if (lista) lista.push(String(row.product_id))
      else elegiveis.set(key, [String(row.product_id)])
    }
  }

  return vivas.map((p: any) => ({
    id: String(p.id),
    discount_kind: p.discount_kind,
    tiers: (p.promotion_tiers || []).map((t: any) => ({ min_qty: Number(t.min_qty), value: Number(t.value) })),
    scope: p.scope,
    eligibleProductIds: elegiveis.get(String(p.id)) ?? [],
    stacks_with_coupon: p.stacks_with_coupon === true,
    created_at: String(p.created_at),
  }))
}

const recusa = (error: string, code: string, status = 422): { ok: false; response: Response } => ({
  ok: false,
  response: json({ error, code }, status),
})

/**
 * Relê preço, variação, promoção e cupom do banco e devolve o preço da montagem.
 *
 * Nada que define dinheiro vem do corpo: dele entram só a escolha (peça, variação, quantidade,
 * gravação), o código do cupom e o avulso. A recusa de `core` (linhas, avulso, A-12) é devolvida com
 * o texto dela.
 */
async function precificar(deps: Deps, entrada: Entrada): Promise<Resultado<Precificado>> {
  const now = new Date(deps.now())
  const ids = [...new Set(entrada.lines.map((l) => l.product_id))]

  const { data: produtos, error: erroProdutos } = ids.length
    ? await deps.supabase
        .from('products')
        .select(
          'id, name, base_price, image_url, capa:images->0->>url, is_active, requires_material, material_kinds, engraving_max_chars, options',
        )
        .in('id', ids)
    : { data: [], error: null }
  const { data: variacoes, error: erroVariacoes } = ids.length
    ? await deps.supabase
        .from('product_variants')
        .select('id, product_id, price, option_values, image_url, is_active')
        .in('product_id', ids)
    : { data: [], error: null }

  if (erroProdutos || erroVariacoes) {
    log({ action: 'order-proposals:price', status: 'catalog_read_failed' })
    return recusa('Não consegui ler o catálogo agora. Tente de novo.', 'catalog_read_failed', 502)
  }

  const produtoPorId = new Map<string, any>((produtos || []).map((p: any) => [String(p.id), p]))
  const variacoesPorProduto = new Map<string, any[]>()
  const variacaoPorId = new Map<string, any>()
  for (const v of (variacoes || []) as any[]) {
    variacaoPorId.set(String(v.id), v)
    const lista = variacoesPorProduto.get(String(v.product_id)) ?? []
    lista.push(v)
    variacoesPorProduto.set(String(v.product_id), lista)
  }

  const basePriceByProductId = new Map<string, number>()
  for (const p of produtos || []) basePriceByProductId.set(String(p.id), Number(p.base_price))
  const variantById = new Map<string, { product_id: string; price: number | null }>()
  for (const v of (variacoes || []) as any[]) {
    variantById.set(String(v.id), {
      product_id: String(v.product_id),
      price: v.price === null || v.price === undefined ? null : Number(v.price),
    })
  }

  const linhas: LinhaRelida[] = []
  for (const pedida of entrada.lines) {
    const produto = produtoPorId.get(pedida.product_id)
    if (!produto) return recusa('Uma das peças não existe mais no catálogo.', 'product_not_found')
    const nome = String(produto.name ?? '')
    if (produto.is_active === false) return recusa(`A peça ${nome} não está à venda.`, 'product_inactive')

    let variacao: any = null
    if (pedida.variant_id) {
      variacao = variacaoPorId.get(pedida.variant_id)
      if (!variacao || String(variacao.product_id) !== pedida.product_id) {
        return recusa(`A variação escolhida de ${nome} não existe mais.`, 'variant_not_found')
      }
      if (variacao.is_active === false) {
        return recusa(`A variação escolhida de ${nome} está pausada.`, 'variant_inactive')
      }
    } else if ((variacoesPorProduto.get(pedida.product_id) ?? []).some((v) => v.is_active !== false)) {
      // MON-05: peça com opções pede a variação. Sem ela não há preço nem gravação a conferir.
      return recusa(`Escolha a variação de ${nome}.`, 'variant_required')
    }

    const preco = resolveItemPrice(
      {
        product_id: pedida.product_id,
        variant_id: pedida.variant_id,
        price_source: pedida.variant_id ? 'variant' : 'base',
      },
      { basePriceByProductId, variantById },
    )
    if (isPriceError(preco)) return recusa(`Não consegui precificar ${nome}.`, 'price_not_resolvable')

    const valores = (variacao?.option_values ?? null) as Record<string, string> | null
    // A gravação só existe na variação que grava (`hasEngraving`); texto mandado para uma que não
    // grava é descartado, como a loja faz — nunca vai para o pedido.
    const gravacao = valores && hasEngraving(valores) ? normalizeEngraving(pedida.engraving_text) : null
    const recusaDaGravacao = engravingRefusal(gravacao, produto.engraving_max_chars ?? null)
    if (recusaDaGravacao) return recusa(recusaDaGravacao, 'engraving_refused')

    const opcoes = Array.isArray(produto.options) ? produto.options : []
    const rotulo = valores ? variantLabel(opcoes, valores) : ''

    linhas.push({
      product_id: pedida.product_id,
      variant_id: pedida.variant_id,
      list_price: preco.price,
      quantity: pedida.quantity,
      product_name: nome,
      // A foto da linha tem um dono em `core` (variação → primeira da galeria → coluna antiga), o mesmo
      // que a montagem do painel e a do app leem: a cliente vê no link a foto que a Adri viu.
      product_image: fotoDaLinha(variacao, produto),
      variant_label: rotulo || null,
      variant_options: valores,
      engraving_text: gravacao,
      requires_material: requiresMaterial(produto),
      material_kinds: toMaterialKinds(produto.material_kinds),
    })
  }

  // O cupom (MON-07): a mesma regra da loja, sobre o subtotal cheio — o que a loja passa a
  // `validateCoupon` —, com a pergunta de primeira compra feita ao banco.
  let coupon: { id: string; code: string } | null = null
  let couponRule: CouponRule | null = null
  const code = (entrada.couponCode ?? '').toUpperCase().trim()
  if (code) {
    const { data: row, error } = await deps.supabase.from('coupons').select('*').ilike('code', code).maybeSingle()
    if (error) return recusa('Erro ao validar cupom.', 'coupon_read_failed', 502)
    if (!row) return recusa('Cupom inválido.', 'coupon_refused')
    const subtotalCheio = round2(linhas.reduce((s, l) => s + l.list_price * (Number.isFinite(l.quantity) ? l.quantity : 0), 0))
    let motivo = couponRefusal(row, { subtotal: subtotalCheio, now })
    if (!motivo && row.first_order_only && entrada.email) {
      const { count } = await deps.supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('customer_email', entrada.email)
      motivo = couponRefusal(row, { subtotal: subtotalCheio, now, hasPriorOrder: (count || 0) > 0 })
    }
    if (motivo) return recusa(motivo, 'coupon_refused')
    coupon = { id: String(row.id), code: String(row.code) }
    couponRule = couponRuleOf(row)
  }

  const promotions = await promocoesVigentes(deps, ids, now)
  const price = priceProposalDraft<LinhaRelida>({
    lines: linhas,
    coupon: couponRule,
    promotions,
    manualDiscount: entrada.manual,
  })
  if (price.refusal) return recusa(price.refusal, 'draft_refused')

  return { ok: true, value: { price, coupon: price.couponApplied ? coupon : null } }
}

/** O resumo que a tela redesenha — os mesmos números que ficam travados. */
function resumo(p: Precificado) {
  return {
    subtotal: p.price.subtotal,
    promotion_discount: p.price.promotionDiscount,
    coupon_discount: p.price.couponDiscount,
    coupon_applied: p.price.couponApplied,
    coupon_free_shipping: p.price.couponFreeShipping,
    coupon_discarded: p.price.discarded === 'coupon',
    manual_discount: p.price.manualDiscount,
    items_total: p.price.itemsTotal,
  }
}

/** O conteúdo que `save_order_proposal` grava, a partir do preço do servidor. */
function conteudoDoSave(p: Precificado, manual: ManualDiscountDraft | null) {
  const travado = lockProposal(p.price)
  return {
    coupon_id: p.coupon?.id ?? null,
    coupon_code: p.coupon?.code ?? null,
    coupon_discount: travado.couponDiscount,
    coupon_free_shipping: travado.couponFreeShipping,
    manual_discount_kind: manual ? manual.kind : null,
    manual_discount_value: manual ? manual.value : null,
    manual_discount_reason: manual ? manual.reason.trim() : null,
    manual_discount: travado.manualDiscount,
    subtotal: p.price.subtotal,
    promotion_discount: p.price.promotionDiscount,
    items_total: p.price.itemsTotal,
    items: p.price.lockedLines.map(({ line, unit_price }) => ({
      product_id: line.product_id,
      variant_id: line.variant_id,
      product_name: line.product_name,
      product_image: line.product_image,
      variant_label: line.variant_label,
      variant_options: line.variant_options,
      quantity: line.quantity,
      list_price: line.list_price,
      unit_price,
      engraving_text: line.engraving_text,
      requires_material: line.requires_material,
      material_kinds: line.material_kinds,
    })),
  }
}

const mesmoValor = (a: unknown, b: unknown) =>
  Math.abs(round2(Number(a)) - round2(Number(b))) < 0.005

/** O prazo do link: 7 dias a partir de agora (A-03). */
const prazoDoLink = (deps: Deps) =>
  new Date(deps.now() + PROPOSAL_LINK_DAYS * 24 * 60 * 60 * 1000).toISOString()

/** O que `save_order_proposal` devolve como `error`, em resposta para a tela. */
function respostaDoErroDoSave(codigo: string): Response {
  switch (codigo) {
    case 'version_conflict':
      return json({ error: VERSION_CONFLICT, code: 'version_conflict' }, 409)
    case 'not_open':
    case 'expired':
      return json({ error: NOT_EDITABLE, code: codigo }, 409)
    case 'not_found':
      return json({ error: NOT_FOUND, code: 'not_found' }, 404)
    case 'customer_not_found':
      return json({ error: 'A ficha da cliente não existe mais.', code: codigo }, 422)
    case 'customer_email_mismatch':
      return json({ error: 'O e-mail não é o da ficha escolhida.', code: codigo }, 422)
    case 'no_items':
    case 'too_many_lines':
      return json({ error: 'Confira as peças da proposta.', code: codigo }, 422)
    default:
      return json({ error: 'Não consegui gravar a proposta.', code: codigo || 'save_failed' }, 400)
  }
}

// ---------------------------------------------------------------------------------------------
// list
// ---------------------------------------------------------------------------------------------

async function list(deps: Deps, req: Request): Promise<Response> {
  const auth = await exigirAdmin(deps, req)
  if (!auth.ok) return json({ error: auth.error }, auth.status)

  const { data, error } = await deps.supabase
    .from('order_proposals')
    .select(COLUNAS_DA_LISTA)
    .order('created_at', { ascending: false })
    .limit(500)
  if (error) {
    log({ action: 'order-proposals:list', status: 'read_failed' })
    return json({ error: 'Não consegui ler as propostas.' }, 502)
  }

  const linhas = (data ?? []) as any[]
  const pedidos = linhas.map((p) => p.order_id).filter(Boolean)
  const numeroDoPedido = new Map<string, string>()
  if (pedidos.length) {
    const { data: orders } = await deps.supabase.from('orders').select('id, order_number').in('id', pedidos)
    for (const o of (orders ?? []) as any[]) numeroDoPedido.set(String(o.id), String(o.order_number ?? ''))
  }

  // As peças de cada proposta, numa leitura só. Falhar aqui é falhar a lista: um cartão sem as
  // peças diria "nenhuma peça" de um pedido que tem.
  const linhasPorProposta = new Map<string, any[]>()
  const ids = linhas.map((p) => p.id).filter(Boolean)
  if (ids.length) {
    const { data: itens, error: erroItens } = await deps.supabase
      .from('order_proposal_items')
      .select(COLUNAS_DA_LINHA_NA_LISTA)
      .in('proposal_id', ids)
      .order('position', { ascending: true })
    if (erroItens) {
      log({ action: 'order-proposals:list', status: 'items_read_failed' })
      return json({ error: 'Não consegui ler as propostas.' }, 502)
    }
    for (const item of (itens ?? []) as any[]) {
      const chave = String(item.proposal_id)
      const doPedido = linhasPorProposta.get(chave) ?? []
      doPedido.push(item)
      linhasPorProposta.set(chave, doPedido)
    }
  }

  const now = new Date(deps.now())
  const proposals = linhas.map((p) => {
    const todas = (linhasPorProposta.get(String(p.id)) ?? []).slice().sort((a, b) => Number(a.position) - Number(b.position))
    return {
      ...p,
      state: estadoDe(p, now),
      order_number: p.order_id ? (numeroDoPedido.get(String(p.order_id)) ?? null) : null,
      lines: todas.slice(0, LINHAS_NA_LISTA).map((l) => ({
        product_name: l.product_name ?? '',
        product_image: l.product_image ?? null,
        variant_label: l.variant_label ?? null,
        quantity: Number(l.quantity ?? 0),
      })),
      lines_count: todas.length,
    }
  })

  log({ action: 'order-proposals:list', status: 'ok', total: proposals.length })
  // `agora`: o relógio do servidor, para quem desenha "montado há 2 dias" sem ler o do aparelho.
  return json({ proposals, agora: now.toISOString() })
}

// ---------------------------------------------------------------------------------------------
// get
// ---------------------------------------------------------------------------------------------

/**
 * A proposta lida, com a cifra do token (`token_cipher`) para quem decide o link. A cifra NUNCA sai
 * numa resposta: o `get` a retira antes de devolver a linha (`semCifra`).
 */
async function lerProposta(deps: Deps, id: string): Promise<{ row: any | null; error: boolean }> {
  const { data, error } = await deps.supabase
    .from('order_proposals')
    .select(`${COLUNAS_DA_PROPOSTA}, token_cipher`)
    .eq('id', id)
    .maybeSingle()
  return { row: data ?? null, error: !!error }
}

async function lerLinhas(deps: Deps, id: string): Promise<any[] | null> {
  const { data, error } = await deps.supabase
    .from('order_proposal_items')
    .select(COLUNAS_DA_LINHA)
    .eq('proposal_id', id)
    .order('position', { ascending: true })
  if (error) return null
  return ((data ?? []) as any[]).slice().sort((a, b) => Number(a.position) - Number(b.position))
}

/** A linha sem credencial: nem a cifra nem o hash saem, mesmo que uma leitura futura os traga. */
const semCifra = (row: any) => {
  const { token_cipher: _cifra, token_hash: _hash, idempotency_key: _chave, ...resto } = row ?? {}
  return resto
}

/**
 * O token do link desta proposta, quando ele pode ser mostrado: aberta (ou vista), com cifra gravada e
 * a chave configurada que a decifra. Qualquer outra coisa ⇒ `null` — a proposta vencida, cancelada ou
 * concluída nunca devolve o link (o link morreu), e a sem cifra cai no "Gerar link novo".
 */
async function tokenDisponivel(deps: Deps, row: any, state: ProposalState): Promise<string | null> {
  if (state !== 'open' && state !== 'viewed') return null
  if (!deps.tokenCipher || typeof row?.token_cipher !== 'string' || !row.token_cipher) return null
  return await deps.tokenCipher.decrypt(row.token_cipher)
}

async function get(deps: Deps, req: Request, body: any): Promise<Response> {
  const auth = await exigirAdmin(deps, req)
  if (!auth.ok) return json({ error: auth.error }, auth.status)

  const id = idDe(body)
  if (!id) return json({ error: NOT_FOUND, code: 'not_found' }, 404)

  const { row, error } = await lerProposta(deps, id)
  if (error) return json({ error: 'Não consegui ler a proposta.' }, 502)
  if (!row) return json({ error: NOT_FOUND, code: 'not_found' }, 404)

  const items = await lerLinhas(deps, id)
  if (items === null) return json({ error: 'Não consegui ler a proposta.' }, 502)

  const { data: eventos } = await deps.supabase
    .from('order_proposal_events')
    .select('kind, channel, actor, created_at')
    .eq('proposal_id', id)
    .order('created_at', { ascending: true })

  // HIS-01: "data e AUTOR". `actor` é o uuid da conta; quem lê o histórico precisa do e-mail. Uma
  // consulta por autor distinto, com a chave de serviço que esta function já tem. Conta que não
  // existe mais (ou leitura que falha) ⇒ `actor_email: null`, e o painel não mostra autor — nunca o
  // uuid cru.
  const autores = [...new Set((eventos ?? []).map((e: { actor: string | null }) => e.actor).filter(Boolean))] as string[]
  const emailDe = new Map<string, string | null>()
  await Promise.all(
    autores.map(async (uid) => {
      try {
        const { data, error: erroAutor } = await deps.supabase.auth.admin.getUserById(uid)
        emailDe.set(uid, erroAutor ? null : (data?.user?.email ?? null))
      } catch {
        emailDe.set(uid, null)
      }
    }),
  )
  const eventosComAutor = (eventos ?? []).map((e: { actor: string | null }) => ({
    ...e,
    actor_email: e.actor ? (emailDe.get(e.actor) ?? null) : null,
  }))

  let orderNumber: string | null = null
  if (row.order_id) {
    const { data: order } = await deps.supabase
      .from('orders')
      .select('order_number')
      .eq('id', row.order_id)
      .maybeSingle()
    orderNumber = order?.order_number ?? null
  }

  const state = estadoDe(row, new Date(deps.now()))
  const token = await tokenDisponivel(deps, row, state)
  log({ action: 'order-proposals:get', status: 'ok', proposal_id: id, link: token ? 'available' : 'unavailable' })
  return json({
    proposal: { ...semCifra(row), items, events: eventosComAutor, order_number: orderNumber },
    state,
    actions: proposalActions(state, { linkAvailable: token !== null }),
    // O token, só da aberta com cifra: quem desenha monta o link com a origem da loja.
    token,
  })
}

// ---------------------------------------------------------------------------------------------
// save — criar e editar (`MON-11`, `PRC-01`, `PRC-02`, `LNK-05`)
// ---------------------------------------------------------------------------------------------

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
const nuloSeVazio = (v: unknown) => texto(v) || null

/**
 * A observação do corpo, como ela é gravada: `undefined` quando o corpo não a traz (a gravação não a
 * toca), `null` para vazio (apaga), o texto aparado — ou a recusa, pela regra de `core`.
 */
function observacaoDoCorpo(body: any): { ok: true; value: string | null | undefined } | { ok: false; error: string } {
  if (!body || !('admin_note' in body)) return { ok: true, value: undefined }
  const bruto = body.admin_note
  if (bruto != null && typeof bruto !== 'string') return { ok: false, error: 'A observação precisa ser um texto.' }
  const recusa = adminNoteRefusal(bruto)
  if (recusa) return { ok: false, error: recusa }
  return { ok: true, value: normalizeAdminNote(bruto) || null }
}

async function save(deps: Deps, req: Request, body: any): Promise<Response> {
  const auth = await exigirAdmin(deps, req)
  if (!auth.ok) return json({ error: auth.error }, auth.status)

  const editando = body?.id != null
  const id = editando ? idDe(body) : null
  if (editando && !id) return json({ error: NOT_FOUND, code: 'not_found' }, 404)
  if (editando && !Number.isInteger(body?.version)) {
    return json({ error: 'A versão da proposta é obrigatória.', code: 'missing_fields' }, 400)
  }
  const chave = texto(body?.idempotency_key)
  if (!editando && !chave) {
    return json({ error: 'idempotency_key é obrigatório.', code: 'missing_fields' }, 400)
  }

  const email = normalizeEmail(texto(body?.customer_email))
  const nome = texto(body?.customer_name)
  if (!nome) return json({ error: 'Informe o nome da cliente.', code: 'missing_fields' }, 400)
  if (!isValidEmail(email)) return json({ error: 'Informe um e-mail válido.', code: 'missing_fields' }, 400)

  const customerId = body?.customer_id == null ? null : typeof body.customer_id === 'string' && UUID_RE.test(body.customer_id) ? body.customer_id : undefined
  if (customerId === undefined) return json({ error: 'A ficha da cliente não existe mais.', code: 'customer_not_found' }, 422)

  const linhas = linhasDoCorpo(body?.lines)
  if (linhas === null) return json({ error: 'Confira as peças da proposta.', code: 'bad_lines' }, 400)

  const observacao = observacaoDoCorpo(body)
  if (!observacao.ok) return json({ error: observacao.error, code: 'bad_admin_note' }, 422)

  const esperado = Number(body?.expected_total)
  if (body?.expected_total == null || !Number.isFinite(esperado)) {
    return json({ error: 'expected_total é obrigatório.', code: 'missing_fields' }, 400)
  }

  const manual = avulsoDoCorpo(body?.manual_discount)
  const precificado = await precificar(deps, {
    lines: linhas,
    couponCode: typeof body?.coupon_code === 'string' ? body.coupon_code : null,
    manual,
    email,
  })
  if (!precificado.ok) {
    log({ action: 'order-proposals:save', status: 'refused' })
    return precificado.response
  }

  // PRC-02: o servidor nunca grava um total que a Adri não viu.
  if (!mesmoValor(precificado.value.price.itemsTotal, esperado)) {
    log({ action: 'order-proposals:save', status: 'prices_changed' })
    return json({ error: PRICES_CHANGED, code: 'prices_changed', summary: resumo(precificado.value) }, 409)
  }

  const contato = {
    customer_id: customerId,
    customer_name: nome,
    customer_email: email,
    customer_phone: nuloSeVazio(body?.customer_phone),
    customer_document: texto(body?.customer_document).replace(/\D/g, '') || null,
    address_zip: texto(body?.address_zip).replace(/\D/g, '') || null,
    address_street: nuloSeVazio(body?.address_street),
    address_number: nuloSeVazio(body?.address_number),
    address_complement: nuloSeVazio(body?.address_complement),
    address_neighborhood: nuloSeVazio(body?.address_neighborhood),
    address_city: nuloSeVazio(body?.address_city),
    address_state: nuloSeVazio(body?.address_state),
  }

  // O token nasce SÓ ao criar (`SEG-01`). Editar mantém o link (`LNK-05`).
  const token = editando ? null : newAccessToken()
  const expiresAt = editando ? null : prazoDoLink(deps)
  const p: Record<string, unknown> = {
    ...contato,
    ...conteudoDoSave(precificado.value, manual),
    actor: auth.userId,
  }
  // A observação não é conteúdo: a RPC não sobe a versão por ela. Ausente do corpo, ela não é tocada.
  if (observacao.value !== undefined) p.admin_note = observacao.value
  if (editando) {
    p.id = id
    p.version = body.version
  } else {
    p.idempotency_key = chave
    p.token_hash = await hashAccessToken(token as string)
    // Com a chave configurada, a cifra nasce junto do hash; sem ela, só o hash.
    if (deps.tokenCipher) p.token_cipher = await deps.tokenCipher.encrypt(token as string)
    p.expires_at = expiresAt
  }
  // "Salvar no cadastro da cliente" grava o endereço em `addresses` NA MESMA transação da
  // proposta (a RPC); o painel e o app não escrevem mais em `addresses` pelo navegador.
  p.save_address = body?.save_address === true

  const { data, error } = await deps.supabase.rpc('save_order_proposal', { p })
  if (error) {
    log({ action: 'order-proposals:save', status: 'rpc_failed' })
    return json({ error: 'Não consegui gravar a proposta.' }, 500)
  }
  if (data?.error) {
    log({ action: 'order-proposals:save', status: String(data.error) })
    return respostaDoErroDoSave(String(data.error))
  }

  // A mesma chave de idempotência devolveu a proposta já criada (duplo clique): o token gerado AGORA
  // não foi gravado, então ele não sai — a tela oferece "Gerar link novo".
  const criou = data?.created === true && data?.reused !== true
  log({
    action: 'order-proposals:save',
    status: criou ? 'created' : data?.reused ? 'reused' : data?.changed ? 'edited' : 'unchanged',
    proposal_id: data?.id ?? null,
  })
  return json({
    id: data?.id ?? null,
    number: data?.number ?? null,
    version: data?.version ?? null,
    status: data?.status ?? null,
    customer_id: data?.customer_id ?? null,
    created: criou,
    changed: data?.changed === true,
    reused: data?.reused === true,
    token: criou ? token : null,
    expires_at: criou ? expiresAt : null,
    summary: resumo(precificado.value),
  })
}

// ---------------------------------------------------------------------------------------------
// renew — link novo, prazo novo, preços relidos (`LNK-05`, `LNK-06`, `PRC-01`)
// ---------------------------------------------------------------------------------------------

/**
 * A ordem das escritas é a que deixa um estado coerente a cada passo:
 *
 *   1. recalcular sem escrever; preço mudou sem a Adri ter visto ⇒ 409 `prices_changed`, nada gravado
 *   2. UM update atômico troca o hash, o prazo e a versão — o link antigo morre aqui (`LNK-05`),
 *      escopado pela versão lida e por `status = open` (duas abas: a segunda não acha a linha)
 *   3. se os preços mudaram, `save_order_proposal` os grava de novo, numa transação
 *   4. o evento "renovada"
 *
 * Se o passo 3 falhar, a proposta fica com o link novo e os preços antigos — o combinado de antes,
 * nunca um valor misturado —, e o token NÃO sai: a Adri renova de novo.
 *
 * // SPEC_DEVIATION: o design não tem RPC de renovação; os passos 2 e 4 são escritas diretas da
 * function (service role) nas tabelas que só ela alcança.
 */
async function renew(deps: Deps, req: Request, body: any): Promise<Response> {
  const auth = await exigirAdmin(deps, req)
  if (!auth.ok) return json({ error: auth.error }, auth.status)

  const id = idDe(body)
  if (!id) return json({ error: NOT_FOUND, code: 'not_found' }, 404)

  const { row, error } = await lerProposta(deps, id)
  if (error) return json({ error: 'Não consegui ler a proposta.' }, 502)
  if (!row) return json({ error: NOT_FOUND, code: 'not_found' }, 404)

  const now = new Date(deps.now())
  // Renovar é da expirada — e da aberta cujo link não pode ser mostrado (sem cifra, ou sem a
  // chave que a decifra): para ela, renovar é o único jeito de ter link. A aberta com link
  // disponível recusa: trocar o link dela mataria o que a cliente já recebeu, sem precisar.
  const estado = estadoDe(row, now)
  const linkAvailable = (await tokenDisponivel(deps, row, estado)) !== null
  if (!proposalActions(estado, { linkAvailable }).renew) {
    return json({ error: 'Esta proposta não pode ser renovada.', code: 'not_renewable' }, 409)
  }

  const linhasGravadas = await lerLinhas(deps, id)
  if (linhasGravadas === null) return json({ error: 'Não consegui ler a proposta.' }, 502)

  const manual: ManualDiscountDraft | null = row.manual_discount_kind
    ? {
        kind: row.manual_discount_kind,
        value: Number(row.manual_discount_value),
        reason: String(row.manual_discount_reason ?? ''),
      }
    : null

  const precificado = await precificar(deps, {
    lines: linhasGravadas.map((l) => ({
      product_id: String(l.product_id),
      variant_id: l.variant_id ?? null,
      quantity: Number(l.quantity),
      engraving_text: l.engraving_text ?? null,
    })),
    couponCode: row.coupon_code ?? null,
    manual,
    email: normalizeEmail(row.customer_email ?? ''),
  })
  if (!precificado.ok) {
    log({ action: 'order-proposals:renew', status: 'refused', proposal_id: id })
    return precificado.response
  }

  const novo = precificado.value
  const mudou =
    !mesmoValor(novo.price.itemsTotal, row.items_total) ||
    !mesmoValor(novo.price.couponDiscount, row.coupon_discount) ||
    !mesmoValor(novo.price.manualDiscount, row.manual_discount) ||
    novo.price.lockedLines.length !== linhasGravadas.length ||
    novo.price.lockedLines.some((l, i) => !mesmoValor(l.unit_price, linhasGravadas[i].unit_price))

  if (mudou) {
    const esperado = Number(body?.expected_total)
    if (body?.expected_total == null || !mesmoValor(novo.price.itemsTotal, esperado)) {
      log({ action: 'order-proposals:renew', status: 'prices_changed', proposal_id: id })
      return json({ error: PRICES_CHANGED, code: 'prices_changed', summary: resumo(novo) }, 409)
    }
  }

  const token = newAccessToken()
  const expiresAt = prazoDoLink(deps)
  const versaoLida = Number(row.version)

  const { data: trocada, error: erroTroca } = await deps.supabase
    .from('order_proposals')
    .update({
      token_hash: await hashAccessToken(token),
      // A cifra no MESMO update do hash: as duas sempre descrevem o mesmo token. Sem a chave, a cifra
      // antiga sai (ela seria de um token que acabou de morrer).
      token_cipher: deps.tokenCipher ? await deps.tokenCipher.encrypt(token) : null,
      expires_at: expiresAt,
      // O link novo ainda não foi aberto por ninguém.
      viewed_at: null,
      version: versaoLida + 1,
      updated_at: now.toISOString(),
    })
    .eq('id', id)
    .eq('version', versaoLida)
    .eq('status', 'open')
    .select('id, version')
    .maybeSingle()

  if (erroTroca) {
    log({ action: 'order-proposals:renew', status: 'update_failed', proposal_id: id })
    return json({ error: 'Não consegui renovar a proposta.' }, 500)
  }
  if (!trocada?.id) {
    log({ action: 'order-proposals:renew', status: 'version_conflict', proposal_id: id })
    return json({ error: VERSION_CONFLICT, code: 'version_conflict' }, 409)
  }

  let versao = Number(trocada.version ?? versaoLida + 1)
  if (mudou) {
    const { data, error: erroSave } = await deps.supabase.rpc('save_order_proposal', {
      p: {
        id,
        version: versao,
        actor: auth.userId,
        customer_id: row.customer_id ?? null,
        customer_name: row.customer_name,
        customer_email: row.customer_email,
        customer_phone: row.customer_phone ?? null,
        customer_document: row.customer_document ?? null,
        address_zip: row.address_zip ?? null,
        address_street: row.address_street ?? null,
        address_number: row.address_number ?? null,
        address_complement: row.address_complement ?? null,
        address_neighborhood: row.address_neighborhood ?? null,
        address_city: row.address_city ?? null,
        address_state: row.address_state ?? null,
        ...conteudoDoSave(novo, manual),
      },
    })
    if (erroSave || data?.error) {
      log({ action: 'order-proposals:renew', status: 'reprice_failed', proposal_id: id })
      return json({ error: 'Renovei o prazo, mas não consegui travar os preços novos. Renove de novo.' }, 500)
    }
    versao = Number(data?.version ?? versao)
  }

  const { error: erroEvento } = await deps.supabase
    .from('order_proposal_events')
    .insert({ proposal_id: id, kind: 'renewed', actor: auth.userId })
  if (erroEvento) log({ action: 'order-proposals:renew', status: 'event_failed', proposal_id: id })

  log({ action: 'order-proposals:renew', status: 'ok', proposal_id: id, repriced: mudou })
  return json({
    id,
    number: row.number ?? null,
    version: versao,
    token,
    expires_at: expiresAt,
    repriced: mudou,
    summary: resumo(novo),
  })
}

// ---------------------------------------------------------------------------------------------
// cancel
// ---------------------------------------------------------------------------------------------

async function cancel(deps: Deps, req: Request, body: any): Promise<Response> {
  const auth = await exigirAdmin(deps, req)
  if (!auth.ok) return json({ error: auth.error }, auth.status)

  const id = idDe(body)
  if (!id) return json({ error: NOT_FOUND, code: 'not_found' }, 404)

  const { row, error } = await lerProposta(deps, id)
  if (error) return json({ error: 'Não consegui ler a proposta.' }, 502)
  if (!row) return json({ error: NOT_FOUND, code: 'not_found' }, 404)

  const now = new Date(deps.now())
  if (!proposalActions(estadoDe(row, now)).cancel) {
    return json({ error: 'Esta proposta não está mais aberta.', code: 'not_open' }, 409)
  }

  // Escopado por `status = open`: a conclusão que chegou entre a leitura e esta escrita vence, e o
  // pedido que já nasceu não perde a proposta dele.
  const { data: cancelada, error: erroUpdate } = await deps.supabase
    .from('order_proposals')
    .update({ status: 'cancelled', updated_at: now.toISOString() })
    .eq('id', id)
    .eq('status', 'open')
    .select('id')
    .maybeSingle()
  if (erroUpdate) return json({ error: 'Não consegui cancelar a proposta.' }, 500)
  if (!cancelada?.id) return json({ error: 'Esta proposta não está mais aberta.', code: 'not_open' }, 409)

  const { error: erroEvento } = await deps.supabase
    .from('order_proposal_events')
    .insert({ proposal_id: id, kind: 'cancelled', actor: auth.userId })
  if (erroEvento) log({ action: 'order-proposals:cancel', status: 'event_failed', proposal_id: id })

  log({ action: 'order-proposals:cancel', status: 'ok', proposal_id: id })
  return json({ id, status: 'cancelled' })
}

// ---------------------------------------------------------------------------------------------
// note — a observação interna, em qualquer status não concluído
// ---------------------------------------------------------------------------------------------

export const NOTE_ON_ORDER = 'Esta proposta já virou pedido: a observação agora é a do pedido.'

/**
 * `save` recusa proposta fechada ou vencida, e a observação precisa ser editável nas duas. Esta ação
 * escreve SÓ a coluna: não sobe a versão (o link da cliente não diz "a proposta mudou"), não toca em
 * `updated_at` e não gera evento `edited`. Concluída ⇒ recusa: a dona passou a ser a observação do
 * pedido, e a coluna da proposta fica congelada. O `update` é escopado pelos status não concluídos: a
 * conclusão que chegou entre a leitura e esta escrita vence.
 */
async function note(deps: Deps, req: Request, body: any): Promise<Response> {
  const auth = await exigirAdmin(deps, req)
  if (!auth.ok) return json({ error: auth.error }, auth.status)

  const id = idDe(body)
  if (!id) return json({ error: NOT_FOUND, code: 'not_found' }, 404)

  const observacao = observacaoDoCorpo(body)
  if (!observacao.ok) return json({ error: observacao.error, code: 'bad_admin_note' }, 422)
  if (observacao.value === undefined) {
    return json({ error: 'admin_note é obrigatório.', code: 'missing_fields' }, 400)
  }

  const { row, error } = await lerProposta(deps, id)
  if (error) return json({ error: 'Não consegui ler a proposta.' }, 502)
  if (!row) return json({ error: NOT_FOUND, code: 'not_found' }, 404)
  if (row.status === 'completed' || row.order_id) {
    return json({ error: NOTE_ON_ORDER, code: 'completed' }, 409)
  }

  const { data: gravada, error: erroUpdate } = await deps.supabase
    .from('order_proposals')
    .update({ admin_note: observacao.value })
    .eq('id', id)
    .in('status', ['open', 'cancelled'])
    .select('id, admin_note')
    .maybeSingle()
  if (erroUpdate) {
    log({ action: 'order-proposals:note', status: 'update_failed', proposal_id: id })
    return json({ error: 'Não consegui gravar a observação.' }, 500)
  }
  if (!gravada?.id) {
    log({ action: 'order-proposals:note', status: 'completed', proposal_id: id })
    return json({ error: NOTE_ON_ORDER, code: 'completed' }, 409)
  }

  log({ action: 'order-proposals:note', status: 'ok', proposal_id: id })
  return json({ id, admin_note: gravada.admin_note ?? null })
}

// ---------------------------------------------------------------------------------------------
// log-sent — "Link enviado" (`LNK-03`)
// ---------------------------------------------------------------------------------------------

const CANAIS = new Set(['whatsapp', 'copy'])

async function logSent(deps: Deps, req: Request, body: any): Promise<Response> {
  const auth = await exigirAdmin(deps, req)
  if (!auth.ok) return json({ error: auth.error }, auth.status)

  const id = idDe(body)
  if (!id) return json({ error: NOT_FOUND, code: 'not_found' }, 404)
  const canal = body?.channel
  if (typeof canal !== 'string' || !CANAIS.has(canal)) {
    return json({ error: 'Canal inválido. Use: whatsapp, copy', code: 'bad_channel' }, 400)
  }

  const { row, error } = await lerProposta(deps, id)
  if (error) return json({ error: 'Não consegui ler a proposta.' }, 502)
  if (!row) return json({ error: NOT_FOUND, code: 'not_found' }, 404)

  const estado = estadoDe(row, new Date(deps.now()))
  if (estado !== 'open' && estado !== 'viewed') {
    return json({ error: 'O link desta proposta não está mais valendo.', code: 'not_open' }, 409)
  }

  const { error: erroEvento } = await deps.supabase
    .from('order_proposal_events')
    .insert({ proposal_id: id, kind: 'link_sent', channel: canal, actor: auth.userId })
  if (erroEvento) {
    log({ action: 'order-proposals:log-sent', status: 'insert_failed', proposal_id: id })
    return json({ error: 'Não consegui registrar o envio.' }, 500)
  }

  log({ action: 'order-proposals:log-sent', status: 'ok', proposal_id: id, channel: canal })
  return json({ ok: true })
}

// ---------------------------------------------------------------------------------------------
// Roteamento
// ---------------------------------------------------------------------------------------------

export async function route(deps: Deps, req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight()

  const action = new URL(req.url).searchParams.get('action') ?? ''

  let body: any = {}
  if (req.method !== 'GET') {
    try {
      const corpo = await req.text()
      body = corpo.trim() === '' ? {} : JSON.parse(corpo)
    } catch {
      log({ action: `order-proposals:${action}`, status: 'bad_body' })
      return json({ error: 'Corpo da requisição inválido' }, 400)
    }
  }

  try {
    switch (action) {
      case 'list':
        return await list(deps, req)
      case 'get':
        return await get(deps, req, body)
      case 'save':
        return await save(deps, req, body)
      case 'renew':
        return await renew(deps, req, body)
      case 'cancel':
        return await cancel(deps, req, body)
      case 'log-sent':
        return await logSent(deps, req, body)
      case 'note':
        return await note(deps, req, body)
      default:
        log({ action: `order-proposals:${action}`, status: 'unknown_action' })
        return json({ error: 'Ação desconhecida. Use: list, get, save, renew, cancel, log-sent, note' }, 400)
    }
  } catch (err) {
    log({ action: `order-proposals:${action}`, status: 'error', message: err instanceof Error ? err.message : String(err) })
    return json({ error: 'Erro interno' }, 500)
  }
}
