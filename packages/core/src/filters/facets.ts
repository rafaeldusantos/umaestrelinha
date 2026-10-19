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
// Desde a 67 a peça também pode carregar o valor por OPÇÃO (eixo + texto), e quem decide se ela passa
// é `matchProduct` (`match.ts`): os grupos que a peça toda não satisfaz têm de ser satisfeitos pela
// MESMA variação ativa. Sem marcação por opção, o resultado é idêntico ao da 66 — os casos de lá são a
// régua disso, e não mudaram uma linha.
//
// O produto carrega as marcações por ID (`filter_value_ids`); a seleção chega por SLUG (é a forma da
// URL), e a tradução acontece aqui, pelo catálogo. Slug desconhecido é ignorado, nunca erro: link
// velho continua abrindo a página.

import { activeVariantsInOrder, matchResolved, resolveSelection, variantCarries } from './match.ts'
import type { MatchOptions } from './match.ts'
import type { FilterCatalog, FilterGroup, FilterSelection, FilterValue, FilterableProduct } from './types.ts'

export interface VisibleFilterGroup {
  group: FilterGroup
  /** Só os valores com ao menos um produto na base, na ordem do painel. */
  values: FilterValue[]
}

const porOrdem = <T extends { sort_order: number }>(a: T, b: T): number => a.sort_order - b.sort_order

/**
 * O produto passa pela seleção dos grupos: OU dentro de cada grupo, E entre os grupos — e os grupos
 * que só a variação satisfaz, pela mesma variação. `opts` é opcional: sem ele, como na 66, só os
 * grupos contam.
 */
export const passesSelection = <P extends FilterableProduct>(
  product: P,
  selection: FilterSelection,
  catalog: FilterCatalog,
  opts: MatchOptions<P> = {},
): boolean => matchResolved(product, resolveSelection(selection, catalog), opts).passes

/**
 * Os valores que a peça carrega de algum jeito: na peça toda, ou por uma marcação de opção que uma
 * variação ATIVA dela de fato vende. Marcação por opção sem variação ativa não vende nada, e por isso
 * não acende bloco nem conta.
 */
const valoresCarregados = (produto: FilterableProduct): Set<string> => {
  const ids = new Set(produto.filter_value_ids ?? [])
  const marcas = produto.option_marks ?? []
  if (marcas.length === 0) return ids
  const ativas = activeVariantsInOrder(produto.variants)
  for (const m of marcas) {
    if (ids.has(m.value_id)) continue
    if (ativas.some(v => variantCarries(v, [m], new Set([m.value_id])))) ids.add(m.value_id)
  }
  return ids
}

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
  for (const p of base) for (const id of valoresCarregados(p)) presentes.add(id)
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
 *
 * Desde a 67 a conta é, literalmente, a pergunta da faceta disjuntiva: "esta peça passaria se a
 * seleção do grupo G fosse só {v}?" (VFL-15). O atalho da 66 — "com uma falha só, conta no grupo que
 * falhou" — deixou de valer, porque a MESMA variação tem de satisfazer vários grupos ao mesmo tempo, e
 * uma peça pode atender G e H separadamente sem atender os dois juntos. A peça conta uma vez por
 * valor, quantas variações casarem.
 *
 * `systemPass` aceita a função da 66 (o filtro de sistema sobre a peça) ou as `MatchOptions` inteiras,
 * quando a loja precisa testar preço e estoque da variação.
 */
export const facetCounts = <P extends FilterableProduct>(
  catalog: FilterCatalog,
  base: readonly P[],
  selection: FilterSelection,
  systemPass: ((product: P) => boolean) | MatchOptions<P> = {},
): Record<string, number> => {
  const opts: MatchOptions<P> = typeof systemPass === 'function' ? { productPass: systemPass } : systemPass
  const ativos = new Set(catalog.groups.filter(g => g.is_active).map(g => g.id))
  const grupoDoValor = new Map<string, string>()
  const counts: Record<string, number> = {}
  for (const v of catalog.values) {
    if (!ativos.has(v.group_id)) continue
    grupoDoValor.set(v.id, v.group_id)
    counts[v.id] = 0
  }
  const selecao = resolveSelection(selection, catalog)
  for (const p of base) {
    // Só os valores que a peça carrega podem contar: para os outros, S_G := {v} nunca se satisfaz.
    for (const id of valoresCarregados(p)) {
      const grupo = grupoDoValor.get(id)
      if (grupo === undefined) continue
      const hipotese = new Map(selecao)
      hipotese.set(grupo, new Set([id]))
      if (matchResolved(p, hipotese, opts).passes) counts[id] += 1
    }
  }
  return counts
}
