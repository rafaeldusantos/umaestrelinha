import { describe, it, expect, vi } from 'vitest'
import { JSDOM } from 'jsdom'
import { SITEMAP_CACHE, serveSitemap, readCatalog, type SitemapDeps, type SitemapResponse } from '../serve.ts'
import type { SitemapCategory, SitemapOptionMark, SitemapProduct, SitemapVariant } from '../types.ts'

/**
 * `SMP-16`..`SMP-20` e, desde a feature 70, `SMV-01`..`SMV-03` — a resposta de `/sitemap.xml`.
 *
 * Os casos MUDARAM DE CASA na feature 70: eram o `handlers.test.ts` da edge function `sitemap`
 * (30 casos), contra o `handleSitemap` da edge function que devolvia `Response`. A regra foi para
 * `core/sitemap/serve.ts`, que devolve `{ status, headers, body }`, e cada caso veio com ela — mesmas
 * fixturas, mesmas asserções. O que mudou: o `Cache-Control` do 200 (`max-age=600` → `s-maxage=3600`,
 * SMV-01) e o `no-store` que TODO 503 passou a carregar (SMV-03), asserido no mesmo ajudante que já
 * recusava o `<urlset>`.
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
  log: () => {},
  ...over,
})

const parse = (xml: string) => new JSDOM(xml, { contentType: 'text/xml' }).window.document

/** Todo corpo de erro passa por aqui: um 5xx não pode carregar sitemap nenhum. */
const naoTemUrlset = (res: SitemapResponse) => {
  const corpo = res.body
  expect(corpo).not.toContain('<urlset')
  expect(corpo).not.toContain('<url>')
  expect(res.headers['Content-Type']).toBe('text/plain; charset=utf-8')
  // SMV-03: com o 200 cacheado por uma hora na borda, um 503 cacheado do mesmo jeito prenderia a
  // falha de um segundo por uma hora inteira.
  expect(res.headers['Cache-Control']).toBe('no-store')
}

describe('serveSitemap — o caminho bom', () => {
  it('responde 200 com `application/xml; charset=utf-8`', async () => {
    const res = await serveSitemap(deps())

    expect(res.status).toBe(200)
    // SMV-01: o tipo é NOSSO desde a feature 70 — sem o gateway `*.supabase.co` no meio, o
    // `vercel.json` deixou de reimpô-lo, e esta é a única declaração dele.
    expect(res.headers['Content-Type']).toBe('application/xml; charset=utf-8')
  })

  it('o corpo é um `<urlset>` que parseia, com as URLs canônicas', async () => {
    const doc = parse((await serveSitemap(deps())).body)
    const locs = [...doc.querySelectorAll('loc')].map(n => n.textContent)

    expect(doc.documentElement.tagName).toBe('urlset')
    expect(locs).toContain('https://umaestrelinha.com.br/produtos/colar-de-leite')
    expect(locs).toContain('https://umaestrelinha.com.br/joias-afetivas/leite-materno')
    // A página de perguntas frequentes entrou em `SITEMAP_STATIC_PATHS` na feature 46, e é aqui que
    // a conta muda: 7 institucionais + 2 categorias + 2 produtos.
    expect(locs).toContain('https://umaestrelinha.com.br/perguntas-frequentes')
    expect(locs).toHaveLength(11)
  })

  it('SMV-01: `Cache-Control: public, s-maxage=3600` — uma hora de cache de borda na Vercel', async () => {
    // Reescrito na feature 70 porque a spec mudou o comportamento: até a `69` o valor era
    // `public, max-age=600`, inútil atrás de um `rewrite` externo que a Vercel não cacheia (medido:
    // sempre MISS). Na função da loja ele vale, e o número é decisão do usuário (2026-10-20).
    const res = await serveSitemap(deps())
    expect(res.headers['Cache-Control']).toBe('public, s-maxage=3600')
    expect(SITEMAP_CACHE).toEqual({ ok: 'public, s-maxage=3600', error: 'no-store' })
  })

  it('SMV-01: os headers do 200 são exatamente os dois — nada de `max-age` de navegador de carona', async () => {
    const res = await serveSitemap(deps())
    expect(res.headers).toEqual({
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600',
    })
  })

  it('o log do caminho bom conta o que leu — é o que separa "200 vazio" de "200 cheio" no log da Vercel', async () => {
    const log = vi.fn()
    await serveSitemap(deps({ log }))
    expect(log).toHaveBeenCalledWith({
      fn: 'sitemap',
      ok: true,
      produtos: 2,
      categorias: 2,
      perguntas: 0,
      variacoes: 0,
      marcacoes: 0,
    })
  })
})

describe('serveSitemap — a origem (SMP-18)', () => {
  it('503 sem origem configurada, e sem tocar no banco', async () => {
    const countProducts = vi.fn(async () => 2)
    const res = await serveSitemap(deps({ origin: '', countProducts }))

    expect(res.status).toBe(503)
    naoTemUrlset(res)
    // Consultar o banco para depois descartar o resultado gastaria leitura por nada — e é o tipo de
    // guarda que a `L-004` cobra: todo retorno antecipado prova zero chamadas de saída.
    expect(countProducts).not.toHaveBeenCalled()
  })

  it('503 com origem relativa — 719 `<loc>` sem host seriam XML válido', async () => {
    const res = await serveSitemap(deps({ origin: '/loja' }))
    expect(res.status).toBe(503)
    naoTemUrlset(res)
  })

  it('503 com esquema que não é http(s)', async () => {
    const res = await serveSitemap(deps({ origin: 'ftp://umaestrelinha.com.br' }))
    expect(res.status).toBe(503)
    naoTemUrlset(res)
  })
})

describe('serveSitemap — leitura truncada (SMP-16, SMP-19)', () => {
  it('503 quando a leitura de produtos vem menor que a contagem', async () => {
    // O teto de 1.000 do PostgREST em forma pura: a contagem diz 3.233, a leitura entrega 1.000, e
    // não há erro em lugar nenhum. Servir o que veio anunciaria um catálogo de 1.000 peças.
    const res = await serveSitemap(
      deps({
        countProducts: async () => 3233,
        readProducts: async (from, to) => (from === 0 ? Array.from({ length: to - from + 1 }, (_, i) => produto(`p${i}`)) : []),
      }),
    )

    expect(res.status).toBe(503)
    naoTemUrlset(res)
  })

  it('503 quando a leitura de CATEGORIAS vem menor — as duas tabelas são conferidas', async () => {
    // Sem este caso, uma implementação que conferisse só produtos passaria: categorias são 35 hoje
    // e nunca truncam, então o defeito ficaria latente até a loja crescer.
    const res = await serveSitemap(
      deps({ countCategories: async () => 99, readCategories: async () => [] }),
    )

    expect(res.status).toBe(503)
    naoTemUrlset(res)
  })

  it('503 quando a consulta levanta erro', async () => {
    const res = await serveSitemap(
      deps({
        readProducts: async () => {
          throw new Error('PGRST301')
        },
      }),
    )

    expect(res.status).toBe(503)
    naoTemUrlset(res)
  })
})

describe('serveSitemap — catálogo vazio (SMP-17)', () => {
  it('503 com zero produtos, em vez de um sitemap só com as institucionais', async () => {
    // Zero produto público é quase sempre credencial errada ou RLS fechada. Servir 4 URLs no lugar
    // de 680, com status 200 e XML válido, seria a resposta mais enganosa possível.
    const res = await serveSitemap(deps({ countProducts: async () => 0, readProducts: async () => [] }))

    expect(res.status).toBe(503)
    naoTemUrlset(res)
  })

  it('categoria vazia NÃO derruba — uma loja sem categoria ainda tem produtos', async () => {
    const res = await serveSitemap(
      deps({ countCategories: async () => 0, readCategories: async () => [] }),
    )

    expect(res.status).toBe(200)
    const locs = [...parse(res.body).querySelectorAll('loc')].map(n => n.textContent)
    expect(locs).toContain('https://umaestrelinha.com.br/produtos/anel')
  })
})

describe('serveSitemap — `<loc>` duplicada', () => {
  it('503 em vez de um sitemap com URL repetida', async () => {
    const res = await serveSitemap(
      deps({
        countProducts: async () => 2,
        readProducts: async () => [produto('a'), produto('a')],
      }),
    )

    expect(res.status).toBe(503)
    naoTemUrlset(res)
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

describe('serveSitemap — as perguntas frequentes', () => {
  const vinculo = (id: string, question: string, over: Record<string, unknown> = {}) => ({
    faq_id: id,
    category: 'envio-do-material',
    position: 0,
    answer_override: null,
    faq: { id, question, answer: 'Resposta.', is_active: true },
    ...over,
  })

  it('cada pergunta da página vira uma `<loc>` própria', async () => {
    const res = await serveSitemap(
      deps({
        readFaqLinks: async () => [
          vinculo('3f9a1c2e-0000-4000-8000-000000000001', 'Quanto de cinzas preciso enviar?'),
        ],
      }),
    )
    expect(res.status).toBe(200)
    const locs = [...parse(res.body).getElementsByTagName('loc')].map(l => l.textContent)
    expect(locs).toContain(
      'https://umaestrelinha.com.br/perguntas-frequentes/quanto-de-cinzas-preciso-enviar-3f9a1c2e',
    )
  })

  it('pergunta que a página esconde (inativa, `faq: null` pela RLS) não é anunciada', async () => {
    const res = await serveSitemap(
      deps({
        readFaqLinks: async () => [
          vinculo('3f9a1c2e-0000-4000-8000-000000000001', 'Escondida?', { faq: null }),
          vinculo('7b2d4e6f-0000-4000-8000-000000000002', 'Despublicada?', {
            faq: { id: '7b2d4e6f-0000-4000-8000-000000000002', question: 'Despublicada?', answer: 'x', is_active: false },
          }),
        ],
      }),
    )
    expect(res.body).not.toContain('/perguntas-frequentes/')
  })

  it('leitura das perguntas falhou: 503 sem sitemap — um documento sem elas descreveria uma loja menor', async () => {
    const res = await serveSitemap(
      deps({
        readFaqLinks: async () => {
          throw new Error('connection refused')
        },
      }),
    )
    expect(res.status).toBe(503)
    naoTemUrlset(res)
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
  const locsDe = (res: SitemapResponse) => [...parse(res.body).querySelectorAll('loc')].map(n => n.textContent)

  it('SVR-24: duas cores marcadas ⇒ duas `<loc>` com ?variant=, logo depois da peça', async () => {
    const res = await serveSitemap(comOpcoes())
    expect(res.status).toBe(200)
    const locs = locsDe(res)
    const i = locs.indexOf('https://umaestrelinha.com.br/produtos/pingente-pata')
    expect(locs.slice(i, i + 3)).toEqual([
      'https://umaestrelinha.com.br/produtos/pingente-pata',
      'https://umaestrelinha.com.br/produtos/pingente-pata?variant=1349521831',
      'https://umaestrelinha.com.br/produtos/pingente-pata?variant=1349521833',
    ])
    expect(locs.filter(l => l!.includes('?'))).toHaveLength(2)
  })

  it('SVR-25: o `<lastmod>` da `<loc>` de opção é o `updated_at` da peça', async () => {
    const doc = parse((await serveSitemap(comOpcoes())).body)
    const urls = [...doc.querySelectorAll('url')].filter(u => u.querySelector('loc')!.textContent!.includes('pingente-pata'))
    expect(urls.map(u => u.querySelector('lastmod')?.textContent)).toEqual([
      '2026-10-01T10:00:00+00:00',
      '2026-10-01T10:00:00+00:00',
      '2026-10-01T10:00:00+00:00',
    ])
  })

  it('SVR-29: sem marcações (removidas, ou grupo desligado pela RLS) não há `<loc>` de opção', async () => {
    const res = await serveSitemap(comOpcoes({ countOptionMarks: async () => 0, readOptionMarks: async () => [] }))
    expect(res.status).toBe(200)
    expect((locsDe(res)).some(l => l!.includes('?'))).toBe(false)
  })

  it.each([
    ['a contagem de variações lança', { countVariants: async () => { throw new Error('fora') } }],
    ['a leitura de variações lança', { readVariants: async () => { throw new Error('fora') } }],
    ['a contagem de marcações lança', { countOptionMarks: async () => { throw new Error('fora') } }],
    ['a leitura de marcações lança', { readOptionMarks: async () => { throw new Error('fora') } }],
  ])('SVR-26: %s ⇒ 503 `text/plain`, sem `<urlset>`', async (_n, over) => {
    const res = await serveSitemap(comOpcoes(over as Partial<SitemapDeps>))
    expect(res.status).toBe(503)
    naoTemUrlset(res)
  })

  // O teto do PostgREST em forma pura: a contagem diz 1001, a primeira página entrega 1000, a
  // segunda nada — sem erro em lugar nenhum.
  const truncada = <T>(gerar: (i: number) => T) => async (from: number, to: number): Promise<T[]> =>
    from === 0 ? Array.from({ length: to - from + 1 }, (_, i) => gerar(i)) : []

  it('SVR-26: variações truncadas (1001 contadas, 1000 lidas) ⇒ 503 sem `<urlset>`', async () => {
    const res = await serveSitemap(
      comOpcoes({ countVariants: async () => 1001, readVariants: truncada(i => variacao(i, 'Prata 925')) }),
    )
    expect(res.status).toBe(503)
    naoTemUrlset(res)
  })

  it('SVR-26: marcações truncadas (1001 contadas, 1000 lidas) ⇒ 503 sem `<urlset>`', async () => {
    const res = await serveSitemap(
      comOpcoes({ countOptionMarks: async () => 1001, readOptionMarks: truncada(i => ({ ...MARCAS[0], value_id: `v${i}` })) }),
    )
    expect(res.status).toBe(503)
    naoTemUrlset(res)
  })

  it('SVR-26: acima de 1.000 a leitura é PAGINADA em faixas inclusivas, e completa passa', async () => {
    const muitas = Array.from({ length: 1001 }, (_, i) => ({ ...variacao(i, i === 1000 ? 'Rose' : 'Prata 925'), position: i, nuvemshop_id: 5000 + i }))
    const readVariants = vi.fn(async (from: number, to: number) => muitas.slice(from, to + 1))
    const res = await serveSitemap(comOpcoes({ countVariants: async () => 1001, readVariants }))
    expect(res.status).toBe(200)
    expect(readVariants).toHaveBeenCalledWith(0, 999)
    expect(readVariants).toHaveBeenCalledWith(1000, 1999)
    // a Rose só existe na linha 1001 — chegou porque a segunda página foi lida
    expect(locsDe(res)).toContain('https://umaestrelinha.com.br/produtos/pingente-pata?variant=6000')
  })
})

/**
 * Feature 69 · SSV-24..30 — as fotos chegam ao documento servido. A regra mora em `core/sitemap` e
 * `core/page/images.ts`; aqui se prova que a function as entrega pelo caminho real (leitura paginada
 * → `sitemapUrls` → `renderSitemapXml`), com o tipo e o parser do caminho bom.
 */
describe('feature 69 — as fotos dos produtos', () => {
  const NS_IMAGEM = 'http://www.google.com/schemas/sitemap-image/1.1'
  const STORAGE = 'https://hgk.supabase.co/storage/v1/object/public/products'
  const RENDER = 'https://hgk.supabase.co/storage/v1/render/image/public/products'
  const rendida = (nome: string) => `${RENDER}/${nome}.webp?width=1200&resize=contain&quality=80`

  const PATA: SitemapProduct = {
    id: 'p-pata',
    slug: 'pingente-pata',
    is_active: true,
    stock_policy: 'track',
    options: [{ name: 'Cor', values: ['Prata 925', 'Ouro'], position: 0 }],
    images: [{ url: `${STORAGE}/a.webp` }, { url: `${STORAGE}/b.webp` }],
  }
  const NUA: SitemapProduct = { id: 'p-nua', slug: 'peca-nua', is_active: true, stock_policy: 'track', images: [] }
  const VARIACOES: SitemapVariant[] = [
    {
      id: '00000000-0000-4000-8000-000000000001',
      product_id: 'p-pata',
      nuvemshop_id: 7001,
      price: 100,
      is_active: true,
      position: 0,
      stock: 0,
      image_url: `${STORAGE}/prata.webp`,
      option_values: { Cor: 'Prata 925' },
    },
    {
      id: '00000000-0000-4000-8000-000000000002',
      product_id: 'p-pata',
      nuvemshop_id: 7002,
      price: 100,
      is_active: true,
      position: 1,
      stock: 5,
      image_url: `${STORAGE}/ouro.webp`,
      option_values: { Cor: 'Ouro' },
    },
  ]
  const MARCAS: SitemapOptionMark[] = [
    { product_id: 'p-pata', option_name: 'Cor', option_value: 'Prata 925', value_id: 'a' },
  ]
  const comFotos = () =>
    deps({
      countProducts: async () => 2,
      readProducts: async (from, to) => [PATA, NUA].slice(from, to + 1),
      countVariants: async () => VARIACOES.length,
      readVariants: async (from, to) => VARIACOES.slice(from, to + 1),
      countOptionMarks: async () => MARCAS.length,
      readOptionMarks: async (from, to) => MARCAS.slice(from, to + 1),
    })

  /** `<loc>` da `<url>` → as `<image:loc>` dela, pelo namespace. */
  const fotosPorUrl = (xml: string): Record<string, string[]> => {
    const doc = parse(xml)
    const saida: Record<string, string[]> = {}
    for (const url of [...doc.getElementsByTagName('url')]) {
      const loc = url.getElementsByTagName('loc')[0].textContent
      const fotos = [...url.getElementsByTagNameNS(NS_IMAGEM, 'loc')].map(n => n.textContent)
      if (fotos.length > 0) saida[loc] = fotos
    }
    return saida
  }

  it('SSV-24/26/28: 200, e só a `<url>` da peça leva fotos — a da representante primeiro', async () => {
    const res = await serveSitemap(comFotos())
    expect(res.status).toBe(200)
    expect(res.headers['Content-Type']).toBe('application/xml; charset=utf-8')
    const xml = res.body
    // A Prata (posição 0) está esgotada: a representante é a Ouro, e a foto dela abre a lista.
    expect(fotosPorUrl(xml)).toEqual({
      'https://umaestrelinha.com.br/produtos/pingente-pata': [rendida('ouro'), rendida('a'), rendida('b')],
    })
    // A `<url>` de opção existe e não leva foto (SSV-28).
    expect([...parse(xml).getElementsByTagName('loc')].map(n => n.textContent)).toContain(
      'https://umaestrelinha.com.br/produtos/pingente-pata?variant=7001',
    )
  })

  it('SSV-25: o documento declara o namespace de imagens', async () => {
    const doc = parse((await serveSitemap(comFotos())).body)
    expect(doc.documentElement.getAttribute('xmlns:image')).toBe(NS_IMAGEM)
  })

  it('SSV-29: o `&` da URL de rendição sai escapado no corpo servido', async () => {
    const xml = (await serveSitemap(comFotos())).body
    expect(xml).toContain(
      `<image:loc>${RENDER}/a.webp?width=1200&amp;resize=contain&amp;quality=80</image:loc>`,
    )
    expect(xml).not.toMatch(/<image:loc>[^<]*&(?!amp;|lt;|gt;|quot;|apos;)/)
  })

  it('SSV-27: peça sem foto sai sem `<image:image>`, e nenhum `<image:loc>` é vazio', async () => {
    const xml = (await serveSitemap(comFotos())).body
    expect(fotosPorUrl(xml)['https://umaestrelinha.com.br/produtos/peca-nua']).toBeUndefined()
    expect(xml).not.toContain('<image:loc></image:loc>')
    expect(xml.match(/<image:image>/g)).toHaveLength(3)
  })
})
