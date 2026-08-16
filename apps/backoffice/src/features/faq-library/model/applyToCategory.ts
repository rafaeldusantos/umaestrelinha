import { descendantIds, type MenuCategory } from '@estrelinha/core/menu'

/**
 * O plano da aplicação em lote — `FAQ-35`, `FAQ-36`. Puro, para a prévia e a gravação usarem a
 * **mesma** conta.
 *
 * Se a prévia fosse calculada de um jeito e a gravação de outro, o número que a dona confirma não
 * seria o número que acontece — e a diferença só apareceria depois de gravado.
 */

export interface FaqBatchPlan {
  /** `product_id` que receberão o vínculo. */
  paraGravar: string[]
  /** Quantos já tinham aquela pergunta e serão pulados. */
  jaTinham: number
  /** Quantos produtos a categoria (e a descendência) alcança. */
  alcancados: number
}

export interface ProductInCategory {
  product_id: string
  category_id: string
}

/**
 * Quem recebe o vínculo.
 *
 * **Alcança a descendência** (`descendantIds`, de `@estrelinha/core/menu`): aplicar a "Joias
 * afetivas" e não alcançar "Pingentes afetivos" faria a dona ter de repetir a operação por cada
 * filha, que é o trabalho manual que este lote existe para evitar. É a mesma travessia que o roll-up
 * de `useProducts(slug)` já faz na loja — uma árvore, uma função.
 *
 * **Produto que já tem a pergunta é pulado, e não regravado**: regravar mexeria em `position` e
 * apagaria `answer_override`, que é curadoria da dona.
 */
export const planFaqBatch = (
  categories: readonly MenuCategory[],
  categoryId: string,
  vinculosDaCategoria: readonly ProductInCategory[],
  jaComEstaPergunta: ReadonlySet<string>,
): FaqBatchPlan => {
  if (!categoryId) return { paraGravar: [], jaTinham: 0, alcancados: 0 }

  const alvo = new Set(descendantIds(categories, categoryId))
  const produtos = new Set(
    vinculosDaCategoria.filter(v => alvo.has(v.category_id)).map(v => v.product_id),
  )

  const paraGravar: string[] = []
  let jaTinham = 0

  for (const product_id of produtos) {
    if (jaComEstaPergunta.has(product_id)) jaTinham += 1
    else paraGravar.push(product_id)
  }

  // Ordem estável: a prévia e a gravação precisam falar da mesma lista em duas execuções.
  paraGravar.sort()

  return { paraGravar, jaTinham, alcancados: produtos.size }
}
