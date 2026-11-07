import { describe, expect, it } from 'vitest'
import {
  resolveOrderLines,
  resolveOrderPricing,
  type CouponRule,
  type OrderPricingInput,
  type PricingItem,
  type ProgressivePromotion,
} from '../../payment/pricing'
import type { BuyTogetherDiscountAddon } from '../../buy-together/cartDiscount'
import { orderSummary, type OrderSummaryInput } from '../summary'

// O resumo do pedido: Subtotal cheio − cada desconto + frete = Total.
//
// O pedido das fixturas é montado como a loja e o servidor o gravam — pelas MESMAS funções
// (`resolveOrderPricing` + `resolveOrderLines`), nunca com os números escritos à mão. Assim a
// prova de que a conta fecha vale para o que o pedido de verdade guarda.

const addon = (o: Partial<BuyTogetherDiscountAddon>): BuyTogetherDiscountAddon => ({
  id: 'a1',
  mainProductId: 'joia',
  position: 0,
  kind: 'product',
  targetProductId: 'corrente',
  listId: null,
  targetVariantIds: [],
  hiddenOnVariantIds: [],
  discountPercent: 10,
  ...o,
})

interface CartLine extends PricingItem {
  product_id: string
  marks?: string[]
}

// A joia (300), duas correntes (79 — uma leva o casado de 10%, a outra a promoção de 5%) e o bump
// (40, 50%). Os preços cheio e cobrado divergem em toda linha com desconto.
const cart: CartLine[] = [
  { product_id: 'joia', variant_id: null, unit_price: 300, quantity: 1 },
  { product_id: 'corrente', variant_id: null, unit_price: 79, quantity: 2, marks: ['joia'] },
  { product_id: 'bump-1', variant_id: null, unit_price: 40, quantity: 1 },
]

const promocao = (stacks: boolean): ProgressivePromotion => ({
  id: 'promo-5',
  discount_kind: 'percent',
  tiers: [{ min_qty: 2, value: 5 }],
  scope: 'categories',
  eligibleProductIds: ['corrente'],
  stacks_with_coupon: stacks,
  created_at: '2026-11-01T00:00:00Z',
})

/** O pedido como fica gravado depois do `create-payment`. */
const pedidoGravado = (input: OrderPricingInput, linhas: CartLine[], coupon_code: string | null) => {
  const outcome = resolveOrderPricing(input)
  const lines = resolveOrderLines(input, outcome)
  const order: OrderSummaryInput = {
    order_items: lines.lines.map((l) => ({
      product_id: linhas[l.index].product_id,
      variant_id: null,
      quantity: l.quantity,
      unit_price: l.unitPrice,
      full_unit_price: l.fullUnitPrice,
      accompanies_product_ids: linhas[l.index].marks ?? null,
    })),
    subtotal: outcome.totals.subtotal,
    shipping_cost: outcome.totals.shipping,
    discount: outcome.totals.couponDiscount,
    coupon_code,
    pix_discount: outcome.totals.pixDiscount,
    total: outcome.totals.total,
    buy_together_discount: lines.buyTogetherDiscount,
    promotion_discount: lines.promotionDiscount,
    order_bump_discount: lines.orderBumpDiscount,
  }
  return { order, outcome }
}

const cents = (n: number) => Math.round(n * 100)
/** Subtotal − descontos + frete, em centavos. */
const fecha = (s: ReturnType<typeof orderSummary>) =>
  cents(s.subtotal) - s.discounts.reduce((acc, d) => acc + cents(d.amount), 0) + cents(s.shipping)

const base = {
  shipping: 20,
  pixDiscountPercent: 5,
  method: 'pix' as const,
  bump: { enabled: true, product_id: 'bump-1', discount_percent: 50 },
}
const config = { addons: [addon({})], lists: [] }
const comCasado = (o: Partial<OrderPricingInput>): OrderPricingInput => ({
  ...base,
  coupon: null,
  promotions: [],
  items: cart,
  buyTogether: { ...config, marks: cart.map((c) => c.marks ?? []) },
  ...o,
})

describe('orderSummary — o resumo fecha com cada desconto na sua linha', () => {
  it('Compre Junto, bump, promoção que empilha, cupom e PIX: Subtotal cheio − descontos + frete = Total', () => {
    const coupon: CouponRule = { type: 'percent', value: 10 }
    const { order } = pedidoGravado(
      comCasado({ coupon, promotions: [promocao(true)] }),
      cart,
      'LEMBRANCA',
    )
    const s = orderSummary(order)

    expect(s.detailed).toBe(true)
    // A soma dos preços cheios: 300 + 79 × 2 + 40.
    expect(s.subtotal).toBe(498)
    expect(s.discounts.map((d) => d.key)).toEqual([
      'buy_together',
      'promotion',
      'order_bump',
      'coupon',
      'pix',
    ])
    expect(s.discounts.map((d) => d.label)).toEqual([
      'Desconto do Compre Junto',
      'Desconto progressivo',
      'Desconto da oferta',
      'Cupom LEMBRANCA',
      'Desconto PIX',
    ])
    expect(s.discounts.find((d) => d.key === 'buy_together')?.amount).toBe(7.9)
    expect(s.discounts.find((d) => d.key === 'order_bump')?.amount).toBe(20)
    expect(s.total).toBe(order.total)
    expect(fecha(s)).toBe(cents(s.total))
  })

  it('sem cupom: a promoção vale na corrente a preço cheio, e a conta fecha', () => {
    const { order } = pedidoGravado(comCasado({ promotions: [promocao(false)] }), cart, null)
    const s = orderSummary(order)
    expect(s.discounts.map((d) => d.key)).toEqual(['buy_together', 'promotion', 'order_bump', 'pix'])
    expect(fecha(s)).toBe(cents(s.total))
  })

  it('cartão, sem PIX nem cupom: só o casado e a oferta, e a conta fecha', () => {
    const { order } = pedidoGravado(comCasado({ method: 'card' }), cart, null)
    const s = orderSummary(order)
    expect(s.discounts.map((d) => d.key)).toEqual(['buy_together', 'order_bump'])
    expect(fecha(s)).toBe(cents(s.total))
  })

  it('o Total é sempre `orders.total`, nunca recalculado', () => {
    const { order } = pedidoGravado(comCasado({}), cart, null)
    expect(orderSummary({ ...order, total: 1 }).total).toBe(1)
  })

  it('sem código, a linha do cupom diz "Cupom"', () => {
    const { order } = pedidoGravado(comCasado({ coupon: { type: 'percent', value: 10 } }), cart, null)
    expect(orderSummary(order).discounts.find((d) => d.key === 'coupon')?.label).toBe('Cupom')
  })
})

describe('orderSummary — as peças: "de/por" e a linha mista partida', () => {
  const { order } = pedidoGravado(comCasado({ promotions: [promocao(false)] }), cart, null)
  const s = orderSummary(order)

  it('a linha mista chega como duas linhas, cada uma com o seu preço', () => {
    expect(order.order_items.map((r) => [r.product_id, r.unit_price, r.full_unit_price])).toEqual([
      ['joia', 300, 300],
      ['corrente', 71.1, 79],
      ['corrente', 75.05, 79],
      ['bump-1', 20, 40],
    ])
  })

  it('a peça com desconto mostra o cheio ("de") e o cobrado ("por"); a sem desconto, só o valor', () => {
    expect(s.rows.map((r) => [r.full, r.charged])).toEqual([
      [null, 300],
      [79, 71.1],
      [79, 75.05],
      [40, 20],
    ])
  })

  it('só a parte do casado diz "N% a menos" e "Acompanha"; a outra parte é a peça avulsa', () => {
    expect(s.rows.map((r) => r.buyTogetherPercent)).toEqual([null, 10, null, null])
    expect(s.rows.map((r) => r.showsCompanion)).toEqual([true, true, false, true])
  })

  it('o percentual só sai quando o snapshot confere com o desconto casado do pedido', () => {
    // Um pedido em que o casado gravado não bate com as linhas: o "de/por" fica, a origem não.
    const torto = orderSummary({ ...order, buy_together_discount: 5 })
    expect(torto.rows.map((r) => r.buyTogetherPercent)).toEqual([null, null, null, null])
    expect(torto.rows[1].full).toBe(79)
    // E sem desconto casado no pedido, também não.
    expect(orderSummary({ ...order, buy_together_discount: 0 }).rows[1].buyTogetherPercent).toBeNull()
  })

  it('a peça que acompanha um principal que NÃO está no pedido não leva o percentual', () => {
    const semPrincipal = orderSummary({
      ...order,
      order_items: order.order_items.map((r) =>
        r.product_id === 'corrente' ? { ...r, accompanies_product_ids: ['outra'] } : r,
      ),
    })
    expect(semPrincipal.rows[1].buyTogetherPercent).toBeNull()
  })
})

describe('orderSummary — pedido de antes das colunas de preço cheio fica como era', () => {
  // O pedido antigo: `unit_price` com o bump, sem `full_unit_price`, subtotal gravado já líquido da
  // promoção, que nunca teve linha própria no resumo.
  const antigo: OrderSummaryInput = {
    order_items: [
      { product_id: 'joia', quantity: 1, unit_price: 300 },
      { product_id: 'corrente', quantity: 2, unit_price: 75.05, accompanies_product_ids: ['joia'] },
    ],
    subtotal: 450.1,
    shipping_cost: 20,
    discount: 10,
    coupon_code: null,
    pix_discount: 23.01,
    total: 437.09,
    promotion_discount: 7.9,
  }

  it('subtotal gravado, o cupom ("Desconto" sem código) e o PIX — e nada mais', () => {
    const s = orderSummary(antigo)
    expect(s.detailed).toBe(false)
    expect(s.subtotal).toBe(450.1)
    expect(s.discounts).toEqual([
      { key: 'coupon', label: 'Desconto', amount: 10 },
      { key: 'pix', label: 'Desconto PIX', amount: 23.01 },
    ])
    expect(s.rows).toEqual([
      { charged: 300, full: null, buyTogetherPercent: null, showsCompanion: true },
      { charged: 150.1, full: null, buyTogetherPercent: null, showsCompanion: true },
    ])
    expect(fecha(s)).toBe(cents(s.total))
  })

  it('uma linha só sem o preço cheio já basta para o formato de antes', () => {
    const misto = orderSummary({
      ...antigo,
      order_items: [{ ...antigo.order_items[0], full_unit_price: 300 }, antigo.order_items[1]],
    })
    expect(misto.detailed).toBe(false)
  })

  it('com o código do cupom, a linha o nomeia (como sempre)', () => {
    expect(orderSummary({ ...antigo, coupon_code: ' FLOR ' }).discounts[0].label).toBe('Cupom FLOR')
  })
})
