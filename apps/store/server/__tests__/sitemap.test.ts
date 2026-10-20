// Feature 70 — `/sitemap.xml` servido pela função `api/page` (SMV-01, SMV-03, SMV-07).
//
// A regra (`serveSitemap`) é testada em `core` (`core/sitemap/__tests__/serve.test.ts`, os casos que
// eram da edge function). Aqui se prova o que só a função faz: QUAIS colunas ela pede, em que ordem
// e em que faixas, com que chave — e que `/sitemap.xml` chega a `serveSitemap`, e não a
// `servePage`, que trataria o caminho com extensão como 404.
//
// O dublê do client REGISTRA tabela, colunas, ordem, faixa e o pedido de contagem. Um dublê que
// devolvesse a fixtura sem olhar o pedido tornaria "esta leitura é paginada e ordenada" inauditável.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { JSDOM } from 'jsdom'
import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createPageHandler, SITEMAP_PATH } from '../page'
import {
  COLUNAS_CATEGORIA_SITEMAP,
  COLUNAS_MARCACAO_SITEMAP,
  COLUNAS_PERGUNTAS_SITEMAP,
  COLUNAS_PRODUTO_SITEMAP,
  COLUNAS_VARIACAO_SITEMAP,
  sitemapDeps,
} from '../sitemap'

interface Chamada {
  tabela: string
  select?: string
  opcoes?: { count?: string; head?: boolean }
  ordem: string[]
  faixa?: [number, number]
}

type Linhas = Record<string, Record<string, unknown>[]>

/** Um client que anota cada consulta e responde pela tabela — contagem pelo tamanho, faixa pelo slice. */
const dubleDoClient = (linhas: Linhas, falhar: string | null = null) => {
  const chamadas: Chamada[] = []
  const client = {
    from(tabela: string) {
      const c: Chamada = { tabela, ordem: [] }
      chamadas.push(c)
      const responder = () => {
        if (falhar === tabela) return { data: null, count: null, error: { message: 'PGRST301' } }
        const todas = linhas[tabela] ?? []
        if (c.opcoes?.head) return { data: null, count: todas.length, error: null }
        const fatia = c.faixa ? todas.slice(c.faixa[0], c.faixa[1] + 1) : todas
        return { data: fatia, error: null }
      }
      const q = {
        select(colunas: string, opcoes?: Chamada['opcoes']) {
          c.select = colunas
          c.opcoes = opcoes
          return q
        },
        order(coluna: string) {
          c.ordem.push(coluna)
          return q
        },
        range(from: number, to: number) {
          c.faixa = [from, to]
          return Promise.resolve(responder())
        },
        then(ok: (r: unknown) => unknown, falha?: (e: unknown) => unknown) {
          return Promise.resolve(responder()).then(ok, falha)
        },
      }
      return q
    },
  }
  return { client: client as unknown as SupabaseClient, chamadas }
}

const LINHAS: Linhas = {
  products: [
    { id: 'p1', slug: 'colar-gota', updated_at: '2026-10-01T10:00:00+00:00', is_active: true, images: [], stock_policy: 'track' },
  ],
  categories: [{ id: 'c1', name: 'Colares', slug: 'colares', parent_id: null, sort_order: 0, active: true, updated_at: null }],
  product_variants: [],
  product_option_filter_values: [],
  faq_page_items: [],
}

const env = { VITE_SUPABASE_URL: 'http://127.0.0.1:54441', VITE_SUPABASE_PUBLISHABLE_KEY: 'pk', STORE_PUBLIC_URL: 'https://loja.test/' }
const SHELL = '<!doctype html><html><head><title>Uma Estrelinha</title></head><body><div id="root"></div></body></html>'
const pedir = (caminho: string) => new Request(`https://loja.test/api/page?__path=${caminho}`)
const locs = (xml: string) =>
  [...new JSDOM(xml, { contentType: 'text/xml' }).window.document.getElementsByTagName('loc')].map(n => n.textContent)

describe('sitemapDeps — as leituras (SMV-07)', () => {
  it('cada tabela é CONTADA (exata, sem corpo) e lida em faixa inclusiva, na ordem estável', async () => {
    const { client, chamadas } = dubleDoClient(LINHAS)
    const deps = sitemapDeps(client, { origin: 'https://loja.test', log: () => {} })
    expect(await deps.countProducts()).toBe(1)
    await deps.readProducts(0, 999)
    await deps.countVariants()
    await deps.readOptionMarks(1000, 1999)

    expect(chamadas).toEqual([
      { tabela: 'products', select: 'slug', opcoes: { count: 'exact', head: true }, ordem: [] },
      { tabela: 'products', select: COLUNAS_PRODUTO_SITEMAP, opcoes: undefined, ordem: ['id'], faixa: [0, 999] },
      { tabela: 'product_variants', select: 'id', opcoes: { count: 'exact', head: true }, ordem: [] },
      {
        tabela: 'product_option_filter_values',
        select: COLUNAS_MARCACAO_SITEMAP,
        opcoes: undefined,
        // A chave primária composta, coluna a coluna — sem ela a paginação não é estável.
        ordem: ['product_id', 'option_name', 'option_value', 'value_id'],
        faixa: [1000, 1999],
      },
    ])
  })

  it('categorias, variações e perguntas pedem as colunas de antes, e as perguntas por `position`', async () => {
    const { client, chamadas } = dubleDoClient(LINHAS)
    const deps = sitemapDeps(client, { origin: 'https://loja.test', log: () => {} })
    await deps.readCategories(0, 999)
    await deps.readVariants(0, 999)
    await deps.readFaqLinks()
    await deps.countCategories()
    await deps.countOptionMarks()
    expect(chamadas.map(c => [c.tabela, c.select, c.ordem])).toEqual([
      ['categories', COLUNAS_CATEGORIA_SITEMAP, ['id']],
      ['product_variants', COLUNAS_VARIACAO_SITEMAP, ['id']],
      ['faq_page_items', COLUNAS_PERGUNTAS_SITEMAP, ['position']],
      ['categories', 'slug', []],
      ['product_option_filter_values', 'product_id', []],
    ])
  })

  it('as colunas são EXATAMENTE as que a edge function `sitemap` pedia (feature 70 só muda o transporte)', () => {
    // Escritas por extenso: a régua nunca é o objeto medido. Uma coluna a mais ou a menos é decisão,
    // não acidente de mudança de casa.
    expect(COLUNAS_PRODUTO_SITEMAP).toBe('id,slug,updated_at,is_active,options,images,stock_policy')
    expect(COLUNAS_VARIACAO_SITEMAP).toBe('id,product_id,nuvemshop_id,price,is_active,position,option_values,image_url,stock')
    expect(COLUNAS_MARCACAO_SITEMAP).toBe('product_id,option_name,option_value,value_id')
    expect(COLUNAS_CATEGORIA_SITEMAP).toBe('id,name,slug,parent_id,sort_order,active,updated_at')
    expect(COLUNAS_PERGUNTAS_SITEMAP).toBe(
      'faq_id, category, position, answer_override, faq:faqs(id, question, answer, is_active)',
    )
  })

  it('erro do PostgREST LANÇA — quem o converte em 503 é `serveSitemap`', async () => {
    const { client } = dubleDoClient(LINHAS, 'products')
    const deps = sitemapDeps(client, { origin: 'https://loja.test', log: () => {} })
    await expect(deps.countProducts()).rejects.toEqual({ message: 'PGRST301' })
    await expect(deps.readProducts(0, 999)).rejects.toEqual({ message: 'PGRST301' })
  })
})

describe('createPageHandler — `/sitemap.xml` (SMV-01, SMV-03)', () => {
  it('o caminho desviado é exatamente `/sitemap.xml`', () => {
    expect(SITEMAP_PATH).toBe('/sitemap.xml')
  })

  it('SMV-01: 200, `application/xml; charset=utf-8`, `public, s-maxage=3600`, e o XML do catálogo', async () => {
    const { client } = dubleDoClient(LINHAS)
    const makeClient = vi.fn(() => client)
    const fetch = createPageHandler({ shell: SHELL, env, log: () => {}, makeClient })
    const r = await fetch(pedir('/sitemap.xml'))

    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toBe('application/xml; charset=utf-8')
    expect(r.headers.get('cache-control')).toBe('public, s-maxage=3600')
    const xml = await r.text()
    expect(xml.startsWith('<?xml')).toBe(true)
    expect(xml).not.toContain('id="root"')
    // A origem vem de `STORE_PUBLIC_URL` sem a barra final — nunca `https://loja.test//produtos`.
    expect(locs(xml)).toContain('https://loja.test/produtos/colar-gota')
    expect(locs(xml)).toContain('https://loja.test/colares')
    expect(locs(xml).some(l => l.includes('//produtos'))).toBe(false)
    // SMV-07: a chave PUBLICÁVEL da env da loja, a mesma da página.
    expect(makeClient).toHaveBeenCalledWith('http://127.0.0.1:54441', 'pk')
  })

  it('SMV-03: leitura que falha ⇒ 503 `no-store` em texto, sem `<urlset>`', async () => {
    const { client } = dubleDoClient(LINHAS, 'product_variants')
    const fetch = createPageHandler({ shell: SHELL, env, log: () => {}, makeClient: () => client })
    const r = await fetch(pedir('/sitemap.xml'))
    expect(r.status).toBe(503)
    expect(r.headers.get('cache-control')).toBe('no-store')
    expect(r.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    expect(await r.text()).not.toContain('<urlset')
  })

  it('SMV-03: sem `STORE_PUBLIC_URL` ⇒ 503 `no-store` — nunca um sitemap com `<loc>` sem host', async () => {
    const { client, chamadas } = dubleDoClient(LINHAS)
    const fetch = createPageHandler({ shell: SHELL, env: { ...env, STORE_PUBLIC_URL: undefined }, log: () => {}, makeClient: () => client })
    const r = await fetch(pedir('/sitemap.xml'))
    expect(r.status).toBe(503)
    expect(r.headers.get('cache-control')).toBe('no-store')
    expect(chamadas).toEqual([])
  })

  it('SMV-03: sem as envs do Supabase ⇒ 503 `no-store` em texto — nunca o shell com 200', async () => {
    const log = vi.fn()
    const makeClient = vi.fn()
    const fetch = createPageHandler({ shell: SHELL, env: { STORE_PUBLIC_URL: 'https://loja.test' }, log, makeClient })
    const r = await fetch(pedir('/sitemap.xml'))
    expect(r.status).toBe(503)
    expect(r.headers.get('cache-control')).toBe('no-store')
    expect(r.headers.get('content-type')).toBe('text/plain; charset=utf-8')
    const corpo = await r.text()
    expect(corpo).not.toContain('<urlset')
    expect(corpo).not.toBe(SHELL)
    expect(makeClient).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ fn: 'page', erro: 'env', path: '/sitemap.xml' }))
  })

  it('par inverso — outro caminho com extensão continua com `servePage` (404), sem ler o catálogo', async () => {
    const { client, chamadas } = dubleDoClient(LINHAS)
    const fetch = createPageHandler({ shell: SHELL, env, log: () => {}, makeClient: () => client })
    for (const caminho of ['/sitemap.xml.gz', '/outro.xml', '/sitemap-1.xml']) {
      const r = await fetch(pedir(caminho))
      expect(r.status, caminho).toBe(404)
      expect(r.headers.get('content-type'), caminho).toBe('text/html; charset=utf-8')
    }
    expect(chamadas.filter(c => c.tabela === 'products')).toEqual([])
  })
})

/**
 * Feature 69 · SSV-26 — portado da edge function na feature 70 (era `sitemap/__tests__/wiring.test.ts`,
 * 4 casos). As colunas que decidem a primeira foto são lidas DO DISCO e conferidas coluna a coluna:
 * sem `stock`, toda linha de peça `track` parece esgotada, a representante vira a primeira por
 * posição, e a primeira `<image:loc>` deixa de ser o `og:image` da página — com o documento válido e
 * 200. Sem `images`, o sitemap sai sem foto nenhuma.
 */
const FONTE_SITEMAP = join(dirname(fileURLToPath(import.meta.url)), '..', 'sitemap.ts')

/** O valor da constante, com as partes concatenadas. `null` quando não acha — e o caso REPROVA. */
const colunas = (fonte: string, nome: string): string[] | null => {
  const m = new RegExp(`const ${nome}\\s*=\\s*([^\\n]*(?:\\n\\s*'[^']*'[^\\n]*)*)`).exec(fonte)
  if (!m) return null
  const partes = [...m[1].matchAll(/'([^']*)'/g)].map(x => x[1]).join('')
  return partes === '' ? null : partes.split(',').map(c => c.trim())
}

describe('server/sitemap.ts — as colunas das fotos (lidas do disco)', () => {
  const fonte = readFileSync(FONTE_SITEMAP, 'utf8')

  it('âncora: as duas constantes foram achadas e trazem as colunas de antes', () => {
    expect(colunas(fonte, 'COLUNAS_PRODUTO_SITEMAP')).toEqual(expect.arrayContaining(['id', 'slug', 'updated_at']))
    expect(colunas(fonte, 'COLUNAS_VARIACAO_SITEMAP')).toEqual(
      expect.arrayContaining(['id', 'product_id', 'price', 'is_active', 'position']),
    )
  })

  it('produtos: `images` e `stock_policy`', () => {
    expect(colunas(fonte, 'COLUNAS_PRODUTO_SITEMAP')).toEqual(expect.arrayContaining(['images', 'stock_policy']))
  })

  it('variações: `image_url` e `stock`', () => {
    expect(colunas(fonte, 'COLUNAS_VARIACAO_SITEMAP')).toEqual(expect.arrayContaining(['image_url', 'stock']))
  })

  it('sensor — a lista sem `stock` é acusada, e a constante ausente devolve null', () => {
    const mutante = fonte.replace(',image_url,stock', ',image_url')
    expect(mutante).not.toBe(fonte)
    expect(colunas(mutante, 'COLUNAS_VARIACAO_SITEMAP')).not.toContain('stock')
    expect(colunas('const OUTRA = 1', 'COLUNAS_VARIACAO_SITEMAP')).toBeNull()
  })
})

// ---------------------------------------------------------------------------------------------
// SMV-03 — QUALQUER leitura que falha vira 503, não só a de produtos (achado da verificação, M01:
// o erro de `faq_page_items` não era exercitado, e engoli-lo dava um sitemap 200 sem as perguntas)
// ---------------------------------------------------------------------------------------------
describe('createPageHandler — `/sitemap.xml`: erro em CADA tabela ⇒ 503', () => {
  it.each(['products', 'categories', 'product_variants', 'product_option_filter_values', 'faq_page_items'])(
    'falha em `%s` ⇒ 503 `no-store`, sem `<urlset>`',
    async tabela => {
      const { client } = dubleDoClient(LINHAS, tabela)
      const fetch = createPageHandler({ shell: SHELL, env, log: () => {}, makeClient: () => client })
      const r = await fetch(pedir('/sitemap.xml'))
      expect(r.status).toBe(503)
      expect(r.headers.get('cache-control')).toBe('no-store')
      expect(await r.text()).not.toContain('<urlset')
    },
  )
})

// ---------------------------------------------------------------------------------------------
// SMV-02 — AS COLUNAS PEDIDAS BASTAM PARA O DOCUMENTO (L-040: régua de comportamento, não de lista)
// ---------------------------------------------------------------------------------------------
// O dublê devolve SÓ as colunas que cada `select` pediu, e o XML tem de ser idêntico ao da linha
// inteira. Coluna lida pela regra e não pedida diverge. As perguntas ficam inteiras: o `select` delas
// tem embed (`faq:faqs(...)`) e a forma já é presa pela string exata acima.
describe('sitemapDeps — as colunas pedidas bastam para o XML', () => {
  const CHEIO: Linhas = {
    products: [
      {
        id: 'p1', slug: 'colar-gota', name: 'Colar Gota', updated_at: '2026-10-01T10:00:00+00:00', is_active: true,
        stock_policy: 'track', options: null, description: 'x', tags: ['t'], brand: 'B',
        images: [{ url: 'https://cdn.test/a.webp', alt: 'a' }, { url: 'https://cdn.test/b.webp', alt: 'b' }],
      },
      {
        id: 'p2', slug: 'anel-sol', name: 'Anel Sol', updated_at: '2026-09-02T08:00:00+00:00', is_active: true,
        stock_policy: 'track', options: null, images: [{ url: 'https://cdn.test/c.webp', alt: 'c' }],
      },
    ],
    categories: [
      { id: 'c1', name: 'Colares', slug: 'colares', parent_id: null, sort_order: 0, active: true, updated_at: '2026-08-01T00:00:00+00:00', banner_url: 'z' },
      { id: 'c2', name: 'Prata', slug: 'prata', parent_id: 'c1', sort_order: 1, active: true, updated_at: null },
    ],
    // Ordem do array ≠ ordem de `position`, e a de menor posição ESGOTADA: só `position`, `stock` e
    // `image_url` juntos dão a primeira foto certa (a do `og:image`).
    product_variants: [
      { id: 'v3', product_id: 'p1', nuvemshop_id: 13, price: 210, is_active: true, position: 3, option_values: {}, image_url: 'https://cdn.test/v3.webp', stock: 5, sku: 'S3' },
      { id: 'v2', product_id: 'p1', nuvemshop_id: 12, price: 180, is_active: true, position: 2, option_values: {}, image_url: 'https://cdn.test/v2.webp', stock: 3, sku: 'S2' },
      { id: 'v1', product_id: 'p1', nuvemshop_id: 11, price: 150, is_active: true, position: 1, option_values: {}, image_url: 'https://cdn.test/v1.webp', stock: 0, sku: 'S1' },
      { id: 'w1', product_id: 'p2', nuvemshop_id: 21, price: 99, is_active: true, position: 1, option_values: {}, image_url: null, stock: 2, sku: 'W1' },
    ],
    product_option_filter_values: [],
    faq_page_items: [],
  }

  /** `a,b,c` ⇒ a linha só com essas chaves. */
  const projetar = (linha: Record<string, unknown>, select: string) =>
    Object.fromEntries(select.split(',').map(k => k.trim()).filter(k => k in linha).map(k => [k, linha[k]]))

  const servir = async (linhas: Linhas, projetado: boolean) => {
    const { client } = dubleDoClient(linhas)
    const original = client.from.bind(client)
    const comProjecao = {
      from(tabela: string) {
        const q = original(tabela) as unknown as Record<string, (...a: unknown[]) => unknown>
        if (!projetado || tabela === 'faq_page_items') return q
        let select = ''
        const embrulho = (r: { data: unknown; count?: number | null; error: unknown }) =>
          Array.isArray(r.data) ? { ...r, data: r.data.map(l => projetar(l as Record<string, unknown>, select)) } : r
        const sel = q.select.bind(q)
        const rng = q.range.bind(q)
        q.select = (colunas: unknown, opcoes: unknown) => {
          select = colunas as string
          sel(colunas, opcoes)
          return q
        }
        q.range = (a: unknown, b: unknown) => (rng(a, b) as Promise<never>).then(embrulho)
        return q
      },
    } as unknown as SupabaseClient
    const fetch = createPageHandler({ shell: SHELL, env, log: () => {}, makeClient: () => comProjecao })
    const r = await fetch(pedir('/sitemap.xml'))
    return { status: r.status, xml: await r.text() }
  }

  it('o XML com as colunas pedidas é IDÊNTICO ao da linha inteira', async () => {
    const cheio = await servir(CHEIO, false)
    expect(cheio.status).toBe(200)
    expect(cheio.xml).toContain('<image:loc>')
    const pedido = await servir(CHEIO, true)
    expect(pedido.status).toBe(200)
    expect(pedido.xml).toBe(cheio.xml)
  })

  it('sensor: a fixtura discrimina — sem `images`, `updated_at`, `position`, `stock`, `image_url` ou `parent_id` o XML muda', async () => {
    const cheio = (await servir(CHEIO, false)).xml
    const sem = (tabela: string, campo: string): Linhas => ({
      ...CHEIO,
      [tabela]: CHEIO[tabela].map(l => ({ ...l, [campo]: undefined })),
    })
    for (const [tabela, campo] of [
      ['products', 'images'], ['products', 'updated_at'], ['product_variants', 'position'],
      ['product_variants', 'stock'], ['product_variants', 'image_url'], ['categories', 'parent_id'],
    ]) {
      expect((await servir(sem(tabela, campo), false)).xml, `${tabela}.${campo}`).not.toBe(cheio)
    }
  })
})
