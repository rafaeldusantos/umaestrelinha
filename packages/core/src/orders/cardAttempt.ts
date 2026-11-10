// "O meio de pagamento ainda está analisando esta cobrança de cartão?"
//
// O expirador de pedidos (`expire-pending-orders`, de hora em hora) leva a `expired` todo pedido
// `pending` com mais de 24 h — inclusive a cobrança de cartão que o Mercado Pago ainda não decidiu
// (`in_process`, `pending_review_manual`…). Esse `expired` é do relógio da loja, não uma resposta do
// meio de pagamento, e a aprovação continua aceita depois dele. Quem diz o que o Mercado Pago
// respondeu por último é `mp_status_detail`, e um detalhe da família "em análise" quer dizer que a
// resposta final ainda não veio.
//
// Folha sem import: o selo (`situation.ts`) e o informativo do cartão (`repix.ts`) a leem, e o
// diretório é alcançado pelo Deno.

/** Os meios de cartão: o da loja (`card`) e o importado da Nuvemshop (`credit_card`). */
export const CARD_METHODS = ['card', 'credit_card']

export interface CardAttemptInput {
  payment_method?: string | null
  payment_status: string | null
  /** O último `status_detail` que o Mercado Pago devolveu para a cobrança. */
  mp_status_detail?: string | null
}

/** `in_process` ou um `pending_*`: o Mercado Pago ainda não deu a resposta final. */
export const detalheEmAnalise = (detalhe: string | null | undefined): boolean => {
  const d = (detalhe ?? '').trim()
  return d === 'in_process' || d.startsWith('pending')
}

/**
 * `true` quando o pedido de cartão está `expired` só pelo relógio da loja: o último detalhe do meio
 * de pagamento ainda é "em análise". A recusa (`rejected`) nunca entra — ela é resposta.
 */
export function cartaoExpiradoSemResposta(o: CardAttemptInput | null | undefined): boolean {
  if (!o || o.payment_status !== 'expired') return false
  return CARD_METHODS.includes((o.payment_method ?? '').trim()) && detalheEmAnalise(o.mp_status_detail)
}
