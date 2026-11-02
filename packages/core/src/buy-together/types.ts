// Feature Compre Junto — a forma das listas e dos adicionais, como a regra as enxerga.
//
// Folha: sem import nenhum, para ser alcançável pelo Deno por caminho relativo. Os tipos de linha do
// banco ficam em `@estrelinha/supabase/types`; estes descrevem só o que a regra precisa.

/** Uma lista nomeada e reutilizável de peças. */
export interface BuyTogetherList {
  id: string
  name: string
}

/**
 * Uma peça da lista. `variantIds` vazio = vale todas as ativas; com ids = só essas. A lista de ids é
 * guardada sem chave estrangeira de propósito: com cascata, apagar a última variação liberada
 * deixaria zero ids e a peça passaria a valer todas.
 */
export interface BuyTogetherListItem {
  productId: string
  position: number
  variantIds: readonly string[]
}

/** Como um adicional aponta para o que a cliente pode levar junto. */
export type BuyTogetherAddonKind = 'product' | 'list'
