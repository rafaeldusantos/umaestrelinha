// Os fatos que a gaveta do carrinho mostra, como função pura.
//
// A gaveta é a única superfície de carrinho da loja (a rota `/carrinho` virou atalho para ela), então
// o que ela decide — quanto falta para o frete grátis, se um item está acabando, o que sugerir para
// completar o pedido — merece prova sem DOM.

import { isVariantAvailable } from '@estrelinha/core/pricing'
import type { Product } from '@estrelinha/supabase/types'
import type { CartItem } from '@/entities/cart/model/cartStore'
import { hasSellableGrid } from '@/entities/product/lib/variantSelection'

// `freeShippingProgress` MOROU AQUI, e foi apagada na feature 37 (`FRG-03`).
//
// Ela era a regra do frete grátis escrita uma segunda vez, e o caso de borda estava **invertido**:
// faixa zerada devolvia `reached: true` ("frete grátis sempre"), enquanto três superfícies da
// vitrine liam o mesmo zero como "não temos frete grátis" e escondiam o texto. Zerar o campo no
// painel escondia o anúncio e liberava frete grátis para todo mundo no caixa.
//
// Hoje quem responde é `freeShippingState` em `@estrelinha/core/shipping`, dono único, e a gaveta a
// alcança por `useFreeShipping`. Os três casos de teste desta função migraram para
// `packages/core/src/shipping/__tests__/freeShipping.test.ts`.

/**
 * O estoque que **esta linha** consome: a variação escolhida, ou o `stock_total` legado quando o
 * produto não tem grade. Somar os dois contaria a mesma joia duas vezes.
 */
const stockOf = (item: CartItem): number => {
  if (item.variantId) {
    const variant = item.product.variants.find((v) => v.id === item.variantId)
    return variant?.stock ?? 0
  }
  return item.product.stock_total
}

/**
 * `Últimas 3!` — só faz sentido com `stock_policy: 'track'`. Em `backorder`/`none` o número no banco
 * não limita a venda, e anunciar escassez que não existe é mentira de vitrine.
 */
export const lowStockLabel = (item: CartItem): string | null => {
  if (item.product.stock_policy !== 'track') return null
  const stock = stockOf(item)
  if (stock <= 0 || stock > item.product.low_stock_threshold) return null
  return `Última${stock === 1 ? '' : 's'} ${stock}!`
}

/** Dá para vender este produto agora? Com grade, pergunta à grade; sem grade, ao `stock_total`. */
const isSuggestable = (product: Product): boolean => {
  if (product.price <= 0) return false
  if (hasSellableGrid(product)) {
    return product.variants.some(
      (v) => v.is_active && v.price != null && isVariantAvailable(v, product.stock_policy),
    )
  }
  return product.stock_policy !== 'track' || product.stock_total > 0
}

/**
 * As sugestões de "complete o frete grátis": as joias mais baratas que ainda não estão na sacola.
 *
 * Barato primeiro, como no board — o rótulo "A partir de R$ X" é o preço da primeira. Não filtramos
 * por "fecha a diferença": quem está a R$ 15,30 do frete grátis aceita bem duas peças de R$ 12,90, e
 * exigir preço ≥ diferença esvaziaria a faixa justamente nos carrinhos quase lá.
 */
export const pickCrossSell = (
  products: readonly Product[] | undefined,
  items: readonly CartItem[],
  limit = 2,
): Product[] => {
  if (!products?.length) return []
  const inCart = new Set(items.map((i) => i.product.id))
  return products
    .filter((p) => !inCart.has(p.id) && isSuggestable(p))
    .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name))
    .slice(0, limit)
}

/** Os rótulos de variação de uma linha, para os chips (`4,5 cm · Fosco` → `['4,5 cm', 'Fosco']`). */
export const variantChips = (item: CartItem): string[] =>
  item.variantLabel
    .split('·')
    .map((s) => s.trim())
    .filter(Boolean)
