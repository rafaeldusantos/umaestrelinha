import { create } from 'zustand'

/**
 * Abertura da busca em tela cheia (board "Mobile Search Open - v3").
 *
 * Mesmo desenho do `cartUiStore`, e pelo mesmo motivo: quem abre a busca está em mais de um lugar
 * (aba do `MobileNav`, menu do header) e o painel precisa ser **um só**, montado uma vez pelo layout.
 * Store efêmero, sem persistência — um booleano de UI em `localStorage` reabriria a busca sozinha na
 * visita seguinte.
 */
interface SearchUiState {
  open: boolean
  openSearch: () => void
  closeSearch: () => void
  setSearchOpen: (open: boolean) => void
}

export const useSearchUiStore = create<SearchUiState>((set) => ({
  open: false,
  openSearch: () => set({ open: true }),
  closeSearch: () => set({ open: false }),
  setSearchOpen: (open) => set({ open }),
}))
