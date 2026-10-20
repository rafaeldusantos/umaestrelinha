// Feature 69 (T10) — o wiring da função `api/page`: as leituras de `PageDeps`, a reconstrução da URL
// do `rewrite` e a tradução para `Response`. A regra (`servePage`) é testada em `core`; aqui se
// prova o que só este arquivo faz.
//
// O dublê do client REGISTRA tabela, colunas, filtros e argumentos de RPC (molde de
// `supabase/functions/_shared/testing`). Um dublê que devolvesse a fixtura sem olhar o pedido
// tornaria "esta leitura pede a coluna certa, filtrada pelo slug certo" inauditável — e é
// exatamente o que se quer provar.
import { describe, expect, it, vi } from 'vitest'
import type { SupabaseClient } from '@supabase/supabase-js'
import { servePage, type PageDeps } from '@estrelinha/core/page'
import {
  COLUNAS_CATEGORIA,
  COLUNAS_MARCACAO,
  COLUNAS_PRODUTO,
  COLUNAS_VARIACAO,
  createPageHandler,
  originalUrl,
  pageDeps,
  toResponse,
} from '../page'

interface Chamada {
  tabela?: string
  rpc?: string
  args?: unknown
  select?: string
  filtros: [string, string, unknown][]
  ordem?: string
  terminal?: 'maybeSingle' | 'lista'
}

type Resposta = { data: unknown; error: unknown }

/** Um client que anota cada chamada e responde pela tabela (ou pela RPC). */
const dubleDoClient = (respostas: Record<string, Resposta>) => {
  const chamadas: Chamada[] = []
  const construtor = (c: Chamada) => {
    const responder = () => respostas[c.tabela ?? `rpc:${c.rpc}`] ?? { data: null, error: null }
    const q = {
      select(colunas: string) {
        c.select = colunas
        return q
      },
      eq(coluna: string, valor: unknown) {
        c.filtros.push(['eq', coluna, valor])
        return q
      },
      in(coluna: string, valor: unknown) {
        c.filtros.push(['in', coluna, valor])
        return q
      },
      order(coluna: string) {
        c.ordem = coluna
        return q
      },
      maybeSingle() {
        c.terminal = 'maybeSingle'
        return Promise.resolve(responder())
      },
      then(ok: (r: Resposta) => unknown, falha?: (e: unknown) => unknown) {
        c.terminal ??= 'lista'
        return Promise.resolve(responder()).then(ok, falha)
      },
    }
    return q
  }
  const client = {
    from(tabela: string) {
      const c: Chamada = { tabela, filtros: [] }
      chamadas.push(c)
      return construtor(c)
    },
    rpc(nome: string, args: unknown) {
      const c: Chamada = { rpc: nome, args, filtros: [] }
      chamadas.push(c)
      return Promise.resolve(respostas[`rpc:${nome}`] ?? { data: null, error: null })
    },
  }
  return { client: client as unknown as SupabaseClient, chamadas }
}

const ctx = { shell: '<html><head><title>x</title></head><body></body></html>', origin: 'https://loja.test', log: () => {} }

describe('originalUrl — o caminho que a cliente pediu, reconstruído do rewrite', () => {
  it('lê o caminho de `__path` e preserva `variant`, sem deixar `__path` na query', () => {
    const url = originalUrl('https://loja.test/api/page?__path=/produtos/colar-x&variant=123')
    expect(url.pathname).toBe('/produtos/colar-x')
    expect(url.searchParams.get('variant')).toBe('123')
    expect(url.searchParams.has('__path')).toBe(false)
    expect(url.origin).toBe('https://loja.test')
  })

  it('a ordem dos parâmetros não importa, e o resto da query fica', () => {
    const url = originalUrl('https://loja.test/api/page?variant=9&utm_source=g&__path=/a/b')
    expect(url.pathname).toBe('/a/b')
    expect([...url.searchParams.keys()]).toEqual(['variant', 'utm_source'])
  })

  it('caminho codificado é decodificado uma vez', () => {
    expect(originalUrl('https://loja.test/api/page?__path=%2Fpolitica-de-privacidade').pathname).toBe(
      '/politica-de-privacidade',
    )
  })

  it('sem query sobrando, a URL não leva `?`', () => {
    expect(originalUrl('https://loja.test/api/page?__path=/carrinho').href).toBe('https://loja.test/carrinho')
  })

  it('barras iniciais repetidas não mudam a origem', () => {
    const url = originalUrl('https://loja.test/api/page?__path=//outro.test/x')
    expect(url.origin).toBe('https://loja.test')
    expect(url.pathname).toBe('/outro.test/x')
  })

  it('sem `__path` (chamada direta), vale o próprio caminho', () => {
    expect(originalUrl('https://loja.test/api/page').pathname).toBe('/api/page')
  })
})

describe('toResponse — status, headers e corpo', () => {
  it('200 leva corpo e os headers como vieram', async () => {
    const r = toResponse({
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'public, s-maxage=300' },
      body: '<html>ok</html>',
    })
    expect(r.status).toBe(200)
    expect(r.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(r.headers.get('cache-control')).toBe('public, s-maxage=300')
    expect(await r.text()).toBe('<html>ok</html>')
  })

  it('404 mantém o status e o corpo', async () => {
    const r = toResponse({ status: 404, headers: { 'Cache-Control': 'public, s-maxage=60' }, body: '<html>404</html>' })
    expect(r.status).toBe(404)
    expect(await r.text()).toBe('<html>404</html>')
  })

  it('301 sai com `Location` e sem corpo', async () => {
    const r = toResponse({ status: 301, headers: { Location: '/produtos/novo', 'Cache-Control': 'x' }, body: '' })
    expect(r.status).toBe(301)
    expect(r.headers.get('location')).toBe('/produtos/novo')
    expect(r.body).toBeNull()
  })
})

describe('pageDeps — cada leitura pede o que deve', () => {
  it('readProduct: `products` + variações embutidas, pelo slug, com as colunas da página', async () => {
    const { client, chamadas } = dubleDoClient({
      products: { data: { id: 'p1', slug: 'colar', product_variants: [{ id: 'v1' }] }, error: null },
    })
    const dados = await pageDeps(client, ctx).readProduct('colar')
    expect(chamadas).toHaveLength(1)
    expect(chamadas[0].tabela).toBe('products')
    expect(chamadas[0].select).toBe(`${COLUNAS_PRODUTO},product_variants(${COLUNAS_VARIACAO})`)
    expect(chamadas[0].filtros).toEqual([['eq', 'slug', 'colar']])
    expect(chamadas[0].terminal).toBe('maybeSingle')
    // As variações saem do produto e vão para o lado.
    expect(dados).toEqual({ product: { id: 'p1', slug: 'colar' }, variants: [{ id: 'v1' }] })
  })

  it('as colunas são as da página de hoje (features 62 e 68)', () => {
    // `stock_policy` e `stock` decidem a disponibilidade e a REPRESENTANTE (`offerAvailability`): sem
    // elas toda peça `track` sai `OutOfStock` no JSON-LD e o `og:image` deixa de ser o `[0]` do sitemap
    // (achado da verificação da 69, M34/M35).
    for (const c of ['seo_title', 'seo_description', 'options', 'images', 'is_active', 'nuvemshop_id', 'stock_policy']) {
      expect(COLUNAS_PRODUTO.split(',')).toContain(c)
    }
    for (const c of ['price', 'image_url', 'is_active', 'option_values', 'nuvemshop_id', 'stock']) {
      expect(COLUNAS_VARIACAO.split(',')).toContain(c)
    }
  })

  it('readProduct: slug que a RLS não devolve ⇒ `null`; erro ⇒ lança', async () => {
    const vazio = dubleDoClient({ products: { data: null, error: null } })
    expect(await pageDeps(vazio.client, ctx).readProduct('x')).toBeNull()
    const erro = dubleDoClient({ products: { data: null, error: new Error('boom') } })
    await expect(pageDeps(erro.client, ctx).readProduct('x')).rejects.toThrow('boom')
  })

  it('readOptionMarks: a tabela das marcações por opção, filtrada pela peça, com o grupo no embed', async () => {
    const linhas = [{ option_name: 'Cor', option_value: 'Ouro', value_id: 'f1', filter_values: null }]
    const { client, chamadas } = dubleDoClient({ product_option_filter_values: { data: linhas, error: null } })
    expect(await pageDeps(client, ctx).readOptionMarks('p1')).toEqual(linhas)
    expect(chamadas[0].tabela).toBe('product_option_filter_values')
    expect(chamadas[0].select).toBe(COLUNAS_MARCACAO)
    expect(COLUNAS_MARCACAO).toContain('filter_groups(is_active)')
    expect(chamadas[0].filtros).toEqual([['eq', 'product_id', 'p1']])
  })

  it('readProductRedirect: `product_redirects` pelo slug antigo, devolvendo o slug ATUAL', async () => {
    const { client, chamadas } = dubleDoClient({
      product_redirects: { data: { product_id: 'p1', products: { slug: 'colar-novo' } }, error: null },
    })
    expect(await pageDeps(client, ctx).readProductRedirect('colar-velho')).toBe('colar-novo')
    expect(chamadas[0].tabela).toBe('product_redirects')
    expect(chamadas[0].select).toBe('product_id,products(slug)')
    expect(chamadas[0].filtros).toEqual([['eq', 'from_slug', 'colar-velho']])
    expect(chamadas[0].terminal).toBe('maybeSingle')
  })

  it('readProductRedirect: sem linha, ou destino escondido pela RLS ⇒ `null`', async () => {
    const sem = dubleDoClient({ product_redirects: { data: null, error: null } })
    expect(await pageDeps(sem.client, ctx).readProductRedirect('x')).toBeNull()
    const oculto = dubleDoClient({ product_redirects: { data: { product_id: 'p', products: null }, error: null } })
    expect(await pageDeps(oculto.client, ctx).readProductRedirect('x')).toBeNull()
  })

  it('readCategories: a árvore ATIVA, com as colunas do `<head>`, na ordem do painel', async () => {
    const arvore = [{ id: 'c1', slug: 'colares', parent_id: null, name: 'Colares' }]
    const { client, chamadas } = dubleDoClient({ categories: { data: arvore, error: null } })
    expect(await pageDeps(client, ctx).readCategories()).toEqual(arvore)
    expect(chamadas[0].tabela).toBe('categories')
    expect(chamadas[0].select).toBe(COLUNAS_CATEGORIA)
    for (const c of ['id', 'slug', 'parent_id', 'name', 'description', 'banner_url', 'image_url']) {
      expect(COLUNAS_CATEGORIA.split(',')).toContain(c)
    }
    expect(chamadas[0].filtros).toEqual([['eq', 'active', true]])
    expect(chamadas[0].ordem).toBe('sort_order')
  })

  it('readCategoryRedirect: `category_redirects` pelo slug antigo, devolvendo o id', async () => {
    const { client, chamadas } = dubleDoClient({ category_redirects: { data: { category_id: 'c9' }, error: null } })
    expect(await pageDeps(client, ctx).readCategoryRedirect('antiga')).toBe('c9')
    expect(chamadas[0].tabela).toBe('category_redirects')
    expect(chamadas[0].select).toBe('category_id')
    expect(chamadas[0].filtros).toEqual([['eq', 'from_slug', 'antiga']])
  })

  it('readInactiveFallback: a RPC `category_fallback` com `p_slug`', async () => {
    const { client, chamadas } = dubleDoClient({ 'rpc:category_fallback': { data: 'c-mae', error: null } })
    expect(await pageDeps(client, ctx).readInactiveFallback('desligada')).toBe('c-mae')
    expect(chamadas).toEqual([{ rpc: 'category_fallback', args: { p_slug: 'desligada' }, filtros: [] }])
  })

  it('readInactiveFallback: `null` ⇒ `null`; erro ⇒ lança (servePage decide)', async () => {
    const nulo = dubleDoClient({ 'rpc:category_fallback': { data: null, error: null } })
    expect(await pageDeps(nulo.client, ctx).readInactiveFallback('x')).toBeNull()
    const erro = dubleDoClient({ 'rpc:category_fallback': { data: null, error: new Error('rpc') } })
    await expect(pageDeps(erro.client, ctx).readInactiveFallback('x')).rejects.toThrow('rpc')
  })

  it('readSettings: as duas chaves numa consulta, traduzidas', async () => {
    const { client, chamadas } = dubleDoClient({
      store_settings: {
        data: [
          { key: 'seo', value: { description: 'Joias afetivas' } },
          { key: 'google_shopping', value: { default_product_category: '188' } },
        ],
        error: null,
      },
    })
    expect(await pageDeps(client, ctx).readSettings()).toEqual({
      defaultProductCategory: '188',
      storeDescription: 'Joias afetivas',
    })
    expect(chamadas[0].tabela).toBe('store_settings')
    expect(chamadas[0].select).toBe('key,value')
    expect(chamadas[0].filtros).toEqual([['in', 'key', ['google_shopping', 'seo']]])
  })

  it('readSettings: descrição em branco ou ausente ⇒ `null`', async () => {
    const { client } = dubleDoClient({
      store_settings: { data: [{ key: 'seo', value: { description: '   ' } }], error: null },
    })
    expect(await pageDeps(client, ctx).readSettings()).toEqual({ defaultProductCategory: null, storeDescription: null })
  })

  it('shell, origem e log passam como vieram', () => {
    const { client } = dubleDoClient({})
    const deps = pageDeps(client, ctx)
    expect(deps.shell).toBe(ctx.shell)
    expect(deps.origin).toBe('https://loja.test')
    expect(deps.log).toBe(ctx.log)
  })
})

describe('createPageHandler — o handler `fetch`', () => {
  const SHELL = '<!doctype html><html><head><title>Uma Estrelinha</title></head><body><div id="root"></div></body></html>'
  const env = { VITE_SUPABASE_URL: 'http://127.0.0.1:54441', VITE_SUPABASE_PUBLISHABLE_KEY: 'pk', STORE_PUBLIC_URL: 'https://loja.test/' }

  it('sem as envs do Supabase: shell, 200, `no-store`, log — e nenhum client criado', async () => {
    const log = vi.fn()
    const makeClient = vi.fn()
    const fetch = createPageHandler({ shell: SHELL, env: { STORE_PUBLIC_URL: 'x' }, log, makeClient })
    const r = await fetch(new Request('https://loja.test/api/page?__path=/produtos/x'))
    expect(r.status).toBe(200)
    expect(r.headers.get('cache-control')).toBe('no-store')
    expect(r.headers.get('content-type')).toBe('text/html; charset=utf-8')
    expect(await r.text()).toBe(SHELL)
    expect(makeClient).not.toHaveBeenCalled()
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ fn: 'page', erro: 'env', path: '/produtos/x' }))
  })

  it.each([
    ['só a URL', { VITE_SUPABASE_URL: 'http://127.0.0.1:54441' }],
    ['só a chave', { VITE_SUPABASE_PUBLISHABLE_KEY: 'pk' }],
  ])('com env PELA METADE (%s): o mesmo shell `no-store`, sem client — nunca 500', async (_, meia) => {
    const makeClient = vi.fn()
    const fetch = createPageHandler({ shell: SHELL, env: { ...meia, STORE_PUBLIC_URL: 'x' }, log: () => {}, makeClient })
    const r = await fetch(new Request('https://loja.test/api/page?__path=/produtos/x'))
    expect(r.status).toBe(200)
    expect(r.headers.get('cache-control')).toBe('no-store')
    expect(await r.text()).toBe(SHELL)
    expect(makeClient).not.toHaveBeenCalled()
  })

  it('com as envs: cria o client com URL e chave publicável, uma vez só', async () => {
    const { client } = dubleDoClient({})
    const makeClient = vi.fn(() => client)
    const fetch = createPageHandler({ shell: SHELL, env, log: () => {}, makeClient })
    await fetch(new Request('https://loja.test/api/page?__path=/carrinho'))
    await fetch(new Request('https://loja.test/api/page?__path=/carrinho'))
    expect(makeClient).toHaveBeenCalledTimes(1)
    expect(makeClient).toHaveBeenCalledWith('http://127.0.0.1:54441', 'pk')
  })

  it('rota de app: o shell intacto, sem nenhuma leitura', async () => {
    const { client, chamadas } = dubleDoClient({})
    const fetch = createPageHandler({ shell: SHELL, env, log: () => {}, makeClient: () => client })
    const r = await fetch(new Request('https://loja.test/api/page?__path=/carrinho'))
    expect(r.status).toBe(200)
    expect(await r.text()).toBe(SHELL)
    expect(chamadas).toEqual([])
  })

  it('produto inexistente: 404 depois de ler o produto e o redirect pelo slug da URL', async () => {
    const { client, chamadas } = dubleDoClient({
      products: { data: null, error: null },
      product_redirects: { data: null, error: null },
      store_settings: { data: [], error: null },
    })
    const fetch = createPageHandler({ shell: SHELL, env, log: () => {}, makeClient: () => client })
    const r = await fetch(new Request('https://loja.test/api/page?__path=/produtos/nao-existe'))
    expect(r.status).toBe(404)
    expect(chamadas.find(c => c.tabela === 'products')?.filtros).toEqual([['eq', 'slug', 'nao-existe']])
    expect(chamadas.find(c => c.tabela === 'product_redirects')?.filtros).toEqual([['eq', 'from_slug', 'nao-existe']])
  })

  it('redirect de produto preserva o `?variant=` e a origem não leva a barra final do env', async () => {
    const { client } = dubleDoClient({
      products: { data: null, error: null },
      product_redirects: { data: { product_id: 'p', products: { slug: 'novo' } }, error: null },
      store_settings: { data: [], error: null },
    })
    const fetch = createPageHandler({ shell: SHELL, env, log: () => {}, makeClient: () => client })
    const r = await fetch(new Request('https://loja.test/api/page?__path=/produtos/velho&variant=77'))
    expect(r.status).toBe(301)
    expect(r.headers.get('location')).toBe('/produtos/novo?variant=77')
  })

  it('página fixa: a canônica na origem do env, sem barra dupla', async () => {
    const { client } = dubleDoClient({})
    const fetch = createPageHandler({ shell: SHELL, env, log: () => {}, makeClient: () => client })
    const r = await fetch(new Request('https://loja.test/api/page?__path=/politica-de-privacidade'))
    const corpo = await r.text()
    expect(r.status).toBe(200)
    expect(corpo).toContain('href="https://loja.test/politica-de-privacidade"')
    expect(corpo).not.toContain('loja.test//')
  })
})

// ---------------------------------------------------------------------------------------------
// AS COLUNAS PEDIDAS BASTAM PARA A PÁGINA (SSV-01, SSV-26) — régua de COMPORTAMENTO, não de lista
// ---------------------------------------------------------------------------------------------
// Achado da verificação da 69 (rodadas 1 e 2): uma lista de colunas escrita no teste mede só o que
// quem a escreveu lembrou — tirar `position`, `compare_price`, `description` ou `brand` deixava a
// suíte verde. `position` e `description` mudam o que o Google lê (a representante e a
// descrição); `compare_price` e `brand` não (ver o sensor). Aqui o dublê devolve SÓ as colunas que o
// `select` pediu, e o HTML servido tem de ser idêntico ao montado com a linha INTEIRA. Coluna usada e
// não pedida diverge — qualquer uma lida no ramo da peça e no de `?variant=` sem opção indexável
// (a fixtura tem `options: null`; o ramo de opções indexáveis é provado em `core/page`, onde o dado
// de entrada é o próprio teste).
describe('readProduct — as colunas pedidas bastam para a página', () => {
  const SHELL = '<!doctype html><html><head><title>Uma Estrelinha</title><meta name="description" content="loja"></head><body><div id="root"></div></body></html>'
  const origin = 'https://loja.test'

  // A linha inteira, com todo campo que a página PODERIA ler preenchido de um jeito que importa:
  // sem `seo_*` (a descrição vem de `description`), marca/MPN/público/categoria próprios, e as
  // variações fora da ordem de `position`, com a de menor posição ESGOTADA numa peça `track` (só
  // `stock`, `stock_policy` e `position` juntos escolhem a representante certa).
  const PRODUTO = {
    id: 'p1', nuvemshop_id: 111, name: 'Colar Gota', slug: 'colar-gota',
    description: '<p>Colar em resina com cinzas, feito à mão em Porto Alegre.</p>',
    images: [{ url: 'https://cdn.test/a.webp', alt: 'a' }, { url: 'https://cdn.test/b.webp', alt: 'b' }],
    is_active: true, stock_policy: 'track', brand: 'Marca Própria', mpn: 'MPN-9', age_group: 'adult',
    gender: 'female', google_product_category: 'Apparel & Accessories > Jewelry > Necklaces',
    identifier_exists: false, seo_title: null, seo_description: null, options: null,
    base_price: 1, original_price: 2, tags: ['x'], category_id: 'c1', created_at: '2026-01-01', updated_at: '2026-01-02',
  }
  const VARIACOES = [
    // Ordem do array ≠ ordem de `position`: sem a coluna, a primeira disponível do array (v3) viraria a
    // representante; com ela, a v1 (posição 1) está esgotada e a certa é a v2.
    { id: 'v3', nuvemshop_id: 223, product_id: 'p1', price: 210, compare_price: null, stock: 7, image_url: null, is_active: true, position: 3, option_values: { Tamanho: 'G' }, sku: 'S3' },
    { id: 'v2', nuvemshop_id: 222, product_id: 'p1', price: 180, compare_price: 240, stock: 4, image_url: 'https://cdn.test/v2.webp', is_active: true, position: 2, option_values: { Tamanho: 'M' }, sku: 'S2' },
    { id: 'v1', nuvemshop_id: 221, product_id: 'p1', price: 150, compare_price: 200, stock: 0, image_url: 'https://cdn.test/v1.webp', is_active: true, position: 1, option_values: { Tamanho: 'P' }, sku: 'S1' },
  ]

  /** `a,b,product_variants(x,y)` ⇒ as chaves de cada nível. */
  const parseSelect = (sel: string) => {
    const m = sel.match(/^(.*),product_variants\((.*)\)$/)
    if (!m) throw new Error(`select inesperado: ${sel}`)
    return { produto: m[1].split(','), variacao: m[2].split(',') }
  }
  const projetar = (linha: Record<string, unknown>, chaves: string[]) =>
    Object.fromEntries(chaves.filter(k => k in linha).map(k => [k, linha[k]]))

  const depsBase = (readProduct: PageDeps['readProduct']): PageDeps => ({
    shell: SHELL, origin, log: () => {}, readProduct,
    readOptionMarks: async () => [], readProductRedirect: async () => null, readCategories: async () => [],
    readCategoryRedirect: async () => null, readInactiveFallback: async () => null,
    readSettings: async () => ({ defaultProductCategory: 'Apparel & Accessories > Jewelry', storeDescription: null }),
  })

  const servir = async (readProduct: PageDeps['readProduct'], caminho: string) =>
    servePage(depsBase(readProduct), new URL(`${origin}${caminho}`))

  const projetado = (produtoBase: Record<string, unknown> = PRODUTO): PageDeps['readProduct'] => {
    const pedidas: string[] = []
    const client = {
      from: () => ({
        select(sel: string) {
          pedidas.push(sel)
          const { produto, variacao } = parseSelect(sel)
          const linha = { ...projetar(produtoBase, produto), product_variants: VARIACOES.map(v => projetar(v, variacao)) }
          const q = { eq: () => q, maybeSingle: () => Promise.resolve({ data: linha, error: null }) }
          return q
        },
      }),
    } as unknown as SupabaseClient
    return pageDeps(client, { shell: SHELL, origin, log: () => {} }).readProduct
  }
  const inteiroDe = (produtoBase: Record<string, unknown>): PageDeps['readProduct'] => async () => ({
    product: produtoBase as never,
    variants: VARIACOES as never,
  })
  const inteiro = inteiroDe(PRODUTO)
  // A política que NÃO é o padrão: com `backorder` a disponibilidade sai da coluna, e não do saldo.
  const SOB_ENCOMENDA = { ...PRODUTO, stock_policy: 'backorder' }

  it.each(['/produtos/colar-gota', '/produtos/colar-gota?variant=222', '/produtos/colar-gota?variant=223'])(
    '%s: o HTML com as colunas pedidas é IDÊNTICO ao da linha inteira',
    async caminho => {
      const cheio = await servir(inteiro, caminho)
      const pedido = await servir(projetado(), caminho)
      expect(cheio.status).toBe(200)
      expect(pedido.status).toBe(cheio.status)
      expect(pedido.body).toBe(cheio.body)
    },
  )

  it('peça sob encomenda (`backorder`): o HTML com as colunas pedidas é IDÊNTICO ao da linha inteira', async () => {
    const cheio = await servir(inteiroDe(SOB_ENCOMENDA), '/produtos/colar-gota')
    expect(cheio.body).toContain('https://schema.org/BackOrder')
    expect((await servir(projetado(SOB_ENCOMENDA), '/produtos/colar-gota')).body).toBe(cheio.body)
  })

  // `compare_price` e `brand` NÃO estão no sensor, e é medido: o JSON-LD servido declara só nome,
  // imagem, SKU, o preço cobrado (`salePrice ?? price`) e a disponibilidade (`core/shopping/jsonld.ts`)
  // — a página é a mesma com ou sem as duas. Elas continuam pedidas para a oferta ter a mesma entrada
  // que o feed.
  it('sensor: a fixtura discrimina — sem `position`, `stock`, `stock_policy` ou `description` o HTML muda', async () => {
    for (const [campo, onde, base] of [
      ['position', 'v', PRODUTO], ['stock', 'v', PRODUTO], ['description', 'p', PRODUTO], ['stock_policy', 'p', SOB_ENCOMENDA],
    ] as const) {
      const cheio = (await servir(inteiroDe(base), '/produtos/colar-gota')).body
      const semCampo: PageDeps['readProduct'] = async () => ({
        product: (onde === 'p' ? { ...base, [campo]: undefined } : base) as never,
        variants: (onde === 'v' ? VARIACOES.map(v => ({ ...v, [campo]: undefined })) : VARIACOES) as never,
      })
      expect((await servir(semCampo, '/produtos/colar-gota')).body, campo).not.toBe(cheio)
    }
  })
})
