import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface WishlistState {
  items: string[]
  toggleItem: (id: string) => void
  hasItem: (id: string) => boolean
  count: () => number
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      toggleItem: (id) =>
        set((state) => ({
          items: state.items.includes(id)
            ? state.items.filter((i) => i !== id)
            : [...state.items, id],
        })),
      hasItem: (id) => get().items.includes(id),
      count: () => get().items.length,
    }),
    { name: 'estrelinha-wishlist' }
  )
)
