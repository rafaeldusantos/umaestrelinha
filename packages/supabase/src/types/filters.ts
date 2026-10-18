// Os filtros de produto como o banco os guarda (feature 66).
//
// `AD-012` — TIPO ESCRITO À MÃO É AFIRMAÇÃO, NÃO VERIFICAÇÃO. As quatro interfaces abaixo foram
// derivadas do `information_schema` do banco local DEPOIS de a migration
// `20261018120000_66-filtros-de-produto.sql` rodar (`supabase migration up`, 2026-10-18), e a
// leitura e a recusa de cada tabela foram provadas por probe na mesma sessão (anon lê só grupo
// ativo e marcação de produto ativo, anon grava → `42501`, admin grava, cascatas apagam).
//
// Snapshot conferido (ordem e nulidade incluídas):
//
//   filter_groups                  id uuid NN dgen_random_uuid() · name text NN · slug text NN ·
//                                  is_active boolean NN dtrue · sort_order integer NN d0 ·
//                                  created_at timestamptz NN dnow()
//   filter_values                  id uuid NN dgen_random_uuid() · group_id uuid NN · name text NN ·
//                                  slug text NN · sort_order integer NN d0
//   product_filter_values          product_id uuid NN · value_id uuid NN
//   category_hidden_filter_groups  category_id uuid NN · group_id uuid NN
//
// Quem interpreta (limites, slug, quem passa, a URL) é `@estrelinha/core/filters`; este arquivo só
// descreve as colunas. Os tipos da REGRA (`FilterGroup`, `FilterValue`) são declarados lá, e não
// importados daqui, porque o grafo de `core/filters` não importa pacote nenhum.

/** Um grupo de filtro. `slug` é a chave dele na URL da loja — único e fora das chaves reservadas. */
export interface DbFilterGroup {
  id: string
  name: string
  slug: string
  /** Desligado ⇒ some da loja (a RLS não o entrega a anon); as marcações ficam (`FLT-09`). */
  is_active: boolean
  sort_order: number
  created_at: string
}

/** Um valor de um grupo. `slug` é único DENTRO do grupo. Apagar o grupo apaga o valor (cascade). */
export interface DbFilterValue {
  id: string
  group_id: string
  name: string
  slug: string
  sort_order: number
}

/** Uma marcação produto × valor. Chave composta: marcar de novo é no-op (`on conflict do nothing`). */
export interface DbProductFilterValue {
  product_id: string
  value_id: string
}

/** "Este grupo não aparece nesta categoria." Sem linha = grupo visível (curadoria é presença). */
export interface DbCategoryHiddenFilterGroup {
  category_id: string
  group_id: string
}
