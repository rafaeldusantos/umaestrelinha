import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook } from '@testing-library/react'
import type { Product } from '@nanapin/supabase/types'
import type { ProgressivePromotion } from '@nanapin/core/payment/pricing'
import { useCartStore } from '@/entities/cart'
import { useCouponStore } from '@/entities/coupon'
import { useProductById } from '@/entities/product'
import { useCheckoutStore } from '../checkoutStore'
import { useCheckoutTotals } from '../useCheckoutTotals'

/* eslint-disable @typescript-eslint/no-explicit-any */

// RSM-06: a sub-linha "no cartão: Nx de R$ Y" precisa de um total que o cartão realmente pratica.
// Os dois números do board `04` (R$ 46,55 e 3x de R$ 16,34 = R$ 49,02) não descendem um do outro:
// o primeiro tem desconto PIX, o segundo não. Daí `cardTotal` ser uma conta própria — pela MESMA
// `resolveOrderPricing` do servidor, forçando `method: 'card'`.
//
// PRM-16/PRM-17/PRM-18: o valor do CTA tem de ser, ao centavo, o que a edge function cobra para o
// mesmo pedido — e a escolha entre promoção e cupom é pelo TOTAL FINAL, não pelo desconto.

vi.mock('@/entities/product/api/useProducts', () => ({ useProductById: vi.fn() }))

const active: { data: (ProgressivePromotion & { name: string })[] } = { data: [] }
vi.mock('@nanapin/core/hooks/usePromotions', () => ({
  useActivePromotions: () => ({ data: active.data, isLoading: false }),
}))

const paymentSettings = { pix_discount_percent: 5 }
const checkoutSettings = {
  order_bump_enabled: false,
  order_bump_product_id: null as string | null,
  order_bump_discount_percent: 50,
}
vi.mock('@nanapin/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => paymentSettings,
  useCheckoutSettings: () => checkoutSettings,
}))

const product = (): Product =>
  ({
    id: 'p1',
    name: 'Pin Gojo Satoru',
    slug: 'pin-gojo',
    price: 50,
    images: [],
    tags: [],
  }) as unknown as Product

const totals = () => renderHook(() => useCheckoutTotals()).result.current

beforeEach(() => {
  useCheckoutStore.getState().reset()
  useCouponStore.getState().clearCoupon()
  sessionStorage.clear()
  localStorage.clear()
  active.data = []
  paymentSettings.pix_discount_percent = 5
  checkoutSettings.order_bump_enabled = false
  vi.mocked(useProductById).mockReturnValue({ data: null, isError: false } as any)
  useCartStore.setState({
    items: [
      {
        product: product(),
        quantity: 2,
        size: '',
        finish: '',
        variantId: null,
        variantLabel: '',
        optionValues: {},
        unitPrice: 50,
      },
    ],
  })
  useCheckoutStore.getState().setShipping({
    serviceId: '1',
    serviceName: 'PAC',
    carrier: 'Correios',
    cost: 10,
    estimateMin: '2026-08-04',
    estimateMax: '2026-08-06',
  })
})

describe('useCheckoutTotals — cardTotal (RSM-06)', () => {
  it('com PIX selecionado, cardTotal é MAIOR que o total exibido — é o total sem o desconto', () => {
    useCheckoutStore.getState().setPayment({ method: 'pix' })

    const t = totals()

    // 100 + 10 = 110 no cartão; 110 − 5 (5% sobre 100) = 105 no PIX.
    expect(t.totals.total).toBe(105)
    expect(t.cardTotal).toBe(110)
    expect(t.cardTotal).toBeGreaterThan(t.totals.total)
  })

  it('com cartão selecionado, cardTotal é o próprio total exibido', () => {
    useCheckoutStore.getState().setPayment({ method: 'card' })

    const t = totals()

    expect(t.cardTotal).toBe(t.totals.total)
    expect(t.cardTotal).toBe(110)
  })

  it('sem desconto PIX configurado os dois valores coincidem, mesmo no PIX', () => {
    paymentSettings.pix_discount_percent = 0
    useCheckoutStore.getState().setPayment({ method: 'pix' })

    const t = totals()

    expect(t.cardTotal).toBe(t.totals.total)
  })

  it('sem método escolhido o total já é o do cartão', () => {
    const t = totals()

    expect(t.method).toBeNull()
    expect(t.cardTotal).toBe(t.totals.total)
  })
})

// A fixture é a MESMA que o teste do servidor afirma em
// `supabase/functions/mercado-pago/__tests__/handlers.test.ts` ("faixa alcançada em escopo `all`: as
// 3 unidades saem a R$ 5,00 (26,70 → 15,00)", com `promotion_discount: 11.7`). Se os dois lados
// divergirem, um destes números muda e o teste cai — é a invariante "exibido == cobrado" olhada do
// lado da loja.
const KIT_PROMOTION: ProgressivePromotion & { name: string } = {
  id: 'promo-kit',
  name: 'Kit de bottons',
  discount_kind: 'unit_price',
  tiers: [{ min_qty: 3, value: 5 }],
  scope: 'all',
  eligibleProductIds: [],
  stacks_with_coupon: false,
  created_at: '2026-08-01T00:00:00.000Z',
}

/** 3 unidades a R$ 8,90 — o pedido do teste do servidor. */
const threeBottons = () =>
  useCartStore.setState({
    items: [
      {
        product: { ...product(), id: 'p1', price: 8.9 },
        quantity: 3,
        size: '',
        finish: '',
        variantId: null,
        variantLabel: '',
        optionValues: {},
        unitPrice: 8.9,
      },
    ],
  })

/**
 * O MESMO pedido, mas com grade: `base_price` R$ 8,90 e a variação escolhida a R$ 6,50.
 *
 * A divergência é o ponto do fixture. Enquanto `product.price` **e** `unitPrice` valem o mesmo, ler o
 * campo errado é indistinguível — foi assim que o hook ficou meses somando o preço base enquanto a
 * gaveta (`useCartPromotion`) e o servidor (`resolveItemPrice`, `price_source: 'variant'`) somavam o
 * da variação.
 */
const threeBottonsWithVariant = () =>
  useCartStore.setState({
    items: [
      {
        product: { ...product(), id: 'p1', price: 8.9 },
        quantity: 3,
        size: '',
        finish: '',
        variantId: 'v1',
        variantLabel: '4,5 cm · Fosco',
        optionValues: {},
        unitPrice: 6.5,
      },
    ],
  })

describe('useCheckoutTotals — exibido == cobrado (PRM-16)', () => {
  beforeEach(() => {
    threeBottons()
    useCheckoutStore.getState().setShipping({
      serviceId: '1',
      serviceName: 'PAC',
      carrier: 'Correios',
      cost: 0,
      estimateMin: '2026-08-04',
      estimateMax: '2026-08-06',
    })
    paymentSettings.pix_discount_percent = 0
  })

  it('3 unidades a R$ 8,90 na faixa de R$ 5,00 dão subtotal R$ 15,00 e desconto R$ 11,70', () => {
    active.data = [KIT_PROMOTION]

    const t = totals()

    expect(t.totals.subtotal).toBe(15)
    expect(t.promotionDiscount).toBe(11.7)
    expect(t.totals.total).toBe(15)
    expect(t.winner).toBe('promotion')
    expect(t.promotionName).toBe('Kit de bottons')
    // PRM-15: o resumo exibe o subtotal CHEIO, com o desconto na linha própria (a forma da gaveta).
    expect(t.subtotalBeforePromotion).toBe(26.7)
  })

  it('sem promoção vigente o subtotal é o cheio — nenhum chamador antigo muda de comportamento', () => {
    const t = totals()

    expect(t.totals.subtotal).toBe(26.7)
    expect(t.subtotalBeforePromotion).toBe(26.7)
    expect(t.promotionDiscount).toBe(0)
    expect(t.winner).toBe('none')
    expect(t.promotionName).toBeNull()
    expect(t.discarded).toBeNull()
  })

  // -----------------------------------------------------------------------------------------------
  // Edge case explícito da spec: "WHEN um item elegível tem preço por variação THEN a faixa SHALL
  // incidir sobre o preço da VARIAÇÃO resolvido por `resolveItemPrice`, não sobre `base_price`".
  //
  // O par no servidor é `handlers.test.ts` → 'faixa sobre item com preço de VARIAÇÃO…', com os MESMOS
  // números (variação R$ 6,50, faixa R$ 5,00 ⇒ subtotal 15,00 e `promotion_discount` 4,50) e com
  // `orders.promotion_discount: 4.5` — o número que ESTA tela grava — passando pela guarda de teto sem
  // 422. Ler `product.price` aqui daria 11,70, e 11,70 > 4,50 é exatamente o 422 espúrio.
  // -----------------------------------------------------------------------------------------------
  it('a faixa incide sobre o preço da VARIAÇÃO, não sobre o base_price', () => {
    active.data = [KIT_PROMOTION]
    threeBottonsWithVariant()

    const t = totals()

    // 3 × 6,50 = 19,50 cheio; a faixa põe cada unidade a 5,00 ⇒ 15,00.
    expect(t.subtotalBeforePromotion).toBe(19.5)
    expect(t.totals.subtotal).toBe(15)
    expect(t.totals.total).toBe(15)
    // O número que a `CheckoutPage` grava em `orders.promotion_discount`. Com o preço base seriam
    // 11,70 — maior que o 4,50 que o servidor recalcula, e a cliente não conseguiria pagar.
    expect(t.promotionDiscount).toBe(4.5)
    // E é o item da linha que manda: os `pricingItems` que vão ao pedido saem de `unitPrice`.
    expect(t.pricingItems).toEqual([{ product_id: 'p1', unit_price: 6.5, quantity: 3 }])
  })

  it('sem promoção, o subtotal da variação também é o da linha e não o do base_price', () => {
    threeBottonsWithVariant()

    const t = totals()

    // 3 × 6,50 = 19,50. Com o base seriam 26,70 — R$ 7,20 que a cliente veria e não pagaria.
    expect(t.totals.subtotal).toBe(19.5)
    expect(t.totals.total).toBe(19.5)
    expect(t.promotionDiscount).toBe(0)
  })

  it('faixa não alcançada não desconta e não nomeia campanha nenhuma', () => {
    active.data = [KIT_PROMOTION]
    useCartStore.setState({
      items: [{ ...useCartStore.getState().items[0], quantity: 2 }],
    })

    const t = totals()

    expect(t.promotionDiscount).toBe(0)
    expect(t.totals.subtotal).toBe(17.8)
    expect(t.promotionName).toBeNull()
  })
})

describe('useCheckoutTotals — promoção contra cupom pelo TOTAL FINAL (PRM-17, D2)', () => {
  const setCoupon = (
    patch: Partial<{ code: string; type: 'percent' | 'fixed' | 'free_shipping'; value: number; freeShipping: boolean }>,
  ) =>
    useCouponStore.getState().setCoupon({
      id: 'c1',
      code: 'BEMVINDA',
      type: 'percent',
      value: 10,
      discount: 0,
      freeShipping: false,
      ...patch,
    } as any)

  beforeEach(() => {
    threeBottons()
    paymentSettings.pix_discount_percent = 0
    active.data = [KIT_PROMOTION]
  })

  const quote = (cost: number) =>
    useCheckoutStore.getState().setShipping({
      serviceId: '1',
      serviceName: 'PAC',
      carrier: 'Correios',
      cost,
      estimateMin: '2026-08-04',
      estimateMax: '2026-08-06',
    })

  it('a promoção que desconta mais vence e o cupom é nomeado como descartado', () => {
    quote(0)
    setCoupon({ type: 'percent', value: 10 })

    const t = totals()

    // 15,00 (faixa) contra 24,03 (26,70 − 10%)
    expect(t.winner).toBe('promotion')
    expect(t.discarded).toBe('coupon')
    expect(t.couponDiscount).toBe(0)
    expect(t.totals.total).toBe(15)
  })

  it('o cupom que desconta mais vence e a promoção é a descartada', () => {
    quote(0)
    setCoupon({ type: 'fixed', value: 20 })

    const t = totals()

    // 6,70 (26,70 − 20,00) contra 15,00 da faixa
    expect(t.winner).toBe('coupon')
    expect(t.discarded).toBe('promotion')
    expect(t.promotionDiscount).toBe(0)
    expect(t.totals.total).toBe(6.7)
    // O nome sobrevive à derrota: é ele que a frase do resumo usa.
    expect(t.promotionName).toBe('Kit de bottons')
  })

  it('cupom de frete grátis vence a promoção quando o frete cotado é maior que a faixa', () => {
    quote(24.8)
    setCoupon({ code: 'FRETEGRATIS', type: 'free_shipping', value: 0, freeShipping: true })

    const t = totals()

    // cupom: 26,70 + 0 de frete = 26,70 · promoção: 15,00 + 24,80 = 39,80
    // Zerar o frete AQUI antes de chamar `resolveOrderPricing` faria o cupom valer nada na
    // comparação, e a promoção venceria cobrando R$ 13,10 a mais.
    expect(t.winner).toBe('coupon')
    expect(t.discarded).toBe('promotion')
    expect(t.totals.shipping).toBe(0)
    expect(t.shippingCost).toBe(0)
    expect(t.totals.total).toBe(26.7)
  })

  it('cupom de frete grátis PERDE quando o frete cotado é menor que a faixa', () => {
    quote(9.9)
    setCoupon({ code: 'FRETEGRATIS', type: 'free_shipping', value: 0, freeShipping: true })

    const t = totals()

    // cupom: 26,70 · promoção: 15,00 + 9,90 = 24,90
    expect(t.winner).toBe('promotion')
    expect(t.totals.total).toBe(24.9)
    // O frete volta a ser o cotado, porque o cupom que o zerava foi descartado.
    expect(t.totals.shipping).toBe(9.9)
  })

  it('com `stacks_with_coupon` os dois incidem e nada é descartado (PRM-18)', () => {
    quote(0)
    active.data = [{ ...KIT_PROMOTION, stacks_with_coupon: true }]
    setCoupon({ type: 'percent', value: 10 })

    const t = totals()

    expect(t.winner).toBe('both')
    expect(t.discarded).toBeNull()
    expect(t.promotionDiscount).toBe(11.7)
    expect(t.couponDiscount).toBe(1.5)
    expect(t.totals.total).toBe(13.5)
  })
})
