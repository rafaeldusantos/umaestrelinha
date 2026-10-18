// Filtros de produto (feature 66) — quais blocos aparecem, quem passa, e quanto cada valor conta.
//
// A regra (FLT-21..24, FLT-37, FLT-41), escrita uma vez para a categoria E para a busca:
//
//   passa(p)          = sistema(p) ∧ ∀ grupo com seleção S: p.valores ∩ S ≠ ∅
//                       — OU dentro do grupo, E entre grupos (e com os filtros de sistema)
//   contagem(v ∈ G)   = |{ p na base : sistema(p) ∧ ∀ H ≠ G com seleção: p ∩ S_H ≠ ∅ ∧ v ∈ p }|
//                       — faceta disjuntiva: a seleção do PRÓPRIO grupo não entra na conta
//   blocos visíveis   = grupos ativos, fora dos escondidos, com ≥ 1 valor presente na base
//   valores visíveis  = valores com ≥ 1 produto na base, na ordem de `sort_order`
//
// O produto carrega as marcações por ID (`filter_value_ids`); a seleção chega por SLUG (é a forma da
// URL), e a tradução acontece aqui, pelo catálogo. Slug desconhecido é ignorado, nunca erro: link
// velho continua abrindo a página.

import type { FilterCatalog, FilterGroup, FilterSelection, FilterValue, FilterableProduct } from './types.ts'

export interface VisibleFilterGroup {
  group: FilterGroup
  /** Só os valores com ao menos um produto na base, na ordem do painel. */
  values: FilterValue[]
}

const porOrdem = <T extends { sort_order: number }>(a: T, b: T): number => a.sort_order - b.sort_order

/** A seleção traduzida para id: grupo ativo → valores conhecidos dele. Grupo sem valor válido some. */
const resolverSelecao = (selection: FilterSelection, catalog: FilterCatalog): Map<string, Set<string>> => {
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

const atende = (produto: FilterableProduct, ids: Set<string>): boolean =>
  (produto.filter_value_ids ?? []).some(id => ids.has(id))

/** Os grupos que o produto NÃO atende, entre os que têm seleção. */
const gruposFalhos = (produto: FilterableProduct, selecao: Map<string, Set<string>>): string[] => {
  const falhos: string[] = []
  for (const [groupId, ids] of selecao) if (!atende(produto, ids)) falhos.push(groupId)
  return falhos
}

/** O produto passa pela seleção dos grupos: OU dentro de cada grupo, E entre os grupos. */
export const passesSelection = (
  product: FilterableProduct,
  selection: FilterSelection,
  catalog: FilterCatalog,
): boolean => gruposFalhos(product, resolverSelecao(selection, catalog)).length === 0

/**
 * Os blocos que a página mostra. `hiddenGroupIds` é o "esconder nesta categoria" (presença de linha
 * em `category_hidden_filter_groups`); na busca, a lista é vazia (FLT-41).
 */
export const visibleGroups = (
  catalog: FilterCatalog,
  base: readonly FilterableProduct[],
  hiddenGroupIds: readonly string[] = [],
): VisibleFilterGroup[] => {
  const presentes = new Set<string>()
  for (const p of base) for (const id of p.filter_value_ids ?? []) presentes.add(id)
  return [...catalog.groups]
    .filter(g => g.is_active && !hiddenGroupIds.includes(g.id))
    .sort(porOrdem)
    .map(group => ({
      group,
      values: catalog.values.filter(v => v.group_id === group.id && presentes.has(v.id)).sort(porOrdem),
    }))
    .filter(bloco => bloco.values.length > 0)
}

/**
 * A contagem de cada valor (por id), com os filtros de sistema e a seleção dos OUTROS grupos
 * aplicados. Valor de grupo ativo sem produto conta `0` — é o `(0)` desabilitado do FLT-24.
 */
export const facetCounts = <P extends FilterableProduct>(
  catalog: FilterCatalog,
  base: readonly P[],
  selection: FilterSelection,
  systemPass: (product: P) => boolean = () => true,
): Record<string, number> => {
  const ativos = new Set(catalog.groups.filter(g => g.is_active).map(g => g.id))
  const grupoDoValor = new Map<string, string>()
  const counts: Record<string, number> = {}
  for (const v of catalog.values) {
    if (!ativos.has(v.group_id)) continue
    grupoDoValor.set(v.id, v.group_id)
    counts[v.id] = 0
  }
  const selecao = resolverSelecao(selection, catalog)
  for (const p of base) {
    if (!systemPass(p)) continue
    const falhos = gruposFalhos(p, selecao)
    if (falhos.length > 1) continue
    for (const id of new Set(p.filter_value_ids ?? [])) {
      const grupo = grupoDoValor.get(id)
      if (grupo === undefined) continue
      // Sem falha: conta em todo grupo. Com uma falha só: conta APENAS no grupo que falhou — tocar
      // num valor dele é o que faria este produto passar.
      if (falhos.length === 0 || falhos[0] === grupo) counts[id] += 1
    }
  }
  return counts
}
