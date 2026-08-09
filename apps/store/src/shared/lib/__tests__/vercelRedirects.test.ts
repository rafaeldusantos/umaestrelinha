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
    expect(LEGACY_REDIRECTS.length).toBe(3)
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

  it('o rewrite do SPA fica intacto — sem ele nenhuma rota profunda responde no F5', () => {
    expect(CONFIG.rewrites).toEqual([{ source: '/(.*)', destination: '/index.html' }])
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
