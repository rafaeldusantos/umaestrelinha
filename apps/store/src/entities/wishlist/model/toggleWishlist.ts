import { addToWishlistEvent } from '@estrelinha/core/analytics'
import type { Product } from '@estrelinha/supabase/types'
import { productItem, track } from '@/shared/lib/analytics'
import { useWishlistStore } from './wishlistStore'

/**
 * Favoritar ou desfavoritar — a ÚNICA porta das telas para o coração (feature 61, `EVT-08`).
 *
 * Os cinco corações da loja (card, página do produto, coluna de informação, barra de compra e linha
 * da sacola) chamavam `toggleItem` cada um por conta. Com o evento, cinco escritas da mesma pergunta
 * — "isto foi favoritar ou desfavoritar?" — divergiriam: bastava uma ler o estado DEPOIS de alternar
 * para medir o contrário. Aqui a pergunta é feita uma vez, ANTES de alternar, e **só marcar gera
 * evento**; desmarcar não.
 */
export function toggleWishlist(product: Product): void {
  const store = useWishlistStore.getState()
  const marcando = !store.hasItem(product.id)
  store.toggleItem(product.id)
  if (marcando) track(addToWishlistEvent({ item: productItem(product) }))
}
