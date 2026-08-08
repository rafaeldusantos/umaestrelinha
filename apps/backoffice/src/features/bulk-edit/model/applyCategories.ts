// RFN-04 — categorias em massa.
//
// `category_ids` **não é coluna de `products`**: é a tabela `product_categories` (N:N, feature 07).
// O `buildBulkPatch` já emitia `values.category_ids` desde a `13`, e mandar isso para o
// `.update('products')` daria erro de coluna inexistente no primeiro uso — o campo nunca chegou a
// ter UI, então o defeito nunca acordou. Estas duas funções são o que o mantém dormindo:
// **separar** o que é coluna do que é vínculo, e **diferenciar** o vínculo em vez de reescrevê-lo.
//
// Por que diff e não "apaga tudo e insere de novo": reescrever perde a `position` (a ordem de
// seleção, que a loja usa para escolher a categoria de exibição) e gera N escritas onde zero eram
// necessárias quando nada mudou.

import type { AdminListRow } from '@/entities/product/api/productQuery'
import type { BulkPatch } from './buildBulkPatch'

export interface CategoryWrite {
  inserts: { product_id: string; category_id: string; position: number }[]
  deletes: { product_id: string; category_id: string }[]
}

/** Tira `category_ids` do patch de coluna e devolve os dois lados separados. */
export const splitCategoryPatches = (
  patches: readonly BulkPatch[],
): { productPatches: BulkPatch[]; categoryTargets: { id: string; categoryIds: string[] }[] } => {
  const productPatches: BulkPatch[] = []
  const categoryTargets: { id: string; categoryIds: string[] }[] = []

  for (const patch of patches) {
    const { category_ids: categoryIds, ...columns } = patch.values
    if (Array.isArray(categoryIds)) {
      categoryTargets.push({ id: patch.id, categoryIds: categoryIds as string[] })
    }
    // Patch que só tinha categorias não vira update de produto nenhum.
    if (Object.keys(columns).length > 0) productPatches.push({ id: patch.id, values: columns })
  }

  return { productPatches, categoryTargets }
}

/**
 * O diff dos vínculos. Só o que entrou vira insert, só o que saiu vira delete.
 *
 * A `position` do que entra continua a partir do que ficou, para a ordem não embaralhar.
 */
export const planCategoryWrites = (
  rows: readonly AdminListRow[],
  targets: readonly { id: string; categoryIds: string[] }[],
): CategoryWrite => {
  const write: CategoryWrite = { inserts: [], deletes: [] }

  for (const target of targets) {
    const row = rows.find(r => r.id === target.id)
    if (!row) continue

    const before = row.category_ids
    const after = target.categoryIds

    for (const categoryId of before) {
      if (!after.includes(categoryId)) write.deletes.push({ product_id: row.id, category_id: categoryId })
    }

    // A posição de quem entra segue a ordem da lista alvo — é a ordem que o admin vê.
    after.forEach((categoryId, index) => {
      if (!before.includes(categoryId)) {
        write.inserts.push({ product_id: row.id, category_id: categoryId, position: index })
      }
    })
  }

  return write
}

/** `true` quando o diff não tem nada a escrever — evita a ida ao banco. */
export const isEmptyWrite = (write: CategoryWrite): boolean =>
  write.inserts.length === 0 && write.deletes.length === 0
