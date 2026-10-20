// Feature 69 — o que um caminho É, antes de qualquer leitura do banco (`AD-053`).
//
// A função da Vercel recebe TODO caminho que não é arquivo estático nem a Home. Esta é a primeira
// decisão dela, e é pura: só a tabela de rotas de `core/routes`. O que depende do catálogo (o produto
// existe? a categoria está ativa?) é de `servePage`, depois.
//
// Imports por ARQUIVO e com extensão explícita: a função empacota este módulo fora do Vite.

import {
  APP_ROUTE_PATTERNS,
  RESERVED_SLUGS,
  SITEMAP_STATIC_PATHS,
} from '../routes/routes.ts'

/**
 * Discriminante por literal de STRING (`strictNullChecks: false` não estreita união por booleano).
 */
export type PathKind =
  | { kind: 'product'; slug: string }
  | { kind: 'category'; slug: string; parentSlug: string | null }
  | { kind: 'static'; path: string }
  | { kind: 'app' }
  | { kind: 'notfound' }

/** O prefixo da página de produto — o segmento estático de `productPath`. */
const PRODUTO = 'produtos'

/**
 * Um segmento que não pode ser slug nem parâmetro de rota.
 *
 * Todo slug do catálogo é `[a-z0-9-]` (medido em 2026-10-19: 702 produtos e as categorias, zero
 * fora disso), e os parâmetros de rota (`:id`, `:pergunta`) também. Então `.` (extensão de arquivo,
 * `..`) e `%` (caminho codificado) só aparecem em endereço que não existe — e tratá-los como
 * inexistentes antes de qualquer leitura é o que impede um caminho de virar consulta ou arquivo
 * (spec, *Implicit-requirement sweep*: validação de entrada). Segmento vazio (`//`, barra final)
 * também: a barra final é resolvida pelo 308 do edge antes de chegar aqui.
 */
const segmentoInvalido = (s: string): boolean => s === '' || s.includes('.') || s.includes('%')

/** `/pedido/:id` contra `['pedido', 'abc']` — `:x` casa qualquer segmento; o resto, sem caixa. */
const casa = (padrao: string, segmentos: readonly string[]): boolean => {
  const partes = padrao.split('/').slice(1)
  return (
    partes.length === segmentos.length &&
    partes.every((p, i) => p.startsWith(':') || p === segmentos[i].toLowerCase())
  )
}

const reservado = (s: string): boolean => RESERVED_SLUGS.includes(s.toLowerCase())

/**
 * A classificação de um `pathname` (sem query), na ordem da tabela do `design.md` da 69:
 *
 * 1. `/` ⇒ `app` — a Home é servida pelo filesystem; se chegar aqui, sai o shell intacto.
 * 2. segmento vazio, com `.` ou `%` ⇒ `notfound` (extensão de arquivo, `..`, codificado).
 * 3. rota de aplicação (`APP_ROUTE_PATTERNS`) ⇒ `app`.
 * 4. página fixa indexável (`SITEMAP_STATIC_PATHS` − `/`) ⇒ `static`, com o caminho declarado.
 * 5. `/produtos/:slug` ⇒ `product`.
 * 6. um ou dois segmentos, o primeiro NÃO reservado ⇒ `category` — um segmento reservado que não
 *    casou rota nenhuma (`/produtos`, `/conta/x`, `/api`) não é categoria por definição (`AD-018`).
 * 7. o resto — três ou mais segmentos não declarados — ⇒ `notfound` (SSV-09).
 *
 * As partes estáticas casam **sem caixa**, como o React Router (`/Sobre` abre `/sobre`); o slug sai
 * com a caixa que chegou, e quem decide se ele existe é o banco — como a SPA faz hoje.
 */
export const classifyPath = (path: string): PathKind => {
  if (path === '/') return { kind: 'app' }
  if (typeof path !== 'string' || !path.startsWith('/')) return { kind: 'notfound' }

  const segmentos = path.slice(1).split('/')
  if (segmentos.some(segmentoInvalido)) return { kind: 'notfound' }

  if (APP_ROUTE_PATTERNS.some(p => casa(p, segmentos))) return { kind: 'app' }

  const fixa = SITEMAP_STATIC_PATHS.find(p => p !== '/' && casa(p, segmentos))
  if (fixa) return { kind: 'static', path: fixa }

  if (segmentos.length === 2 && segmentos[0].toLowerCase() === PRODUTO) {
    return { kind: 'product', slug: segmentos[1] }
  }

  if (segmentos.length <= 2 && !reservado(segmentos[0])) {
    return segmentos.length === 1
      ? { kind: 'category', slug: segmentos[0], parentSlug: null }
      : { kind: 'category', slug: segmentos[1], parentSlug: segmentos[0] }
  }

  return { kind: 'notfound' }
}
