// As linhas das tabelas do Compre Junto, como o PostgREST as devolve. Escritas à mão: tipo de banco
// é afirmação, e a prova de que o painel lê e grava cada uma é o probe contra o banco local.

/** `buy_together_lists` — uma lista nomeada e reutilizável de peças. */
export interface DbBuyTogetherList {
  id: string
  name: string
  created_at: string
  updated_at: string
}

/** `buy_together_list_items` — uma peça da lista. `variant_ids` vazio = vale todas as ativas. */
export interface DbBuyTogetherListItem {
  list_id: string
  product_id: string
  position: number
  variant_ids: string[]
  created_at: string
}

/** `product_buy_together` — um adicional de uma joia: uma peça (`product`) ou uma lista (`list`). */
export interface DbProductBuyTogether {
  id: string
  product_id: string
  position: number
  kind: 'product' | 'list'
  target_product_id: string | null
  list_id: string | null
  target_variant_ids: string[]
  hidden_on_variant_ids: string[]
  created_at: string
}

/** `buy_together_list_usage` — uma linha por (lista, joia que a usa). */
export interface DbBuyTogetherListUsage {
  list_id: string
  product_id: string
  product_name: string
  product_slug: string
}
