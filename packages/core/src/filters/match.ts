// Filtros nas variações (feature 67) — quem passa pela seleção, e em QUAL variação o card abre.
//
// A regra (VFL-09..11, VFL-13), escrita uma vez para a categoria, para a busca e para as contagens:
//
//   S        = a seleção, grupo → ids de valor (só grupos ativos e valores conhecidos)
//   G_peça   = { G ∈ S : a peça toda carrega algum valor de S_G }
//   R        = S \ G_peça            — os grupos que só uma VARIAÇÃO pode satisfazer
//   R = ∅    ⇒ passa = productPass(peça); variante = null           — o card de hoje (VFL-13)
//   R ≠ ∅    ⇒ candidatas = variações ATIVAS, por `position`, tais que
//                ∀ G ∈ R: a variação carrega um valor de S_G por marcação de opção
//                ∧ variantPass(variação)                          — preço e estoque DELA (VFL-10)
//              variante = a primeira candidata com `prefer`, senão a primeira (VFL-11)
//              passa    = variante ≠ null
//
// "A MESMA variação" é o ponto: Prata 925 + Chaveiro numa peça que vende prata em pingente e chaveiro
// em folheado NÃO passa, embora a peça "tenha" os dois valores somados (VFL-09). E a marcação da peça
// toda vence a da opção: o grupo que ela satisfaz não restringe variação nenhuma.
//
// Preço, estoque e desconto são regra da LOJA, e `core` não os conhece: chegam como funções
// (`productPass`, `variantPass`, `prefer`), como o `systemPass` da 66.

import type { FilterCatalog, FilterSelection, FilterableProduct, FilterableVariant, OptionMark } from './types.ts'

/** A variação que a peça carrega, ou a de base quando ela não declara. */
export type VariantOf<P> = P extends { variants?: readonly (infer V)[] | null } ? V : FilterableVariant

export interface MatchOptions<P extends FilterableProduct = FilterableProduct> {
  /** O filtro de sistema sobre a PEÇA. Vale quando nenhum grupo pede variação. Ausente ⇒ passa. */
  productPass?: (product: P) => boolean
  /**
   * O filtro de sistema sobre a VARIAÇÃO candidata. Ausente ⇒ cai em `productPass(peça)`: sem isso,
   * uma loja que só passasse `productPass` deixaria a peça que casa por opção fora do preço e do
   * estoque, em silêncio.
   */
  variantPass?: (variant: VariantOf<P>, product: P) => boolean
  /** Entre as candidatas, quem vence o empate de posição (a loja: a que tem estoque). */
  prefer?: (variant: VariantOf<P>, product: P) => boolean
}

export interface MatchResult<V> {
  passes: boolean
  /** A variação em que o card abre, ou `null` quando a peça passa pela peça toda (ou não passa). */
  variant: V | null
}

/**
 * A seleção traduzida para id: grupo ativo → valores conhecidos dele. Grupo sem valor válido some —
 * slug desconhecido é ignorado, nunca erro: link velho continua abrindo a página.
 */
export const resolveSelection = (selection: FilterSelection, catalog: FilterCatalog): Map<string, Set<string>> => {
  const out = new Map<string, Set<string>>()
  for (const [groupSlug, valueSlugs] of Object.entries(selection ?? {})) {
    const grupo = catalog.groups.find(g => g.slug === groupSlug && g.is_active)
    if (!grupo || !valueSlugs?.length) continue
    const ids = new Set(
      catalog.values.filter(v => v.group_id === grupo.id && valueSlugs.includes(v.slug)).map(v => v.id),
    )
    if (ids.size > 0) out.set(grupo.id, ids)
  }
  return out
}

/** A variação carrega algum dos valores por marcação de opção: o texto dela naquele eixo é o marcado. */
export const variantCarries = (
  variant: FilterableVariant,
  marks: readonly OptionMark[] | null | undefined,
  valueIds: ReadonlySet<string>,
): boolean => {
  const opcoes = variant.option_values ?? {}
  // Eixo ausente na variação dá `undefined`, que nunca é igual a um texto: não casa (edge case da spec).
  return (marks ?? []).some(m => valueIds.has(m.value_id) && opcoes[m.option_name] === m.option_value)
}

/** As variações ativas, na ordem do painel (`position`), com a ordem de chegada como desempate. */
export const activeVariantsInOrder = <V extends FilterableVariant>(variants: readonly V[] | null | undefined): V[] =>
  (variants ?? [])
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => v.is_active)
    .sort((a, b) => (a.v.position ?? a.i) - (b.v.position ?? b.i) || a.i - b.i)
    .map(({ v }) => v)

const atendeNaPeca = (product: FilterableProduct, ids: ReadonlySet<string>): boolean =>
  (product.filter_value_ids ?? []).some(id => ids.has(id))

/** O núcleo, sobre a seleção já resolvida — é o que `facetCounts` chama valor a valor. */
export const matchResolved = <P extends FilterableProduct>(
  product: P,
  selecao: ReadonlyMap<string, ReadonlySet<string>>,
  opts: MatchOptions<P> = {},
): MatchResult<VariantOf<P>> => {
  const productPass = opts.productPass ?? (() => true)
  const variantPass = opts.variantPass ?? ((_v: VariantOf<P>, p: P) => productPass(p))

  const restantes: ReadonlySet<string>[] = []
  for (const ids of selecao.values()) if (!atendeNaPeca(product, ids)) restantes.push(ids)

  if (restantes.length === 0) return { passes: productPass(product), variant: null }

  const candidatas = activeVariantsInOrder(product.variants)
    .filter(v => restantes.every(ids => variantCarries(v, product.option_marks, ids)))
    .map(v => v as VariantOf<P>)
    .filter(v => variantPass(v, product))
  if (candidatas.length === 0) return { passes: false, variant: null }

  const preferida = opts.prefer ? candidatas.find(v => opts.prefer!(v, product)) : undefined
  return { passes: true, variant: preferida ?? candidatas[0] }
}

/** A peça passa pela seleção — e, quando só uma variação a faz passar, qual delas abre o card. */
export const matchProduct = <P extends FilterableProduct>(
  product: P,
  selection: FilterSelection,
  catalog: FilterCatalog,
  opts: MatchOptions<P> = {},
): MatchResult<VariantOf<P>> => matchResolved(product, resolveSelection(selection, catalog), opts)
