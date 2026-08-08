// Feature 17 / T17 — a prévia "Cliente paga" (PRM-04, AC 6).
//
// O número do board é o âncora: com bottons a R$ 8,90, a faixa `5 un a R$ 4,60` dá **R$ 23,00** e
// **−48%**. Se esta conta divergir da do carrinho, a promoção passa a ser exibida com um preço e
// cobrada com outro — o defeito que a feature 17 existe para impedir.

import { describe, expect, it } from 'vitest'
import { tierPreview } from './tierPreview'

/** O preço do botton no board do editor: as três porcentagens (−44/−48/−53) saem dele. */
const BOTTON = 8.9

describe('tierPreview — preço por unidade', () => {
  it('faixa de 5 un a R$ 4,60 ⇒ cliente paga R$ 23,00 (AC 6)', () => {
    expect(tierPreview({ min_qty: 5, value: 4.6 }, 'unit_price', BOTTON)).toEqual({
      unitPrice: 4.6,
      total: 23,
      percentOff: 48,
    })
  })

  it('as três faixas do board dão os três totais e os três percentuais do board', () => {
    expect(tierPreview({ min_qty: 3, value: 5 }, 'unit_price', BOTTON).total).toBe(15)
    expect(tierPreview({ min_qty: 3, value: 5 }, 'unit_price', BOTTON).percentOff).toBe(44)
    expect(tierPreview({ min_qty: 10, value: 4.2 }, 'unit_price', BOTTON).total).toBe(42)
    expect(tierPreview({ min_qty: 10, value: 4.2 }, 'unit_price', BOTTON).percentOff).toBe(53)
  })

  it('faixa mais CARA que o preço cheio não aumenta o preço (A10) e não anuncia desconto', () => {
    // Um botton de R$ 3,90 numa faixa de R$ 4,60 continua R$ 3,90 — é `tierUnitPrice` quem garante.
    const preview = tierPreview({ min_qty: 5, value: 4.6 }, 'unit_price', 3.9)

    expect(preview.unitPrice).toBe(3.9)
    expect(preview.total).toBe(19.5)
    expect(preview.percentOff).toBe(0)
  })
})

describe('tierPreview — % off', () => {
  it('10% off sobre R$ 8,90 em 4 unidades ⇒ R$ 32,04', () => {
    // 8,90 × 0,9 = 8,01 por unidade (arredondado POR ITEM, como o servidor faz), × 4 = 32,04.
    expect(tierPreview({ min_qty: 4, value: 10 }, 'percent', BOTTON)).toEqual({
      unitPrice: 8.01,
      total: 32.04,
      percentOff: 10,
    })
  })

  it('o mesmo `value` produz prévias DIFERENTES nos dois tipos — alternar recalcula', () => {
    const asPrice = tierPreview({ min_qty: 5, value: 10 }, 'unit_price', BOTTON)
    const asPercent = tierPreview({ min_qty: 5, value: 10 }, 'percent', BOTTON)

    // Como preço, R$ 10,00 é mais caro que o cheio: A10 mantém R$ 8,90 ⇒ 5 × 8,90.
    expect(asPrice.total).toBe(44.5)
    // Como percentual, 10% de desconto ⇒ 5 × 8,01.
    expect(asPercent.total).toBe(40.05)
  })
})

describe('tierPreview — sem resposta possível', () => {
  it('sem preço de referência não inventa número nenhum', () => {
    expect(tierPreview({ min_qty: 5, value: 4.6 }, 'unit_price', null)).toEqual({
      unitPrice: null,
      total: null,
      percentOff: null,
    })
  })

  it('campo vazio ou zero não vira prévia de R$ 0,00', () => {
    expect(tierPreview({ min_qty: '', value: '' }, 'unit_price', BOTTON).total).toBeNull()
    expect(tierPreview({ min_qty: 5, value: 0 }, 'unit_price', BOTTON).total).toBeNull()
  })
})
