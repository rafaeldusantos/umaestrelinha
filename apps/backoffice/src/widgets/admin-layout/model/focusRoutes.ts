// As rotas que pedem foco — feature 47.
//
// `/admin/home` e `/admin/menu` são as duas telas do painel que mostram **a loja ao lado do que se
// edita**. Nelas a sidebar de 240px é a coisa menos usada: quem entra em `/admin/home` veio compor a
// Home, não navegar. Aqui é onde a navegação recolhe para o trilho, devolvendo 184px às duas colunas
// que estão disputando espaço.
//
// **Mora ao lado de `navItems.ts` de propósito.** Quem já é dono de "quais rotas a navegação
// conhece" é quem deve dizer "em quais delas ela sai da frente". A alternativa — cada página pedir o
// foco por contexto num `useEffect` — foi recusada no design: o layout renderiza **antes** do efeito
// da página, então o trilho apareceria expandido por um quadro e recolheria depois, com piscada
// visível a cada navegação.

import { isNavActive } from '@/widgets/admin-layout/lib/isNavActive'

export const FOCUS_ROUTES: readonly string[] = ['/admin/home', '/admin/menu']

/**
 * Esta rota pede o modo de foco?
 *
 * Casa por `isNavActive` — **a mesma** função que decide qual item da sidebar fica marcado. Duas
 * réguas de "esta rota é aquela" discordariam no dia em que uma subrota nova aparecesse: o editor de
 * seção (`/admin/home/:sectionId`) precisa contar como Home, e `/admin/homologacao` não pode contar
 * como nenhuma das duas só por começar com as mesmas letras.
 */
export const isFocusRoute = (pathname: string): boolean =>
  FOCUS_ROUTES.some(rota => isNavActive(pathname, rota))
