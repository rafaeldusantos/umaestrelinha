// O status que a dona da loja lê na listagem de cupons (feature 18 / T10, DSC-06 AC 3-5).
//
// Eram DOIS estados vermelhos e um verde. `Expirado` e `Esgotado` saíam os dois em `destructive`, e
// isso não é detalhe de paleta: **a ação para cada um é diferente**. O esgotado se reabre subindo o
// limite de usos; o expirado se prorroga mudando a vigência. Duas doenças, dois remédios, uma cor só —
// a tela obrigava a abrir o cupom para descobrir qual era.
//
// A precedência é deliberada. `!active` vence tudo porque é a única decisão EXPLÍCITA da dona: um
// cupom que ela desligou não deve aparecer como "expirado" só porque a data também passou — ele está
// desligado, e reativá-lo é o gesto que ela tentaria. Depois vem a vigência (o mundo mudou sozinho) e
// por fim o teto de usos (a loja consumiu).

import type { Coupon } from '@nanapin/supabase/types/coupon'

export type CouponStatus = 'active' | 'inactive' | 'expired' | 'exhausted'

export const isExhausted = (coupon: Coupon): boolean =>
  coupon.max_uses != null && (coupon.used_count ?? 0) >= coupon.max_uses

export const couponStatus = (coupon: Coupon, now = new Date()): CouponStatus => {
  if (!coupon.active) return 'inactive'
  if (coupon.valid_until && new Date(coupon.valid_until) < now) return 'expired'
  if (isExhausted(coupon)) return 'exhausted'
  return 'active'
}

export interface CouponStats {
  /** O MESMO veredito da coluna Status — não a coluna `active` crua (AC 3). */
  active: number
  total: number
  /** Cupons que precisam de uma decisão: expirados + esgotados. */
  needsAttention: number
  totalUses: number
}

/**
 * Os três cartões do topo.
 *
 * Antes desta feature `AdminCouponsPage` calculava `total`, `active` e `totalUses` a cada render e não
 * renderizava nenhum dos três — e o `active` contava `coupon.active` cru, o que teria inflado o cartão
 * com cupons expirados e esgotados que a tabela ao lado mostra como Expirado e Esgotado.
 */
export const couponStats = (coupons: Coupon[], now = new Date()): CouponStats => {
  let active = 0
  let needsAttention = 0
  let totalUses = 0
  for (const coupon of coupons) {
    const status = couponStatus(coupon, now)
    if (status === 'active') active += 1
    if (status === 'expired' || status === 'exhausted') needsAttention += 1
    totalUses += coupon.used_count ?? 0
  }
  return { active, total: coupons.length, needsAttention, totalUses }
}
