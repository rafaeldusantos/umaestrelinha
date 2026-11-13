import { describe, expect, it } from 'vitest'
import type { FilterCatalog } from '@estrelinha/core/filters'
import { mapDbToProduct } from '@/entities/product/lib/mapProduct'
import { defaultFilters, filterMatches, filterProducts, priceBounds, sortMatches, sortProducts } from '../filters'

// Durante a vigência, a peça de campanha conta nos filtros e na ordenação pelo preço com desconto.
// As peças vêm do MAPEADOR, como a categoria e a busca as recebem: o filtro não conhece campanha,
// lê o preço que a leitura entrega.

const CATALOGO: FilterCatalog = { groups: [], values: [] }
const CAMPANHA = {
  id: 'camp-bf',
  name: 'Black Friday',
  badge_text: 'Black Friday',
  band_color: '#161514',
  accent_color: '#C2A063',
  ends_at: '2026-12-01T03:00:00Z',
}

const peca = (id: string, base_price: number, percent: number | null, extra: Record<string, unknown> = {}) =>
  mapDbToProduct({
    id,
    name: id,
    slug: id,
    base_price,
    original_price: null,
    stock_policy: 'none',
    product_campaigns: percent === null ? [] : [{ percent, campaigns: CAMPANHA }],
    ...extra,
  })

// R$ 209,90 a 20% = R$ 167,92 — abaixo da peça comum de R$ 180.
const campanha = peca('campanha', 209.9, 20)
const comum = peca('comum', 180, null)
const cara = peca('cara', 250, null)

describe('filtros e ordenação com a peça de campanha', () => {
  it('"Com desconto" inclui a peça de campanha, sem "de/por" no cadastro', () => {
    const f = { ...defaultFilters(priceBounds([campanha, comum])), onSaleOnly: true }
    expect(filterProducts([campanha, comum], f, CATALOGO).map(p => p.id)).toEqual(['campanha'])
  })

  it('a régua de preço vai do preço com desconto', () => {
    expect(priceBounds([campanha, comum, cara])).toEqual([167, 250])
  })

  it('a faixa de preço filtra pelo preço com desconto', () => {
    // R$ 160–175: entra a de campanha (R$ 167,92), fica fora a comum (R$ 180) — e a de campanha
    // ficaria fora pelo preço cheio (R$ 209,90).
    const f = { ...defaultFilters(priceBounds([campanha, comum, cara])), priceRange: [160, 175] as [number, number] }
    expect(filterProducts([campanha, comum, cara], f, CATALOGO).map(p => p.id)).toEqual(['campanha'])
  })

  it('"Menor preço" ordena pelo preço com desconto', () => {
    expect(sortProducts([cara, comum, campanha], 'menor-preco').map(p => p.id)).toEqual(['campanha', 'comum', 'cara'])
    expect(sortProducts([campanha, comum, cara], 'maior-preco').map(p => p.id)).toEqual(['cara', 'comum', 'campanha'])
  })

  it('a variação casada também conta pelo próprio preço com desconto', () => {
    const comGrade = peca('grade', 200, 20, {
      options: [{ name: 'Cor', values: ['Ouro'], position: 0 }],
      product_variants: [
        { id: 'v1', price: 210, compare_price: null, stock: 5, is_active: true, position: 0, option_values: { Cor: 'Ouro' } },
      ],
    })
    const f = { ...defaultFilters([0, 1000]), onSaleOnly: true, priceRange: [160, 170] as [number, number] }
    // 20% sobre os R$ 210 da variação = R$ 168.
    const [m] = filterMatches([comGrade, comum], f, CATALOGO)
    expect(m.product.id).toBe('grade')
    expect(sortMatches([{ product: comum, variant: null }, m], 'menor-preco')[0].product.id).toBe('grade')
  })
})
