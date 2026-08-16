// Feature 30 · GSH-06, GSH-07 — o preço e a disponibilidade que a oferta anuncia.
//
// ---------------------------------------------------------------------------------------------
// O FEED LÊ PREÇO. ELE NÃO CALCULA NENHUM.
// ---------------------------------------------------------------------------------------------
// Nada aqui importa `@estrelinha/core/payment/**`, e é de propósito: o dinheiro do projeto tem um
// dono (`resolveOrderPricing`) e esta feature fechou sem alterar uma linha dele. O que o Shopping
// anuncia é o preço de tabela da linha; o que o caixa cobra continua sendo assunto do caixa.
//
// ---------------------------------------------------------------------------------------------
// POR QUE PIX E PROMOÇÃO PROGRESSIVA FICAM DE FORA
// ---------------------------------------------------------------------------------------------
// `g:price` é o preço **sem condição**. O desconto do Pix depende de meio de pagamento e o desconto
// progressivo depende de quantidade — anunciar qualquer um dos dois faria o feed prometer um número
// que a landing page não mostra, que é exatamente o que o Merchant Center compara e reprova.
//
// O único "de/por" incondicional que a nossa base tem é `compare_price`, e ele só é "de" de verdade
// quando é MAIOR que o preço: medido no import da Nuvemshop, 3.346 das 3.357 variações trazem
// `compare_at_price` **igual** ao preço, que não é promoção nenhuma.
//
// ---------------------------------------------------------------------------------------------
// O PREÇO É O DA LINHA
// ---------------------------------------------------------------------------------------------
// `product_variants.price`, nunca `products.base_price` — a base é o "a partir de" da vitrine, e
// anunciá-la faria a oferta prometer o menor preço da grade para uma linha que custa outro. Nunca
// `price_override` tampouco: a coluna está depreciada desde a migration `20260801120000`, tem
// semântica ambígua no seed, e nenhum código novo a lê.

import type {
  OfferAvailability,
  OfferPricingProduct,
  OfferPricingVariant,
} from './types.ts'

export interface OfferPrice {
  /** O `<g:price>`. É o `compare_price` quando há "de/por" de verdade. */
  price: number
  /** O `<g:sale_price>`, ou `null` quando não há promoção incondicional. */
  salePrice: number | null
}

/**
 * O par de preços da oferta, a partir da **linha**.
 *
 * `compare_price` maior que `price` ⇒ o "de" vai em `<g:price>` e o "por" em `<g:sale_price>`.
 * Igual ou menor ⇒ só `<g:price>`, porque um "de" que não é maior não é desconto.
 */
export const offerPricing = (variant: OfferPricingVariant): OfferPrice => {
  const price = variant.price
  const compare = variant.compare_price
  if (compare != null && price != null && compare > price) {
    return { price: compare, salePrice: price }
  }
  return { price, salePrice: null }
}

/**
 * A disponibilidade no vocabulário do Google, derivada da política de estoque do **produto** e do
 * saldo da **linha**.
 *
 * | `stock_policy` | saldo | `<g:availability>` |
 * | --- | --- | --- |
 * | `track` | > 0 | `in_stock` |
 * | `track` | 0 | `out_of_stock` |
 * | `backorder` | qualquer | `backorder` |
 * | `none` | qualquer | `in_stock` |
 *
 * `backorder` e `none` **nunca esgotam** — é a mesma regra que `useProductPurchase` aplica ao CTA da
 * página (PST-08). Divergir aqui faria a oferta dizer "esgotado" numa peça que a loja vende.
 */
export const offerAvailability = (
  product: OfferPricingProduct,
  variant: OfferPricingVariant,
): OfferAvailability => {
  if (product.stock_policy === 'backorder') return 'backorder'
  if (product.stock_policy === 'none') return 'in_stock'
  return variant.stock > 0 ? 'in_stock' : 'out_of_stock'
}
