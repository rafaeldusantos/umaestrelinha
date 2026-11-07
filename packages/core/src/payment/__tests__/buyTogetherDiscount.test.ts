import { describe, expect, it } from 'vitest'
import {
  resolveOrderPricing,
  type BuyTogetherPricingInput,
  type OrderBumpConfig,
  type OrderPricingInput,
  type PricingItem,
  type ProgressivePromotion,
} from '../pricing'
import type { BuyTogetherDiscountAddon } from '../../buy-together/cartDiscount'

// O desconto da compra casada (Compre Junto) dentro de `resolveOrderPricing` — a função que a
// gaveta, o checkout e o servidor chamam. Os números de cada caso foram feitos à mão.

const JOIA = 'joia'
const CORRENTE = 'corrente'

const addon = (overrides: Partial<BuyTogetherDiscountAddon> = {}): BuyTogetherDiscountAddon => ({
  id: 'a1',
  mainProductId: JOIA,
  position: 0,
  kind: 'product',
  targetProductId: CORRENTE,
  listId: null,
  targetVariantIds: [],
  hiddenOnVariantIds: [],
  discountPercent: 10,
  ...overrides,
})

const config = (
  addons: BuyTogetherDiscountAddon[],
  extra: Partial<BuyTogetherPricingInput> = {},
): BuyTogetherPricingInput => ({ addons, lists: [], ...extra })

const joia = (quantity = 1, variant_id: string | null = null): PricingItem => ({
  product_id: JOIA,
  variant_id,
  unit_price: 300,
  quantity,
})
const corrente = (quantity = 1, unit_price = 79, variant_id: string | null = null): PricingItem => ({
  product_id: CORRENTE,
  variant_id,
  unit_price,
  quantity,
})

const pricing = (overrides: Partial<OrderPricingInput>): OrderPricingInput => ({
  items: [joia(), corrente()],
  shipping: 0,
  pixDiscountPercent: 0,
  method: 'card',
  coupon: null,
  promotions: [],
  ...overrides,
})

const promo = (overrides: Partial<ProgressivePromotion> = {}): ProgressivePromotion => ({
  id: 'promo',
  discount_kind: 'percent',
  tiers: [{ min_qty: 1, value: 30 }],
  scope: 'categories',
  eligibleProductIds: [CORRENTE],
  stacks_with_coupon: false,
  created_at: '2026-10-01T00:00:00.000Z',
  ...overrides,
})

describe('sem a configuração do desconto casado, o pedido é o de hoje', () => {
  it('ausente ou nulo: o objeto inteiro é igual, sem os campos novos', () => {
    const hoje = resolveOrderPricing(pricing({ pixDiscountPercent: 10, method: 'pix', shipping: 18.9 }))
    expect(hoje).toEqual({
      totals: { subtotal: 379, couponDiscount: 0, pixDiscount: 37.9, shipping: 18.9, total: 360 },
      promotionDiscount: 0,
      applied: [],
      winner: 'none',
      discarded: null,
    })
    expect(
      resolveOrderPricing(
        pricing({ pixDiscountPercent: 10, method: 'pix', shipping: 18.9, buyTogether: null }),
      ),
    ).toEqual(hoje)
    expect(hoje).not.toHaveProperty('buyTogetherDiscount')
    expect(hoje).not.toHaveProperty('buyTogetherLines')
  })
})

describe('o desconto da peça adicional', () => {
  it('joia + corrente com 10%: a corrente sai a 71,10, e o PIX incide depois do desconto', () => {
    const r = resolveOrderPricing(
      pricing({ buyTogether: config([addon()]), pixDiscountPercent: 10, method: 'pix' }),
    )
    expect(r.totals).toEqual({ subtotal: 371.1, couponDiscount: 0, pixDiscount: 37.11, shipping: 0, total: 333.99 })
    expect(r.buyTogetherDiscount).toBe(7.9)
    expect(r.promotionDiscount).toBe(0)
    expect(r.buyTogetherLines).toEqual([
      {
        index: 1,
        discountedUnits: 1,
        segments: [{ units: 1, percent: 10, unitPrice: 71.1, mainProductId: JOIA }],
        fullTotal: 79,
        total: 71.1,
        discount: 7.9,
      },
    ])
  })

  it('1 joia × 2 correntes: uma com desconto, outra a preço cheio', () => {
    const r = resolveOrderPricing(pricing({ items: [joia(), corrente(2)], buyTogether: config([addon()]) }))
    expect(r.totals.subtotal).toBe(450.1)
    expect(r.buyTogetherLines[0]).toMatchObject({ index: 1, discountedUnits: 1, fullTotal: 158, total: 150.1 })
  })

  it('duas joias somam as unidades: 2 joias × 2 correntes, as duas com desconto', () => {
    const r = resolveOrderPricing(
      pricing({ items: [joia(1, 'v-a'), joia(1, 'v-b'), corrente(2)], buyTogether: config([addon()]) }),
    )
    expect(r.buyTogetherLines).toHaveLength(1)
    expect(r.buyTogetherLines[0].discountedUnits).toBe(2)
    expect(r.buyTogetherDiscount).toBe(15.8)
  })

  it('o maior percentual vale primeiro: duas joias, 10% e 20%, uma corrente — 20%', () => {
    const r = resolveOrderPricing(
      pricing({
        items: [
          joia(),
          { product_id: 'joia-b', unit_price: 200, quantity: 1 },
          corrente(),
        ],
        buyTogether: config([
          addon(),
          addon({ id: 'b1', mainProductId: 'joia-b', discountPercent: 20 }),
        ]),
      }),
    )
    expect(r.buyTogetherLines[0].segments).toEqual([
      { units: 1, percent: 20, unitPrice: 63.2, mainProductId: 'joia-b' },
    ])
    expect(r.buyTogetherDiscount).toBe(15.8)
  })

  it('entre linhas da mesma peça, a de maior preço primeiro; no empate, a que vem antes', () => {
    const caro = resolveOrderPricing(
      pricing({
        items: [joia(), corrente(1, 79, 'v-prata'), corrente(1, 99, 'v-ouro')],
        buyTogether: config([addon()]),
      }),
    )
    expect(caro.buyTogetherLines.map(l => l.index)).toEqual([2])
    expect(caro.buyTogetherDiscount).toBe(9.9)

    const empate = resolveOrderPricing(
      pricing({
        items: [joia(), corrente(1, 79, 'v-prata'), corrente(1, 79, 'v-rose')],
        buyTogether: config([addon()]),
      }),
    )
    expect(empate.buyTogetherLines.map(l => l.index)).toEqual([1])
  })

  it('o desconto sai em buyTogetherDiscount, nunca em promotionDiscount', () => {
    const r = resolveOrderPricing(pricing({ buyTogether: config([addon()]) }))
    expect(r.promotionDiscount).toBe(0)
    expect(r.applied).toEqual([])
    expect(r.winner).toBe('none')
    expect(r.buyTogetherDiscount).toBe(7.9)
  })
})

describe('com promoção, bump e cupom', () => {
  it('a promoção que dá preço menor vence sem somar (30% sobre 79 = 55,30)', () => {
    const r = resolveOrderPricing(pricing({ buyTogether: config([addon()]), promotions: [promo()] }))
    expect(r.totals.subtotal).toBe(355.3)
    expect(r.buyTogetherDiscount).toBe(7.9)
    expect(r.promotionDiscount).toBe(15.8)
    expect(r.applied).toEqual([{ promotion_id: 'promo', tier_min_qty: 1 }])
    expect(r.winner).toBe('promotion')
  })

  it('a promoção que não chega abaixo do desconto casado não conta como aplicada', () => {
    const r = resolveOrderPricing(
      pricing({ buyTogether: config([addon()]), promotions: [promo({ tiers: [{ min_qty: 1, value: 5 }] })] }),
    )
    expect(r.totals.subtotal).toBe(371.1)
    expect(r.promotionDiscount).toBe(0)
    expect(r.applied).toEqual([])
    expect(r.winner).toBe('none')
  })

  it('o bump vence quando é menor: o casado não desconta nada naquela linha', () => {
    const bump: OrderBumpConfig = { enabled: true, product_id: CORRENTE, discount_percent: 50 }
    const r = resolveOrderPricing(pricing({ buyTogether: config([addon()]), bump }))
    expect(r.totals.subtotal).toBe(339.5)
    expect(r.buyTogetherDiscount).toBe(0)
    expect(r.buyTogetherLines[0]).toMatchObject({ fullTotal: 39.5, total: 39.5, discount: 0 })
  })

  it('o cupom acumula e incide sobre o subtotal já com o desconto casado', () => {
    const r = resolveOrderPricing(
      pricing({ buyTogether: config([addon()]), coupon: { type: 'percent', value: 10 } }),
    )
    expect(r.totals).toEqual({ subtotal: 371.1, couponDiscount: 37.11, pixDiscount: 0, shipping: 0, total: 333.99 })
    expect(r.buyTogetherDiscount).toBe(7.9)
    expect(r.winner).toBe('coupon')
    expect(r.discarded).toBeNull()
  })

  it('a promoção que não desconta além do casado perde para o cupom sem ser nomeada', () => {
    const r = resolveOrderPricing(
      pricing({
        buyTogether: config([addon()]),
        promotions: [promo({ tiers: [{ min_qty: 1, value: 5 }] })],
        coupon: { type: 'percent', value: 10 },
      }),
    )
    expect(r.winner).toBe('coupon')
    expect(r.discarded).toBeNull()
  })

  it('o cupom que não desconta nada não é nomeado quando a promoção vence', () => {
    const entrada = pricing({
      buyTogether: config([addon()]),
      promotions: [promo()],
      coupon: { type: 'free_shipping', value: 0 },
      shipping: 0,
    })
    const r = resolveOrderPricing(entrada)
    expect(r.winner).toBe('promotion')
    expect(r.discarded).toBeNull()

    // O cupom de frete que zera um frete cotado desconta, e é nomeado quando perde.
    const comFrete = resolveOrderPricing({ ...entrada, shipping: 5 })
    expect(comFrete.winner).toBe('promotion')
    expect(comFrete.discarded).toBe('coupon')
  })
})

describe('qual adicional e qual variação', () => {
  it('dentro da mesma joia, a peça avulsa vem antes da lista', () => {
    const r = resolveOrderPricing(
      pricing({
        buyTogether: config(
          [
            addon({ id: 'lista', position: 0, kind: 'list', targetProductId: null, listId: 'L1', discountPercent: 25 }),
            addon({ id: 'avulsa', position: 1, discountPercent: 10 }),
          ],
          { lists: [{ id: 'L1', name: 'Correntes', items: [{ productId: CORRENTE, position: 0, variantIds: [] }] }] },
        ),
      }),
    )
    expect(r.buyTogetherLines[0].segments[0].percent).toBe(10)
  })

  it('entre listas, vale a ordem da dona', () => {
    const lista = (id: string) => ({ id, name: id, items: [{ productId: CORRENTE, position: 0, variantIds: [] }] })
    const r = resolveOrderPricing(
      pricing({
        buyTogether: config(
          [
            addon({ id: 'l2', position: 1, kind: 'list', targetProductId: null, listId: 'L2', discountPercent: 30 }),
            addon({ id: 'l1', position: 0, kind: 'list', targetProductId: null, listId: 'L1', discountPercent: 15 }),
          ],
          { lists: [lista('L1'), lista('L2')] },
        ),
      }),
    )
    expect(r.buyTogetherLines[0].segments[0].percent).toBe(15)
  })

  const reciproco = config([
    addon({ discountPercent: 10 }),
    addon({ id: 'b', mainProductId: CORRENTE, targetProductId: JOIA, discountPercent: 20 }),
  ])

  it('par recíproco sem marca: só a de menor preço cheio recebe', () => {
    const r = resolveOrderPricing(pricing({ buyTogether: reciproco }))
    expect(r.buyTogetherLines.map(l => l.index)).toEqual([1])
    expect(r.buyTogetherDiscount).toBe(7.9)
  })

  it('par recíproco com marca: vale o desconto da peça levada pelo bloco', () => {
    const r = resolveOrderPricing(
      pricing({ buyTogether: { ...reciproco, marks: [[CORRENTE], null] } }),
    )
    expect(r.buyTogetherLines.map(l => l.index)).toEqual([0])
    expect(r.buyTogetherDiscount).toBe(60)
  })

  it('a variação do principal que esconde o adicional não dá desconto', () => {
    const esconde = config([addon({ hiddenOnVariantIds: ['v-curta'] })])
    const escondida = resolveOrderPricing(pricing({ items: [joia(1, 'v-curta'), corrente()], buyTogether: esconde }))
    expect(escondida.buyTogetherDiscount).toBe(0)
    expect(escondida.buyTogetherLines).toEqual([])

    // Só a unidade da variação que esconde deixa de contar.
    const misto = resolveOrderPricing(
      pricing({ items: [joia(1, 'v-curta'), joia(1, 'v-longa'), corrente(2)], buyTogether: esconde }),
    )
    expect(misto.buyTogetherLines[0].discountedUnits).toBe(1)
  })

  it('a variação da peça que a dona não liberou não recebe', () => {
    const r = resolveOrderPricing(
      pricing({
        items: [joia(), corrente(1, 79, 'v-ouro')],
        buyTogether: config([addon({ targetVariantIds: ['v-prata'] })]),
      }),
    )
    expect(r.buyTogetherDiscount).toBe(0)
  })

  it('principal sem grade: a regra de esconder não se aplica', () => {
    const r = resolveOrderPricing(
      pricing({ items: [joia(1, null), corrente()], buyTogether: config([addon({ hiddenOnVariantIds: ['v-curta'] })]) }),
    )
    expect(r.buyTogetherDiscount).toBe(7.9)
  })

  it('sem a joia no pedido, a peça sai a preço cheio', () => {
    const r = resolveOrderPricing(pricing({ items: [corrente()], buyTogether: config([addon()]) }))
    expect(r.totals.subtotal).toBe(79)
    expect(r.buyTogetherDiscount).toBe(0)
  })
})
