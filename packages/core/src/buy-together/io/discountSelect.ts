// O `select` de `product_buy_together` que a sacola (`useCartBuyTogether`) e a cobrança
// (`mercado-pago`) fazem, filtrado pelas joias do pedido — UM texto, para as duas leituras não
// divergirem de coluna. As FKs têm nome por causa do `PGRST201`. O mapeamento das linhas é
// `buyTogetherDiscountConfig` (`../cartDiscount.ts`).
//
// Mora num subdiretório porque não é texto que a cliente lê: o guarda de tom do Compre Junto
// (`tomDoCompreJunto.test.ts`) lê os literais do diretório de cima, e a sintaxe de embed do PostgREST
// usa o ponto de exclamação. Folha sem import, alcançável pelo Deno por caminho relativo.

export const BUY_TOGETHER_DISCOUNT_SELECT =
  'id, position, kind, product_id, target_product_id, list_id, target_variant_ids, hidden_on_variant_ids, discount_percent, ' +
  'main:products!product_buy_together_product_id_fkey(id, name), ' +
  'list:buy_together_lists!product_buy_together_list_id_fkey(id, name, ' +
  'items:buy_together_list_items(product_id, position, variant_ids))'
