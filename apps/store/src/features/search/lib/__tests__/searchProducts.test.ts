import { describe, it, expect } from 'vitest'
import { searchProducts, normalizeTerm, MIN_QUERY_LENGTH } from '../searchProducts'
import type { Category, Product } from '@estrelinha/supabase/types'

const product = (over: Partial<Product> & { name: string }): Product =>
  ({
    id: over.name,
    slug: over.name.toLowerCase().replace(/\s+/g, '-'),
    price: 14.9,
    compare_price: null,
    category_id: '',
    category_slug: '',
    description: '',
    image_url: '',
    images: [],
    options: [],
    variants: [],
    stock_policy: 'ignore',
    category_links: [],
    stock_total: 0,
    low_stock_threshold: 5,
    is_new: false,
    is_featured: false,
    tags: [],
    ...over,
  }) as Product

const cat = (id: string, name: string): Category =>
  ({ id, name, slug: id, description: null, image_url: null, color_accent: null, icon: null, parent_id: null, sort_order: 0 }) as Category

const names = (hits: ReturnType<typeof searchProducts>) => hits.map((h) => h.product.name)

describe('searchProducts', () => {
  it('ignora consulta abaixo do mínimo', () => {
    const items = [product({ name: 'Pin Naruto' })]
    expect(searchProducts(items, 'n')).toEqual([])
    expect(searchProducts(items, '   ')).toEqual([])
    expect(MIN_QUERY_LENGTH).toBe(2)
  })

  it('casa sem acento nos dois sentidos — é como se digita no celular', () => {
    const items = [product({ name: 'Pin Pokémon Pikachu' })]
    expect(names(searchProducts(items, 'pokemon'))).toEqual(['Pin Pokémon Pikachu'])
    expect(names(searchProducts([product({ name: 'Pin Pokemon' })], 'pokémon'))).toEqual(['Pin Pokemon'])
  })

  it('exige todos os termos, em qualquer ordem', () => {
    const items = [
      product({ name: 'Pin Naruto Chibi' }),
      product({ name: 'Pin Naruto Sennin' }),
    ]
    expect(names(searchProducts(items, 'chibi naruto'))).toEqual(['Pin Naruto Chibi'])
  })

  it('ranqueia nome acima de tag, tag acima de descrição', () => {
    const items = [
      product({ name: 'Chaveiro Sakura', description: 'inspirado em naruto' }),
      product({ name: 'Pin Kunai', tags: ['naruto'] }),
      product({ name: 'Naruto Uzumaki' }),
    ]
    expect(names(searchProducts(items, 'naruto'))).toEqual([
      'Naruto Uzumaki',
      'Pin Kunai',
      'Chaveiro Sakura',
    ])
  })

  it('casa pelo nome da categoria quando elas são passadas', () => {
    const categories = [cat('c1', 'K-Pop')]
    const items = [product({ name: 'Pin Lightstick', category_links: [{ category_id: 'c1', position: 0 }] as never })]
    expect(names(searchProducts(items, 'k-pop', { categories }))).toEqual(['Pin Lightstick'])
    // Sem as categorias, o mesmo termo não tem onde casar.
    expect(searchProducts(items, 'k-pop')).toEqual([])
  })

  it('desempata por nome, para a ordem não mudar entre renders', () => {
    const items = [product({ name: 'Pin Zoro' }), product({ name: 'Pin Ace' })]
    expect(names(searchProducts(items, 'pin'))).toEqual(['Pin Ace', 'Pin Zoro'])
  })

  it('respeita o limite e aceita catálogo ausente', () => {
    const items = [product({ name: 'Pin A' }), product({ name: 'Pin B' }), product({ name: 'Pin C' })]
    expect(searchProducts(items, 'pin', { limit: 2 })).toHaveLength(2)
    expect(searchProducts(undefined, 'pin')).toEqual([])
  })

  it('normalizeTerm tira acento, caixa e espaço', () => {
    expect(normalizeTerm('  Jujutsu KAISEN  ')).toBe('jujutsu kaisen')
    expect(normalizeTerm('Coração')).toBe('coracao')
  })
})
