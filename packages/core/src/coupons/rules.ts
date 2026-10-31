// A regra do cupom — pura (feature 89, MON-07, PRC-01).
//
// Quem pergunta "este cupom vale para este pedido?" são três: a loja (`validateCoupon`, no
// navegador), o painel ao montar uma proposta, e a function `order-proposals`, que reconfere no
// servidor. Escrita em cada um, a ordem das recusas ou um texto diverge sem nada quebrar — e o painel
// aceitaria o que o servidor recusa. Esta folha é o dono; `validateCoupon` delega.
//
// Sem import de pacote: a function lê este arquivo por caminho relativo no Deno, e lá todo
// especificador precisa de extensão explícita (o único import é o tipo de `../payment/pricing.ts`).
// Por isso a linha do cupom é declarada aqui de forma ESTRUTURAL, em vez de vir do pacote de tipos:
// o pacote descreve a coluna, isto descreve o argumento.

import type { CouponRule } from '../payment/pricing.ts'

/** As colunas de `coupons` que a regra lê. A linha inteira do banco satisfaz este tipo. */
export interface CouponRow {
  type: 'percent' | 'fixed' | 'free_shipping'
  value: number
  active: boolean
  valid_from: string | null
  valid_until: string | null
  max_uses: number | null
  used_count: number
  min_order: number | null
  first_order_only: boolean
}

export interface CouponContext {
  /** Subtotal dos itens sobre o qual o pedido mínimo é conferido. */
  subtotal: number
  now: Date
  /**
   * Este e-mail já tem pedido? `null`/ausente = não foi perguntado (não há e-mail, ou o chamador
   * ainda não consultou) — e aí a regra de primeira compra não recusa. Só `true` recusa.
   */
  hasPriorOrder?: boolean | null
}

/** O texto do pedido mínimo, com a vírgula decimal da loja. */
const minOrderRefusal = (min: number) => `Pedido mínimo de R$ ${min.toFixed(2).replace('.', ',')}.`

/**
 * A recusa do cupom, ou `null` quando ele vale. Os textos e a ORDEM são os da loja desde antes da
 * feature 89: desativado → ainda não válido → expirado → esgotado → pedido mínimo → primeira compra.
 *
 * `string | null` e não união por booleano: com `strictNullChecks` desligado aquela não estreita.
 */
export function couponRefusal(coupon: CouponRow, ctx: CouponContext): string | null {
  if (!coupon.active) return 'Cupom desativado.'
  if (coupon.valid_from && new Date(coupon.valid_from) > ctx.now) return 'Cupom ainda não está válido.'
  if (coupon.valid_until && new Date(coupon.valid_until) < ctx.now) return 'Cupom expirado.'
  if (coupon.max_uses != null && coupon.used_count >= coupon.max_uses) return 'Cupom esgotado.'
  const min = coupon.min_order || 0
  if (ctx.subtotal < min) return minOrderRefusal(min)
  if (coupon.first_order_only && ctx.hasPriorOrder === true) {
    return 'Cupom válido apenas no primeiro pedido.'
  }
  return null
}

/** A forma mínima que `resolveOrderPricing` precisa conhecer do cupom. */
export function couponRuleOf(coupon: Pick<CouponRow, 'type' | 'value'>): CouponRule {
  return { type: coupon.type, value: Number(coupon.value) }
}
