import { describe, expect, it } from 'vitest'
import { pixPrice } from '../pix'

// PDP-14 — a regra pura do preço com PIX exibido.
//
// A igualdade com o que o caixa cobra é asseverada em `displayedEqualsCharged.test.ts`, contra
// `resolveOrderPricing`. Aqui ficam a forma da conta e os limites.

describe('pixPrice — a conta', () => {
  it('desconta o percentual do preço', () => {
    // 100 − round2(5) = 95
    expect(pixPrice(100, 5)).toBe(95)
  })

  it('arredonda o DESCONTO e subtrai, não o preço final', () => {
    // A distinção que motivou a função. Com R$ 7,90 a 5%:
    //   desconto = 0,395 → arredonda para 0,40 → 7,90 − 0,40 = 7,50   ← o que o caixa cobra
    //   preço final = 7,90 × 0,95 = 7,505 → arredondaria para 7,51    ← o que o card exibia
    expect(pixPrice(7.9, 5)).toBe(7.5)
    expect(pixPrice(7.9, 5)).not.toBe(7.51)
  })

  it('vale para os outros preços medidos que divergiam', () => {
    // Três dos 81 preços distintos do catálogo que divergiam a 5%.
    expect(pixPrice(22.9, 5)).toBe(21.75)
    expect(pixPrice(64.9, 5)).toBe(61.65)
    expect(pixPrice(74.9, 5)).toBe(71.15)
  })

  it('devolve duas casas decimais, sem resíduo de ponto flutuante', () => {
    // 289,90 × 0,05 = 14,495 em decimal, mas 14.494999999999999 em ponto flutuante.
    expect(pixPrice(289.9, 5)).toBe(275.4)
  })
})

describe('pixPrice — os limites devolvem `null`', () => {
  it('sem desconto configurado', () => {
    expect(pixPrice(100, 0)).toBeNull()
  })

  it('percentual negativo', () => {
    expect(pixPrice(100, -5)).toBeNull()
  })

  it('percentual de 100% ou mais — zeraria ou inverteria o preço na tela', () => {
    expect(pixPrice(100, 100)).toBeNull()
    expect(pixPrice(100, 150)).toBeNull()
  })

  it('percentual logo abaixo de 100 ainda vale', () => {
    // A fronteira é `>= 100`, e não `> 99`: 99% é absurdo comercialmente, mas é um desconto.
    expect(pixPrice(100, 99)).toBe(1)
  })

  it('preço zerado ou negativo', () => {
    expect(pixPrice(0, 5)).toBeNull()
    expect(pixPrice(-10, 5)).toBeNull()
  })

  it('`NaN` nos dois argumentos', () => {
    expect(pixPrice(NaN, 5)).toBeNull()
    expect(pixPrice(100, NaN)).toBeNull()
  })
})
