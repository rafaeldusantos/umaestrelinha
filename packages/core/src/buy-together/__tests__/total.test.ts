import { describe, expect, it } from 'vitest'
import { pixPrice } from '../../payment/pix.ts'
import {
  addonEngravingRefusal,
  addonMissingChoice,
  bundlePix,
  bundleTotal,
} from '../index.ts'

describe('bundleTotal', () => {
  it('conta o principal na quantidade e cada adicional uma vez', () => {
    expect(bundleTotal({ mainPrice: 100, mainQty: 2, addonPrices: [30, 20.5] })).toBe(250.5)
  })

  it('sem adicional é o preço do principal vezes a quantidade', () => {
    expect(bundleTotal({ mainPrice: 49.9, mainQty: 3, addonPrices: [] })).toBe(149.7)
  })

  it('soma em centavos: 0,1 + 0,2 não vira 0,30000000000000004', () => {
    expect(bundleTotal({ mainPrice: 0.1, mainQty: 1, addonPrices: [0.2] })).toBe(0.3)
  })
})

describe('bundlePix', () => {
  it('é o preço PIX do total, nunca a soma dos PIX de cada peça', () => {
    const total = bundleTotal({ mainPrice: 99.9, mainQty: 1, addonPrices: [33.33, 17.77] })
    // Fonte independente: 151,00 com 5% de desconto, arredondando o desconto (7,55).
    expect(total).toBe(151)
    expect(bundlePix(total, 5)).toBe(143.45)
    expect(bundlePix(total, 5)).toBe(pixPrice(151, 5))
    const somaDosPix = pixPrice(99.9, 5)! + pixPrice(33.33, 5)! + pixPrice(17.77, 5)!
    expect(Math.round(somaDosPix * 100)).not.toBe(Math.round(bundlePix(total, 5)! * 100))
  })

  it('sem desconto configurado não há preço PIX', () => {
    expect(bundlePix(151, 0)).toBeNull()
  })
})

describe('addonEngravingRefusal', () => {
  it('dentro do limite (texto aparado) passa; em branco passa', () => {
    expect(addonEngravingRefusal('  Ana  ', 5)).toBeNull()
    expect(addonEngravingRefusal('   ', 5)).toBeNull()
    expect(addonEngravingRefusal('', 5)).toBeNull()
  })

  it('excedeu: diz o limite da peça e quantos tirar', () => {
    expect(addonEngravingRefusal('Maria Clara', 8)).toBe(
      'Cabem até 8 caracteres nesta peça. Tire 3 para continuar.',
    )
    expect(addonEngravingRefusal('Maria Clar', 8)).toBe(
      'Cabem até 8 caracteres nesta peça. Tire 2 para continuar.',
    )
  })

  it('peça sem limite cadastrado cai em 20', () => {
    expect(addonEngravingRefusal('a'.repeat(21), null)).toBe(
      'Cabem até 20 caracteres nesta peça. Tire 1 para continuar.',
    )
    expect(addonEngravingRefusal('a'.repeat(20), null)).toBeNull()
  })
})

describe('addonMissingChoice', () => {
  it('pede a peça quando a lista ainda não teve uma escolhida', () => {
    expect(addonMissingChoice({ kind: 'list', pieceChosen: false, missingAxis: null, pieceName: 'x' })).toBe(
      'Escolha a peça.',
    )
  })

  it('pede o eixo faltante com a primeira palavra do nome da peça', () => {
    expect(
      addonMissingChoice({
        kind: 'product',
        pieceChosen: true,
        missingAxis: 'Cor',
        pieceName: 'Pingente Estrela do Mar',
      }),
    ).toBe('Escolha o cor da pingente.')
  })

  it('o eixo inteiro e a primeira palavra saem em minúscula, sem perder o acento', () => {
    expect(
      addonMissingChoice({ kind: 'product', pieceChosen: true, missingAxis: 'Comprimento', pieceName: 'Corrente Veneziana' }),
    ).toBe('Escolha o comprimento da corrente.')
    expect(
      addonMissingChoice({ kind: 'list', pieceChosen: true, missingAxis: 'Acabamento Ouro Rosé', pieceName: 'Árvore da Vida' }),
    ).toBe('Escolha o acabamento ouro rosé da árvore.')
  })

  it('nada falta: nulo', () => {
    expect(addonMissingChoice({ kind: 'product', pieceChosen: true, missingAxis: null, pieceName: 'x' })).toBeNull()
  })
})
