import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Product } from '@nanapin/supabase/types'
import type { ProgressivePromotion } from '@nanapin/core/payment/pricing'
import { useCouponStore } from '@/entities/coupon'
import { useCartStore } from '../cartStore'

// PRM-15 / PRM-23: o que as faixas fazem com a sacola, e o convite da próxima faixa.
//
// Os números da faixa alcançada são os MESMOS que o teste do servidor afirma
// (`supabase/functions/mercado-pago/__tests__/handlers.test.ts` — 3 unidades a R$ 8,90 numa faixa
// `unit_price` de R$ 5,00 ⇒ subtotal R$ 15,00, desconto R$ 11,70). É a invariante "exibido ==
// cobrado" olhada do lado da loja.

const active: { data: ProgressivePromotion[] } = { data: [] }

vi.mock('@nanapin/core/hooks/usePromotions', () => ({
  useActivePromotions: () => ({ data: active.data, isLoading: false }),
}))

import { useCartPromotion } from '../useCartPromotion'

const PROMO_ID = 'promo-kit'

const promotion = (overrides: Partial<ProgressivePromotion> = {}): ProgressivePromotion => ({
  id: PROMO_ID,
  discount_kind: 'unit_price',
  tiers: [{ min_qty: 3, value: 5 }],
  scope: 'all',
  eligibleProductIds: [],
  stacks_with_coupon: false,
  created_at: '2026-08-01T00:00:00.000Z',
  ...overrides,
})

const product = (overrides: Partial<Product> = {}): Product =>
  ({
    id: 'p1',
    name: 'Pin Naruto',
    slug: 'pin-naruto',
    price: 8.9,
    images: [],
    tags: [],
    ...overrides,
  }) as unknown as Product

const setCart = (lines: { product?: Product; quantity: number; unitPrice?: number }[]) =>
  useCartStore.setState({
    items: lines.map((line) => {
      const p = line.product ?? product()
      return {
        product: p,
        size: '',
        finish: '',
        variantId: null,
        variantLabel: '',
        optionValues: {},
        unitPrice: line.unitPrice ?? p.price,
        quantity: line.quantity,
      }
    }),
  })

const promo = () => renderHook(() => useCartPromotion()).result

beforeEach(() => {
  active.data = []
  useCartStore.setState({ items: [] })
  useCouponStore.getState().clearCoupon()
  localStorage.clear()
})

describe('useCartPromotion — sacola vazia', () => {
  it('desconto zero, nenhuma promoção aplicada e nenhum convite', () => {
    active.data = [promotion()]

    const result = promo()

    expect(result.current.promotionDiscount).toBe(0)
    expect(result.current.applied).toEqual([])
    expect(result.current.nextTier).toBeNull()
    expect(result.current.winner).toBe('none')
    expect(result.current.discarded).toBeNull()
  })
})

describe('useCartPromotion — faixa alcançada', () => {
  it('3 unidades a R$ 8,90 numa faixa de R$ 5,00 descontam R$ 11,70 e o subtotal vira R$ 15,00', () => {
    active.data = [promotion()]
    setCart([{ quantity: 3 }])

    const result = promo()

    expect(result.current.promotionDiscount).toBe(11.7)
    expect(result.current.totals.subtotal).toBe(15)
    expect(result.current.applied).toEqual([{ promotion_id: PROMO_ID, tier_min_qty: 3 }])
    expect(result.current.winner).toBe('promotion')
  })

  it('sem nenhuma promoção vigente o subtotal é o cheio e o desconto é zero', () => {
    setCart([{ quantity: 3 }])

    const result = promo()

    expect(result.current.promotionDiscount).toBe(0)
    expect(result.current.totals.subtotal).toBe(26.7)
    expect(result.current.nextTier).toBeNull()
  })

  it('faixa não alcançada não desconta nada', () => {
    active.data = [promotion()]
    setCart([{ quantity: 2 }])

    const result = promo()

    expect(result.current.promotionDiscount).toBe(0)
    expect(result.current.applied).toEqual([])
    expect(result.current.totals.subtotal).toBe(17.8)
  })

  /**
   * Edge case explícito da spec: com grade, a faixa incide sobre o preço da **variação**.
   *
   * O fixture faz `unitPrice` (R$ 6,50) divergir de `product.price` (R$ 8,90) de propósito: enquanto
   * os dois valem o mesmo — o default de `setCart` — ler o campo errado é indistinguível, e foi assim
   * que `useCheckoutTotals` ficou meses somando o base enquanto este hook somava o da linha. Os
   * mesmos números estão no par do servidor (`handlers.test.ts`, faixa sobre item `price_source:
   * 'variant'`) e no do checkout (`useCheckoutTotals.test.tsx`).
   */
  it('com preço de variação, a faixa incide sobre ele e não sobre o base_price', () => {
    active.data = [promotion()]
    setCart([{ quantity: 3, unitPrice: 6.5 }])

    const result = promo()

    // 3 × 6,50 = 19,50 cheio; a faixa põe cada unidade a 5,00 ⇒ 15,00 ⇒ desconto 4,50.
    // Pelo `product.price` (8,90) o desconto seria 11,70 — o número que produz o 422 de PRM-12.
    expect(result.current.promotionDiscount).toBe(4.5)
    expect(result.current.totals.subtotal).toBe(15)
    expect(result.current.applied).toEqual([{ promotion_id: PROMO_ID, tier_min_qty: 3 }])
  })

  it('escopo por categoria sem o produto na lista de elegíveis não desconta', () => {
    active.data = [promotion({ scope: 'categories', eligibleProductIds: ['outro'] })]
    setCart([{ quantity: 3 }])

    const result = promo()

    expect(result.current.promotionDiscount).toBe(0)
    expect(result.current.nextTier).toBeNull()
  })

  it('remover unidade abaixo da faixa recalcula e zera o desconto', () => {
    active.data = [promotion()]
    setCart([{ quantity: 3 }])

    const { result } = renderHook(() => useCartPromotion())
    expect(result.current.promotionDiscount).toBe(11.7)

    act(() => setCart([{ quantity: 2 }]))

    expect(result.current.promotionDiscount).toBe(0)
  })
})

describe('useCartPromotion — convite para a próxima faixa (PRM-23)', () => {
  it('com 2 unidades numa faixa que começa em 3, falta 1 e a unidade sai a R$ 5,00', () => {
    active.data = [promotion()]
    setCart([{ quantity: 2 }])

    const result = promo()

    expect(result.current.nextTier).toEqual({ missing: 1, unitPrice: 5 })
  })

  it('com a faixa de 3 alcançada, o convite passa a ser a de 5', () => {
    active.data = [
      promotion({
        tiers: [
          { min_qty: 3, value: 5 },
          { min_qty: 5, value: 4.6 },
        ],
      }),
    ]
    setCart([{ quantity: 3 }])

    const result = promo()

    expect(result.current.nextTier).toEqual({ missing: 2, unitPrice: 4.6 })
  })

  it('na última faixa não há convite', () => {
    active.data = [promotion()]
    setCart([{ quantity: 3 }])

    const result = promo()

    expect(result.current.nextTier).toBeNull()
  })

  it('faixa em `percent` convida com o preço que a mesma função pura produz (40% de 8,90)', () => {
    active.data = [promotion({ discount_kind: 'percent', tiers: [{ min_qty: 3, value: 40 }] })]
    setCart([{ quantity: 2 }])

    const result = promo()

    expect(result.current.nextTier).toEqual({ missing: 1, unitPrice: 5.34 })
  })

  it('o convite parte do preço da VARIAÇÃO quando a linha tem um', () => {
    active.data = [promotion({ discount_kind: 'percent', tiers: [{ min_qty: 3, value: 40 }] })]
    setCart([{ quantity: 2, unitPrice: 6.5 }])

    const result = promo()

    // 40% de 6,50 = 3,90. Pelo `product.price` (8,90) o convite prometeria 5,34 — um preço que o
    // servidor não cobraria, porque ele reprecifica pela variação.
    expect(result.current.nextTier).toEqual({ missing: 1, unitPrice: 3.9 })
  })

  it('o convite usa o maior preço elegível, para não prometer menos do que algum item custará', () => {
    active.data = [promotion({ discount_kind: 'percent', tiers: [{ min_qty: 3, value: 50 }] })]
    setCart([
      { quantity: 1 },
      { product: product({ id: 'p2', price: 20 }), quantity: 1 },
    ])

    const result = promo()

    // 50% de 20,00 = 10,00 (e não 4,45, que é o que sairia do item de R$ 8,90)
    expect(result.current.nextTier).toEqual({ missing: 1, unitPrice: 10 })
  })
})

describe('useCartPromotion — promoção contra cupom (D2)', () => {
  const applyCoupon = (
    overrides: Partial<{ type: 'percent' | 'fixed' | 'free_shipping'; value: number }> = {},
  ) =>
    useCouponStore.getState().setCoupon({
      id: 'c1',
      code: 'BEMVINDA',
      type: 'percent',
      value: 10,
      discount: 0,
      freeShipping: false,
      ...overrides,
    })

  it('cupom que desconta mais vence, e a promoção fica sem desconto nenhum', () => {
    active.data = [promotion()]
    setCart([{ quantity: 3 }])
    applyCoupon({ type: 'fixed', value: 20 })

    const result = promo()

    // 26,70 − 20,00 = 6,70 contra os R$ 15,00 da faixa
    expect(result.current.winner).toBe('coupon')
    expect(result.current.discarded).toBe('promotion')
    expect(result.current.promotionDiscount).toBe(0)
    expect(result.current.totals.total).toBe(6.7)
  })

  it('promoção que desconta mais vence, e o cupom não é aplicado', () => {
    active.data = [promotion()]
    setCart([{ quantity: 3 }])
    applyCoupon({ type: 'percent', value: 10 })

    const result = promo()

    expect(result.current.winner).toBe('promotion')
    expect(result.current.discarded).toBe('coupon')
    expect(result.current.totals.couponDiscount).toBe(0)
    expect(result.current.totals.total).toBe(15)
  })

  it('com `stacks_with_coupon` os dois incidem e nada é descartado', () => {
    active.data = [promotion({ stacks_with_coupon: true })]
    setCart([{ quantity: 3 }])
    applyCoupon({ type: 'percent', value: 10 })

    const result = promo()

    expect(result.current.winner).toBe('both')
    expect(result.current.discarded).toBeNull()
    expect(result.current.promotionDiscount).toBe(11.7)
    expect(result.current.totals.couponDiscount).toBe(1.5)
    expect(result.current.totals.total).toBe(13.5)
  })

  it('cupom que come o subtotal inteiro não quebra a gaveta', () => {
    active.data = [promotion()]
    setCart([{ quantity: 3 }])
    applyCoupon({ type: 'fixed', value: 26.7 })

    const result = promo()

    expect(result.current.promotionDiscount).toBe(0)
    expect(result.current.nextTier).toBeNull()
  })
})
