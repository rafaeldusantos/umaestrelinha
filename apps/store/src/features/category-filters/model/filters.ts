// Regras da listagem de categoria: o que cada filtro derruba e como a ordenação decide.
//
// Funções puras de propósito. O que precisa de prova é a regra — "com desconto" é
// `compare_price > price`, não "tem compare_price" — e não o DOM do painel, que aparece em duas
// superfícies (sidebar no desktop, bottom sheet no mobile) sobre exatamente este estado.

import { isProductOutOfStock } from '@/entities/product/lib/availability'
import type { Product } from '@estrelinha/supabase/types'

export type SortOption = 'relevancia' | 'menor-preco' | 'maior-preco' | 'novidades'

export const SORT_LABELS: Record<SortOption, string> = {
  relevancia: 'Relevância',
  'menor-preco': 'Menor preço',
  'maior-preco': 'Maior preço',
  novidades: 'Novidades',
}

/** Os três interruptores de "Disponibilidade" do board, mais preço e universo. */
export interface CategoryFilters {
  priceRange: [number, number]
  tags: string[]
  inStockOnly: boolean
  onSaleOnly: boolean
  newOnly: boolean
}

export const defaultFilters = (bounds: [number, number]): CategoryFilters => ({
  priceRange: bounds,
  tags: [],
  inStockOnly: false,
  onSaleOnly: false,
  newOnly: false,
})

/** A faixa de preço da coleção. Vira o mínimo/máximo do slider e o estado "sem filtro de preço". */
export const priceBounds = (products: readonly Product[]): [number, number] => {
  if (products.length === 0) return [0, 20]
  const prices = products.map(p => p.price)
  return [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))]
}

const hasDiscount = (p: Product) => p.compare_price !== null && p.compare_price > p.price

const priceUntouched = (f: CategoryFilters, bounds: [number, number]) =>
  f.priceRange[0] <= bounds[0] && f.priceRange[1] >= bounds[1]

export const hasActiveFilters = (f: CategoryFilters, bounds: [number, number]): boolean =>
  f.tags.length > 0 || f.inStockOnly || f.onSaleOnly || f.newOnly || !priceUntouched(f, bounds)

/**
 * Os chips removíveis acima do grid (board desktop: "Naruto ✕  Em estoque ✕").
 *
 * A faixa de preço não vira chip: ela já tem representação permanente no slider, e um chip
 * "R$ 0 — R$ 12" que some ao ser fechado esconderia o controle que o cliente acabou de mexer.
 */
export const activeFilterChips = (
  f: CategoryFilters,
): { key: string; label: string }[] => [
  ...f.tags.map(tag => ({ key: `tag:${tag}`, label: tag })),
  ...(f.inStockOnly ? [{ key: 'inStockOnly', label: 'Em estoque' }] : []),
  ...(f.onSaleOnly ? [{ key: 'onSaleOnly', label: 'Com desconto' }] : []),
  ...(f.newOnly ? [{ key: 'newOnly', label: 'Novidades' }] : []),
]

/** Desfaz um chip. `tag:` volta ao array de universos; o resto são os interruptores. */
export const clearFilterChip = (f: CategoryFilters, key: string): CategoryFilters => {
  if (key.startsWith('tag:')) {
    const tag = key.slice(4)
    return { ...f, tags: f.tags.filter(t => t !== tag) }
  }
  return { ...f, [key]: false }
}

export const toggleTag = (f: CategoryFilters, tag: string): CategoryFilters => ({
  ...f,
  tags: f.tags.includes(tag) ? f.tags.filter(t => t !== tag) : [...f.tags, tag],
})

/** Os universos disponíveis na coleção, em ordem alfabética estável. */
export const collectTags = (products: readonly Product[]): string[] =>
  Array.from(new Set(products.flatMap(p => p.tags))).sort((a, b) => a.localeCompare(b))

export const filterProducts = (
  products: readonly Product[],
  f: CategoryFilters,
): Product[] =>
  products.filter(p => {
    if (p.price < f.priceRange[0] || p.price > f.priceRange[1]) return false
    if (f.inStockOnly && isProductOutOfStock(p)) return false
    if (f.onSaleOnly && !hasDiscount(p)) return false
    if (f.newOnly && !p.is_new) return false
    // Universo é OU entre as tags escolhidas: marcar "Naruto" e "One Piece" mostra os dois, não a
    // interseção — que seria sempre vazia.
    if (f.tags.length > 0 && !f.tags.some(t => p.tags.includes(t))) return false
    return true
  })

export const sortProducts = (products: readonly Product[], sort: SortOption): Product[] => {
  const out = [...products]
  switch (sort) {
    case 'menor-preco':
      return out.sort((a, b) => a.price - b.price)
    case 'maior-preco':
      return out.sort((a, b) => b.price - a.price)
    case 'novidades':
      return out.sort((a, b) => Number(b.is_new) - Number(a.is_new))
    default:
      return out
  }
}
