import { describe, expect, it } from 'vitest'
import { campaignUnitPrice, percentOffCents, pieceComparePrice } from '../index.ts'

describe('campaignUnitPrice — centavos inteiros, meio centavo para cima, por unidade', () => {
  it('20% sobre R$ 209,90 = R$ 167,92', () => {
    expect(campaignUnitPrice(209.9, null, 20)).toEqual({ charged: 167.92, full: 209.9, discounted: true })
  })

  it('15% sobre R$ 199,90 = R$ 169,92 (169,915 sobe)', () => {
    expect(campaignUnitPrice(199.9, null, 15).charged).toBe(169.92)
  })

  it('o meio centavo sobe, e o abaixo do meio desce', () => {
    expect(percentOffCents(19990, 15)).toBe(16992) // 16991,5
    expect(percentOffCents(10001, 10)).toBe(9001) // 9000,9
    expect(percentOffCents(10003, 10)).toBe(9003) // 9002,7
    expect(percentOffCents(10004, 10)).toBe(9004) // 9003,6
    expect(percentOffCents(1005, 10)).toBe(905) // 904,5
    expect(percentOffCents(1004, 10)).toBe(904) // 903,6 — sobe para 904
    expect(percentOffCents(1001, 10)).toBe(901) // 900,9
    expect(percentOffCents(1011, 10)).toBe(910) // 909,9 — sobe para 910
    expect(percentOffCents(1006, 25)).toBe(755) // 754,5
    expect(percentOffCents(1002, 25)).toBe(752) // 751,5
    expect(percentOffCents(1001, 25)).toBe(751) // 750,75
    expect(percentOffCents(1003, 25)).toBe(752) // 752,25 — desce
  })

  it('com "de" R$ 259,90 e preço R$ 239,90, 10% cobra R$ 233,91 — nunca R$ 215,91', () => {
    const preco = campaignUnitPrice(239.9, 259.9, 10)
    expect(preco).toEqual({ charged: 233.91, full: 259.9, discounted: true })
    expect(preco.charged).not.toBe(215.91)
  })

  it('o "de/por" já mais barato que a campanha: cobra o preço de hoje, sem desconto de campanha', () => {
    expect(campaignUnitPrice(150, 259.9, 10)).toEqual({ charged: 150, full: 259.9, discounted: false })
  })

  it('"de" menor ou igual ao preço não é cheio', () => {
    expect(campaignUnitPrice(209.9, 199.9, 20).full).toBe(209.9)
    expect(campaignUnitPrice(209.9, 209.9, 20).charged).toBe(167.92)
  })

  it('sem percentual: o preço de sempre', () => {
    expect(campaignUnitPrice(209.9, null, null)).toEqual({ charged: 209.9, full: 209.9, discounted: false })
    expect(campaignUnitPrice(239.9, 259.9, undefined)).toEqual({ charged: 239.9, full: 259.9, discounted: false })
  })

  it('por unidade antes da quantidade: 3 × R$ 169,92 = R$ 509,76 (nunca 3 × 199,90 × 0,85 = 509,745)', () => {
    const unidade = campaignUnitPrice(199.9, null, 15).charged
    expect(Math.round(unidade * 100) * 3).toBe(50976)
  })
})

describe('pieceComparePrice — o "de" da peça sem grade mora na variação única', () => {
  it('peça de uma variação: o "de" dela vale (R$ 374,00), e 10% dá R$ 336,60 — nunca R$ 314,91', () => {
    const de = pieceComparePrice(349.9, null, [{ price: 349.9, compare_price: 374 }])
    expect(de).toBe(374)
    expect(campaignUnitPrice(349.9, de, 10)).toEqual({ charged: 336.6, full: 374, discounted: true })
  })

  it('sem "de" em lugar nenhum: o da peça (nulo), e 20% sobre R$ 385,00 dá R$ 308,00', () => {
    const de = pieceComparePrice(385, null, [{ price: 385, compare_price: null }])
    expect(de).toBeNull()
    expect(campaignUnitPrice(385, de, 20).charged).toBe(308)
  })

  it('vale o maior entre o "de" da peça e o da variação', () => {
    expect(pieceComparePrice(100, 130, [{ price: 100, compare_price: 120 }])).toBe(130)
    expect(pieceComparePrice(100, 110, [{ price: 100, compare_price: 120 }])).toBe(120)
  })

  it('o valor numérico em texto (como o banco pode devolver) também é lido', () => {
    expect(pieceComparePrice(349.9, null, [{ price: '349.90', compare_price: '374.00' }])).toBe(374)
  })

  it('variação com OUTRO preço não empresta o "de" à peça', () => {
    expect(pieceComparePrice(349.9, null, [{ price: 300, compare_price: 374 }])).toBeNull()
  })

  it('peça com grade (mais de uma variação) fica com o "de" dela', () => {
    expect(
      pieceComparePrice(349.9, null, [
        { price: 349.9, compare_price: 374 },
        { price: 349.9, compare_price: 380 },
      ]),
    ).toBeNull()
  })

  it('sem variação, ou com a lista ausente, fica o "de" da peça', () => {
    expect(pieceComparePrice(100, 120, [])).toBe(120)
    expect(pieceComparePrice(100, null, null)).toBeNull()
  })
})
