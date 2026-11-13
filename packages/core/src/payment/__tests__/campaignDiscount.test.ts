import { describe, expect, it } from 'vitest'
import { couponRefusal } from '../../coupons/rules'
import {
  couponEligibleSubtotal,
  resolveOrderLines,
  resolveOrderPricing,
  type OrderPricingInput,
  type PricingItem,
  type ProgressivePromotion,
} from '../pricing'
import type { BuyTogetherDiscountAddon } from '../../buy-together/cartDiscount'

// O desconto de campanha dentro de `resolveOrderPricing` — a função que a sacola, o checkout e o
// servidor chamam. A peça marcada entra com o preço de TABELA e a campanha da linha; quem desconta é
// a função. Os números de cada caso foram feitos à mão.

const PECA = 'peca-black'
const COMUM = 'peca-comum'

const campanha = (quantity = 1, extra: Partial<PricingItem> = {}): PricingItem => ({
  product_id: PECA,
  unit_price: 209.9,
  quantity,
  campaign: { percent: 20 },
  ...extra,
})
const comum = (quantity = 1, unit_price = 100): PricingItem => ({
  product_id: COMUM,
  unit_price,
  quantity,
  campaign: null,
})

const pricing = (overrides: Partial<OrderPricingInput>): OrderPricingInput => ({
  items: [campanha(), comum()],
  shipping: 0,
  pixDiscountPercent: 0,
  method: 'card',
  coupon: null,
  promotions: [],
  ...overrides,
})

describe('sem campanha, o pedido é o de hoje', () => {
  it('campanha ausente ou nula: o objeto inteiro é igual, sem o campo novo', () => {
    const semCampo = resolveOrderPricing(
      pricing({
        items: [{ product_id: COMUM, unit_price: 100, quantity: 2 }],
        coupon: { type: 'percent', value: 10 },
        shipping: 20,
      }),
    )
    expect(semCampo).toEqual({
      totals: { subtotal: 200, couponDiscount: 20, pixDiscount: 0, shipping: 20, total: 200 },
      promotionDiscount: 0,
      applied: [],
      winner: 'coupon',
      discarded: null,
    })
    const nula = resolveOrderPricing(
      pricing({ items: [comum(2)], coupon: { type: 'percent', value: 10 }, shipping: 20 }),
    )
    expect(nula).toEqual(semCampo)
    expect(nula).not.toHaveProperty('campaignDiscount')
  })
})

describe('a peça de campanha é cobrada pelo preço com desconto', () => {
  it('20% sobre R$ 209,90 cobra R$ 167,92 antes de PIX, cupom e frete', () => {
    const r = resolveOrderPricing(pricing({ items: [campanha()], shipping: 18.9 }))
    expect(r.totals).toEqual({ subtotal: 167.92, couponDiscount: 0, pixDiscount: 0, shipping: 18.9, total: 186.82 })
    expect(r.campaignDiscount).toBe(41.98)
    expect(r.promotionDiscount).toBe(0)
  })

  it('com "de/por", o cheio é o compare_price e cobra o menor; nunca os dois descontos', () => {
    // De R$ 250,00 por R$ 199,90; 15% sobre 250 = 212,50 > 199,90 ⇒ fica 199,90.
    const fica = resolveOrderPricing(
      pricing({ items: [campanha(1, { unit_price: 199.9, campaign: { percent: 15, compare_price: 250 } })] }),
    )
    expect(fica.totals.subtotal).toBe(199.9)
    expect(fica.campaignDiscount).toBe(0)
    // 30% sobre 250 = 175,00 < 199,90 ⇒ 175,00.
    const desce = resolveOrderPricing(
      pricing({ items: [campanha(1, { unit_price: 199.9, campaign: { percent: 30, compare_price: 250 } })] }),
    )
    expect(desce.totals.subtotal).toBe(175)
    expect(desce.campaignDiscount).toBe(24.9)
  })

  it('marcada sem baixar o preço é peça comum: o cupom vale para ela', () => {
    // De 250,00 por 199,90 com 15%: o cheio com o desconto (212,50) não baixa o preço de hoje.
    const r = resolveOrderPricing(
      pricing({
        items: [campanha(1, { unit_price: 199.9, campaign: { percent: 15, compare_price: 250 } })],
        coupon: { type: 'percent', value: 10 },
      }),
    )
    expect(r.totals.couponDiscount).toBe(19.99)
  })

  it('arredonda por unidade, meio centavo para cima: 15% sobre R$ 199,90 × 3 = 3 × 169,92', () => {
    const r = resolveOrderPricing(
      pricing({ items: [campanha(3, { unit_price: 199.9, campaign: { percent: 15 } })] }),
    )
    expect(r.totals.subtotal).toBe(509.76)
  })
})

describe('o cupom não vale em peça de campanha', () => {
  it('campanha R$ 167,92 + comum R$ 100,00 com cupom de 10%: desconta R$ 10,00, só da comum', () => {
    const r = resolveOrderPricing(pricing({ coupon: { type: 'percent', value: 10 } }))
    expect(r.totals.subtotal).toBe(267.92)
    expect(r.totals.couponDiscount).toBe(10)
    expect(r.totals.total).toBe(257.92)
  })

  it('o cupom de valor desconta no máximo o que as peças comuns somam', () => {
    const r = resolveOrderPricing(pricing({ coupon: { type: 'fixed', value: 150 } }))
    expect(r.totals.couponDiscount).toBe(100)
    expect(r.totals.total).toBe(167.92)
  })

  it('sacola só com peças de campanha: o cupom não desconta nada', () => {
    const r = resolveOrderPricing(pricing({ items: [campanha()], coupon: { type: 'percent', value: 10 } }))
    expect(r.totals.couponDiscount).toBe(0)
    expect(r.totals.total).toBe(167.92)
  })

  it('o cupom de frete grátis continua zerando o frete', () => {
    const r = resolveOrderPricing(
      pricing({ items: [campanha()], coupon: { type: 'free_shipping', value: 0 }, shipping: 24.8 }),
    )
    expect(r.totals.shipping).toBe(0)
    expect(r.totals.total).toBe(167.92)
  })

  it('o PIX de 5% vale sobre o total, com a peça de campanha', () => {
    const r = resolveOrderPricing(
      pricing({ coupon: { type: 'percent', value: 10 }, method: 'pix', pixDiscountPercent: 5 }),
    )
    // (267,92 − 10,00) × 5% = 12,896 ⇒ 12,90.
    expect(r.totals.pixDiscount).toBe(12.9)
    expect(r.totals.total).toBe(245.02)
  })
})

describe('a peça com "de/por" que a campanha baixa também fica fora do cupom', () => {
  // De R$ 374,00 por R$ 349,90 com 10%: 10% sobre 374,00 = 336,60 < 349,90 ⇒ a campanha baixa o
  // preço, e a peça é de campanha. A comparação é contra o "por" de tabela, nunca contra o próprio
  // preço já descontado.
  const comDePor = (): PricingItem => ({
    product_id: PECA,
    unit_price: 349.9,
    quantity: 1,
    campaign: { percent: 10, compare_price: 374 },
  })
  const semDePor = (): PricingItem => ({
    product_id: PECA,
    unit_price: 385,
    quantity: 1,
    campaign: { percent: 10 },
  })
  const cupom10 = { type: 'percent' as const, value: 10 }

  it('com uma comum de R$ 340,00 e cupom de 10%: desconta R$ 34,00, só da comum', () => {
    const r = resolveOrderPricing(pricing({ items: [comum(1, 340), comDePor()], coupon: cupom10 }))
    expect(r.totals.subtotal).toBe(676.6)
    expect(r.totals.couponDiscount).toBe(34)
    expect(r.totals.total).toBe(642.6)
  })

  it('o par sem "de/por" (R$ 385,00 a 10%) dá o mesmo cupom de R$ 34,00', () => {
    const r = resolveOrderPricing(pricing({ items: [comum(1, 340), semDePor()], coupon: cupom10 }))
    expect(r.totals.subtotal).toBe(686.5)
    expect(r.totals.couponDiscount).toBe(34)
  })

  it('com o Compre Junto na entrada, a base do cupom também deixa a peça de fora', () => {
    const r = resolveOrderPricing(
      pricing({ items: [comum(1, 340), comDePor()], coupon: cupom10, buyTogether: { addons: [], lists: [] } }),
    )
    expect(r.totals.couponDiscount).toBe(34)
    expect(
      couponEligibleSubtotal({ items: [comum(1, 340), comDePor()], buyTogether: { addons: [], lists: [] } }),
    ).toBe(340)
  })

  it('sacola só com ela: a base do cupom é zero e o cupom é recusado com o nome da campanha', () => {
    const base = couponEligibleSubtotal({ items: [comDePor()] })
    expect(base).toBe(0)
    expect(couponEligibleSubtotal({ items: [semDePor()] })).toBe(0)
    expect(
      couponRefusal(
        {
          type: 'percent',
          value: 10,
          active: true,
          valid_from: null,
          valid_until: null,
          max_uses: null,
          used_count: 0,
          min_order: null,
          first_order_only: false,
        },
        { subtotal: 336.6, eligibleSubtotal: base, campaignName: 'Dia das Mães', now: new Date('2026-11-13T12:00:00Z') },
      ),
    ).toBe('Este cupom não vale para peças da Dia das Mães.')
  })
})

describe('a promoção progressiva não conta a peça de campanha', () => {
  const faixa: ProgressivePromotion = {
    id: 'tres-por',
    discount_kind: 'unit_price',
    tiers: [{ min_qty: 3, value: 50 }],
    scope: 'categories',
    eligibleProductIds: [PECA, COMUM],
    stacks_with_coupon: false,
    created_at: '2026-10-01T00:00:00.000Z',
  }

  it('duas comuns e uma de campanha: a faixa de 3 não é alcançada', () => {
    const r = resolveOrderPricing(pricing({ items: [comum(2), campanha()], promotions: [faixa] }))
    expect(r.applied).toEqual([])
    expect(r.promotionDiscount).toBe(0)
    expect(r.totals.subtotal).toBe(367.92)
  })

  it('três comuns alcançam a faixa, e a de campanha não recebe o preço dela', () => {
    const r = resolveOrderPricing(pricing({ items: [comum(3), campanha()], promotions: [faixa] }))
    expect(r.applied).toEqual([{ promotion_id: 'tres-por', tier_min_qty: 3 }])
    expect(r.promotionDiscount).toBe(150)
    expect(r.totals.subtotal).toBe(317.92)
  })
})

describe('o Compre Junto não desconta a peça de campanha', () => {
  const addon = (overrides: Partial<BuyTogetherDiscountAddon> = {}): BuyTogetherDiscountAddon => ({
    id: 'a1',
    mainProductId: COMUM,
    position: 0,
    kind: 'product',
    targetProductId: PECA,
    listId: null,
    targetVariantIds: [],
    hiddenOnVariantIds: [],
    discountPercent: 10,
    ...overrides,
  })

  it('como adicional: a peça de campanha sai pelo preço da campanha, sem o casado', () => {
    const r = resolveOrderPricing(pricing({ buyTogether: { addons: [addon()], lists: [] } }))
    expect(r.totals.subtotal).toBe(267.92)
    expect(r.buyTogetherDiscount).toBe(0)
    expect(r.campaignDiscount).toBe(41.98)
  })

  it('como principal: a peça de campanha não recebe o casado, e o adicional comum recebe', () => {
    const r = resolveOrderPricing(
      pricing({
        buyTogether: {
          addons: [
            addon({ id: 'a2', mainProductId: PECA, targetProductId: COMUM }),
            addon({ id: 'a3', mainProductId: COMUM, targetProductId: PECA }),
          ],
          lists: [],
        },
      }),
    )
    // O par é recíproco; a peça de campanha nunca sai com o casado.
    const linhaDaCampanha = (r.buyTogetherLines ?? []).find((l) => l.index === 0)
    expect(linhaDaCampanha).toBeUndefined()
    expect(r.campaignDiscount).toBe(41.98)
  })
})

describe('a oferta do checkout numa peça de campanha cobra o menor', () => {
  it('bump de 10% (188,91) contra campanha de 20% (167,92): cobra 167,92', () => {
    const r = resolveOrderPricing(
      pricing({ items: [campanha()], bump: { enabled: true, product_id: PECA, discount_percent: 10 } }),
    )
    expect(r.totals.subtotal).toBe(167.92)
    expect(r.campaignDiscount).toBe(41.98)
  })

  it('bump de 30% (146,93) contra campanha de 20%: cobra 146,93, e o desconto é do bump', () => {
    const r = resolveOrderPricing(
      pricing({ items: [campanha()], bump: { enabled: true, product_id: PECA, discount_percent: 30 } }),
    )
    expect(r.totals.subtotal).toBe(146.93)
    expect(r.campaignDiscount).toBe(0)
  })
})

describe('as linhas do pedido', () => {
  it('a linha de campanha leva o cheio e o cobrado; o desconto de campanha fica fora do resíduo do bump', () => {
    const input = pricing({ bump: { enabled: true, product_id: PECA, discount_percent: 10 } })
    const out = resolveOrderLines(input, resolveOrderPricing(input))
    expect(out.lines).toEqual([
      { index: 0, quantity: 1, fullUnitPrice: 209.9, unitPrice: 167.92 },
      { index: 1, quantity: 1, fullUnitPrice: 100, unitPrice: 100 },
    ])
    expect(out.campaignDiscount).toBe(41.98)
    expect(out.orderBumpDiscount).toBe(0)
  })

  it('sem campanha, as linhas não ganham o campo novo', () => {
    const input = pricing({ items: [comum(2)] })
    const out = resolveOrderLines(input, resolveOrderPricing(input))
    expect(out).not.toHaveProperty('campaignDiscount')
  })
})
