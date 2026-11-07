import { describe, expect, it } from 'vitest'
import { buyTogetherDiscountedPrice } from '../index.ts'

// Os valores esperados são feitos à mão: 79 × 0,90 = 71,10 e 25 × 0,85 = 21,25.

describe('buyTogetherDiscountedPrice — o preço da peça que vai junto, por unidade', () => {
  it('aplica o percentual e arredonda a centavo', () => {
    expect(buyTogetherDiscountedPrice(79, 10)).toBe(71.1)
    expect(buyTogetherDiscountedPrice(25, 15)).toBe(21.25)
  })

  it('arredonda o centavo que a conta em ponto flutuante deixaria torto', () => {
    // 19,90 × 0,90 = 17,91 (a multiplicação crua dá 17,910000000000004)
    expect(buyTogetherDiscountedPrice(19.9, 10)).toBe(17.91)
    // 33,33 × 0,95 = 31,6635 → 31,66
    expect(buyTogetherDiscountedPrice(33.33, 5)).toBe(31.66)
  })

  it('arredonda o meio centavo para cima, e não trunca', () => {
    // 0,99 × 0,50 = 0,495 → 0,50 (truncar daria 0,49)
    expect(buyTogetherDiscountedPrice(0.99, 50)).toBe(0.5)
    // 1,99 × 0,50 = 0,995 → 1,00 (truncar daria 0,99)
    expect(buyTogetherDiscountedPrice(1.99, 50)).toBe(1)
  })

  it('sem percentual a peça sai pelo preço de sempre', () => {
    expect(buyTogetherDiscountedPrice(79, null)).toBe(79)
    expect(buyTogetherDiscountedPrice(79, undefined)).toBe(79)
  })
})
