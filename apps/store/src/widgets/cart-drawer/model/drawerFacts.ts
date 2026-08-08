// Os fatos que a gaveta do carrinho mostra, como função pura.
//
// A gaveta é a única superfície de carrinho da loja (a rota `/carrinho` virou atalho para ela), então
// o que ela decide — quanto falta para o frete grátis, se um item está acabando, o que sugerir para
// completar o pedido — merece prova sem DOM.

import { isVariantAvailable } from '@nanapin/core/pricing'
import type { Product } from '@nanapin/supabase/types'
import type { CartItem } from '@/entities/cart/model/cartStore'
import { hasSellableGrid } from '@/entities/product/lib/variantSelection'

export interface FreeShippingProgress {
  /** Quanto falta em reais. `0` quando a faixa já foi atingida. */
  remaining: number
  /** 0–100, já limitado — a barra nunca passa do fim. */
  percent: number
  reached: boolean
}

export const freeShippingProgress = (
  subtotal: number,
  threshold: number,
): FreeShippingProgress => {
  // Faixa desligada (0 ou negativa) = frete grátis sempre; dividir por ela daria `Infinity`/`NaN` na
  // largura da barra.
  if (!(threshold > 0)) return { remaining: 0, percent: 100, reached: true }
  const remaining = Math.max(threshold - subtotal, 0)
  return {
    remaining,
    percent: Math.min((subtotal / threshold) * 100, 100),
    reached: remaining <= 0,
  }
}

/**
 * O estoque que **esta linha** consome: a variação escolhida, ou o `stock_total` legado quando o
 * produto não tem grade. Somar os dois contaria o mesmo botton duas vezes.
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
 * As sugestões de "complete o frete grátis": os bottons mais baratos que ainda não estão na sacola.
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
