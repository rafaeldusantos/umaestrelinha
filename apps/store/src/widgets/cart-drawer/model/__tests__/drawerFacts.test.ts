import { describe, expect, it } from 'vitest'
import type { Product, ProductVariant } from '@estrelinha/supabase/types'
import type { CartItem } from '@/entities/cart/model/cartStore'
import { lowStockLabel, pickCrossSell, variantChips } from '../drawerFacts'

/**
 * Os 3 casos de `freeShippingProgress` SAÍRAM daqui na feature 37 e reapareceram em
 * `packages/core/src/shipping/__tests__/freeShipping.test.ts`, onde a regra passou a morar.
 *
 * É a migração de asserção prevista pelo `CLAUDE.md` — "queda só vale se o número reaparece do outro
 * lado" —, e o terceiro deles teve o **veredito invertido de propósito**: a função antiga tratava
 * faixa zerada como "frete grátis sempre", que era a leitura que custava dinheiro.
 */

let seq = 0
const variant = (overrides: Partial<ProductVariant> = {}): ProductVariant => ({
  id: `v${++seq}`,
  product_id: 'p1',
  option_values: { Tamanho: '4,5 cm' },
  name: null,
  sku: null,
  price: 14.9,
  compare_price: null,
  stock: 10,
  weight_kg: null,
  image_url: null,
  is_active: true,
  position: 0,
  ...overrides,
})

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Pin Gojo Satoru',
  slug: 'pin-gojo-satoru',
  price: 14.9,
  compare_price: null,
  category_id: 'c1',
  category_slug: 'anime',
  description: '',
  image_url: '',
  images: [],
  options: [],
  variants: [],
  stock_policy: 'track',
  category_links: [],
  stock_total: 10,
  low_stock_threshold: 3,
  is_new: false,
  is_featured: false,
  tags: [],
  ...overrides,
})

const item = (overrides: Partial<CartItem> = {}): CartItem => ({
  product: product(),
  size: '',
  finish: '',
  variantId: null,
  variantLabel: '',
  optionValues: {},
  unitPrice: 14.9,
  quantity: 1,
  ...overrides,
})

describe('lowStockLabel', () => {
  it('anuncia escassez quando o estoque bate no limiar', () => {
    expect(lowStockLabel(item({ product: product({ stock_total: 3 }) }))).toBe('Últimas 3!')
  })

  it('singular com uma unidade', () => {
    expect(lowStockLabel(item({ product: product({ stock_total: 1 }) }))).toBe('Última 1!')
  })

  it('acima do limiar não anuncia nada', () => {
    expect(lowStockLabel(item({ product: product({ stock_total: 9 }) }))).toBeNull()
  })

  it('só vale com `track` — em backorder o número no banco não limita a venda', () => {
    const p = product({ stock_total: 2, stock_policy: 'backorder' })
    expect(lowStockLabel(item({ product: p }))).toBeNull()
  })

  it('com grade, conta o estoque DA VARIAÇÃO, não o `stock_total` legado', () => {
    const v = variant({ stock: 2 })
    const p = product({ stock_total: 900, variants: [v] })
    expect(lowStockLabel(item({ product: p, variantId: v.id }))).toBe('Últimas 2!')
  })
})

describe('pickCrossSell', () => {
  const cheap = product({ id: 'a', name: 'Pin Sukuna', slug: 'sukuna', price: 12.9 })
  const mid = product({ id: 'b', name: 'Pin Luffy', slug: 'luffy', price: 14.9 })
  const pricey = product({ id: 'c', name: 'Pin Zoro', slug: 'zoro', price: 29.9 })

  it('sugere os mais baratos primeiro, respeitando o limite', () => {
    expect(pickCrossSell([pricey, cheap, mid], [], 2).map((p) => p.id)).toEqual(['a', 'b'])
  })

  it('não sugere o que já está na sacola', () => {
    const inCart = [item({ product: cheap })]
    expect(pickCrossSell([cheap, mid, pricey], inCart, 2).map((p) => p.id)).toEqual(['b', 'c'])
  })

  it('esgotado em `track` fica de fora — sugerir o que não dá para vender é armadilha', () => {
    const out = product({ id: 'd', price: 1, stock_total: 0 })
    expect(pickCrossSell([out, cheap], [], 2).map((p) => p.id)).toEqual(['a'])
  })

  it('grade toda esgotada fica de fora, mesmo com `stock_total` cheio', () => {
    const grid = product({
      id: 'e',
      price: 1,
      stock_total: 50,
      options: [{ name: 'Tamanho', values: ['4,5 cm'], position: 0 }],
      variants: [variant({ stock: 0 })],
    })
    expect(pickCrossSell([grid, cheap], [], 2).map((p) => p.id)).toEqual(['a'])
  })

  it('sem catálogo carregado, nenhuma sugestão', () => {
    expect(pickCrossSell(undefined, [], 2)).toEqual([])
  })
})

describe('variantChips', () => {
  it('quebra o rótulo nos eixos', () => {
    expect(variantChips(item({ variantLabel: '4,5 cm · Fosco' }))).toEqual(['4,5 cm', 'Fosco'])
  })

  it('produto sem grade não gera chip vazio', () => {
    expect(variantChips(item({ variantLabel: '' }))).toEqual([])
  })
})
