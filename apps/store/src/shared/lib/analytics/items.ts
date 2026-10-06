// Feature 61 · EVT-13 — de `Product`/linha da sacola para a entrada do item do GA4.
//
// Um dono só na loja: todo ponto de chamada (card, página do produto, sacola, checkout) passa por
// aqui, e o item final é montado por `toAnalyticsItem` em `core` — o mesmo que o servidor usa no
// `purchase`. Escrito em cada tela, o `item_id` do card e o da sacola divergiriam sem nada quebrar.
//
// **Copia campo a campo, nunca espalha.** A linha da sacola carrega o texto de gravação, e o tipo de
// entrada de `core` nem tem campo para ele — mas um espalhamento aqui o levaria adiante (`EVT-14`).

import type { AnalyticsItemInput } from '@estrelinha/core/analytics'
import { displayCategorySlug } from '@estrelinha/core/product'
import type { Product } from '@estrelinha/supabase/types'

/**
 * `item_category`: o **slug** da categoria de exibição (`PST-06`), pela MESMA função que o
 * `purchase` do servidor chama (`displayCategorySlug`, em `core/product`).
 *
 * Nunca `category_slug`: ele vem da coluna LEGADA `products.category_id`, nula nos 691 produtos —
 * a loja mandava categoria vazia enquanto o servidor mandava a certa. O slug sai do embed
 * `categories(slug, sort_order, active)` dos vínculos, que os dois `select` da loja pedem.
 */
const categoria = (product: Pick<Product, 'category_links'>): string | null =>
  displayCategorySlug(product.category_links)

/** O item de um produto da vitrine ou da página — preço da linha quando há, senão o do produto. */
export function productItem(
  product: Product,
  opts: { index?: number; quantity?: number; variant?: string | null; price?: number } = {},
): AnalyticsItemInput {
  return {
    id: product.id,
    nuvemshop_id: product.nuvemshop_id ?? null,
    name: product.name,
    category: categoria(product),
    variant: opts.variant ?? null,
    price: opts.price ?? product.price,
    quantity: opts.quantity,
    index: opts.index,
  }
}

/** A forma mínima de uma linha da sacola que o item lê. */
export interface CartLineLike {
  product: Product
  variantLabel?: string | null
  unitPrice: number
  quantity: number
}

/** O item de uma linha da sacola: rótulo e preço da LINHA, nunca os do produto. */
export function cartLineItem(line: CartLineLike, quantity = line.quantity): AnalyticsItemInput {
  return productItem(line.product, {
    variant: line.variantLabel || null,
    price: line.unitPrice,
    quantity,
  })
}

/** A lista de origem de um card — o que `view_item_list` e `select_item` levam (`EVT-02`, `EVT-03`). */
export interface AnalyticsList {
  id: string
  name: string
}
