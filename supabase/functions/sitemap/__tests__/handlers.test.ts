import { describe, it, expect, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import { handleSitemap, readCatalog, type SitemapDeps } from '../handlers.ts'
import type {
  SitemapCategory,
  SitemapOptionMark,
  SitemapProduct,
  SitemapVariant,
} from '../../../../packages/core/src/sitemap/index.ts'

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
  readFaqLinks: async () => [],
  // Feature 68: sem variação nem marcação, o documento é o de antes.
  countVariants: async () => 0,
  readVariants: async () => [],
  countOptionMarks: async () => 0,
  readOptionMarks: async () => [],
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
    // A página de perguntas frequentes entrou em `SITEMAP_STATIC_PATHS` na feature 46, e é aqui que
    // a conta muda: 7 institucionais + 2 categorias + 2 produtos.
    expect(locs).toContain('https://umaestrelinha.com.br/perguntas-frequentes')
    expect(locs).toHaveLength(11)
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

describe('handleSitemap — as perguntas frequentes', () => {
  const vinculo = (id: string, question: string, over: Record<string, unknown> = {}) => ({
    faq_id: id,
    category: 'envio-do-material',
    position: 0,
    answer_override: null,
    faq: { id, question, answer: 'Resposta.', is_active: true },
    ...over,
  })

  it('cada pergunta da página vira uma `<loc>` própria', async () => {
    const res = await handleSitemap(
      deps({
        readFaqLinks: async () => [
          vinculo('3f9a1c2e-0000-4000-8000-000000000001', 'Quanto de cinzas preciso enviar?'),
        ],
      }),
    )
    expect(res.status).toBe(200)
    const locs = [...parse(await res.text()).getElementsByTagName('loc')].map(l => l.textContent)
    expect(locs).toContain(
      'https://umaestrelinha.com.br/perguntas-frequentes/quanto-de-cinzas-preciso-enviar-3f9a1c2e',
    )
  })

  it('pergunta que a página esconde (inativa, `faq: null` pela RLS) não é anunciada', async () => {
    const res = await handleSitemap(
      deps({
        readFaqLinks: async () => [
          vinculo('3f9a1c2e-0000-4000-8000-000000000001', 'Escondida?', { faq: null }),
          vinculo('7b2d4e6f-0000-4000-8000-000000000002', 'Despublicada?', {
            faq: { id: '7b2d4e6f-0000-4000-8000-000000000002', question: 'Despublicada?', answer: 'x', is_active: false },
          }),
        ],
      }),
    )
    expect(await res.text()).not.toContain('/perguntas-frequentes/')
  })

  it('leitura das perguntas falhou: 503 sem sitemap — um documento sem elas descreveria uma loja menor', async () => {
    const res = await handleSitemap(
      deps({
        readFaqLinks: async () => {
          throw new Error('connection refused')
        },
      }),
    )
    expect(res.status).toBe(503)
    await naoTemUrlset(res)
  })
})

/**
 * Feature 68 · SVR-24..26, SVR-29 — as páginas de opção no sitemap servido.
 *
 * O caminho bom e, sobretudo, os degradados: variações ou marcações que falham ou chegam truncadas
 * produzem 503 SEM `<urlset>`. Um sitemap 200 sem as páginas de opção apagaria mil URLs num dia e as
 * devolveria no seguinte — e um parcial nas variações poderia trocar a representante de uma opção.
 */
describe('feature 68 — as páginas de opção', () => {
  const PATA: SitemapProduct = {
    id: 'p-pata',
    slug: 'pingente-pata',
    updated_at: '2026-10-01T10:00:00+00:00',
    is_active: true,
    options: [{ name: 'Cor', values: ['Prata 925', 'Ouro', 'Rose'], position: 0 }],
  }
  const variacao = (n: number, cor: string): SitemapVariant => ({
    id: `00000000-0000-4000-8000-00000000000${n}`,
    product_id: 'p-pata',
    nuvemshop_id: 1349521830 + n,
    price: 100,
    is_active: true,
    position: n,
    option_values: { Cor: cor },
  })
  const VARIACOES = [variacao(1, 'Prata 925'), variacao(2, 'Ouro'), variacao(3, 'Rose')]
  const MARCAS: SitemapOptionMark[] = [
    { product_id: 'p-pata', option_name: 'Cor', option_value: 'Prata 925', value_id: 'a' },
    { product_id: 'p-pata', option_name: 'Cor', option_value: 'Rose', value_id: 'b' },
  ]
  const comOpcoes = (over: Partial<SitemapDeps> = {}) =>
    deps({
      countProducts: async () => 1,
      readProducts: async (from, to) => [PATA].slice(from, to + 1),
      countVariants: async () => VARIACOES.length,
      readVariants: async (from, to) => VARIACOES.slice(from, to + 1),
      countOptionMarks: async () => MARCAS.length,
      readOptionMarks: async (from, to) => MARCAS.slice(from, to + 1),
      ...over,
    })
  const locsDe = async (res: Response) => [...parse(await res.text()).querySelectorAll('loc')].map(n => n.textContent)

  it('SVR-24: duas cores marcadas ⇒ duas `<loc>` com ?variant=, logo depois da peça', async () => {
    const res = await handleSitemap(comOpcoes())
    expect(res.status).toBe(200)
    const locs = await locsDe(res)
    const i = locs.indexOf('https://umaestrelinha.com.br/produtos/pingente-pata')
    expect(locs.slice(i, i + 3)).toEqual([
      'https://umaestrelinha.com.br/produtos/pingente-pata',
      'https://umaestrelinha.com.br/produtos/pingente-pata?variant=1349521831',
      'https://umaestrelinha.com.br/produtos/pingente-pata?variant=1349521833',
    ])
    expect(locs.filter(l => l!.includes('?'))).toHaveLength(2)
  })

  it('SVR-25: o `<lastmod>` da `<loc>` de opção é o `updated_at` da peça', async () => {
    const doc = parse(await (await handleSitemap(comOpcoes())).text())
    const urls = [...doc.querySelectorAll('url')].filter(u => u.querySelector('loc')!.textContent!.includes('pingente-pata'))
    expect(urls.map(u => u.querySelector('lastmod')?.textContent)).toEqual([
      '2026-10-01T10:00:00+00:00',
      '2026-10-01T10:00:00+00:00',
      '2026-10-01T10:00:00+00:00',
    ])
  })

  it('SVR-29: sem marcações (removidas, ou grupo desligado pela RLS) não há `<loc>` de opção', async () => {
    const res = await handleSitemap(comOpcoes({ countOptionMarks: async () => 0, readOptionMarks: async () => [] }))
    expect(res.status).toBe(200)
    expect((await locsDe(res)).some(l => l!.includes('?'))).toBe(false)
  })

  it.each([
    ['a contagem de variações lança', { countVariants: async () => { throw new Error('fora') } }],
    ['a leitura de variações lança', { readVariants: async () => { throw new Error('fora') } }],
    ['a contagem de marcações lança', { countOptionMarks: async () => { throw new Error('fora') } }],
    ['a leitura de marcações lança', { readOptionMarks: async () => { throw new Error('fora') } }],
  ])('SVR-26: %s ⇒ 503 `text/plain`, sem `<urlset>`', async (_n, over) => {
    const res = await handleSitemap(comOpcoes(over as Partial<SitemapDeps>))
    expect(res.status).toBe(503)
    await naoTemUrlset(res)
  })

  // O teto do PostgREST em forma pura: a contagem diz 1001, a primeira página entrega 1000, a
  // segunda nada — sem erro em lugar nenhum.
  const truncada = <T>(gerar: (i: number) => T) => async (from: number, to: number): Promise<T[]> =>
    from === 0 ? Array.from({ length: to - from + 1 }, (_, i) => gerar(i)) : []

  it('SVR-26: variações truncadas (1001 contadas, 1000 lidas) ⇒ 503 sem `<urlset>`', async () => {
    const res = await handleSitemap(
      comOpcoes({ countVariants: async () => 1001, readVariants: truncada(i => variacao(i, 'Prata 925')) }),
    )
    expect(res.status).toBe(503)
    await naoTemUrlset(res)
  })

  it('SVR-26: marcações truncadas (1001 contadas, 1000 lidas) ⇒ 503 sem `<urlset>`', async () => {
    const res = await handleSitemap(
      comOpcoes({ countOptionMarks: async () => 1001, readOptionMarks: truncada(i => ({ ...MARCAS[0], value_id: `v${i}` })) }),
    )
    expect(res.status).toBe(503)
    await naoTemUrlset(res)
  })

  it('SVR-26: acima de 1.000 a leitura é PAGINADA em faixas inclusivas, e completa passa', async () => {
    const muitas = Array.from({ length: 1001 }, (_, i) => ({ ...variacao(i, i === 1000 ? 'Rose' : 'Prata 925'), position: i, nuvemshop_id: 5000 + i }))
    const readVariants = vi.fn(async (from: number, to: number) => muitas.slice(from, to + 1))
    const res = await handleSitemap(comOpcoes({ countVariants: async () => 1001, readVariants }))
    expect(res.status).toBe(200)
    expect(readVariants).toHaveBeenCalledWith(0, 999)
    expect(readVariants).toHaveBeenCalledWith(1000, 1999)
    // a Rose só existe na linha 1001 — chegou porque a segunda página foi lida
    expect(await locsDe(res)).toContain('https://umaestrelinha.com.br/produtos/pingente-pata?variant=6000')
  })
})
