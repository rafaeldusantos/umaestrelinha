// O link de pagamento por cartão de um pedido, do lado da loja.
//
//   get-card-link   a página `/pagar-com-cartao` pede o pedido pelo token do link. Devolve só o que a
//                   página desenha para pagar: o número, o valor do cartão e as peças. Nenhum dado
//                   pessoal — nem nome, e-mail, telefone, documento ou endereço —, nenhum hash.
//
// Quem gera o link é a Adri, no painel (function `mercado-pago`, ação `card-link`); quem cobra é o
// `create-payment`, com o token como prova de posse. O link vale até o pedido ser pago ou cancelado,
// ou até a Adri gerar outro: aberto com o pedido pago ou cancelado, ele mostra a situação e nada para
// pagar (`cardLinkSituation`, a mesma regra do painel).
//
// O token nunca aparece em log — nem ele, nem o hash.

import { hashAccessToken } from '../../../packages/core/src/checkout/guestAccess.ts'
import { cardLinkRefusal, cardLinkSituation } from '../../../packages/core/src/checkout/cardLink.ts'
import { json } from '../_shared/http.ts'
import { clientIp, type RateLimiter } from '../_shared/rateLimit.ts'
import type { Deps } from './handlers.ts'

function log(entry: Record<string, unknown>) {
  console.log(JSON.stringify(entry))
}

/** No máximo 30 leituras do link por IP a cada 5 minutos — o teto da página do pedido montado. */
export const CARD_LINK_READ_MAX = 30
export const CARD_LINK_READ_WINDOW_MS = 5 * 60 * 1000

export const CARD_LINK_UNAVAILABLE =
  'Este link não está mais disponível. Fale comigo pelo WhatsApp que eu mando um novo.'

const FALHA = 'Não consegui abrir o pagamento agora. Tente de novo.'

const indisponivel = () => json({ error: CARD_LINK_UNAVAILABLE, code: 'unavailable' }, 404)

export async function getCardLink(
  deps: Deps,
  req: Request,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: any,
  limiter: RateLimiter | null,
): Promise<Response> {
  // Sem o balde, recusa — nunca "sem teto": o link é uma credencial de URL.
  if (!limiter) {
    log({ action: 'get-card-link', status: 'limiter_missing' })
    return json({ error: FALHA }, 503)
  }
  const ip = clientIp(req)
  if (ip && !limiter.hit(ip)) {
    log({ action: 'get-card-link', status: 'rate_limited' })
    return json({ error: 'Muitas consultas. Tente de novo em alguns minutos.' }, 429)
  }

  const token = typeof body?.token === 'string' ? body.token.trim() : ''
  if (!token) return indisponivel()

  const { data: link, error: linkError } = await deps.supabase
    .from('order_card_links')
    .select('order_id, revoked_at')
    .eq('token_hash', await hashAccessToken(token))
    .maybeSingle()
  if (linkError) {
    log({ action: 'get-card-link', status: 'read_failed' })
    return json({ error: FALHA }, 502)
  }
  if (!link || link.revoked_at) {
    log({ action: 'get-card-link', status: link ? 'revoked' : 'unknown_token' })
    return indisponivel()
  }

  const orderId = String(link.order_id)
  const { data: order, error: orderError } = await deps.supabase
    .from('orders')
    .select('id, order_number, payment_method, status, payment_status, paid_at, total')
    .eq('id', orderId)
    .maybeSingle()
  if (orderError) {
    log({ action: 'get-card-link', status: 'read_failed', order_id: orderId })
    return json({ error: FALHA }, 502)
  }
  if (!order) return indisponivel()

  const estado = {
    payment_method: order.payment_method ?? null,
    status: order.status ?? null,
    payment_status: order.payment_status ?? null,
    paid_at: order.paid_at ?? null,
  }
  const situation = cardLinkSituation(estado)
  if (situation) {
    log({ action: 'get-card-link', status: situation, order_id: orderId })
    return json({ situation, order_number: order.order_number ?? null })
  }
  if (cardLinkRefusal(estado)) {
    log({ action: 'get-card-link', status: 'not_payable', order_id: orderId })
    return indisponivel()
  }

  // O valor do cartão travado na primeira cobrança; sem ela, o total do pedido. Quem cobra é o
  // `create-payment`, pela mesma regra.
  const { data: lock } = await deps.supabase
    .from('order_charge_locks')
    .select('card')
    .eq('order_id', orderId)
    .maybeSingle()
  const travado = Number(lock?.card?.total)
  const amount = Number.isFinite(travado) && travado > 0 ? travado : Number(order.total)

  const { data: itens, error: itensError } = await deps.supabase
    .from('order_items')
    .select('product_name, variant_label, quantity')
    .eq('order_id', orderId)
  if (itensError) {
    log({ action: 'get-card-link', status: 'read_failed', order_id: orderId })
    return json({ error: FALHA }, 502)
  }

  log({ action: 'get-card-link', status: 'ok', order_id: orderId })
  return json({
    order: {
      id: orderId,
      order_number: order.order_number ?? null,
      amount,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      items: (Array.isArray(itens) ? itens : []).map((i: any) => ({
        name: String(i.product_name ?? ''),
        variant: typeof i.variant_label === 'string' && i.variant_label ? i.variant_label : null,
        quantity: Number(i.quantity ?? 0),
      })),
    },
  })
}
