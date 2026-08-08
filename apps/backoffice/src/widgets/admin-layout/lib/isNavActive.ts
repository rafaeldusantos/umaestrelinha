/**
 * Item de navegação ativo: match exato para `/admin` (Dashboard) e match por
 * prefixo de segmento para as demais rotas (ex.: `/admin/produtos/novo` ativa "Produtos").
 */
export const isNavActive = (pathname: string, to: string): boolean =>
  to === '/admin' ? pathname === '/admin' : pathname === to || pathname.startsWith(`${to}/`)
