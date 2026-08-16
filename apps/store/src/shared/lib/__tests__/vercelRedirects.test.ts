import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { LEGACY_REDIRECTS } from '@estrelinha/core/routes'

/**
 * `URL-02` — o guarda do `vercel.json`.
 *
 * O 301 das URLs legadas mora no **edge**, porque só o edge devolve status HTTP de verdade — é ele
 * que preserva o link equity e é ele que `curl -I` mede. O roteador da loja tem o espelho (para
 * `pnpm dev` e para o vitest, que não têm edge nenhum), mas o espelho não é o que o Google vê.
 *
 * Config sem verificação é código não provado, e este arquivo é o pior caso disso: um `source`
 * escrito errado **não quebra nada** — o build passa, os testes de componente passam, a loja sobe.
 * O que acontece é que a URL indexada cai no `rewrites` do SPA, a página monta, e a loja serve o
 * mesmo conteúdo em dois endereços sem canônica. Ninguém descobre até o relatório do Search Console.
 *
 * Por isso o teste lê `apps/store/vercel.json` **do disco**, por caminho literal, e compara com
 * `LEGACY_REDIRECTS` — a mesma lista que o `App.tsx` consome. As duas pontas não podem divergir.
 *
 * Não se testa aqui que `redirects` roda **antes** de `rewrites`: isso é comportamento documentado
 * da plataforma, não do repositório. O que é nosso — e está testado — é o que está escrito no
 * arquivo.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '../../../../../..')

/**
 * O caminho escrito por extenso, e não derivado de uma constante do código medido. A régua nunca
 * pode ser o objeto medido: um caminho montado a partir do que se quer testar encolhe junto com ele.
 */
const VERCEL_JSON = join(ROOT, 'apps/store/vercel.json')

type Redirect = { source?: string; destination?: string; statusCode?: number; permanent?: boolean }
type VercelConfig = {
  framework?: string
  trailingSlash?: boolean
  redirects?: Redirect[]
  rewrites?: { source?: string; destination?: string }[]
  headers?: { source?: string; headers?: { key?: string; value?: string }[] }[]
}

const RAW = readFileSync(VERCEL_JSON, 'utf8')
const CONFIG = JSON.parse(RAW) as VercelConfig

describe('vercel.json — âncora da leitura', () => {
  it('o arquivo lido tem conteúdo de verdade', () => {
    // Sem esta âncora, um caminho errado (ou um arquivo esvaziado) faria o resto da suíte comparar
    // listas vazias com listas vazias e passar em silêncio — a pior falha possível num guarda.
    expect(RAW.trim().length).toBeGreaterThan(100)
    // E é o arquivo CERTO: a configuração de host da loja, não outro JSON qualquer do repositório.
    expect(CONFIG.framework).toBe('vite')
  })

  it('encontra um redirect para cada forma legada', () => {
    // A segunda metade da âncora dupla: contou o que leu, e o número bate com a lista de origem.
    expect(CONFIG.redirects).toBeDefined()
    expect(CONFIG.redirects.length).toBe(LEGACY_REDIRECTS.length)

    // E o tamanho da própria régua está escrito aqui: esvaziar `LEGACY_REDIRECTS` tornaria a
    // comparação acima verdadeira contra um `redirects: []`, que é exatamente o defeito a evitar.
    // Três padrões de categoria/produto (feature 23) + o caminho fixo do guia (feature 31).
    expect(LEGACY_REDIRECTS.length).toBe(4)
  })
})

describe('vercel.json — os 301 das URLs legadas (URL-02)', () => {
  const bySource = (source: string): Redirect =>
    CONFIG.redirects.find((entry) => entry.source === source)

  it('`/produto/:slug` → `/produtos/:slug` com 301 — o singular nunca foi canônico (AC 2)', () => {
    const entry = bySource('/produto/:slug')
    expect(entry).toBeDefined()
    expect(entry.destination).toBe('/produtos/:slug')
    expect(entry.statusCode).toBe(301)
  })

  it('`/colecao/:slug` → `/:slug` com 301 — a rota da loja nova deixa de ser canônica (AC 3c)', () => {
    const entry = bySource('/colecao/:slug')
    expect(entry).toBeDefined()
    expect(entry.destination).toBe('/:slug')
    expect(entry.statusCode).toBe(301)
  })

  it('`/categoria/:slug` → `/:slug` com 301 — forma que a Nuvemshop aceita e canonicaliza', () => {
    const entry = bySource('/categoria/:slug')
    expect(entry).toBeDefined()
    expect(entry.destination).toBe('/:slug')
    expect(entry.statusCode).toBe(301)
  })

  it('`/como-enviar-o-material` → o guia novo com 301 (feature 31)', () => {
    // Caminho INTEIRO, sem `:slug`: a feature 31 trocou o endereço do guia de material, e não há
    // nada de variável para casar. É a URL que está no rodapé de todo e-mail já enviado.
    const entry = bySource('/como-enviar-o-material')
    expect(entry).toBeDefined()
    expect(entry.destination).toBe('/como-enviar-seu-material-de-dna')
    expect(entry.statusCode).toBe(301)
  })

  it('o edge declara exatamente o mesmo conjunto que `LEGACY_REDIRECTS` — nas duas direções', () => {
    // Bidirecional: entrada nova na lista que não chegou ao arquivo quebra aqui, e entrada no
    // arquivo que ninguém declarou na lista também. Sem isso as duas pontas envelhecem separadas.
    const noArquivo = CONFIG.redirects.map((entry) => `${entry.source} → ${entry.destination}`).sort()
    const naLista = LEGACY_REDIRECTS.map((entry) => `${entry.from} → ${entry.to}`).sort()

    expect(noArquivo).toEqual(naLista)
  })

  it('nenhum redirect usa `permanent`', () => {
    // `permanent: true` produz **308**, e a AC 2 pede 301. Os dois campos também não podem coexistir
    // no mesmo objeto — a Vercel recusa a configuração. Assere-se a ausência da chave, não a
    // ausência do valor `true`: `permanent: false` produziria 307 e seria igualmente errado.
    for (const entry of CONFIG.redirects) {
      expect(Object.prototype.hasOwnProperty.call(entry, 'permanent')).toBe(false)
    }
  })
})

describe('vercel.json — barra final e o que já existia', () => {
  it('`trailingSlash: false` — a canônica é a forma sem barra', () => {
    // `undefined` está fora de questão: as duas formas serviriam o mesmo conteúdo sem canônica.
    // A URL indexada (`/produtos/x/`) paga UM salto 308 e chega na forma que o router serve.
    expect(CONFIG.trailingSlash).toBe(false)
  })

  /**
   * Feature 30 (`GSH-03`, `GSH-12`): esta asserção foi **reescrita porque a spec mudou o
   * comportamento**, e ela GANHOU vizinhas em vez de ser afrouxada. Até a `30` o array tinha um
   * elemento só; agora tem três, e o que precisa ser guardado deixou de ser a igualdade e passou a
   * ser a **ordem**.
   */
  it('o rewrite do SPA continua existindo — sem ele nenhuma rota profunda responde no F5', () => {
    expect(CONFIG.rewrites).toContainEqual({ source: '/(.*)', destination: '/index.html' })
  })

  it('o catch-all é o ÚLTIMO — a Vercel avalia rewrites por ordem', () => {
    // Um catch-all na frente engoliria o feed e a página servida **sem erro nenhum**: as duas rotas
    // passariam a devolver o `index.html` do SPA, o Merchant Center leria HTML no lugar do RSS e a
    // landing page voltaria a não ter JSON-LD. Nada quebraria; só pararia de funcionar.
    const ultimo = CONFIG.rewrites[CONFIG.rewrites.length - 1]
    expect(ultimo).toEqual({ source: '/(.*)', destination: '/index.html' })
    expect(CONFIG.rewrites.filter((r) => r.source === '/(.*)')).toHaveLength(1)
  })
})

describe('vercel.json — as duas rotas do Google Shopping (feature 30)', () => {
  const porSource = (source: string) => CONFIG.rewrites.find((r) => r.source === source)

  it('o feed é exposto sob o domínio da loja', () => {
    const feed = porSource('/feeds/google-shopping.xml')
    expect(feed).toBeDefined()
    expect(feed.destination).toMatch(/\/functions\/v1\/google-feed$/)
  })

  it('a página do produto passa pela function que injeta o JSON-LD', () => {
    const pagina = porSource('/produtos/:slug')
    expect(pagina).toBeDefined()
    expect(pagina.destination).toMatch(/\/functions\/v1\/product-page\?slug=:slug$/)
  })

  it('as duas vêm ANTES do catch-all', () => {
    const i = (source: string) => CONFIG.rewrites.findIndex((r) => r.source === source)
    const catchAll = i('/(.*)')
    expect(i('/feeds/google-shopping.xml')).toBeLessThan(catchAll)
    expect(i('/produtos/:slug')).toBeLessThan(catchAll)
  })

  it('as duas apontam para o MESMO host — meia configuração é pior que nenhuma', () => {
    const host = (source: string) => new URL(porSource(source).destination).host
    expect(host('/feeds/google-shopping.xml')).toBe(host('/produtos/:slug'))
  })

  it('o host é um projeto Supabase', () => {
    for (const source of ['/feeds/google-shopping.xml', '/produtos/:slug']) {
      expect(new URL(porSource(source).destination).host).toMatch(/\.supabase\.co$/)
    }
  })

  /**
   * **Não há projeto Supabase hospedado da Uma Estrelinha** (`C-08`), então o host das duas rotas é
   * um marcador. Um marcador que ninguém rastreia é uma armadilha com prazo indeterminado — o mesmo
   * defeito que a lista de slugs reservados existe para conter. Este teste transforma a pendência em
   * item rastreado: enquanto o marcador estiver no arquivo, ele **precisa** estar declarado no
   * backlog. Substituído pelo ref real, o teste sai de cena sozinho.
   */
  it('enquanto o host for marcador, a pendência está declarada no BACKLOG', () => {
    const host = new URL(porSource('/produtos/:slug').destination).host
    const ehMarcador = /[A-Z]/.test(host)
    if (!ehMarcador) return
    const backlog = readFileSync(join(ROOT, '.specs/BACKLOG.md'), 'utf8')
    expect(backlog).toContain('BL-016')
    expect(backlog).toContain(host)
  })

  it('os headers existentes ficam intactos', () => {
    const assets = CONFIG.headers.find((entry) => entry.source === '/assets/(.*)')
    expect(assets).toBeDefined()
    expect(assets.headers).toEqual([
      { key: 'Cache-Control', value: 'public, max-age=31536000, immutable' },
    ])

    const seguranca = CONFIG.headers.find((entry) => entry.source === '/(.*)')
    expect(seguranca).toBeDefined()
    expect(seguranca.headers.map((header) => header.key)).toEqual([
      'X-Content-Type-Options',
      'Referrer-Policy',
      'X-Frame-Options',
    ])
  })
})
