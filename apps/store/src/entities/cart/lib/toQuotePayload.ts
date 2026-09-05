// Mapper carrinho → payload de `melhor-envio?action=quote` (SHP-02).
//
// **A regra não mora mais aqui.** Ela é de `@estrelinha/core/shipping/quotePayload`, porque tem dois
// consumidores: este (o carrinho da cliente) e a cotação da dona na tela do pedido do backoffice.
// Enquanto eram duas implementações elas divergiram no `insurance_value` — a loja mandava por
// unidade, o painel por unidade × quantidade — e ninguém viu, porque cada uma era coerente sozinha.
// O arquivo de `core` conta a medição inteira.
//
// O que sobra aqui é só a **adaptação de formato**: `CartItem` tem o produto aninhado, e o pedido do
// backoffice chega como `order_items` + um mapa de dimensões. Nenhuma decisão de negócio nesta linha.
import { toQuoteProducts } from '@estrelinha/core/shipping'
import type { QuoteProductPayload } from '@estrelinha/core/shipping'
import type { CartItem } from '../model/cartStore'

export type { QuoteProductPayload }
export { QUOTE_FALLBACK } from '@estrelinha/core/shipping'

export function toQuotePayload(items: CartItem[]): QuoteProductPayload[] {
  return toQuoteProducts(
    (items ?? []).map((item) => ({
      id: item.product.id,
      // `unitPrice`, NÃO `product.price`: com grade os dois divergem, e o `cartStore` já escolhe
      // este no `subtotal()` pelo mesmo motivo. Segurar a carga pelo preço-base de um produto cuja
      // variação custa outra coisa é subsegurar (ou supersegurar) em silêncio.
      unitPrice: item.unitPrice ?? item.product.price,
      quantity: item.quantity,
      dimensions: item.product,
    })),
  )
}
