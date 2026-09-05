// PLS-01 — a consulta da listagem, expressa como dado.
//
// O filtro sai do `useMemo` sobre o catálogo inteiro e vira uma DESCRIÇÃO que o hook traduz para o
// PostgREST. Separado do hook porque é a parte que pode errar em silêncio (uma visão filtrando a
// coluna errada não quebra nada, só mostra a lista errada) — e porque é testável sem montar tela.
//
// As formas de filtro daqui foram conferidas contra o PostgREST local antes de escritas: `count`
// exato com `Range`, `images=eq.[]`, `seo_title.eq.` (string vazia), dois `or=` no mesmo request
// (que o PostgREST combina com AND) e `product_variants!inner` para casar SKU.

import type { ProductImage, ProductOption, ProductVariant, StockPolicy } from '@estrelinha/supabase/types'

/** As visões fixas do artboard. Visões do usuário viram um `ProductFilters` salvo (A22). */
export type ProductViewId =
  | 'todos'
  | 'ativos'
  | 'rascunhos'
  | 'sem-estoque'
  | 'sem-imagem'
  | 'sem-seo'
  | 'agendados'

export const PRODUCT_VIEWS: { id: ProductViewId; label: string }[] = [
  { id: 'todos', label: 'Todos' },
  { id: 'ativos', label: 'Ativos' },
  { id: 'rascunhos', label: 'Rascunhos' },
  { id: 'sem-estoque', label: 'Sem estoque' },
  { id: 'sem-imagem', label: 'Sem imagem' },
  { id: 'sem-seo', label: 'Sem SEO' },
  { id: 'agendados', label: 'Agendados' },
]

export type ProductSortKey = 'name' | 'price' | 'stock' | 'created'

export interface ProductFilters {
  view: ProductViewId
  categoryIds: string[]
  tags: string[]
  priceMin: number | null
  priceMax: number | null
}

export interface ProductQuery {
  page: number
  pageSize: number
  search: string
  filters: ProductFilters
  sort: { key: ProductSortKey; dir: 'asc' | 'desc' }
}

export const emptyFilters = (): ProductFilters => ({
  view: 'todos',
  categoryIds: [],
  tags: [],
  priceMin: null,
  priceMax: null,
})

export const defaultQuery = (): ProductQuery => ({
  page: 1,
  pageSize: 25,
  search: '',
  filters: emptyFilters(),
  sort: { key: 'created', dir: 'desc' },
})

/** Quantos filtros (fora a visão) estão ativos — alimenta os chips e o "limpar". */
export const activeFilterCount = (filters: ProductFilters): number =>
  (filters.categoryIds.length > 0 ? 1 : 0) +
  (filters.tags.length > 0 ? 1 : 0) +
  (filters.priceMin !== null || filters.priceMax !== null ? 1 : 0)

/** A coluna do `order` do PostgREST para cada chave de ordenação da tela. */
export const SORT_COLUMN: Record<ProductSortKey, string> = {
  name: 'name',
  price: 'base_price',
  stock: 'stock_total',
  created: 'created_at',
}

/**
 * Aritmética de página e escape de busca — **reexportados de `@estrelinha/core/paging`**.
 *
 * Moravam aqui, com um consumidor só. A feature 34 trouxe o segundo (as listagens de pedidos e de
 * clientes fazem a mesma conta), e pela consequência 1 do defeito 01 do repositório a regra passou
 * a ter dono único. A reexportação existe para que `AdminProductsPage` e os testes desta listagem
 * sigam importando daqui, sem alteração.
 */
export { pageRange, rangeLabel, escapeSearchTerm } from '@estrelinha/core/paging'

export interface AdminListRow {
  id: string
  name: string
  slug: string
  price: number
  compare_price: number | null
  images: ProductImage[]
  tags: string[]
  is_active: boolean
  stock_total: number
  low_stock_threshold: number
  stock_policy: StockPolicy
  options: ProductOption[]
  variants: ProductVariant[]
  category_ids: string[]
  seo_title: string | null
  seo_description: string | null
  scheduled_at: string | null
  created_at: string
  updated_at: string | null
}
