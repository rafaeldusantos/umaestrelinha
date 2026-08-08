// Feature 18 / T10 — DSC-06 AC 3-5.

import { describe, expect, it } from 'vitest'
import type { Coupon } from '@nanapin/supabase/types/coupon'
import { couponStats, couponStatus, isExhausted } from './couponStatus'

const NOW = new Date('2026-08-03T12:00:00.000Z')

const coupon = (over: Partial<Coupon> = {}): Coupon =>
  ({
    id: 'cup-1',
    code: 'NANA10',
    description: null,
    type: 'percent',
    value: 10,
    min_order: 0,
    max_uses: null,
    used_count: 0,
    first_order_only: false,
    active: true,
    valid_from: null,
    valid_until: null,
    created_at: '2026-08-01T00:00:00.000Z',
    updated_at: '2026-08-01T00:00:00.000Z',
    ...over,
  }) as Coupon

describe('couponStatus — os quatro estados', () => {
  it('ativo, dentro da vigência e com uso disponível', () => {
    expect(couponStatus(coupon(), NOW)).toBe('active')
    expect(couponStatus(coupon({ max_uses: 40, used_count: 12 }), NOW)).toBe('active')
    expect(couponStatus(coupon({ valid_until: '2026-09-30T00:00:00.000Z' }), NOW)).toBe('active')
  })

  it('desligado é `inactive`', () => {
    expect(couponStatus(coupon({ active: false }), NOW)).toBe('inactive')
  })

  it('vigência vencida é `expired`', () => {
    expect(couponStatus(coupon({ valid_until: '2026-07-31T00:00:00.000Z' }), NOW)).toBe('expired')
  })

  it('teto de usos batido é `exhausted` — e não `expired`', () => {
    expect(couponStatus(coupon({ max_uses: 40, used_count: 40 }), NOW)).toBe('exhausted')
    // São doenças diferentes, com remédios diferentes: subir o limite vs. prorrogar a data.
    expect(couponStatus(coupon({ max_uses: 40, used_count: 40 }), NOW)).not.toBe('expired')
  })

  it('usos acima do teto (corrida no checkout) também é `exhausted`', () => {
    expect(couponStatus(coupon({ max_uses: 40, used_count: 41 }), NOW)).toBe('exhausted')
  })

  it('desligado vence expirado e esgotado — é a única decisão explícita da dona', () => {
    const desligadoEVencido = coupon({
      active: false,
      valid_until: '2026-07-31T00:00:00.000Z',
      max_uses: 40,
      used_count: 40,
    })

    expect(couponStatus(desligadoEVencido, NOW)).toBe('inactive')
  })

  it('sem teto, nunca esgota', () => {
    expect(isExhausted(coupon({ max_uses: null, used_count: 9999 }))).toBe(false)
  })
})

describe('couponStats — os três cartões (AC 2-3)', () => {
  const coupons = [
    coupon({ id: 'a', used_count: 12 }),
    coupon({ id: 'b', used_count: 96 }),
    coupon({ id: 'c', active: false, used_count: 0 }),
    coupon({ id: 'd', max_uses: 40, used_count: 40 }),
    coupon({ id: 'e', valid_until: '2026-07-31T00:00:00.000Z', used_count: 0 }),
  ]

  it('conta como ativo o MESMO veredito da coluna Status, não `active` cru', () => {
    const stats = couponStats(coupons, NOW)

    // `active = true` em quatro linhas (a, b, d, e); vigentes de verdade, só duas.
    expect(coupons.filter(c => c.active)).toHaveLength(4)
    expect(stats.active).toBe(2)
  })

  it('total é o cadastrado, e usos somam o histórico de todos', () => {
    const stats = couponStats(coupons, NOW)

    expect(stats.total).toBe(5)
    expect(stats.totalUses).toBe(148)
  })

  it('`pedem decisão` junta expirados e esgotados', () => {
    expect(couponStats(coupons, NOW).needsAttention).toBe(2)
  })

  it('sem cupom nenhum, tudo zero — e nada de dividir por zero', () => {
    expect(couponStats([], NOW)).toEqual({
      active: 0,
      total: 0,
      needsAttention: 0,
      totalUses: 0,
    })
  })
})
