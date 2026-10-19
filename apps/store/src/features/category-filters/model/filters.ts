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
//
// **Feature 67 — a peça também passa pela VARIAÇÃO.** Quem decide é `matchProduct` (`core`): os
// grupos que a peça toda não satisfaz têm de ser satisfeitos pela mesma variação ativa, e ela devolve
// em qual variação o card abre. Este arquivo entrega a `core` os filtros de sistema nas duas formas —
// sobre a peça (`passesSystem`) e sobre a variação candidata (`passesSystemVariant`, com o preço, o
// estoque e o desconto DELA) — e nunca lê a marcação por opção: ela atravessa dentro do produto.

import { isProductOutOfStock } from '@/entities/product/lib/availability'
import {
  DEFAULT_FILTER_SORT,
  FILTER_SORT_OPTIONS,
  defaultFilterState,
  facetCounts,
  matchProduct,
  visibleGroups,
  type FilterCatalog,
  type FilterGroup,
  type FilterSort,
  type FilterState,
  type FilterValue,
  type MatchOptions,
} from '@estrelinha/core/filters'
import { isVariantAvailable } from '@estrelinha/core/pricing'
import type { Product, ProductVariant } from '@estrelinha/supabase/types'

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

/**
 * Os filtros de sistema sobre a VARIAÇÃO candidata (feature 67, VFL-10) — quando a peça só passa
 * pela opção, o card mostra a variação, e é o número DELA que o filtro tem de testar: testar o da
 * peça mostraria R$ 95 sob "até R$ 80".
 *
 * Preço é `price ?? preço da peça`, o mesmo recuo do card; o "de" riscado, idem. Estoque é o da
 * linha (`isVariantAvailable`, que respeita a `stock_policy`). Novidade é da peça — a variação não
 * tem `is_new` —, e entra aqui porque, com a variação decidindo, `core` não chama o teste da peça.
 */
export const passesSystemVariant = (p: Product, v: ProductVariant, f: CategoryFilters): boolean => {
  const preco = v.price ?? p.price
  const de = v.compare_price ?? p.compare_price
  if (preco < f.priceRange[0] || preco > f.priceRange[1]) return false
  if (f.inStockOnly && !isVariantAvailable(v, p.stock_policy)) return false
  if (f.onSaleOnly && !(de !== null && de > preco)) return false
  if (f.newOnly && !p.is_new) return false
  return true
}

/**
 * O produto como a regra de `core` o lê: ele mesmo, com os ids marcados nunca `undefined`. O spread
 * leva junto as variações e a marcação por opção — este arquivo não as nomeia (`VFL-38`).
 */
const filtravel = (p: Product) => ({ ...p, filter_value_ids: p.filter_value_ids ?? [] })
type Filtravel = ReturnType<typeof filtravel>

/**
 * Os filtros de sistema nas duas formas que `core` pede, e a preferência entre as candidatas: a
 * variação com estoque vence o empate de posição (VFL-11), para o card não abrir numa esgotada
 * quando há outra que casa.
 */
const opcoesDaLoja = (f: CategoryFilters): MatchOptions<Filtravel> => ({
  productPass: p => passesSystem(p, f),
  variantPass: (v, p) => passesSystemVariant(p, v, f),
  prefer: (v, p) => isVariantAvailable(v, p.stock_policy),
})

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

/**
 * Uma peça que passou, e a variação em que o card abre: `null` quando ela passa pela peça toda (ou
 * não há seleção), que é o card de hoje (VFL-13).
 */
export interface ProductMatch {
  product: Product
  variant: ProductVariant | null
}

// SPEC_DEVIATION: o `tasks.md` (T13) pede que `filterProducts` devolva os pares. Os pares saem de
// `filterMatches`, e `filterProducts` continua devolvendo as peças — a projeção dela. Assim os casos
// da 66 que medem `filterProducts` seguem sem uma linha alterada, como régua de não-regressão.
/**
 * Quem passa pelos filtros, e em qual variação (VFL-09..11). É a lista que a categoria e a busca
 * desenham (VFL-17), e a variação vai ao card como `matchedVariant`.
 */
export const filterMatches = (
  products: readonly Product[],
  f: CategoryFilters,
  catalog: FilterCatalog,
): ProductMatch[] => {
  const opts = opcoesDaLoja(f)
  const out: ProductMatch[] = []
  for (const product of products) {
    const r = matchProduct(filtravel(product), f.selection ?? {}, catalog, opts)
    if (r.passes) out.push({ product, variant: r.variant })
  }
  return out
}

export const filterProducts = (
  products: readonly Product[],
  f: CategoryFilters,
  catalog: FilterCatalog,
): Product[] => filterMatches(products, f, catalog).map(m => m.product)

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
  const base = products.map(filtravel)
  // A mesma regra da lista, com a variação: a peça conta uma vez por valor (VFL-15).
  const counts = facetCounts(catalog, base, f.selection ?? {}, opcoesDaLoja(f))
  return visibleGroups(catalog, base).map(({ group, values }) => ({
    group,
    values: values.map(value => {
      const count = counts[value.id] ?? 0
      const selected = (f.selection?.[group.slug] ?? []).includes(value.slug)
      return { value, count, selected, disabled: count === 0 && !selected }
    }),
  }))
}

const ordenar = <T>(
  items: readonly T[],
  sort: SortOption,
  peca: (item: T) => Product,
  preco: (item: T) => number = item => peca(item).price,
): T[] => {
  const out = [...items]
  switch (sort) {
    case 'menor-preco':
      return out.sort((a, b) => preco(a) - preco(b))
    case 'maior-preco':
      return out.sort((a, b) => preco(b) - preco(a))
    case 'novidades':
      return out.sort((a, b) => Number(peca(b).is_new) - Number(peca(a).is_new))
    default:
      return out
  }
}

export const sortProducts = (products: readonly Product[], sort: SortOption): Product[] =>
  ordenar(products, sort, p => p)

/**
 * O preço que o card mostra para o par: o da variação casada (`v.price ?? p.price`, o mesmo recuo do
 * card e de `passesSystemVariant`), ou o da peça quando ela passou pela peça toda.
 */
export const matchPrice = (m: ProductMatch): number => m.variant?.price ?? m.product.price

/**
 * A mesma ordem, sobre os pares de `filterMatches`. "Menor/maior preço" ordena pelo preço que o card
 * MOSTRA (`matchPrice`) — decisão do usuário na pós-verificação da 67: ordenar pela peça deixava um
 * card de R$ 130 antes de um de R$ 95 em "menor preço". Relevância e Novidades não mudam.
 */
export const sortMatches = (matches: readonly ProductMatch[], sort: SortOption): ProductMatch[] =>
  ordenar(matches, sort, m => m.product, matchPrice)
