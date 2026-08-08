import { describe, expect, it } from 'vitest'
import type { Product } from '@estrelinha/supabase/types'
import {
  activeFilterChips,
  clearFilterChip,
  collectTags,
  defaultFilters,
  filterProducts,
  hasActiveFilters,
  priceBounds,
  sortProducts,
  toggleTag,
} from '../filters'

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Botton',
  slug: 'botton',
  price: 8.9,
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
  low_stock_threshold: 5,
  is_new: false,
  is_featured: false,
  tags: [],
  ...overrides,
})

describe('priceBounds', () => {
  it('arredonda para fora, para o slider nunca cortar o produto mais caro', () => {
    expect(priceBounds([product({ price: 7.5 }), product({ price: 12.9 })])).toEqual([7, 13])
  })

  it('coleção vazia cai numa faixa neutra em vez de [Infinity, -Infinity]', () => {
    expect(priceBounds([])).toEqual([0, 20])
  })
})

describe('filterProducts', () => {
  const bounds: [number, number] = [0, 20]
  const base = defaultFilters(bounds)

  it('"com desconto" exige compare_price MAIOR que o preço, não só preenchido', () => {
    const riscado = product({ id: 'a', price: 8.9, compare_price: 12.9 })
    const igual = product({ id: 'b', price: 8.9, compare_price: 8.9 })
    const semNada = product({ id: 'c', price: 8.9, compare_price: null })

    const out = filterProducts([riscado, igual, semNada], { ...base, onSaleOnly: true })
    expect(out.map(p => p.id)).toEqual(['a'])
  })

  it('"em estoque" respeita a stock_policy: none nunca esgota (PST-08 AC 6)', () => {
    const semSaldoTrack = product({ id: 'a', stock_total: 0, stock_policy: 'track' })
    const semSaldoNone = product({ id: 'b', stock_total: 0, stock_policy: 'none' })

    const out = filterProducts([semSaldoTrack, semSaldoNone], { ...base, inStockOnly: true })
    expect(out.map(p => p.id)).toEqual(['b'])
  })

  it('universo é OU entre as tags — marcar duas não devolve a interseção vazia', () => {
    const naruto = product({ id: 'a', tags: ['Naruto'] })
    const onePiece = product({ id: 'b', tags: ['One Piece'] })
    const outro = product({ id: 'c', tags: ['Bleach'] })

    const out = filterProducts([naruto, onePiece, outro], {
      ...base,
      tags: ['Naruto', 'One Piece'],
    })
    expect(out.map(p => p.id)).toEqual(['a', 'b'])
  })

  it('a faixa de preço corta pelas duas pontas, inclusiva', () => {
    const items = [product({ id: 'a', price: 5 }), product({ id: 'b', price: 10 }), product({ id: 'c', price: 15 })]
    const out = filterProducts(items, { ...base, priceRange: [5, 10] })
    expect(out.map(p => p.id)).toEqual(['a', 'b'])
  })
})

describe('hasActiveFilters', () => {
  const bounds: [number, number] = [5, 15]

  it('faixa inteira selecionada não conta como filtro ativo', () => {
    expect(hasActiveFilters(defaultFilters(bounds), bounds)).toBe(false)
  })

  it('encolher a faixa conta', () => {
    expect(hasActiveFilters({ ...defaultFilters(bounds), priceRange: [6, 15] }, bounds)).toBe(true)
  })
})

describe('chips', () => {
  const bounds: [number, number] = [0, 20]

  it('lista tags e interruptores, e nunca a faixa de preço — o slider já a representa', () => {
    const f = { ...defaultFilters(bounds), tags: ['Naruto'], inStockOnly: true, priceRange: [3, 9] as [number, number] }
    expect(activeFilterChips(f)).toEqual([
      { key: 'tag:Naruto', label: 'Naruto' },
      { key: 'inStockOnly', label: 'Em estoque' },
    ])
  })

  it('fechar o chip de uma tag tira só aquela tag', () => {
    const f = { ...defaultFilters(bounds), tags: ['Naruto', 'One Piece'] }
    expect(clearFilterChip(f, 'tag:Naruto').tags).toEqual(['One Piece'])
  })

  it('fechar o chip de um interruptor o desliga', () => {
    const f = { ...defaultFilters(bounds), inStockOnly: true }
    expect(clearFilterChip(f, 'inStockOnly').inStockOnly).toBe(false)
  })

  it('tag com o mesmo nome de um interruptor não desliga o interruptor', () => {
    const f = { ...defaultFilters(bounds), tags: ['inStockOnly'], inStockOnly: true }
    const out = clearFilterChip(f, 'tag:inStockOnly')
    expect(out.tags).toEqual([])
    expect(out.inStockOnly).toBe(true)
  })
})

describe('toggleTag / collectTags', () => {
  it('alterna a tag sem mexer no resto do estado', () => {
    const f = defaultFilters([0, 20])
    expect(toggleTag(f, 'Naruto').tags).toEqual(['Naruto'])
    expect(toggleTag(toggleTag(f, 'Naruto'), 'Naruto').tags).toEqual([])
  })

  it('junta as tags da coleção sem repetir, em ordem estável', () => {
    const items = [product({ tags: ['One Piece', 'Naruto'] }), product({ tags: ['Naruto'] })]
    expect(collectTags(items)).toEqual(['Naruto', 'One Piece'])
  })
})

describe('sortProducts', () => {
  const items = [
    product({ id: 'a', price: 12, is_new: false }),
    product({ id: 'b', price: 7, is_new: true }),
    product({ id: 'c', price: 9, is_new: false }),
  ]

  it('relevância preserva a ordem que veio do banco', () => {
    expect(sortProducts(items, 'relevancia').map(p => p.id)).toEqual(['a', 'b', 'c'])
  })

  it('menor e maior preço', () => {
    expect(sortProducts(items, 'menor-preco').map(p => p.id)).toEqual(['b', 'c', 'a'])
    expect(sortProducts(items, 'maior-preco').map(p => p.id)).toEqual(['a', 'c', 'b'])
  })

  it('novidades sobe os is_new e não muta a lista original', () => {
    expect(sortProducts(items, 'novidades')[0].id).toBe('b')
    expect(items.map(p => p.id)).toEqual(['a', 'b', 'c'])
  })
})
