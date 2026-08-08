import { create } from 'zustand'

/**
 * Abertura da gaveta do carrinho.
 *
 * Fora do `cartStore` de propósito: aquele é persistido em `localStorage` (`estrelinha-cart`), e um
 * booleano de UI ali reabriria a gaveta sozinha na visita seguinte. Este é efêmero.
 *
 * Mora em `entities/cart` — e não no widget — porque quem precisa abrir a gaveta está espalhado por
 * camadas que não podem importar `widgets/`: o card e a página de produto (`entities`), a nav mobile
 * e o header (`widgets`), o checkout (`pages`). O widget é o único que **lê** `open`.
 */
interface CartUiState {
  open: boolean
  openCart: () => void
  closeCart: () => void
  setCartOpen: (open: boolean) => void
}

export const useCartUiStore = create<CartUiState>((set) => ({
  open: false,
  openCart: () => set({ open: true }),
  closeCart: () => set({ open: false }),
  setCartOpen: (open) => set({ open }),
}))
