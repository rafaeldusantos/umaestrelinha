import { describe, expect, it } from 'vitest'
import {
  resolveItemPrice, isPriceError, isVariantAvailable, priceRange, variantLabel,
  type PricingContext, type PricedItem,
} from '../index'
import type { ProductOption, ProductVariant } from '@estrelinha/supabase/types'

// Testes derivados de PST-01 (AC 6-9), PST-08, PFM-15 e do "Done when" da T9.
//
// Este é o módulo com risco de dinheiro da fase: um fallback silencioso aqui é undercharge em
// TODO pedido. Por isso cada caminho de erro tem teste próprio e nenhum deles aceita "não lançou"
// como asserção.

const ctx = (
  products: Record<string, number> = {},
  variants: Record<string, { product_id: string; price: number | null }> = {},
): PricingContext => ({
  basePriceByProductId: new Map(Object.entries(products)),
  variantById: new Map(Object.entries(variants)),
})

const item = (over: Partial<PricedItem> = {}): PricedItem => ({
  product_id: 'p1',
  variant_id: null,
  price_source: 'base',
  ...over,
})

const priceOf = (r: ReturnType<typeof resolveItemPrice>) =>
  isPriceError(r) ? `ERRO:${r.error.code}` : r.price

describe('resolveItemPrice — price_source variant', () => {
  it('usa o preço da variação, não o base_price do produto', () => {
    const c = ctx({ p1: 14.9 }, { v1: { product_id: 'p1', price: 18.4 } })
    expect(priceOf(resolveItemPrice(item({ variant_id: 'v1', price_source: 'variant' }), c))).toBe(18.4)
  })

  it('variação inexistente → erro, NUNCA fallback para base_price', () => {
    const c = ctx({ p1: 14.9 }, {})
    const r = resolveItemPrice(item({ variant_id: 'sumiu', price_source: 'variant' }), c)
    expect(isPriceError(r)).toBe(true)
    expect((r as { error: { code: string } }).error.code).toBe('VARIANT_NOT_FOUND')
  })

  it('variação de OUTRO produto → erro (item forjado ou dado inconsistente)', () => {
    const c = ctx({ p1: 14.9, p2: 9.9 }, { v1: { product_id: 'p2', price: 18.4 } })
    const r = resolveItemPrice(item({ product_id: 'p1', variant_id: 'v1', price_source: 'variant' }), c)
    expect(isPriceError(r)).toBe(true)
    expect((r as { error: { code: string } }).error.code).toBe('VARIANT_PRODUCT_MISMATCH')
  })

  it('variação com price null → erro (é o estado das migradas pela T2)', () => {
    const c = ctx({ p1: 14.9 }, { v1: { product_id: 'p1', price: null } })
    const r = resolveItemPrice(item({ variant_id: 'v1', price_source: 'variant' }), c)
    expect(isPriceError(r)).toBe(true)
    expect((r as { error: { code: string } }).error.code).toBe('VARIANT_WITHOUT_PRICE')
  })

  it('price_source variant sem variant_id → erro', () => {
    const c = ctx({ p1: 14.9 }, {})
    const r = resolveItemPrice(item({ variant_id: null, price_source: 'variant' }), c)
    expect((r as { error: { code: string } }).error.code).toBe('VARIANT_ID_MISSING')
  })

  it('a mensagem de erro NOMEIA o item — o 422 precisa dizer qual falhou (PST-01 AC 9)', () => {
    const c = ctx({ p1: 14.9 }, { v1: { product_id: 'p1', price: null } })
    const r = resolveItemPrice(item({ variant_id: 'v1', price_source: 'variant' }), c)
    expect((r as { error: { message: string } }).error.message).toContain('v1')
  })

  it('preço 0 é preço válido, não ausência de preço', () => {
    const c = ctx({ p1: 14.9 }, { v1: { product_id: 'p1', price: 0 } })
    expect(priceOf(resolveItemPrice(item({ variant_id: 'v1', price_source: 'variant' }), c))).toBe(0)
  })
})

describe('resolveItemPrice — price_source base', () => {
  it('usa products.base_price', () => {
    expect(priceOf(resolveItemPrice(item(), ctx({ p1: 14.9 })))).toBe(14.9)
  })

  it('produto ausente → erro, sem fallback', () => {
    const r = resolveItemPrice(item({ product_id: 'fantasma' }), ctx({ p1: 14.9 }))
    expect(isPriceError(r)).toBe(true)
    expect((r as { error: { code: string } }).error.code).toBe('PRODUCT_NOT_FOUND')
  })

  it('base_price 0 é válido', () => {
    expect(priceOf(resolveItemPrice(item(), ctx({ p1: 0 })))).toBe(0)
  })
})

describe('resolveItemPrice — o caminho é o GRAVADO, não o inferido (PST-01 AC 6)', () => {
  it('item base num produto QUE TEM variação ativa segue cobrando base_price', () => {
    // Se a função reavaliasse "o produto tem grade?", criar uma variação depois do pedido
    // mudaria o valor de um pedido já fechado. Esta é a asserção que impede isso.
    const c = ctx({ p1: 14.9 }, { v1: { product_id: 'p1', price: 99.9 } })
    expect(priceOf(resolveItemPrice(item({ price_source: 'base' }), c))).toBe(14.9)
  })

  it('item variant NÃO cai em base_price quando a variação some', () => {
    const c = ctx({ p1: 14.9 }, {})
    const r = resolveItemPrice(item({ variant_id: 'v1', price_source: 'variant' }), c)
    expect(isPriceError(r)).toBe(true)
  })
})

describe('isVariantAvailable', () => {
  const v = (over: Partial<Pick<ProductVariant, 'stock' | 'is_active'>> = {}) =>
    ({ stock: 10, is_active: true, ...over })

  it('track com estoque → disponível; sem estoque → indisponível', () => {
    expect(isVariantAvailable(v({ stock: 10 }), 'track')).toBe(true)
    expect(isVariantAvailable(v({ stock: 0 }), 'track')).toBe(false)
  })

  it('backorder vende com saldo zero e negativo', () => {
    expect(isVariantAvailable(v({ stock: 0 }), 'backorder')).toBe(true)
    expect(isVariantAvailable(v({ stock: -5 }), 'backorder')).toBe(true)
  })

  it('none nunca esgota — é o modo dos personalizados', () => {
    expect(isVariantAvailable(v({ stock: 0 }), 'none')).toBe(true)
    expect(isVariantAvailable(v({ stock: -5 }), 'none')).toBe(true)
  })

  it.each(['track', 'backorder', 'none'] as const)(
    'pausada é indisponível mesmo com política %s — is_active vence a política',
    policy => {
      expect(isVariantAvailable(v({ is_active: false, stock: 999 }), policy)).toBe(false)
    },
  )
})

describe('priceRange', () => {
  const v = (price: number | null, is_active = true) => ({ price, is_active })

  it('devolve min, max e a contagem', () => {
    expect(priceRange([v(14.9), v(18.4), v(16.9)])).toEqual({ min: 14.9, max: 18.4, count: 3 })
  })

  it('ignora pausadas — a loja não pode anunciar preço que não se compra', () => {
    expect(priceRange([v(14.9), v(9.9, false)])).toEqual({ min: 14.9, max: 14.9, count: 1 })
  })

  it('ignora sem preço', () => {
    expect(priceRange([v(14.9), v(null)])).toEqual({ min: 14.9, max: 14.9, count: 1 })
  })

  it.each([
    ['lista vazia', []],
    ['só pausadas', [v(14.9, false)]],
    ['só sem preço', [v(null), v(null)]],
    ['pausadas e sem preço', [v(null), v(9.9, false)]],
  ])('%s → null', (_label, variants) => {
    expect(priceRange(variants)).toBeNull()
  })

  it('uma variação só: min = max, count 1', () => {
    expect(priceRange([v(14.9)])).toEqual({ min: 14.9, max: 14.9, count: 1 })
  })
})

describe('variantLabel', () => {
  const options: ProductOption[] = [
    { name: 'Tamanho', values: ['3,5 cm', '4,5 cm'], position: 0 },
    { name: 'Acabamento', values: ['Fosco', 'Brilhante'], position: 1 },
  ]

  it('respeita a ordem de position, não a ordem das chaves do objeto', () => {
    // Chaves deliberadamente na ordem INVERSA da de position.
    expect(variantLabel(options, { Acabamento: 'Fosco', Tamanho: '4,5 cm' })).toBe('4,5 cm · Fosco')
  })

  it('position fora de ordem no array também é respeitado', () => {
    const shuffled: ProductOption[] = [
      { name: 'Acabamento', values: [], position: 1 },
      { name: 'Tamanho', values: [], position: 0 },
    ]
    expect(variantLabel(shuffled, { Tamanho: '4,5 cm', Acabamento: 'Fosco' })).toBe('4,5 cm · Fosco')
  })

  it('um eixo só', () => {
    expect(variantLabel(options, { Tamanho: '3,5 cm' })).toBe('3,5 cm')
  })

  it('três eixos', () => {
    const three = [...options, { name: 'Cor', values: [], position: 2 }]
    expect(variantLabel(three, { Cor: 'Rosa', Tamanho: '4,5 cm', Acabamento: 'Fosco' }))
      .toBe('4,5 cm · Fosco · Rosa')
  })

  it('eixo órfão (existe em values, não em options) vai para o FIM em vez de sumir', () => {
    expect(variantLabel(options, { Tamanho: '4,5 cm', Estampa: 'Holográfica' }))
      .toBe('4,5 cm · Holográfica')
  })

  it('vários órfãos entram em ordem alfabética, para o rótulo ser determinístico', () => {
    expect(variantLabel([], { Zeta: 'Z', Alfa: 'A', Meio: 'M' })).toBe('A · M · Z')
  })

  it('valor vazio ou só espaço não vira separador solto', () => {
    expect(variantLabel(options, { Tamanho: '4,5 cm', Acabamento: '  ' })).toBe('4,5 cm')
    expect(variantLabel(options, { Tamanho: '', Acabamento: 'Fosco' })).toBe('Fosco')
  })

  it.each([
    ['values vazio', {}],
    ['values null', null],
    ['values undefined', undefined],
  ])('%s → string vazia', (_label, values) => {
    expect(variantLabel(options, values as never)).toBe('')
  })
})
