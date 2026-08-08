import { create } from 'zustand'

/**
 * Abertura da folha de menu do celular (board "Mobile Menu Open - v3").
 *
 * Mesmo molde e mesma justificativa do `cartUiStore`:
 *
 * - **Efêmero, fora de qualquer storage.** Um booleano de UI persistido reabriria o menu sozinho na
 *   visita seguinte — a cliente voltaria à loja com a navegação em cima do conteúdo.
 * - **Mora em `entities/category`, não no widget.** Quem abre é o `Header` (um widget), e widget não
 *   importa widget. Quem só **lê** `open` é o `widgets/mobile-menu`.
 *
 * `closeMenu` é chamado de dentro da própria folha em três caminhos que levam a outra superfície —
 * busca, conta e navegação — porque duas camadas abertas ao mesmo tempo no celular deixam a cliente
 * sem saber qual `Esc`/voltar está fechando o quê.
 */
interface MenuUiState {
  open: boolean
  openMenu: () => void
  closeMenu: () => void
  setMenuOpen: (open: boolean) => void
}

export const useMenuUiStore = create<MenuUiState>((set) => ({
  open: false,
  openMenu: () => set({ open: true }),
  closeMenu: () => set({ open: false }),
  setMenuOpen: (open) => set({ open }),
}))
