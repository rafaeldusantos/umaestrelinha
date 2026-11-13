import { describe, expect, it } from 'vitest'
import { offerAvailability, offerPricing } from '../pricing'

/**
 * `GSH-06` (AC 8) e `GSH-07` (AC 9) — o preço e a disponibilidade da oferta.
 *
 * **Os fixtures divergem de propósito.** Um fixture em que os dois campos candidatos valem o mesmo
 * número não detecta leitura do campo errado — é a armadilha que já custou a este projeto uma
 * vitrine anunciando o preço-base numa loja com grade. Aqui `base_price`, `price_override` e `price`
 * têm valores diferentes em toda asserção que importa.
 */

describe('offerPricing — o preço é o da LINHA', () => {
  it('usa product_variants.price', () => {
    expect(offerPricing({ price: 19.9, compare_price: null, stock: 5 })).toEqual({
      price: 19.9,
      salePrice: null,
    })
  })

  it('ignora base_price do produto, mesmo divergente', () => {
    const variacao = { price: 84, compare_price: null, stock: 5, base_price: 19.9 }
    expect(offerPricing(variacao).price).toBe(84)
  })

  it('ignora price_override, a coluna depreciada, mesmo divergente', () => {
    const variacao = { price: 84, compare_price: null, stock: 5, price_override: 42 }
    expect(offerPricing(variacao).price).toBe(84)
  })
})

describe('offerPricing — o "de/por"', () => {
  it('compare_price MAIOR vira o g:price, e o preço vira g:sale_price', () => {
    expect(offerPricing({ price: 84, compare_price: 120, stock: 5 })).toEqual({
      price: 120,
      salePrice: 84,
    })
  })

  it('compare_price IGUAL não é promoção — 3.346 das 3.357 variações do catálogo são assim', () => {
    expect(offerPricing({ price: 84, compare_price: 84, stock: 5 })).toEqual({
      price: 84,
      salePrice: null,
    })
  })

  it('compare_price MENOR não é promoção', () => {
    expect(offerPricing({ price: 84, compare_price: 50, stock: 5 })).toEqual({
      price: 84,
      salePrice: null,
    })
  })

  it('compare_price nulo não é promoção', () => {
    expect(offerPricing({ price: 84, compare_price: null, stock: 5 }).salePrice).toBeNull()
  })
})

describe('offerPricing — o que NUNCA entra', () => {
  it('não aplica desconto do Pix: 5% de 19,90 seria 18,91 e o feed anuncia 19,90', () => {
    expect(offerPricing({ price: 19.9, compare_price: null, stock: 5 }).price).toBe(19.9)
  })

  it('não aplica desconto por quantidade: o preço da oferta é o de uma unidade', () => {
    expect(offerPricing({ price: 100, compare_price: null, stock: 50 }).price).toBe(100)
  })
})

describe('offerAvailability — os quatro ramos', () => {
  it('track com saldo > 0 é in_stock', () => {
    expect(offerAvailability({ stock_policy: 'track' }, { price: 84, compare_price: null, stock: 3 }))
      .toBe('in_stock')
  })

  it('track com saldo 0 é out_of_stock', () => {
    expect(offerAvailability({ stock_policy: 'track' }, { price: 84, compare_price: null, stock: 0 }))
      .toBe('out_of_stock')
  })

  it('backorder nunca esgota, mesmo com saldo 0', () => {
    expect(
      offerAvailability({ stock_policy: 'backorder' }, { price: 84, compare_price: null, stock: 0 }),
    ).toBe('backorder')
  })

  it('none nunca esgota, mesmo com saldo 0 — é o sob demanda', () => {
    expect(offerAvailability({ stock_policy: 'none' }, { price: 84, compare_price: null, stock: 0 }))
      .toBe('in_stock')
  })

  it('saldo negativo em track é out_of_stock, não in_stock', () => {
    expect(
      offerAvailability({ stock_policy: 'track' }, { price: 84, compare_price: null, stock: -2 }),
    ).toBe('out_of_stock')
  })
})

describe('offerPricing — a campanha de desconto em vigência', () => {
  const campanha = (percent: number) => ({
    percent,
    starts_at: '2026-11-13T03:00:00+00:00',
    ends_at: '2026-12-01T03:00:00+00:00',
  })

  it('o g:price é o cheio, o g:sale_price é o com desconto, e a vigência acompanha', () => {
    // 15% sobre R$ 199,90 = R$ 169,915 ⇒ R$ 169,92, meio centavo para cima.
    expect(offerPricing({ price: 199.9, compare_price: null, stock: 5 }, campanha(15))).toEqual({
      price: 199.9,
      salePrice: 169.92,
      saleEffective: { start: '2026-11-13T03:00:00+00:00', end: '2026-12-01T03:00:00+00:00' },
    })
  })

  it('com "de/por", o desconto vale sobre o "de" e o cobrado é o MENOR — campanha vence', () => {
    // 15% sobre 200 = 170, menor que os 180 de hoje.
    expect(offerPricing({ price: 180, compare_price: 200, stock: 5 }, campanha(15))).toEqual({
      price: 200,
      salePrice: 170,
      saleEffective: { start: '2026-11-13T03:00:00+00:00', end: '2026-12-01T03:00:00+00:00' },
    })
  })

  it('com "de/por" mais barato que a campanha, fica o "de/por" de sempre, sem vigência — nunca os dois somados', () => {
    // 15% sobre 200 = 170, maior que os 150 de hoje; multiplicar daria 127,50.
    expect(offerPricing({ price: 150, compare_price: 200, stock: 5 }, campanha(15))).toEqual({
      price: 200,
      salePrice: 150,
    })
  })

  it('sem campanha, idêntico a hoje', () => {
    expect(offerPricing({ price: 199.9, compare_price: null, stock: 5 }, null)).toEqual({
      price: 199.9,
      salePrice: null,
    })
    expect(offerPricing({ price: 84, compare_price: 120, stock: 5 }, undefined)).toEqual({
      price: 120,
      salePrice: 84,
    })
  })

  it('linha sem preço continua sem preço, com campanha', () => {
    expect(offerPricing({ price: null, compare_price: null, stock: 5 }, campanha(15))).toEqual({
      price: null,
      salePrice: null,
    })
  })
})
