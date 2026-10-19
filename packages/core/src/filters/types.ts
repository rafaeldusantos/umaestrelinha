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
  /**
   * Os termos extras que também sugerem este valor (feature 67, VFL-35). Opcional: a loja não os lê,
   * e o catálogo da 66 continua válido sem eles. O nome do valor sugere sempre, com ou sem termos.
   */
  suggest_terms?: readonly string[] | null
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

/**
 * Uma marcação por OPÇÃO da peça (feature 67): "nesta peça, `Cor` = `Prata 925` é o valor X". O eixo
 * e o texto são EXATOS, como em `products.options` — é o texto que `option_values` da variação usa,
 * e não há id de opção no schema. Vale só para a peça que a carrega.
 */
export interface OptionMark {
  option_name: string
  option_value: string
  value_id: string
}

/**
 * O mínimo que a regra precisa de uma variação. `position` é a ordem do painel (a de menor posição
 * abre o card quando várias casam); ausente, vale a ordem de chegada.
 */
export interface FilterableVariant {
  id: string
  option_values: Readonly<Record<string, string>> | null
  is_active: boolean
  position?: number | null
}

/**
 * O mínimo que a regra precisa de um produto: os ids dos valores marcados na peça toda e, desde a
 * 67, as marcações por opção e as variações. Os dois campos novos são opcionais: sem eles a peça se
 * comporta exatamente como na 66 — e é isso que mantém os casos de lá intocados.
 */
export interface FilterableProduct<V extends FilterableVariant = FilterableVariant> {
  filter_value_ids: readonly string[]
  option_marks?: readonly OptionMark[] | null
  variants?: readonly V[] | null
}
