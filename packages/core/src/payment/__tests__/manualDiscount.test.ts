import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  calculateOrderTotals,
  resolveManualDiscount,
  resolveOrderPricing,
  type OrderPricingInput,
  type ProgressivePromotion,
} from '../pricing'

// Feature 89, PRC-04: o desconto avulso (combinado no WhatsApp) entra DEPOIS de promoção e cupom,
// sobre o subtotal dos itens, nunca deixando-o negativo, e ANTES do PIX. Os números de cada caso
// foram feitos à mão a partir da AC, não lidos da implementação.

const KIT_5: ProgressivePromotion = {
  id: 'promo-kit',
  discount_kind: 'unit_price',
  tiers: [{ min_qty: 5, value: 4.6 }],
  scope: 'all',
  eligibleProductIds: [],
  stacks_with_coupon: false,
  created_at: '2026-08-01T00:00:00Z',
}

const input = (over: Partial<OrderPricingInput> = {}): OrderPricingInput => ({
  items: [{ product_id: 'joia', unit_price: 100, quantity: 1 }],
  shipping: 0,
  pixDiscountPercent: 0,
  method: 'card',
  coupon: null,
  promotions: [],
  ...over,
})

describe('resolveManualDiscount — o valor do avulso sobre a base', () => {
  it('em reais: o valor, arredondado a centavo', () => {
    expect(resolveManualDiscount(100, { kind: 'amount', value: 20 })).toBe(20)
    expect(resolveManualDiscount(100, { kind: 'amount', value: 20.004 })).toBe(20)
  })

  it('em percentual: sobre a base, arredondado a centavo', () => {
    // 89,70 × 10% = 8,97 · 89,70 × 33,33% = 29,897… ⇒ 29,90
    expect(resolveManualDiscount(89.7, { kind: 'percent', value: 10 })).toBe(8.97)
    expect(resolveManualDiscount(89.7, { kind: 'percent', value: 33.33 })).toBe(29.9)
  })

  it('nunca maior que a base (piso do restante em zero)', () => {
    expect(resolveManualDiscount(20, { kind: 'amount', value: 40 })).toBe(20)
    expect(resolveManualDiscount(20, { kind: 'percent', value: 150 })).toBe(20)
  })

  it('nunca negativo: valor negativo ou não numérico vira zero', () => {
    expect(resolveManualDiscount(50, { kind: 'amount', value: -10 })).toBe(0)
    expect(resolveManualDiscount(50, { kind: 'percent', value: Number.NaN })).toBe(0)
  })

  it('sem avulso: zero', () => {
    expect(resolveManualDiscount(50, null)).toBe(0)
    expect(resolveManualDiscount(50, undefined)).toBe(0)
  })
})

describe('resolveOrderPricing com desconto avulso (PRC-04)', () => {
  it('em reais, cartão: total = subtotal − avulso + frete', () => {
    const out = resolveOrderPricing(
      input({ shipping: 10, manualDiscount: { kind: 'amount', value: 20 } }),
    )
    expect(out.totals.subtotal).toBe(100)
    expect(out.totals.manualDiscount).toBe(20)
    expect(out.totals.pixDiscount).toBe(0)
    expect(out.totals.total).toBe(90)
  })

  it('em percentual: sobre o subtotal', () => {
    // 3 × 29,90 = 89,70 · 10% = 8,97 ⇒ 80,73
    const out = resolveOrderPricing(
      input({
        items: [{ product_id: 'joia', unit_price: 29.9, quantity: 3 }],
        manualDiscount: { kind: 'percent', value: 10 },
      }),
    )
    expect(out.totals.manualDiscount).toBe(8.97)
    expect(out.totals.total).toBe(80.73)
  })

  it('maior que o restante depois do cupom: o subtotal pára em zero, nunca negativo', () => {
    // 50 − cupom fixo 30 = 20 restantes; avulso de 40 desconta só 20. Itens = 0, frete 15.
    const out = resolveOrderPricing(
      input({
        items: [{ product_id: 'joia', unit_price: 50, quantity: 1 }],
        shipping: 15,
        coupon: { type: 'fixed', value: 30 },
        manualDiscount: { kind: 'amount', value: 40 },
      }),
    )
    expect(out.totals.couponDiscount).toBe(30)
    expect(out.totals.manualDiscount).toBe(20)
    expect(out.totals.total).toBe(15)
  })

  it('ordem cupom → avulso → PIX: o percentual do avulso incide sobre (subtotal − cupom), e o PIX sobre (subtotal − cupom − avulso)', () => {
    // 100 − cupom 10% (10) = 90 · avulso 10% de 90 = 9 (se fosse sobre 100 seria 10)
    // PIX 5% de 81 = 4,05 (se o avulso ficasse fora da base seria 4,50) · total 76,95 + 12 de frete
    const out = resolveOrderPricing(
      input({
        shipping: 12,
        method: 'pix',
        pixDiscountPercent: 5,
        coupon: { type: 'percent', value: 10 },
        manualDiscount: { kind: 'percent', value: 10 },
      }),
    )
    expect(out.totals.couponDiscount).toBe(10)
    expect(out.totals.manualDiscount).toBe(9)
    expect(out.totals.pixDiscount).toBe(4.05)
    expect(out.totals.total).toBe(88.95)
  })

  it('cartão: nada de PIX, mesmo com percentual configurado', () => {
    const out = resolveOrderPricing(
      input({ pixDiscountPercent: 5, manualDiscount: { kind: 'amount', value: 20 } }),
    )
    expect(out.totals.pixDiscount).toBe(0)
    expect(out.totals.total).toBe(80)
  })

  it('com a promoção vencedora: o avulso incide sobre o subtotal JÁ promocional', () => {
    // 5 × 5,90 = 29,50; promoção ⇒ 5 × 4,60 = 23,00 (vence o cupom fixo de 2: 27,50)
    // avulso 10% de 23,00 = 2,30 ⇒ 20,70
    const out = resolveOrderPricing(
      input({
        items: [{ product_id: 'pin', unit_price: 5.9, quantity: 5 }],
        promotions: [KIT_5],
        coupon: { type: 'fixed', value: 2 },
        manualDiscount: { kind: 'percent', value: 10 },
      }),
    )
    expect(out.winner).toBe('promotion')
    expect(out.totals.subtotal).toBe(23)
    expect(out.totals.couponDiscount).toBe(0)
    expect(out.totals.manualDiscount).toBe(2.3)
    expect(out.totals.total).toBe(20.7)
  })

  it('com promoção e cupom acumulando (both): avulso sobre (promocional − cupom)', () => {
    // 23,00 − 15% (3,45) = 19,55 · avulso R$ 5 ⇒ 14,55
    const out = resolveOrderPricing(
      input({
        items: [{ product_id: 'pin', unit_price: 5.9, quantity: 5 }],
        promotions: [{ ...KIT_5, stacks_with_coupon: true }],
        coupon: { type: 'percent', value: 15 },
        manualDiscount: { kind: 'amount', value: 5 },
      }),
    )
    expect(out.winner).toBe('both')
    expect(out.totals.couponDiscount).toBe(3.45)
    expect(out.totals.manualDiscount).toBe(5)
    expect(out.totals.total).toBe(14.55)
  })

  it('cupom free_shipping: o frete é zerado e o avulso segue sobre os itens', () => {
    const out = resolveOrderPricing(
      input({
        shipping: 24.8,
        coupon: { type: 'free_shipping', value: 0 },
        manualDiscount: { kind: 'amount', value: 30 },
      }),
    )
    expect(out.totals.shipping).toBe(0)
    expect(out.totals.manualDiscount).toBe(30)
    expect(out.totals.total).toBe(70)
  })

  it('avulso que zera itens sem frete nenhum: a guarda do total mínimo continua valendo', () => {
    expect(() =>
      resolveOrderPricing(input({ manualDiscount: { kind: 'amount', value: 100 } })),
    ).toThrow()
  })
})

describe('sem desconto avulso, a saída é a de antes da feature 89', () => {
  const casos: Array<[string, Partial<OrderPricingInput>]> = [
    ['cartão sem nada', {}],
    ['pix com cupom', { method: 'pix', pixDiscountPercent: 5, coupon: { type: 'percent', value: 10 } }],
    [
      'promoção vencendo',
      {
        items: [{ product_id: 'pin', unit_price: 5.9, quantity: 5 }],
        promotions: [KIT_5],
        coupon: { type: 'fixed', value: 2 },
      },
    ],
  ]

  it.each(casos)('%s: a chave manualDiscount não aparece, nem com null', (_, over) => {
    const sem = resolveOrderPricing(input(over))
    const nulo = resolveOrderPricing(input({ ...over, manualDiscount: null }))
    expect('manualDiscount' in sem.totals).toBe(false)
    expect(Object.keys(sem.totals)).toEqual(['subtotal', 'couponDiscount', 'pixDiscount', 'shipping', 'total'])
    expect(nulo).toEqual(sem)
  })

  it('calculateOrderTotals sem o campo devolve as cinco chaves de sempre', () => {
    const totals = calculateOrderTotals({
      items: [{ unit_price: 100, quantity: 1 }],
      shipping: 10,
      couponDiscount: 20,
      pixDiscountPercent: 5,
      method: 'pix',
    })
    expect(totals).toEqual({ subtotal: 100, couponDiscount: 20, pixDiscount: 4, shipping: 10, total: 86 })
  })
})

describe('pricing.ts continua sem import (alcançável pelo Deno por caminho)', () => {
  it('nenhuma linha de import no arquivo', () => {
    const fonte = readFileSync(fileURLToPath(new URL('../pricing.ts', import.meta.url)), 'utf8')
    expect(fonte.length).toBeGreaterThan(1000)
    expect(fonte).toContain('export function resolveOrderPricing')
    expect(fonte).not.toMatch(/^\s*import\s/m)
    expect(fonte).not.toMatch(/^\s*export\s[^\n]*\sfrom\s/m)
  })
})
