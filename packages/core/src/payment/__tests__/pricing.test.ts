import { describe, expect, it } from 'vitest'
import { calculateOrderTotals } from '../pricing'

// PAY-03: valor cobrado recalculado a partir do pedido (itens + frete − descontos)
// PAY-14: desconto PIX = pix_discount_percent% sobre (subtotal − cupom), frete excluído

describe('calculateOrderTotals', () => {
  it('sem cupom, cartão: total = subtotal + frete, sem desconto pix', () => {
    const totals = calculateOrderTotals({
      items: [{ unit_price: 10, quantity: 2 }],
      shipping: 15,
      couponDiscount: 0,
      pixDiscountPercent: 5,
      method: 'card',
    })
    expect(totals.subtotal).toBe(20)
    expect(totals.pixDiscount).toBe(0)
    expect(totals.total).toBe(35)
  })

  it('com cupom, cartão: total = subtotal − cupom + frete', () => {
    const totals = calculateOrderTotals({
      items: [{ unit_price: 25, quantity: 2 }],
      shipping: 9.9,
      couponDiscount: 10,
      pixDiscountPercent: 5,
      method: 'card',
    })
    expect(totals.couponDiscount).toBe(10)
    expect(totals.total).toBe(49.9)
  })

  it('pix 5% sem cupom: desconto sobre o subtotal, frete fora da base', () => {
    const totals = calculateOrderTotals({
      items: [{ unit_price: 50, quantity: 2 }],
      shipping: 20,
      couponDiscount: 0,
      pixDiscountPercent: 5,
      method: 'pix',
    })
    // base = 100 (não 120): 5% = 5,00 — se o frete entrasse na base seria 6,00
    expect(totals.pixDiscount).toBe(5)
    expect(totals.total).toBe(115)
  })

  it('pix com cupom: base do desconto é (subtotal − cupom)', () => {
    const totals = calculateOrderTotals({
      items: [{ unit_price: 100, quantity: 1 }],
      shipping: 10,
      couponDiscount: 20,
      pixDiscountPercent: 5,
      method: 'pix',
    })
    // base = 100 − 20 = 80 → 5% = 4,00
    expect(totals.pixDiscount).toBe(4)
    expect(totals.total).toBe(86)
  })

  it('cupom freeShipping + pix: desconto sobre (subtotal − 0), frete já zerado', () => {
    const totals = calculateOrderTotals({
      items: [{ unit_price: 100, quantity: 1 }],
      shipping: 0,
      couponDiscount: 0,
      pixDiscountPercent: 5,
      method: 'pix',
    })
    expect(totals.pixDiscount).toBe(5)
    expect(totals.total).toBe(95)
  })

  it('pix 0%: nenhum desconto e total idêntico ao do cartão', () => {
    const input = {
      items: [{ unit_price: 40, quantity: 1 }],
      shipping: 10,
      couponDiscount: 0,
      pixDiscountPercent: 0,
    }
    const pix = calculateOrderTotals({ ...input, method: 'pix' as const })
    const card = calculateOrderTotals({ ...input, method: 'card' as const })
    expect(pix.pixDiscount).toBe(0)
    expect(pix.total).toBe(50)
    expect(pix.total).toBe(card.total)
  })

  it('cartão ignora pix_discount_percent > 0', () => {
    const totals = calculateOrderTotals({
      items: [{ unit_price: 40, quantity: 1 }],
      shipping: 10,
      couponDiscount: 0,
      pixDiscountPercent: 10,
      method: 'card',
    })
    expect(totals.pixDiscount).toBe(0)
    expect(totals.total).toBe(50)
  })

  it('arredonda desconto e total a 2 casas decimais', () => {
    const totals = calculateOrderTotals({
      items: [{ unit_price: 3.33, quantity: 3 }],
      shipping: 0,
      couponDiscount: 0,
      pixDiscountPercent: 10,
      method: 'pix',
    })
    // subtotal 9,99 → 10% = 0,999 → 1,00
    expect(totals.subtotal).toBe(9.99)
    expect(totals.pixDiscount).toBe(1)
    expect(totals.total).toBe(8.99)
  })

  it('total < R$ 0,01 lança erro (pedido inválido)', () => {
    expect(() =>
      calculateOrderTotals({
        items: [{ unit_price: 10, quantity: 1 }],
        shipping: 0,
        couponDiscount: 10,
        pixDiscountPercent: 0,
        method: 'card',
      }),
    ).toThrow(/0,01/)
  })

  it('total < R$ 0,01 via desconto pix também lança erro', () => {
    expect(() =>
      calculateOrderTotals({
        items: [{ unit_price: 5, quantity: 1 }],
        shipping: 0,
        couponDiscount: 5,
        pixDiscountPercent: 5,
        method: 'pix',
      }),
    ).toThrow(/0,01/)
  })

  it('total exatamente R$ 0,01 é permitido', () => {
    const totals = calculateOrderTotals({
      items: [{ unit_price: 10.01, quantity: 1 }],
      shipping: 0,
      couponDiscount: 10,
      pixDiscountPercent: 0,
      method: 'card',
    })
    expect(totals.total).toBe(0.01)
  })
})
