import { describe, expect, it } from 'vitest'
import { couponRefusal, couponRuleOf, type CouponRow } from '../rules.ts'

// MON-07 / PRC-01: a mesma regra do cupom no navegador da loja, no painel e no servidor. Os textos e
// a ordem são os da loja de antes da feature 89 (`validateCoupon`), escritos aqui por extenso.

const NOW = new Date('2026-10-31T12:00:00Z')

const cupom = (over: Partial<CouponRow> = {}): CouponRow => ({
  type: 'percent',
  value: 10,
  active: true,
  valid_from: null,
  valid_until: null,
  max_uses: null,
  used_count: 0,
  min_order: 0,
  first_order_only: false,
  ...over,
})

const ctx = { subtotal: 100, now: NOW }

describe('couponRefusal — cada recusa, com o texto da loja', () => {
  it('cupom válido: null', () => {
    expect(couponRefusal(cupom(), ctx)).toBeNull()
  })

  it('desativado', () => {
    expect(couponRefusal(cupom({ active: false }), ctx)).toBe('Cupom desativado.')
  })

  it('ainda não válido (valid_from no futuro)', () => {
    expect(couponRefusal(cupom({ valid_from: '2026-11-01T00:00:00Z' }), ctx)).toBe(
      'Cupom ainda não está válido.',
    )
  })

  it('expirado (valid_until no passado)', () => {
    expect(couponRefusal(cupom({ valid_until: '2026-10-30T23:59:59Z' }), ctx)).toBe('Cupom expirado.')
  })

  it('limites de data exatamente no instante: ainda vale', () => {
    const iso = NOW.toISOString()
    expect(couponRefusal(cupom({ valid_from: iso, valid_until: iso }), ctx)).toBeNull()
  })

  it('esgotado (used_count alcança max_uses)', () => {
    expect(couponRefusal(cupom({ max_uses: 5, used_count: 5 }), ctx)).toBe('Cupom esgotado.')
    expect(couponRefusal(cupom({ max_uses: 5, used_count: 4 }), ctx)).toBeNull()
  })

  it('max_uses 0 já é esgotado (nulo é que é ilimitado)', () => {
    expect(couponRefusal(cupom({ max_uses: 0, used_count: 0 }), ctx)).toBe('Cupom esgotado.')
    expect(couponRefusal(cupom({ max_uses: null, used_count: 999 }), ctx)).toBeNull()
  })

  it('pedido mínimo, com vírgula decimal', () => {
    expect(couponRefusal(cupom({ min_order: 150 }), ctx)).toBe('Pedido mínimo de R$ 150,00.')
    expect(couponRefusal(cupom({ min_order: 99.9 }), { ...ctx, subtotal: 99.89 })).toBe(
      'Pedido mínimo de R$ 99,90.',
    )
    expect(couponRefusal(cupom({ min_order: 100 }), ctx)).toBeNull()
  })

  it('min_order nulo não recusa', () => {
    expect(couponRefusal(cupom({ min_order: null }), { ...ctx, subtotal: 0 })).toBeNull()
  })

  it('primeira compra: só recusa quando se sabe que o e-mail já comprou', () => {
    const c = cupom({ first_order_only: true })
    expect(couponRefusal(c, { ...ctx, hasPriorOrder: true })).toBe(
      'Cupom válido apenas no primeiro pedido.',
    )
    expect(couponRefusal(c, { ...ctx, hasPriorOrder: false })).toBeNull()
    expect(couponRefusal(c, { ...ctx, hasPriorOrder: null })).toBeNull()
    expect(couponRefusal(c, ctx)).toBeNull()
  })

  it('compra anterior não importa para cupom que não é de primeira compra', () => {
    expect(couponRefusal(cupom(), { ...ctx, hasPriorOrder: true })).toBeNull()
  })
})

describe('couponRefusal — a ordem das recusas é a de hoje', () => {
  const tudoErrado = cupom({
    active: false,
    valid_from: '2027-01-01T00:00:00Z',
    valid_until: '2026-01-01T00:00:00Z',
    max_uses: 1,
    used_count: 1,
    min_order: 1000,
    first_order_only: true,
  })
  const comAnterior = { ...ctx, hasPriorOrder: true }

  it.each([
    ['desativado vence tudo', {}, 'Cupom desativado.'],
    ['depois, ainda não válido', { active: true }, 'Cupom ainda não está válido.'],
    ['depois, expirado', { active: true, valid_from: null }, 'Cupom expirado.'],
    ['depois, esgotado', { active: true, valid_from: null, valid_until: null }, 'Cupom esgotado.'],
    [
      'depois, pedido mínimo',
      { active: true, valid_from: null, valid_until: null, max_uses: null },
      'Pedido mínimo de R$ 1000,00.',
    ],
    [
      'por último, primeira compra',
      { active: true, valid_from: null, valid_until: null, max_uses: null, min_order: 0 },
      'Cupom válido apenas no primeiro pedido.',
    ],
  ])('%s', (_, over, esperado) => {
    expect(couponRefusal({ ...tudoErrado, ...over }, comAnterior)).toBe(esperado)
  })
})

describe('couponRuleOf', () => {
  it('leva só tipo e valor, com o valor numérico (a coluna numeric chega como texto às vezes)', () => {
    expect(couponRuleOf({ type: 'fixed', value: '15.5' as unknown as number })).toEqual({
      type: 'fixed',
      value: 15.5,
    })
    expect(couponRuleOf(cupom({ type: 'free_shipping', value: 0 }))).toEqual({
      type: 'free_shipping',
      value: 0,
    })
  })
})
