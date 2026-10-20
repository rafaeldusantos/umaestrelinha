import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  APP_ROUTE_PATTERNS,
  LEGACY_REDIRECTS,
  NON_INDEXABLE_PATHS,
  ROUTE_SLUGS,
  SITEMAP_STATIC_PATHS,
} from '@estrelinha/core/routes'
import { staticPageMeta } from '@estrelinha/core/seo'
import { classifyPath, servePage, type PageDeps } from '@estrelinha/core/page'

/**
 * Feature 69, T13 (SSV-23) — **toda página fixa do sitemap é SERVIDA com o `<head>` próprio**.
 *
 * Desde a 69 o HTML de `/sobre`, das políticas, do guia e das perguntas frequentes sai de `servePage`
 * (`AD-053`), e a decisão "este caminho é página fixa" é de `classifyPath`. O defeito que este guarda
 * impede não quebra nada: uma rota acrescentada a `SITEMAP_STATIC_PATHS` que a classificação não
 * reconhecesse como fixa cairia em `category` (um segmento não reservado) — a função consultaria a
 * árvore, não acharia, e responderia **404 com `noindex`** para uma página que o sitemap anuncia e que
 * a SPA desenha. Quem descobre é o Google, semanas depois. O inverso é o mesmo defeito ao contrário:
 * um caminho servido como fixa sem estar no sitemap é página que existe e ninguém anuncia.
 *
 * Por isso a comparação é nas **duas direções**, no molde de `metaPorRota.test.ts`:
 *
 * 1. toda entrada de `SITEMAP_STATIC_PATHS` diferente de `/` é classificada `static` **e** servida com
 *    200, o `<title>` e a descrição de `staticPageMeta(path)` e a canônica absoluta do caminho;
 * 2. todo caminho que `classifyPath` chama de `static` — entre todos os que a loja conhece: as rotas
 *    do `App.tsx` (lidas do disco), as não indexáveis, as de app, as legadas e os slugs reservados —
 *    está em `SITEMAP_STATIC_PATHS`.
 *
 * As duas réguas recebem a LISTA como argumento, para que o sensor prove que uma lista com um
 * caminho a mais e uma com um a menos reprovam (a régua nunca pode ser o objeto medido).
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../..')

/** O caminho por extenso: a régua não pode ser o objeto medido. */
const APP = readFileSync(join(ROOT, 'apps/store/src/app/App.tsx'), 'utf8')

const ORIGEM = 'https://umaestrelinha.com.br'
const SHELL =
  '<!doctype html><html><head><title>Uma Estrelinha</title>' +
  '<meta name="description" content="Joias afetivas"></head><body><div id="root"></div></body></html>'

/**
 * Dublê mínimo: página fixa não lê o banco (SSV-22). Toda leitura LANÇA — se uma página fixa for
 * parar no ramo de categoria ou de produto, a resposta vira o shell com `no-store`, e as asserções de
 * título e canônica reprovam em vez de passar sobre um dado inventado.
 */
const lanca = async (): Promise<never> => {
  throw new Error('página fixa não lê o banco')
}
const deps: PageDeps = {
  shell: SHELL,
  origin: ORIGEM,
  readProduct: lanca,
  readOptionMarks: lanca,
  readProductRedirect: lanca,
  readCategories: lanca,
  readCategoryRedirect: lanca,
  readInactiveFallback: lanca,
  readSettings: lanca,
  log: () => {},
}

const desescapa = (s: string): string =>
  s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')

const titulos = (corpo: string) =>
  [...corpo.matchAll(/<title>([^<]*)<\/title>/g)].map(m => desescapa(m[1]))
const descricoes = (corpo: string) =>
  [...corpo.matchAll(/<meta\s+name="description"\s+content="([^"]*)"/g)].map(m => desescapa(m[1]))
const canonicas = (corpo: string) =>
  [...corpo.matchAll(/<link\s+rel="canonical"\s+href="([^"]*)"/g)].map(m => desescapa(m[1]))

/** (1) As entradas da lista que NÃO saem como página fixa servida, com o motivo. */
type Servir = (url: URL) => Promise<{ status: number; body: string }>
const servirDeVerdade: Servir = url => servePage(deps, url)

const naoServidas = async (lista: readonly string[], servir: Servir = servirDeVerdade): Promise<string[]> => {
  const erros: string[] = []
  for (const path of lista.filter(p => p !== '/')) {
    const tipo = classifyPath(path)
    if (tipo.kind !== 'static' || tipo.path !== path) {
      erros.push(`${path}: classificado ${tipo.kind}`)
      continue
    }
    let meta: { title: string; description: string }
    try {
      meta = staticPageMeta(path)
    } catch {
      erros.push(`${path}: sem staticPageMeta`)
      continue
    }
    const res = await servir(new URL(`${ORIGEM}${path}`))
    if (res.status !== 200) erros.push(`${path}: status ${res.status}`)
    if (JSON.stringify(titulos(res.body)) !== JSON.stringify([meta.title])) {
      erros.push(`${path}: <title> ${JSON.stringify(titulos(res.body))}`)
    }
    if (JSON.stringify(descricoes(res.body)) !== JSON.stringify([meta.description])) {
      erros.push(`${path}: description ${JSON.stringify(descricoes(res.body))}`)
    }
    if (JSON.stringify(canonicas(res.body)) !== JSON.stringify([`${ORIGEM}${path}`])) {
      erros.push(`${path}: canônica ${JSON.stringify(canonicas(res.body))}`)
    }
  }
  return erros
}

/** As rotas do `App.tsx` — comentário não é rota (linha e bloco na MESMA varredura, `BL-027`). */
const rotasDoApp = (fonte: string): string[] => [
  ...new Set(
    [...fonte.replace(/\r\n/g, '\n').replace(/\/\/[^\n]*|\/\*[\s\S]*?\*\//g, '').matchAll(/path="([^"]*)"/g)].map(
      m => m[1],
    ),
  ),
]

/** Uma URL concreta de um padrão: cada `:param` vira um segmento de slug válido. */
const instancia = (padrao: string): string =>
  padrao.replace(/:[A-Za-z]+/g, m => (m === ':parentSlug' ? 'joias-afetivas' : 'x-1a2b3c4d'))

/**
 * Todo caminho que a loja conhece, cada um também em CAIXA ALTA (`classifyPath` casa a parte
 * estática sem caixa, como o React Router — `/Sobre` também é página fixa, e a canônica é a da lista).
 */
const candidatos = (): string[] => {
  const base = [
    ...rotasDoApp(APP).filter(p => p !== '*'),
    ...SITEMAP_STATIC_PATHS,
    ...NON_INDEXABLE_PATHS.map(r => r.path),
    ...APP_ROUTE_PATTERNS,
    ...LEGACY_REDIRECTS.map(r => r.from),
    ...ROUTE_SLUGS.map(s => `/${s}`),
  ].map(instancia)
  return [...new Set(base.flatMap(p => [p, p.toUpperCase()]))]
}

/** (2) Os caminhos que `classifyPath` serve como fixa sem estarem na lista. */
const fixasForaDaLista = (lista: readonly string[], caminhos: readonly string[]): string[] =>
  caminhos.flatMap(c => {
    const tipo = classifyPath(c)
    return tipo.kind === 'static' && !lista.includes(tipo.path) ? [`${c} ⇒ ${tipo.path}`] : []
  })

describe('paginasFixasServidas — âncoras', () => {
  it('SITEMAP_STATIC_PATHS tem 7 entradas, e 6 delas são páginas fixas servidas (a Home é do filesystem)', () => {
    // Número cravado: uma página fixa nova muda esta contagem, e quem a acrescenta passa por aqui.
    expect(SITEMAP_STATIC_PATHS).toHaveLength(7)
    expect(SITEMAP_STATIC_PATHS.filter(p => p !== '/')).toHaveLength(6)
  })

  it('a varredura do inverso leu o App.tsx e conhece caminhos de todos os tipos', () => {
    expect(APP).toContain('<Routes>')
    expect(rotasDoApp(APP)).toHaveLength(25)
    const tipos = new Set(candidatos().map(c => classifyPath(c).kind))
    // Sem esta âncora, um colhedor que devolvesse só páginas fixas faria o inverso passar sobre nada.
    expect([...tipos].sort()).toEqual(['app', 'category', 'notfound', 'product', 'static'])
    expect(candidatos().filter(c => classifyPath(c).kind === 'static')).toHaveLength(12)
  })
})

describe('paginasFixasServidas — bidirecional (SSV-23)', () => {
  it('toda entrada de SITEMAP_STATIC_PATHS − / é classificada `static` e servida com o <head> dela', async () => {
    expect(await naoServidas(SITEMAP_STATIC_PATHS)).toEqual([])
  })

  it('todo caminho que classifyPath serve como fixa está em SITEMAP_STATIC_PATHS', () => {
    expect(fixasForaDaLista(SITEMAP_STATIC_PATHS, candidatos())).toEqual([])
  })
})

describe('paginasFixasServidas — sensores (a régua de fato reprova)', () => {
  it('uma lista com um caminho A MAIS — que a classificação não serve como fixa — é acusada', async () => {
    const aMais = [...SITEMAP_STATIC_PATHS, '/pagina-nova-do-sitemap']
    expect(await naoServidas(aMais)).toEqual(['/pagina-nova-do-sitemap: classificado category'])
  })

  it('uma lista com um caminho A MENOS deixa uma fixa servida fora dela, e é acusada', () => {
    const aMenos = SITEMAP_STATIC_PATHS.filter(p => p !== '/sobre')
    expect(fixasForaDaLista(aMenos, candidatos())).toEqual(['/sobre ⇒ /sobre', '/SOBRE ⇒ /sobre'])
  })

  it('um servidor que devolve o shell intacto (sem o <head> da página) é acusado em toda fixa', async () => {
    // A régua de título, descrição e canônica tem dente: a classificação certa com a resposta errada
    // reprova nas três medidas, uma linha por medida e por caminho.
    const shellIntacto: Servir = async () => ({ status: 200, body: SHELL })
    const erros = await naoServidas(SITEMAP_STATIC_PATHS, shellIntacto)
    expect(erros).toHaveLength(6 * 3)
    expect(erros.filter(e => e.includes('<title>'))).toHaveLength(6)
    expect(erros.filter(e => e.includes('canônica'))).toHaveLength(6)
  })

  it('um servidor que responde 404 é acusado pelo status', async () => {
    const quatrocentos: Servir = async url => ({ ...(await servirDeVerdade(url)), status: 404 })
    expect(await naoServidas(['/sobre'], quatrocentos)).toEqual(['/sobre: status 404'])
  })

  it('rota citada só em comentário não conta — com CRLF e com LF', () => {
    for (const quebra of ['\n', '\r\n']) {
      const sintetico = APP.replace(
        '<Routes>',
        `<Routes>${quebra}{/* <Route path="/so-em-prosa" /> */}${quebra}// path="/tambem-prosa"${quebra}`,
      )
      expect(sintetico).not.toBe(APP)
      expect(rotasDoApp(sintetico)).not.toContain('/so-em-prosa')
      expect(rotasDoApp(sintetico)).not.toContain('/tambem-prosa')
    }
  })
})
