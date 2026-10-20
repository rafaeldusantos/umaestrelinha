import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { APP_ROUTE_PATTERNS, SITEMAP_STATIC_PATHS } from '@estrelinha/core/routes'
import { classifyPath } from '@estrelinha/core/page'

/**
 * Feature 69, T04 (SSV-09, SSV-10) — **toda rota do `App.tsx` tem uma resposta servida**.
 *
 * Desde a 69 o catch-all da Vercel deixa de ser o `index.html` e passa a ser a função `api/page`, que
 * responde 404 a tudo que não reconhece. Isso inverte o risco: antes uma rota nova "funcionava
 * sozinha" (200 para tudo); agora, se ela não entrar em `APP_ROUTE_PATTERNS` (ou não for página fixa,
 * produto ou categoria), o servidor responde **404 para uma página que existe** — e a SPA ainda
 * desenha a página por cima, então quem vê o defeito é só o Google, semanas depois.
 *
 * Por isso a comparação é nas **duas direções**, contra o `App.tsx` **lido do disco** (molde de
 * `reservedSlugs.test.ts` e `sitemapRoutes.test.ts`): rota sem classificação reprova, e padrão de
 * `APP_ROUTE_PATTERNS` que deixou de ser rota também — senão a função responderia 200 a um endereço
 * que a SPA desenha como 404.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../..')

/** O caminho por extenso: a régua não pode ser o objeto medido. */
const APP_TSX = join(ROOT, 'apps/store/src/app/App.tsx')
const APP = readFileSync(APP_TSX, 'utf8')

/** Comentário não é rota — o `App.tsx` cita `path="*"` em prosa. Linha e bloco na MESMA varredura. */
const semComentarios = (source: string): string =>
  source.replace(/\r\n/g, '\n').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '')

const declaredPaths = (source: string): string[] => [
  ...new Set([...semComentarios(source).matchAll(/path="([^"]*)"/g)].map(m => m[1])),
]

/** As formas que a função resolve pelo CATÁLOGO, e não por lista. */
const DO_CATALOGO = ['/produtos/:slug', '/:slug', '/:parentSlug/:slug']
const CURINGA = '*'

/** Em quantos conjuntos a rota está — tem de ser exatamente um. */
const conjuntos = (path: string): string[] =>
  [
    APP_ROUTE_PATTERNS.includes(path) ? 'app' : null,
    SITEMAP_STATIC_PATHS.includes(path) ? 'fixa' : null,
    DO_CATALOGO.includes(path) ? 'catalogo' : null,
    path === CURINGA ? 'curinga' : null,
  ].filter(Boolean) as string[]

const semClassificacao = (source: string): string[] =>
  declaredPaths(source).filter(p => conjuntos(p).length !== 1)

const padroesOrfaos = (source: string): string[] => {
  const rotas = new Set(declaredPaths(source))
  return APP_ROUTE_PATTERNS.filter(p => !rotas.has(p))
}

/** Uma URL concreta da rota: cada `:param` vira um segmento de slug válido. */
const instancia = (padrao: string): string =>
  padrao.replace(/:[A-Za-z]+/g, m => (m === ':parentSlug' ? 'joias-afetivas' : 'x-1a2b3c4d'))

describe('rotasDeApp — âncora da varredura', () => {
  it('leu o `App.tsx` de verdade', () => {
    expect(APP.length).toBeGreaterThan(1000)
    expect(APP).toContain('<Routes>')
  })

  it('encontrou as 25 rotas que o roteador declara — e 14 delas são de app', () => {
    // Se uma rota sumir ou entrar, este número muda e alguém precisa olhar, em vez de a classificação
    // passar a cobrir um roteador diferente sem aviso.
    expect(declaredPaths(APP)).toHaveLength(25)
    expect(declaredPaths(APP).filter(p => APP_ROUTE_PATTERNS.includes(p))).toHaveLength(14)
  })
})

describe('rotasDeApp — bidirecional com o App.tsx', () => {
  it('toda rota declarada está em EXATAMENTE um conjunto (app, fixa, catálogo, curinga)', () => {
    expect(semClassificacao(APP)).toEqual([])
  })

  it('todo padrão de APP_ROUTE_PATTERNS ainda é rota do App.tsx', () => {
    expect(padroesOrfaos(APP)).toEqual([])
  })

  it('a função classifica uma URL concreta de cada rota no conjunto dela', () => {
    const errados: string[] = []
    for (const padrao of declaredPaths(APP)) {
      if (padrao === CURINGA) continue
      const url = instancia(padrao)
      const kind = classifyPath(url).kind
      const esperado = APP_ROUTE_PATTERNS.includes(padrao)
        ? 'app'
        : padrao === '/'
          ? 'app'
          : SITEMAP_STATIC_PATHS.includes(padrao)
            ? 'static'
            : padrao === '/produtos/:slug'
              ? 'product'
              : 'category'
      if (kind !== esperado) errados.push(`${padrao} (${url}) ⇒ ${kind}, esperado ${esperado}`)
    }
    expect(errados).toEqual([])
  })

  it('nenhuma rota declarada vira 404 no servidor', () => {
    const viram404 = declaredPaths(APP)
      .filter(p => p !== CURINGA)
      .filter(p => classifyPath(instancia(p)).kind === 'notfound')
    expect(viram404).toEqual([])
  })
})

describe('rotasDeApp — os sensores (a régua de fato reprova)', () => {
  it('uma rota NOVA no App.tsx sem classificação é acusada', () => {
    const sintetico = APP.replace(
      '<Route path="/favoritos"',
      '<Route path="/ajuda/:assunto" element={<X />} />\n<Route path="/favoritos"',
    )
    expect(sintetico).not.toBe(APP)
    expect(semClassificacao(sintetico)).toEqual(['/ajuda/:assunto'])
  })

  it('uma rota de app REMOVIDA do App.tsx deixa o padrão órfão, e é acusada', () => {
    const sintetico = APP.replace('<Route path="/favoritos" element={<WishlistPage />} />', '')
    expect(sintetico).not.toBe(APP)
    expect(padroesOrfaos(sintetico)).toEqual(['/favoritos'])
  })

  it('rota citada só em comentário não conta — com CRLF e com LF', () => {
    for (const quebra of ['\n', '\r\n']) {
      const sintetico = APP.replace(
        '<Routes>',
        `<Routes>${quebra}{/* <Route path="/so-em-prosa" /> */}${quebra}// path="/tambem-prosa"${quebra}`,
      )
      expect(declaredPaths(sintetico)).not.toContain('/so-em-prosa')
      expect(declaredPaths(sintetico)).not.toContain('/tambem-prosa')
    }
  })
})
