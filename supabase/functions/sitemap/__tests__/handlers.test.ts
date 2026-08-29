import { describe, it, expect, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import { handleSitemap, readCatalog, type SitemapDeps } from '../handlers.ts'
import type { SitemapCategory, SitemapProduct } from '../../../../packages/core/src/sitemap/index.ts'

/**
 * `SMP-16`..`SMP-20` — a function.
 *
 * A propriedade central deste arquivo é **negativa**: nenhum caminho degradado pode devolver um
 * `<urlset>`. É por isso que quase todo caso assere a **ausência** do elemento, e não só o status —
 * um 503 com corpo de sitemap seria lido como sitemap por metade dos consumidores, e a lição do
 * `BUG-20260829` é exatamente que status e corpo se decidem em lugares diferentes.
 */

const produto = (slug: string, updated_at: string | null = null): SitemapProduct => ({
  slug,
  updated_at,
})

const categoria = (slug: string, over: Partial<SitemapCategory> = {}): SitemapCategory => ({
  id: over.id ?? slug,
  name: over.name ?? slug,
  slug,
  parent_id: over.parent_id ?? null,
  sort_order: over.sort_order ?? 0,
  active: true,
  show_in_menu: false,
  updated_at: over.updated_at ?? null,
})

const PRODUTOS = [produto('colar-de-leite', '2026-08-16T14:58:34.849+00:00'), produto('anel')]
const CATEGORIAS = [categoria('joias-afetivas'), categoria('leite-materno', { parent_id: 'joias-afetivas' })]

const deps = (over: Partial<SitemapDeps> = {}): SitemapDeps => ({
  origin: 'https://umaestrelinha.com.br',
  countProducts: async () => PRODUTOS.length,
  countCategories: async () => CATEGORIAS.length,
  readProducts: async (from, to) => PRODUTOS.slice(from, to + 1),
  readCategories: async (from, to) => CATEGORIAS.slice(from, to + 1),
  ...over,
})

const parse = (xml: string) => new JSDOM(xml, { contentType: 'text/xml' }).window.document

/** Todo corpo de erro passa por aqui: um 5xx não pode carregar sitemap nenhum. */
const naoTemUrlset = async (res: Response) => {
  const corpo = await res.text()
  expect(corpo).not.toContain('<urlset')
  expect(corpo).not.toContain('<url>')
  expect(res.headers.get('Content-Type')).toBe('text/plain; charset=utf-8')
}

describe('handleSitemap — o caminho bom', () => {
  it('responde 200 com `application/xml; charset=utf-8`', async () => {
    const res = await handleSitemap(deps())

    expect(res.status).toBe(200)
    // O tipo é declarado aqui E reimposto no `vercel.json`: a Supabase reescreve `text/html` no
    // domínio compartilhado, e `application/xml` nunca foi medido atravessando (`BUG-20260829`).
    expect(res.headers.get('Content-Type')).toBe('application/xml; charset=utf-8')
  })

  it('o corpo é um `<urlset>` que parseia, com as URLs canônicas', async () => {
    const doc = parse(await (await handleSitemap(deps())).text())
    const locs = [...doc.querySelectorAll('loc')].map(n => n.textContent)

    expect(doc.documentElement.tagName).toBe('urlset')
    expect(locs).toContain('https://umaestrelinha.com.br/produtos/colar-de-leite')
    expect(locs).toContain('https://umaestrelinha.com.br/joias-afetivas/leite-materno')
    // 4 institucionais + 2 categorias + 2 produtos.
    expect(locs).toHaveLength(8)
  })

  it('declara `Cache-Control` — inútil na Vercel hoje, e correto quando o transporte mudar', async () => {
    // Medido em 2026-08-29: a Vercel NÃO cacheia `rewrite` para host externo (4 batidas, 4 MISS).
    // O header não é encenação: é o que passa a valer sozinho no dia da `BL-017`.
    const res = await handleSitemap(deps())
    expect(res.headers.get('Cache-Control')).toBe('public, max-age=600')
  })
})

describe('handleSitemap — a origem (SMP-18)', () => {
  it('503 sem origem configurada, e sem tocar no banco', async () => {
    const countProducts = vi.fn(async () => 2)
    const res = await handleSitemap(deps({ origin: '', countProducts }))

    expect(res.status).toBe(503)
    await naoTemUrlset(res)
    // Consultar o banco para depois descartar o resultado gastaria leitura por nada — e é o tipo de
    // guarda que a `L-004` cobra: todo retorno antecipado prova zero chamadas de saída.
    expect(countProducts).not.toHaveBeenCalled()
  })

  it('503 com origem relativa — 719 `<loc>` sem host seriam XML válido', async () => {
    const res = await handleSitemap(deps({ origin: '/loja' }))
    expect(res.status).toBe(503)
    await naoTemUrlset(res)
  })

  it('503 com esquema que não é http(s)', async () => {
    const res = await handleSitemap(deps({ origin: 'ftp://umaestrelinha.com.br' }))
    expect(res.status).toBe(503)
    await naoTemUrlset(res)
  })
})

describe('handleSitemap — leitura truncada (SMP-16, SMP-19)', () => {
  it('503 quando a leitura de produtos vem menor que a contagem', async () => {
    // O teto de 1.000 do PostgREST em forma pura: a contagem diz 3.233, a leitura entrega 1.000, e
    // não há erro em lugar nenhum. Servir o que veio anunciaria um catálogo de 1.000 peças.
    const res = await handleSitemap(
      deps({
        countProducts: async () => 3233,
        readProducts: async (from, to) => (from === 0 ? Array.from({ length: to - from + 1 }, (_, i) => produto(`p${i}`)) : []),
      }),
    )

    expect(res.status).toBe(503)
    await naoTemUrlset(res)
  })

  it('503 quando a leitura de CATEGORIAS vem menor — as duas tabelas são conferidas', async () => {
    // Sem este caso, uma implementação que conferisse só produtos passaria: categorias são 35 hoje
    // e nunca truncam, então o defeito ficaria latente até a loja crescer.
    const res = await handleSitemap(
      deps({ countCategories: async () => 99, readCategories: async () => [] }),
    )

    expect(res.status).toBe(503)
    await naoTemUrlset(res)
  })

  it('503 quando a consulta levanta erro', async () => {
    const res = await handleSitemap(
      deps({
        readProducts: async () => {
          throw new Error('PGRST301')
        },
      }),
    )

    expect(res.status).toBe(503)
    await naoTemUrlset(res)
  })
})

describe('handleSitemap — catálogo vazio (SMP-17)', () => {
  it('503 com zero produtos, em vez de um sitemap só com as institucionais', async () => {
    // Zero produto público é quase sempre credencial errada ou RLS fechada. Servir 4 URLs no lugar
    // de 680, com status 200 e XML válido, seria a resposta mais enganosa possível.
    const res = await handleSitemap(deps({ countProducts: async () => 0, readProducts: async () => [] }))

    expect(res.status).toBe(503)
    await naoTemUrlset(res)
  })

  it('categoria vazia NÃO derruba — uma loja sem categoria ainda tem produtos', async () => {
    const res = await handleSitemap(
      deps({ countCategories: async () => 0, readCategories: async () => [] }),
    )

    expect(res.status).toBe(200)
    const locs = [...parse(await res.text()).querySelectorAll('loc')].map(n => n.textContent)
    expect(locs).toContain('https://umaestrelinha.com.br/produtos/anel')
  })
})

describe('handleSitemap — `<loc>` duplicada', () => {
  it('503 em vez de um sitemap com URL repetida', async () => {
    const res = await handleSitemap(
      deps({
        countProducts: async () => 2,
        readProducts: async () => [produto('a'), produto('a')],
      }),
    )

    expect(res.status).toBe(503)
    await naoTemUrlset(res)
  })
})

describe('readCatalog — a paginação', () => {
  it('pagina as duas tabelas em faixas inclusivas', async () => {
    const readProducts = vi.fn(async (from: number, to: number) => PRODUTOS.slice(from, to + 1))
    const readCategories = vi.fn(async (from: number, to: number) => CATEGORIAS.slice(from, to + 1))

    const { products, categories } = await readCatalog(deps({ readProducts, readCategories }))

    expect(products).toHaveLength(2)
    expect(categories).toHaveLength(2)
    expect(readProducts).toHaveBeenCalledWith(0, 999)
    expect(readCategories).toHaveBeenCalledWith(0, 999)
  })
})
