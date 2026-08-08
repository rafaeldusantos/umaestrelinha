import { useMemo } from 'react'
import { menuEntries, type MenuEntry } from '@estrelinha/core/menu'
import { useCategories } from './useCategories'

/**
 * O menu da loja — as entradas da barra do topo, com filhas e card promo resolvidos.
 *
 * **Sem consulta própria**: deriva da mesma `queryKey ['categories']` que o resto da loja usa, então
 * montar o header não custa um segundo round-trip. E como a regra é `menuEntries` de
 * `@estrelinha/core/menu`, o que o desktop mostra, o que o celular mostra e o que a tela `/admin/menu`
 * promete são a mesma função.
 *
 * Falha de consulta devolve `[]` (o `useCategories` já engole o erro por design), e a barra renderiza
 * só o item fixo "Sobre" em vez de uma barra quebrada (`MENU-04`).
 */
export const useMenu = (): { entries: MenuEntry[] } => {
  const { data: categories } = useCategories()
  const entries = useMemo(() => menuEntries(categories ?? []), [categories])
  return { entries }
}
