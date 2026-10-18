// Filtros de produto (feature 66) — o estado da listagem ⇄ a URL (FLT-29..34).
//
//   ?acabamento=prata-925,ouro&preco=10-80&estoque=1&desconto=1&novidades=1&ordem=menor-preco
//
// - grupo pelo `slug`, valores pelo `slug` separados por vírgula, na ordem do painel;
// - `preco=min-max`, recortado à faixa da coleção; faixa que não toca a da coleção é ignorada;
// - `estoque`/`desconto`/`novidades` valem só com `1`;
// - parâmetro desconhecido, grupo inativo ou valor que não existe: ignorados em silêncio — link
//   velho continua abrindo a página (FLT-31);
// - estado padrão ⇒ nenhum parâmetro de filtro (FLT-32);
// - o que não é filtro (`q`, `pagina`, `utm_*`, `gclid`, `fbclid`, e qualquer chave desconhecida) é
//   preservado pela escrita (FLT-34).
//
// `URLSearchParams.toString()` codifica a vírgula como `%2C`. A leitura aceita as duas formas.

import type { FilterCatalog, FilterSelection } from './types.ts'

export const FILTER_SORT_OPTIONS = ['relevancia', 'menor-preco', 'maior-preco', 'novidades'] as const
export type FilterSort = (typeof FILTER_SORT_OPTIONS)[number]
export const DEFAULT_FILTER_SORT: FilterSort = 'relevancia'

/**
 * O estado inteiro de uma listagem filtrável (categoria ou busca). Os nomes dos campos são os do
 * `CategoryFilters` da loja, que este tipo substitui: `tags` sai, `selection` e `sort` entram.
 */
export interface FilterState {
  priceRange: [number, number]
  inStockOnly: boolean
  onSaleOnly: boolean
  newOnly: boolean
  selection: FilterSelection
  sort: FilterSort
}

/** As chaves de sistema que a escrita reescreve. Os slugs de grupo do catálogo também. */
export const FILTER_SYSTEM_PARAMS = {
  price: 'preco',
  inStock: 'estoque',
  onSale: 'desconto',
  isNew: 'novidades',
  sort: 'ordem',
} as const

export const defaultFilterState = (bounds: [number, number]): FilterState => ({
  priceRange: [bounds[0], bounds[1]],
  inStockOnly: false,
  onSaleOnly: false,
  newOnly: false,
  selection: {},
  sort: DEFAULT_FILTER_SORT,
})

const priceUntouched = (range: [number, number], bounds: [number, number]): boolean =>
  range[0] <= bounds[0] && range[1] >= bounds[1]

const parsePrice = (raw: string | null, bounds: [number, number]): [number, number] => {
  const m = raw?.trim().match(/^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$/)
  if (!m) return [bounds[0], bounds[1]]
  let lo = Number(m[1])
  let hi = Number(m[2])
  if (lo > hi) [lo, hi] = [hi, lo]
  if (hi < bounds[0] || lo > bounds[1]) return [bounds[0], bounds[1]]
  return [Math.max(lo, bounds[0]), Math.min(hi, bounds[1])]
}

const ativosEmOrdem = (catalog: FilterCatalog) =>
  [...catalog.groups].filter(g => g.is_active).sort((a, b) => a.sort_order - b.sort_order)

const valoresEmOrdem = (catalog: FilterCatalog, groupId: string) =>
  catalog.values.filter(v => v.group_id === groupId).sort((a, b) => a.sort_order - b.sort_order)

/** A URL → o estado. Nunca lança; o que não se reconhece fica de fora. */
export const parseFilterParams = (
  params: URLSearchParams,
  catalog: FilterCatalog,
  bounds: [number, number],
): FilterState => {
  const selection: FilterSelection = {}
  for (const grupo of ativosEmOrdem(catalog)) {
    const raw = params.get(grupo.slug)
    if (!raw) continue
    const pedidos = new Set(raw.split(',').map(s => s.trim()).filter(Boolean))
    const slugs = valoresEmOrdem(catalog, grupo.id)
      .filter(v => pedidos.has(v.slug))
      .map(v => v.slug)
    if (slugs.length > 0) selection[grupo.slug] = slugs
  }
  const sort = params.get(FILTER_SYSTEM_PARAMS.sort)
  return {
    priceRange: parsePrice(params.get(FILTER_SYSTEM_PARAMS.price), bounds),
    inStockOnly: params.get(FILTER_SYSTEM_PARAMS.inStock) === '1',
    onSaleOnly: params.get(FILTER_SYSTEM_PARAMS.onSale) === '1',
    newOnly: params.get(FILTER_SYSTEM_PARAMS.isNew) === '1',
    selection,
    sort: (FILTER_SORT_OPTIONS as readonly string[]).includes(sort) ? (sort as FilterSort) : DEFAULT_FILTER_SORT,
  }
}

/**
 * O estado → a URL. Parte de `params` (que não é alterado), apaga toda chave de filtro — as de
 * sistema, os slugs de grupo do catálogo e os que estiverem na seleção — e escreve só o que difere
 * do padrão, nesta ordem: grupos (ordem do painel), preço, estoque, desconto, novidades, ordem.
 */
export const writeFilterParams = (
  params: URLSearchParams,
  state: FilterState,
  catalog: FilterCatalog,
  bounds: [number, number],
): URLSearchParams => {
  const out = new URLSearchParams(params)
  for (const k of Object.values(FILTER_SYSTEM_PARAMS)) out.delete(k)
  for (const g of catalog.groups) out.delete(g.slug)
  for (const k of Object.keys(state.selection ?? {})) out.delete(k)

  for (const grupo of ativosEmOrdem(catalog)) {
    const escolhidos = state.selection?.[grupo.slug]
    if (!escolhidos?.length) continue
    const slugs = valoresEmOrdem(catalog, grupo.id)
      .filter(v => escolhidos.includes(v.slug))
      .map(v => v.slug)
    if (slugs.length > 0) out.set(grupo.slug, slugs.join(','))
  }
  if (!priceUntouched(state.priceRange, bounds)) {
    out.set(FILTER_SYSTEM_PARAMS.price, `${state.priceRange[0]}-${state.priceRange[1]}`)
  }
  if (state.inStockOnly) out.set(FILTER_SYSTEM_PARAMS.inStock, '1')
  if (state.onSaleOnly) out.set(FILTER_SYSTEM_PARAMS.onSale, '1')
  if (state.newOnly) out.set(FILTER_SYSTEM_PARAMS.isNew, '1')
  if (state.sort && state.sort !== DEFAULT_FILTER_SORT) out.set(FILTER_SYSTEM_PARAMS.sort, state.sort)
  return out
}
