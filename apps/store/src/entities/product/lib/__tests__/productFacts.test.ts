import { describe, expect, it } from 'vitest'
import type { Product, ProductVariant } from '@estrelinha/supabase/types'
import { productSpecs, savingsOf, stockLineOf } from '../productFacts'

const product = (overrides: Partial<Product> = {}): Product =>
  ({
    id: 'p1',
    name: 'Botton Sailor Moon',
    slug: 'botton-sailor-moon',
    price: 8.9,
    compare_price: null,
    category_id: '',
    category_slug: '',
    description: '',
    image_url: '',
    images: [],
    options: [],
    variants: [],
    stock_policy: 'track',
    category_links: [],
    stock_total: 10,
    low_stock_threshold: 5,
    is_new: false,
    is_featured: false,
    tags: [],
    ...overrides,
  }) as Product

const variant = (overrides: Partial<ProductVariant> = {}): ProductVariant => ({
  id: 'v1',
  product_id: 'p1',
  option_values: { Tamanho: '4,5 cm' },
  name: null,
  sku: null,
  price: 9.4,
  compare_price: null,
  stock: 10,
  weight_kg: null,
  image_url: null,
  is_active: true,
  position: 0,
  ...overrides,
})

const GRID = {
  options: [{ name: 'Tamanho', values: ['4,5 cm'], position: 0 }],
}

describe('savingsOf — a pílula "Economize R$ X"', () => {
  it('desconta contra o preço COBRADO, não contra o base_price', () => {
    // Linha escolhida custa 9,40; a comparação é 12,00 — economia de 2,60, não a do base_price.
    expect(savingsOf(product({ compare_price: 12 }), 9.4)).toEqual({
      compareAt: 12,
      saved: 2.6,
      percent: 22,
    })
  })

  it('compare_price menor que o preço é cadastro torto — não anuncia economia negativa', () => {
    expect(savingsOf(product({ compare_price: 5 }), 8.9)).toBeNull()
  })

  it('compare_price igual ao preço não é desconto', () => {
    expect(savingsOf(product({ compare_price: 8.9 }), 8.9)).toBeNull()
  })

  it('sem compare_price não há pílula', () => {
    expect(savingsOf(product(), 8.9)).toBeNull()
  })
})

describe('stockLineOf — o saldo que a página anuncia (PST-08)', () => {
  it('policy track, saldo folgado: "Em estoque", sem contagem', () => {
    expect(stockLineOf(product({ stock_total: 40 }), null)).toEqual({
      tone: 'in',
      label: 'Em estoque',
      note: null,
    })
  })

  it('saldo dentro do limiar vira escassez com a contagem do board', () => {
    expect(stockLineOf(product({ stock_total: 3, low_stock_threshold: 5 }), null)).toEqual({
      tone: 'low',
      label: 'Últimas unidades',
      note: '— apenas 3 restantes',
    })
  })

  it('uma unidade fala no singular', () => {
    expect(stockLineOf(product({ stock_total: 1 }), null).note).toBe('— apenas 1 restante')
  })

  it('policy diferente de track nunca esgota nem conta — não se inventa escassez', () => {
    expect(stockLineOf(product({ stock_policy: 'none', stock_total: 0 }), null)).toEqual({
      tone: 'in',
      label: 'Em estoque',
      note: null,
    })
    expect(stockLineOf(product({ stock_policy: 'backorder', stock_total: 2 }), null).note).toBeNull()
  })

  it('saldo zero em track é "Esgotado"', () => {
    expect(stockLineOf(product({ stock_total: 0 }), null).tone).toBe('out')
  })

  it('com grade vendável o saldo é o da LINHA, não o stock_total do produto', () => {
    const p = product({
      ...GRID,
      stock_total: 500,
      variants: [variant({ stock: 2 })],
    })

    expect(stockLineOf(p, variant({ stock: 2 }))).toEqual({
      tone: 'low',
      label: 'Últimas unidades',
      note: '— apenas 2 restantes',
    })
  })

  it('com grade e nenhuma linha casada, a página não promete estoque', () => {
    const p = product({ ...GRID, stock_total: 500, variants: [variant()] })
    expect(stockLineOf(p, null).tone).toBe('out')
  })
})

describe('productSpecs — a ficha do acordeão', () => {
  it('tira o diâmetro e o peso do cadastro, com vírgula decimal e gramas', () => {
    const specs = productSpecs(product({ width_cm: 3.8, weight_kg: 0.01 }))
    expect(specs).toContain('Tamanho: 3,8 cm de diâmetro')
    expect(specs).toContain('Peso: 10g')
  })

  it('sem medida cadastrada o item some — não se publica um 3,8 cm inventado', () => {
    const specs = productSpecs(product())
    expect(specs.some(s => s.startsWith('Tamanho:'))).toBe(false)
    expect(specs.some(s => s.startsWith('Peso:'))).toBe(false)
    expect(specs).toContain('Material: metal com acabamento premium')
  })

  it('cai em height_cm quando só ela está cadastrada', () => {
    expect(productSpecs(product({ height_cm: 5 }))).toContain('Tamanho: 5 cm de diâmetro')
  })
})
