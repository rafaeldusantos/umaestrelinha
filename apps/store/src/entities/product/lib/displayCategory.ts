// Qual das N categorias do produto a loja mostra (PST-06 AC 3).
//
// Com `product_categories` (N:N) um produto está em várias categorias ao mesmo tempo, mas o selo do
// card e o breadcrumb têm espaço para **uma**. A escolha não pode ser arbitrária: se ela mudar entre
// dois renders, o mesmo produto aparece em "Anime" na home e em "K-Pop" na busca.
//
// A regra — `menor categories.sort_order`, desempate por `product_categories.position`, depois o
// `category_id` — mora em `@estrelinha/core/product` (`pickDisplayCategory`) desde a feature 61: o
// `purchase` do servidor precisa da MESMA escolha para o `item_category` do GA4, e a cópia que ele
// tinha já divergia da loja. Aqui fica só a ponte para a árvore de categorias da loja e a rede da
// coluna legada.

import { pickDisplayCategory } from '@estrelinha/core/product'
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

  // A categoria vem da ÁRVORE da loja (a mesma que o header já carregou), não do embed do vínculo:
  // o selo precisa do nome, e a árvore é quem diz que a categoria está ativa.
  const escolhida = pickDisplayCategory(
    product.category_links.map(link => ({
      category_id: link.category_id,
      position: link.position,
      category: byId.get(link.category_id) ?? null,
    })),
  )
  if (escolhida) return escolhida

  // Produto ainda sem linha em `product_categories`: o backfill da T4 cobriu os existentes, mas
  // um insert direto no banco pode não ter. A coluna legada é a rede.
  return (product.category_id && byId.get(product.category_id)) || null
}
