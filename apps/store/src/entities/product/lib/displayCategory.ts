// Qual das N categorias do produto a loja mostra (PST-06 AC 3).
//
// Com `product_categories` (N:N) um produto está em várias categorias ao mesmo tempo, mas o selo do
// card e o breadcrumb têm espaço para **uma**. A escolha não pode ser arbitrária: se ela mudar entre
// dois renders, o mesmo produto aparece em "Anime" na home e em "K-Pop" na busca.
//
// A regra é `menor categories.sort_order`, com desempate por `product_categories.position` —
// primeiro a ordem editorial da loja, depois a ordem que o admin arrastou no formulário. Empate nos
// dois cai no `category_id`, para o resultado ser determinístico em qualquer caso.

import type { Category, ProductCategoryLink } from '@estrelinha/supabase/types'

export interface DisplayCategoryProduct {
  category_links: readonly ProductCategoryLink[]
  /** @deprecated Coluna legada. Só entra como último recurso, para produto sem vínculo N:N. */
  category_id?: string
}

/**
 * A categoria de exibição, ou `null` quando o produto não está em nenhuma categoria conhecida —
 * o chamador esconde o selo, não quebra o card (T19 "produto sem categoria não quebra o card").
 */
export const displayCategory = (
  product: DisplayCategoryProduct,
  categories: readonly Category[] | undefined,
): Category | null => {
  if (!categories?.length) return null
  const byId = new Map(categories.map(c => [c.id, c]))

  const candidates = product.category_links
    .map(link => ({ link, category: byId.get(link.category_id) }))
    .filter((entry): entry is { link: ProductCategoryLink; category: Category } => !!entry.category)

  if (candidates.length === 0) {
    // Produto ainda sem linha em `product_categories`: o backfill da T4 cobriu os existentes, mas
    // um insert direto no banco pode não ter. A coluna legada é a rede.
    return (product.category_id && byId.get(product.category_id)) || null
  }

  candidates.sort(
    (a, b) =>
      a.category.sort_order - b.category.sort_order ||
      a.link.position - b.link.position ||
      a.link.category_id.localeCompare(b.link.category_id),
  )
  return candidates[0].category
}
