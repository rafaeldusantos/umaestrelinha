import { describe, expect, it } from 'vitest'
import {
  applyOrderBump,
  calculateOrderTotals,
  type OrderBumpConfig,
  type PricingItem,
} from '../pricing'

// BMP-03: unit_price = round(base_price × (1 − discount_percent / 100), 2)
// BMP-04: o mesmo cálculo roda no servidor => exibido == cobrado
// BMP-05: marcar/desmarcar não acumula desconto

const BUMP_ID = 'prod-bump'

const bumpConfig = (over: Partial<OrderBumpConfig> = {}): OrderBumpConfig => ({
  enabled: true,
  product_id: BUMP_ID,
  discount_percent: 50,
  ...over,
})

const item = (over: Partial<PricingItem> = {}): PricingItem => ({
  product_id: BUMP_ID,
  unit_price: 20,
  quantity: 1,
  ...over,
})

describe('applyOrderBump', () => {
  it('aplica o desconto ao item cujo product_id casa com a oferta', () => {
    const result = applyOrderBump([item()], bumpConfig())
    expect(result[0].unit_price).toBe(10)
  })

  it('arredonda o preço com desconto a 2 casas decimais', () => {
    // 19,99 × (1 − 0,30) = 13,993 => 13,99
    const result = applyOrderBump([item({ unit_price: 19.99 })], bumpConfig({ discount_percent: 30 }))
    expect(result[0].unit_price).toBe(13.99)
  })

  it('não altera os demais itens do carrinho', () => {
    const result = applyOrderBump(
      [item({ product_id: 'prod-a', unit_price: 30, quantity: 2 }), item()],
      bumpConfig(),
    )
    expect(result[0].unit_price).toBe(30)
    expect(result[0].quantity).toBe(2)
    expect(result[1].unit_price).toBe(10)
  })

  it('aplica ao primeiro item que casa quando há dois do mesmo produto', () => {
    const result = applyOrderBump([item(), item()], bumpConfig())
    expect(result[0].unit_price).toBe(10)
    expect(result[1].unit_price).toBe(20)
  })

  it('devolve a lista intacta quando o bump é nulo', () => {
    const result = applyOrderBump([item()], null)
    expect(result[0].unit_price).toBe(20)
  })

  it('devolve a lista intacta quando o bump é undefined', () => {
    const result = applyOrderBump([item()], undefined)
    expect(result[0].unit_price).toBe(20)
  })

  it('devolve a lista intacta quando enabled é false', () => {
    const result = applyOrderBump([item()], bumpConfig({ enabled: false }))
    expect(result[0].unit_price).toBe(20)
  })

  it('devolve a lista intacta quando product_id da oferta é null', () => {
    const result = applyOrderBump([item()], bumpConfig({ product_id: null }))
    expect(result[0].unit_price).toBe(20)
  })

  it('devolve a lista intacta quando nenhum item casa com a oferta', () => {
    const result = applyOrderBump([item({ product_id: 'prod-outro' })], bumpConfig())
    expect(result[0].unit_price).toBe(20)
  })

  it('devolve a lista intacta quando o item que casa tem quantity > 1', () => {
    const result = applyOrderBump([item({ quantity: 2 })], bumpConfig())
    expect(result[0].unit_price).toBe(20)
    expect(result[0].quantity).toBe(2)
  })

  it('devolve a lista intacta quando o item não tem product_id', () => {
    const result = applyOrderBump([{ unit_price: 20, quantity: 1 }], bumpConfig())
    expect(result[0].unit_price).toBe(20)
  })

  it('não muta a lista de entrada e duas chamadas sobre o mesmo input dão o mesmo resultado', () => {
    const items = [item()]
    const first = applyOrderBump(items, bumpConfig())
    const second = applyOrderBump(items, bumpConfig())
    expect(items[0].unit_price).toBe(20)
    expect(first[0].unit_price).toBe(10)
    expect(second).toEqual(first)
  })
})

describe('calculateOrderTotals com bump', () => {
  it('subtotal e total usam o preço já descontado do item do bump', () => {
    const totals = calculateOrderTotals({
      items: [item({ product_id: 'prod-a', unit_price: 30 }), item()],
      shipping: 10,
      couponDiscount: 0,
      pixDiscountPercent: 0,
      method: 'card',
      bump: bumpConfig(),
    })
    // 30 + (20 × 0,5 = 10) = 40 de subtotal; + 10 de frete
    expect(totals.subtotal).toBe(40)
    expect(totals.total).toBe(50)
  })

  it('sem bump o mesmo pedido cobra o preço cheio (assinatura atual preservada)', () => {
    const totals = calculateOrderTotals({
      items: [item({ product_id: 'prod-a', unit_price: 30 }), item()],
      shipping: 10,
      couponDiscount: 0,
      pixDiscountPercent: 0,
      method: 'card',
    })
    expect(totals.subtotal).toBe(50)
    expect(totals.total).toBe(60)
  })

  it('desconto PIX incide sobre o subtotal já com o bump aplicado', () => {
    const totals = calculateOrderTotals({
      items: [item({ product_id: 'prod-a', unit_price: 30 }), item()],
      shipping: 10,
      couponDiscount: 0,
      pixDiscountPercent: 5,
      method: 'pix',
      bump: bumpConfig(),
    })
    // base do PIX = 40 (não 50) => 5% = 2,00
    expect(totals.subtotal).toBe(40)
    expect(totals.pixDiscount).toBe(2)
    expect(totals.total).toBe(48)
  })
})
