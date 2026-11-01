import { navGroups } from '../model/navItems'

/** O caminho cai no destino: exato para `/admin` (Dashboard), por segmento para os demais. */
const casa = (pathname: string, to: string): boolean =>
  to === '/admin' ? pathname === '/admin' : pathname === to || pathname.startsWith(`${to}/`)

/**
 * Item de navegação ativo: match exato para `/admin` (Dashboard) e match por prefixo de segmento
 * para as demais rotas (ex.: `/admin/produtos/novo` ativa "Produtos").
 *
 * **Vence o destino MAIS ESPECÍFICO.** Desde 2026-11-01 a sidebar tem "Pedidos" (`/admin/pedidos`) e,
 * abaixo, "Pedidos montados" (`/admin/pedidos/montados`). Por prefixo os dois casariam em
 * `/admin/pedidos/montados/:id`, e a sidebar marcaria dois itens. Um destino que tem outro destino da
 * sidebar mais fundo casando no mesmo caminho cede para ele.
 */
export const isNavActive = (pathname: string, to: string): boolean => {
  if (!casa(pathname, to)) return false
  return !navGroups.some((g) =>
    g.items.some((i) => i.to !== to && i.to.startsWith(`${to}/`) && casa(pathname, i.to)),
  )
}
