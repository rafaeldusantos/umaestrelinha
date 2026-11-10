// O link de pagamento por cartão de um pedido: quem pode recebê-lo, o que ele mostra no lugar do
// pagamento, e o endereço. A mesma regra decide o botão do painel e a recusa das functions
// (`mercado-pago`, ação `card-link`; `checkout`, ação `get-card-link`).
//
// Folha alcançável pelo Deno: o único import é `core/routes/routes.ts`, com a extensão explícita.

import { CARD_LINK_PATH } from '../routes/routes.ts'

export { CARD_LINK_PATH }

/** Os campos do pedido que a regra lê. */
export interface CardLinkOrder {
  payment_method: string | null
  status: string | null
  payment_status: string | null
  paid_at: string | null
}

export const CARD_LINK_NOT_CARD = 'O link de cartão é só para pedido feito com cartão.'
export const CARD_LINK_CANCELLED = 'Este pedido foi cancelado.'
export const CARD_LINK_PAID = 'Este pedido já foi pago.'
export const CARD_LINK_NOT_PAYABLE = 'O pagamento deste pedido não pode ser refeito agora.'

/** Os pagamentos que podem ser refeitos: pendente, recusado e vencido. */
const PAGAVEIS = ['pending', 'rejected', 'expired']

/**
 * `null` quando o pedido pode receber um link de pagamento por cartão; senão, o motivo. Só pedido
 * feito com cartão, com o pagamento pendente, recusado ou vencido, não pago e não cancelado.
 */
export function cardLinkRefusal(order: CardLinkOrder): string | null {
  if (order.status === 'cancelled') return CARD_LINK_CANCELLED
  if (order.paid_at || order.payment_status === 'approved') return CARD_LINK_PAID
  if (order.payment_method !== 'card') return CARD_LINK_NOT_CARD
  if (!PAGAVEIS.includes(order.payment_status ?? '')) return CARD_LINK_NOT_PAYABLE
  return null
}

/**
 * A situação que o link mostra no lugar do pagamento: `'cancelled'`, `'paid'` ou `null` (o pedido
 * não está encerrado). Cancelado vence pago — é o estado final do pedido.
 */
export function cardLinkSituation(order: CardLinkOrder): 'paid' | 'cancelled' | null {
  if (order.status === 'cancelled') return 'cancelled'
  if (order.paid_at || order.payment_status === 'approved') return 'paid'
  return null
}

/** `https://loja` + token ⇒ `https://loja/pagar-com-cartao#<token>`. */
export function cardLink(origin: string, token: string): string {
  const base = (origin ?? '').trim().replace(/\/+$/, '')
  return `${base}${CARD_LINK_PATH}#${token}`
}
