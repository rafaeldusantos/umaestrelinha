import { describe, expect, it } from 'vitest'
import { campaignUnitPrice, percentOffCents } from '../index.ts'

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
