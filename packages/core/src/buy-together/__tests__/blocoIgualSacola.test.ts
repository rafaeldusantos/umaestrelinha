import { describe, expect, it } from 'vitest'

import { resolveOrderPricing, type PricingItem, type ProgressivePromotion } from '../../payment/pricing'
import type { BuyTogetherDiscountAddon } from '../cartDiscount'
import { bundleTotal } from '../total'

// O total que o bloco Compre Junto mostra na página do produto e o total da sacola com só a joia e as
// peças marcadas: sem promoção nem cupom, são o MESMO número, ao centavo. O bloco chama
// `bundleTotal`; a sacola (e o checkout, e o servidor) chamam `resolveOrderPricing`. Os valores
// esperados foram feitos à mão.

const JOIA = 'joia'
const CORRENTE = 'corrente'
const CAIXA = 'caixa'

const addon = (o: Partial<BuyTogetherDiscountAddon>): BuyTogetherDiscountAddon => ({
  id: 'a1',
  mainProductId: JOIA,
  position: 0,
  kind: 'product',
  targetProductId: CORRENTE,
  listId: null,
  targetVariantIds: [],
  hiddenOnVariantIds: [],
  discountPercent: null,
  ...o,
})

// A joia oferece a corrente com 10% e a caixa sem desconto.
const config = {
  addons: [
    addon({ id: 'a1', position: 0, targetProductId: CORRENTE, discountPercent: 10 }),
    addon({ id: 'a2', position: 1, targetProductId: CAIXA, discountPercent: null }),
  ],
  lists: [],
}

const sacola = (mainQty: number): PricingItem[] => [
  { product_id: JOIA, variant_id: null, unit_price: 289.9, quantity: mainQty },
  { product_id: CORRENTE, variant_id: null, unit_price: 79.9, quantity: 1 },
  { product_id: CAIXA, variant_id: null, unit_price: 24.5, quantity: 1 },
]

const totalDaSacola = (items: PricingItem[], promotions: ProgressivePromotion[] = []) =>
  resolveOrderPricing({
    items,
    shipping: 0,
    pixDiscountPercent: 0,
    method: 'card',
    coupon: null,
    promotions,
    buyTogether: config,
  })

const bloco = (mainQty: number) =>
  bundleTotal({
    mainPrice: 289.9,
    mainQty,
    addons: [
      { price: 79.9, discountPercent: 10 },
      { price: 24.5, discountPercent: null },
    ],
  })

describe('o total do bloco é o total da sacola com só a joia e as peças marcadas', () => {
  it('uma joia: 289,90 + 71,91 (79,90 com 10%) + 24,50 = 386,31 nas duas pontas', () => {
    expect(bloco(1).total).toBe(386.31)
    expect(totalDaSacola(sacola(1)).totals.total).toBe(386.31)
    // E o desconto do conjunto é o mesmo desconto casado que a sacola mostra.
    expect(bloco(1).discount).toBe(7.99)
    expect(totalDaSacola(sacola(1)).buyTogetherDiscount).toBe(7.99)
  })

  it('duas joias e uma peça de cada: a peça vai uma vez, com desconto — 579,80 + 71,91 + 24,50', () => {
    expect(bloco(2).total).toBe(676.21)
    expect(totalDaSacola(sacola(2)).totals.total).toBe(676.21)
  })

  it('com uma promoção que dá preço menor que o casado, a sacola mostra o menor e o bloco não', () => {
    // 30% em tudo a partir de 1 unidade: a corrente sai a 55,93 (< 71,91), a joia a 202,93, a caixa
    // a 17,15. A diferença aparece só na sacola.
    const trinta: ProgressivePromotion = {
      id: 'p',
      discount_kind: 'percent',
      tiers: [{ min_qty: 1, value: 30 }],
      scope: 'all',
      eligibleProductIds: [],
      stacks_with_coupon: false,
      created_at: '2026-11-01T00:00:00Z',
    }
    expect(bloco(1).total).toBe(386.31)
    expect(totalDaSacola(sacola(1), [trinta]).totals.total).toBe(276.01)
  })
})
