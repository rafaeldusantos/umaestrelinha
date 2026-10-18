// Filtros de produto (feature 66) — os tipos do catálogo de filtros, como a regra os lê.
//
// Este módulo é o dono de "quais filtros existem, quem passa, e como isso vai para a URL". A loja
// (categoria e busca) e o painel (recusa ao gravar) leem a mesma regra daqui — e o guarda da
// migration (`productFiltersSchema.test.ts`, na suíte da loja) compara os números de `rules.ts` com
// os `check` do banco.
//
// Os campos espelham as colunas de `filter_groups` e `filter_values`, mas o tipo é declarado AQUI e
// não importado de `@estrelinha/supabase/types`: o grafo deste módulo não importa pacote nenhum (ver
// `__tests__/purity.test.ts`), e quem descreve a coluna é o pacote de tipos.

/** Um grupo de filtro ("Acabamento"). `slug` é a chave dele na URL. */
export interface FilterGroup {
  id: string
  name: string
  slug: string
  is_active: boolean
  sort_order: number
}

/** Um valor de um grupo ("Prata 925"). `slug` é único dentro do grupo, e é o que vai na URL. */
export interface FilterValue {
  id: string
  group_id: string
  name: string
  slug: string
  sort_order: number
}

/** O catálogo inteiro: grupos e valores, como chegam do banco (sem ordem garantida). */
export interface FilterCatalog {
  groups: readonly FilterGroup[]
  values: readonly FilterValue[]
}

/**
 * A seleção da cliente, POR SLUG: `{ acabamento: ['prata-925', 'ouro'] }`.
 *
 * Slug, e não id, porque é a forma da URL; a tradução para id (que é como o produto carrega as
 * marcações) acontece dentro de `facets.ts`, pelo catálogo.
 */
export type FilterSelection = Record<string, string[]>

/** O mínimo que a regra precisa de um produto: os ids dos valores marcados nele. */
export interface FilterableProduct {
  filter_value_ids: readonly string[]
}
