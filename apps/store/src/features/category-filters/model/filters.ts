// Regras da listagem filtrável (categoria e busca): o que cada filtro derruba e como a ordenação
// decide.
//
// Funções puras de propósito. O que precisa de prova é a regra — "com desconto" é
// `compare_price > price`, não "tem compare_price" — e não o DOM do painel, que aparece em duas
// superfícies (sidebar no desktop, bottom sheet no mobile) sobre exatamente este estado.
//
// **Feature 66 — os filtros curados substituem o "Universo" por tag.** O estado é o `FilterState`
// de `@estrelinha/core/filters` (o mesmo que vai para a URL), e quem decide "este produto passa pela
// seleção dos grupos?" e "quanto este valor conta?" é `core` — OU dentro do grupo, E entre grupos,
// faceta disjuntiva. Este arquivo só soma os filtros de SISTEMA (preço, estoque, desconto,
// novidade), que são da loja, e traduz a regra para o que o painel desenha. A tag do produto é
// etiqueta interna da dona e nenhum filtro a lê (`filtroSemTag.test.ts`).

import { isProductOutOfStock } from '@/entities/product/lib/availability'
import {
  DEFAULT_FILTER_SORT,
  FILTER_SORT_OPTIONS,
  defaultFilterState,
  facetCounts,
  passesSelection,
  visibleGroups,
  type FilterCatalog,
  type FilterGroup,
  type FilterSort,
  type FilterState,
  type FilterValue,
} from '@estrelinha/core/filters'
import type { Product } from '@estrelinha/supabase/types'

export type SortOption = FilterSort

export const SORT_LABELS: Record<SortOption, string> = {
  relevancia: 'Relevância',
  'menor-preco': 'Menor preço',
  'maior-preco': 'Maior preço',
  novidades: 'Novidades',
}

/** As opções na ordem de `core` — o seletor e a URL leem a mesma lista. */
export const SORT_OPTIONS: readonly SortOption[] = FILTER_SORT_OPTIONS

/**
 * O estado inteiro da listagem: preço, os três interruptores de "Disponibilidade", a seleção dos
 * grupos curados (por slug) e a ordem. É o `FilterState` de `core` — um tipo só para a tela e para
 * a URL, senão os dois divergem.
 */
export type CategoryFilters = FilterState

export const defaultFilters = (bounds: [number, number]): CategoryFilters => defaultFilterState(bounds)

/**
 * "Limpar filtros": tudo volta ao padrão, **menos a ordem**. A ordem não é filtro — ela não some da
 * lista nada — e zerá-la ao limpar faria a lista pular de posição sem a cliente ter pedido.
 */
export const clearFilters = (f: CategoryFilters, bounds: [number, number]): CategoryFilters => ({
  ...defaultFilterState(bounds),
  sort: f.sort ?? DEFAULT_FILTER_SORT,
})

/**
 * O catálogo como ESTA página o enxerga: sem os grupos escondidos na categoria (feature 66, P2).
 *
 * Filtrar o catálogo — e não só a lista de blocos — é o que faz um grupo escondido que chegue pela
 * URL ser ignorado por inteiro: `parseFilterParams` não o reconhece, `passesSelection` não o aplica
 * e nenhum chip o nomeia. Esconder só o bloco deixaria a seleção dele filtrando a lista sem
 * controle nenhum na tela para desfazê-la.
 */
export const catalogWithout = (
  catalog: FilterCatalog,
  hiddenGroupIds: readonly string[] = [],
): FilterCatalog => {
  if (hiddenGroupIds.length === 0) return catalog
  const groups = catalog.groups.filter(g => !hiddenGroupIds.includes(g.id))
  const ids = new Set(groups.map(g => g.id))
  return { groups, values: catalog.values.filter(v => ids.has(v.group_id)) }
}

/** A faixa de preço da coleção. Vira o mínimo/máximo do slider e o estado "sem filtro de preço". */
export const priceBounds = (products: readonly Product[]): [number, number] => {
  if (products.length === 0) return [0, 20]
  const prices = products.map(p => p.price)
  return [Math.floor(Math.min(...prices)), Math.ceil(Math.max(...prices))]
}

const hasDiscount = (p: Product) => p.compare_price !== null && p.compare_price > p.price

const priceUntouched = (f: CategoryFilters, bounds: [number, number]) =>
  f.priceRange[0] <= bounds[0] && f.priceRange[1] >= bounds[1]

const selectionCount = (f: CategoryFilters): number =>
  Object.values(f.selection ?? {}).reduce((n, slugs) => n + (slugs?.length ?? 0), 0)

export const hasActiveFilters = (f: CategoryFilters, bounds: [number, number]): boolean =>
  selectionCount(f) > 0 || f.inStockOnly || f.onSaleOnly || f.newOnly || !priceUntouched(f, bounds)

/** Os filtros de sistema — preço, estoque, desconto, novidade. São da loja, não do catálogo. */
export const passesSystem = (p: Product, f: CategoryFilters): boolean => {
  if (p.price < f.priceRange[0] || p.price > f.priceRange[1]) return false
  if (f.inStockOnly && isProductOutOfStock(p)) return false
  if (f.onSaleOnly && !hasDiscount(p)) return false
  if (f.newOnly && !p.is_new) return false
  return true
}

/** O produto como a regra de `core` o lê: só os ids marcados, nunca `undefined`. */
const filtravel = (p: Product) => ({ filter_value_ids: p.filter_value_ids ?? [] })

/**
 * A ordem que a Adri arrastou no painel (`sort_order`). Comparação por função, e não pela subtração
 * escrita inline: a forma inline é a assinatura que `medicaoComDonoUnico.test.ts` procura para a
 * régua de ordenação da CATEGORIA de exibição, que é outra regra e tem outro dono.
 */
const crescente = (x: number, y: number): number => (x < y ? -1 : x > y ? 1 : 0)
const porOrdemDoPainel = (a: { sort_order: number }, b: { sort_order: number }): number =>
  crescente(a.sort_order, b.sort_order)

const valueChipKey = (groupSlug: string, valueSlug: string) => `valor:${groupSlug}:${valueSlug}`

/**
 * Os chips removíveis acima do grid: um por valor marcado (FLT-25) e um por interruptor ligado.
 *
 * O chip de valor nomeia **só o valor** ("Prata 925"), na ordem do painel — dois valores com o mesmo
 * nome em grupos diferentes continuam sendo dois chips, porque a chave carrega o grupo. Slug que o
 * catálogo não conhece não vira chip: não há nome para mostrar, e `core` já o ignora no filtro.
 *
 * A faixa de preço não vira chip: ela já tem representação permanente no slider, e um chip
 * "R$ 0 — R$ 12" que some ao ser fechado esconderia o controle que a cliente acabou de mexer.
 */
export const activeFilterChips = (
  f: CategoryFilters,
  catalog: FilterCatalog,
): { key: string; label: string }[] => {
  const valores: { key: string; label: string }[] = []
  const grupos = [...catalog.groups].filter(g => g.is_active).sort(porOrdemDoPainel)
  for (const grupo of grupos) {
    const escolhidos = f.selection?.[grupo.slug]
    if (!escolhidos?.length) continue
    catalog.values
      .filter(v => v.group_id === grupo.id && escolhidos.includes(v.slug))
      .sort(porOrdemDoPainel)
      .forEach(v => valores.push({ key: valueChipKey(grupo.slug, v.slug), label: v.name }))
  }
  return [
    ...valores,
    ...(f.inStockOnly ? [{ key: 'inStockOnly', label: 'Em estoque' }] : []),
    ...(f.onSaleOnly ? [{ key: 'onSaleOnly', label: 'Com desconto' }] : []),
    ...(f.newOnly ? [{ key: 'newOnly', label: 'Novidades' }] : []),
  ]
}

/** Desmarca um valor de um grupo; o grupo sem valor nenhum sai da seleção. */
const withoutValue = (f: CategoryFilters, groupSlug: string, valueSlug: string): CategoryFilters => {
  const restantes = (f.selection?.[groupSlug] ?? []).filter(s => s !== valueSlug)
  const selection = { ...(f.selection ?? {}) }
  if (restantes.length > 0) selection[groupSlug] = restantes
  else delete selection[groupSlug]
  return { ...f, selection }
}

/** Desfaz um chip. `valor:` desmarca aquele valor; o resto são os interruptores. */
export const clearFilterChip = (f: CategoryFilters, key: string): CategoryFilters => {
  if (key.startsWith('valor:')) {
    const [, groupSlug, valueSlug] = key.split(':')
    return withoutValue(f, groupSlug, valueSlug)
  }
  if (key === 'inStockOnly' || key === 'onSaleOnly' || key === 'newOnly') return { ...f, [key]: false }
  return f
}

/** Marca ou desmarca um valor de um grupo, sem mexer no resto do estado. */
export const toggleFilterValue = (
  f: CategoryFilters,
  groupSlug: string,
  valueSlug: string,
): CategoryFilters => {
  if ((f.selection?.[groupSlug] ?? []).includes(valueSlug)) return withoutValue(f, groupSlug, valueSlug)
  return {
    ...f,
    selection: { ...(f.selection ?? {}), [groupSlug]: [...(f.selection?.[groupSlug] ?? []), valueSlug] },
  }
}

export const filterProducts = (
  products: readonly Product[],
  f: CategoryFilters,
  catalog: FilterCatalog,
): Product[] =>
  products.filter(p => passesSystem(p, f) && passesSelection(filtravel(p), f.selection ?? {}, catalog))

/** Um valor como o painel o desenha. */
export interface FilterBlockValue {
  value: FilterValue
  /** Quantos produtos sobram se a cliente tocar aqui (faceta disjuntiva, FLT-22). */
  count: number
  selected: boolean
  /** Zero com a seleção atual e não marcado: aparece, mas não se toca (FLT-24). */
  disabled: boolean
}

/** Um bloco do painel: um grupo visível e os valores dele presentes na base. */
export interface FilterBlock {
  group: FilterGroup
  values: FilterBlockValue[]
}

/**
 * Os blocos do painel (FLT-21, FLT-22, FLT-24). `base` é a coleção inteira (ou o resultado da
 * busca), **antes** de qualquer filtro: é ela que decide quais valores existem; a seleção só decide
 * as contagens. Por isso um valor zerado pela seleção continua no bloco, desabilitado — sumir faria
 * o painel pular a cada toque.
 */
export const filterBlocks = (
  products: readonly Product[],
  f: CategoryFilters,
  catalog: FilterCatalog,
): FilterBlock[] => {
  const base = products.map(p => ({ p, ...filtravel(p) }))
  const counts = facetCounts(catalog, base, f.selection ?? {}, item => passesSystem(item.p, f))
  return visibleGroups(catalog, base).map(({ group, values }) => ({
    group,
    values: values.map(value => {
      const count = counts[value.id] ?? 0
      const selected = (f.selection?.[group.slug] ?? []).includes(value.slug)
      return { value, count, selected, disabled: count === 0 && !selected }
    }),
  }))
}

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
