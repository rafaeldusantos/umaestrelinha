import { describe, it, expect } from 'vitest'
import { SITEMAP_STATIC_PATHS, LEGACY_REDIRECTS } from '../../routes/index.ts'
import { indexableOptions, resolveVariantPage } from '../../seo/variant.ts'
import { originRefusal, sitemapUrls } from '../urls.ts'
import type { SitemapCategory, SitemapProduct } from '../types.ts'

/**
 * `SMP-02`..`SMP-08`, `SMP-12` — o catálogo virando URLs canônicas.
 *
 * O que este arquivo guarda **não quebra nada quando erra**: um sitemap que anuncie a forma legada
 * de categoria em vez da canônica é XML válido, responde 200 nos dois endereços, e o custo aparece
 * semanas depois como conteúdo duplicado no relatório do Search Console. Por isso as asserções são
 * sobre a **forma exata** da URL, e não sobre "existe uma entrada para esta categoria".
 *
 * As formas legadas não aparecem escritas aqui: quem as conhece é `LEGACY_REDIRECTS`, e o teste de
 * ausência as lê de lá. `menu.test.ts` varre `core` inteiro proibindo o literal — inclusive em
 * comentário —, e essa varredura é a razão de esta observação existir.
 */

const ORIGIN = 'https://umaestrelinha.com.br'

const categoria = (over: Partial<SitemapCategory>): SitemapCategory => ({
  id: over.id ?? 'c1',
  name: over.name ?? 'Categoria',
  slug: over.slug ?? 'categoria',
  parent_id: over.parent_id ?? null,
  sort_order: over.sort_order ?? 0,
  active: over.active ?? true,
  show_in_menu: over.show_in_menu ?? false,
  updated_at: over.updated_at ?? null,
})

const produto = (slug: string, updated_at: string | null = null): SitemapProduct => ({
  slug,
  updated_at,
})

const locs = (input: Parameters<typeof sitemapUrls>[0]) => sitemapUrls(input).map(u => u.loc)

const vazio = { origin: ORIGIN, products: [], categories: [] }

describe('sitemapUrls — produto (SMP-02)', () => {
  it('sai em `/produtos/:slug`, absoluto', () => {
    expect(locs({ ...vazio, products: [produto('colar-de-leite')] })).toContain(
      'https://umaestrelinha.com.br/produtos/colar-de-leite',
    )
  })

  it('NÃO sai em `/produto/:slug` — o singular é legado com 301 (SMP-06)', () => {
    const saida = locs({ ...vazio, products: [produto('colar-de-leite')] })
    expect(saida).not.toContain('https://umaestrelinha.com.br/produto/colar-de-leite')
  })

  it('sem variações nem marcações, nenhuma `<loc>` carrega query (SMP-07, na forma que a 68 manteve)', () => {
    // O `<g:link>` do feed do Shopping carrega `?variant=`, e é o link mais visível do catálogo.
    // Copiá-lo para o sitemap anunciaria 3.233 URLs no lugar de 680 canônicas. A 68 revogou a
    // SMP-07 só para a opção indexável (SVR-27, abaixo): o resto continua sem query.
    for (const loc of locs({ ...vazio, products: [produto('x')] })) {
      expect(loc).not.toContain('?')
    }
  })
})

/**
 * Feature 68 — as `<loc>` de opção (SVR-24..29).
 *
 * Fixture: a "Pingente Pata" com três cores e duas marcadas, mais uma peça sem marcação e uma com a
 * marcação num texto que só existe em variação inativa.
 */
describe('sitemapUrls — as páginas de opção (feature 68)', () => {
  const PRATA = 'Prata 925'
  const OURO = 'Prata 925 Folheado a Ouro'
  const ROSE = 'Prata 925 Folheado a Ouro Rose'
  const cor = { name: 'Cor', values: [PRATA, OURO, ROSE], position: 0 }
  const pata = { id: 'p-pata', slug: 'pingente-pata', updated_at: '2026-10-01T10:00:00+00:00', is_active: true, options: [cor] }
  const anel = { id: 'p-anel', slug: 'anel', updated_at: '2026-10-02T10:00:00+00:00', is_active: true, options: [cor] }
  const colar = { id: 'p-colar', slug: 'colar', updated_at: null, is_active: true, options: [cor] }
  let n = 0
  const variacao = (product_id: string, texto: string, position: number, extra: Record<string, unknown> = {}) => ({
    id: `00000000-0000-4000-8000-${String(++n).padStart(12, '0')}`,
    product_id,
    nuvemshop_id: 9000 + n,
    price: 100,
    is_active: true,
    position,
    option_values: { Cor: texto },
    ...extra,
  })
  const variants = [
    variacao('p-pata', PRATA, 0),
    variacao('p-pata', OURO, 1),
    variacao('p-pata', ROSE, 2),
    variacao('p-pata', ROSE, 3),
    variacao('p-anel', PRATA, 0),
    variacao('p-anel', OURO, 1),
    variacao('p-colar', PRATA, 0),
    variacao('p-colar', OURO, 1, { is_active: false }),
    variacao('p-colar', ROSE, 2),
  ]
  const optionMarks = [
    { product_id: 'p-pata', option_name: 'Cor', option_value: ROSE, value_id: 'rose' },
    { product_id: 'p-pata', option_name: 'Cor', option_value: PRATA, value_id: 'prata' },
    { product_id: 'p-colar', option_name: 'Cor', option_value: OURO, value_id: 'ouro' },
  ]
  const entrada = { ...vazio, staticPaths: [], products: [pata, anel, colar], variants, optionMarks }
  const comoProduto = (id: string) => {
    const p = [pata, anel, colar].find(x => x.id === id)!
    return {
      product: { ...p, option_marks: optionMarks.filter(m => m.product_id === id) },
      variants: variants.filter(v => v.product_id === id),
    }
  }

  it('SVR-24: uma `<loc>` por opção indexável, logo depois da peça, na ordem de SVR-01', () => {
    expect(locs(entrada)).toEqual([
      `${ORIGIN}/produtos/anel`,
      `${ORIGIN}/produtos/colar`,
      `${ORIGIN}/produtos/pingente-pata`,
      `${ORIGIN}/produtos/pingente-pata?variant=${variants[0].nuvemshop_id}`,
      `${ORIGIN}/produtos/pingente-pata?variant=${variants[2].nuvemshop_id}`,
    ])
  })

  it('SVR-24: a ordem das `<loc>` de opção é a de options.values MESMO quando a grade discorda', () => {
    // Na fixture acima `values` e grade concordam (Prata antes de Rose nas duas), então ela não
    // separa "ordem de values" de "ordem da grade" (mutante M11, rodada 1). Aqui `values` põe a Rose
    // primeiro e a grade continua começando pela Prata.
    const roseAntes = { ...pata, options: [{ ...cor, values: [ROSE, OURO, PRATA] }] }
    expect(variants[0].option_values.Cor).toBe(PRATA)
    expect(locs({ ...entrada, products: [roseAntes] })).toEqual([
      `${ORIGIN}/produtos/pingente-pata`,
      `${ORIGIN}/produtos/pingente-pata?variant=${variants[2].nuvemshop_id}`,
      `${ORIGIN}/produtos/pingente-pata?variant=${variants[0].nuvemshop_id}`,
    ])
  })

  it('SVR-24/SVR-05: a `<loc>` de opção é o caminho canônico da regra, absolutizado', () => {
    const esperado = indexableOptions(comoProduto('p-pata')).map(o => `${ORIGIN}${o.path}`)
    expect(locs(entrada).filter(l => l.includes('?'))).toEqual(esperado)
  })

  it('SVR-25: o `lastmod` da `<loc>` de opção é o `updated_at` da peça', () => {
    const urls = sitemapUrls(entrada).filter(u => u.loc.includes('pingente-pata'))
    expect(urls).toHaveLength(3)
    for (const u of urls) expect(u.lastmod).toBe('2026-10-01T10:00:00+00:00')
  })

  it('sem `variants`/`optionMarks` na entrada, o documento é idêntico ao de antes da 68', () => {
    const antes = { ...vazio, products: [pata, anel, colar] }
    expect(sitemapUrls(antes)).toEqual(sitemapUrls({ ...vazio, products: [produto('anel', '2026-10-02T10:00:00+00:00'), produto('colar'), produto('pingente-pata', '2026-10-01T10:00:00+00:00')] }))
    expect(sitemapUrls({ ...antes, variants, optionMarks: [] })).toEqual(sitemapUrls(antes))
  })

  it('peça sem `id` (forma antiga da entrada) sai só com a `<loc>` dela', () => {
    const { id: _id, ...semId } = pata
    expect(locs({ ...entrada, products: [semId] })).toEqual([`${ORIGIN}/produtos/pingente-pata`])
  })

  it('peça desativada não ganha `<loc>` de opção', () => {
    expect(locs({ ...entrada, products: [{ ...pata, is_active: false }] }).some(l => l.includes('?'))).toBe(false)
  })

  it('a duplicata continua LANÇANDO — inclusive a de uma `<loc>` de opção', () => {
    expect(() => sitemapUrls({ ...entrada, products: [pata, { ...pata }] })).toThrow(/duplicada/)
  })

  // ------------------------------------------------------------------------------------------
  // SVR-27 — a régua que substitui a SMP-07. Mais ESTREITA que "nenhum `?`": a única query aceita é
  // `?variant=<id>`, e o id tem de ser de opção indexável SEGUNDO `indexableOptions`.
  // ------------------------------------------------------------------------------------------
  const opcoesIndexaveis = new Set(
    [pata, anel, colar].flatMap(p => indexableOptions(comoProduto(p.id)).map(o => `${ORIGIN}${o.path}`)),
  )
  const recusaDeQuery = (loc: string, indexaveis: ReadonlySet<string>): string | null => {
    const i = loc.indexOf('?')
    if (i === -1) return null
    if (!/^variant=[^&=?#]+$/.test(loc.slice(i + 1))) return `query fora da forma ?variant=<id>: ${loc}`
    if (!indexaveis.has(loc)) return `?variant= que não é de opção indexável: ${loc}`
    return null
  }

  it('SVR-27: toda `<loc>` passa pela régua — a única query é ?variant= de opção indexável', () => {
    const saida = locs(entrada)
    expect(saida.filter(l => l.includes('?'))).toHaveLength(2)
    for (const loc of saida) expect(recusaDeQuery(loc, opcoesIndexaveis)).toBeNull()
  })

  it.each([
    ['?variant= de variação não indexável (Ouro, sem marcação)', `${ORIGIN}/produtos/pingente-pata?variant=${variants[1].nuvemshop_id}`],
    ['?variant= da NÃO representante de um texto indexável', `${ORIGIN}/produtos/pingente-pata?variant=${variants[3].nuvemshop_id}`],
  ])('SENSOR SVR-27 — %s é recusado', (_n, loc) => {
    expect(recusaDeQuery(loc, opcoesIndexaveis)).not.toBeNull()
  })

  // A FORMA da query é medida sozinha: o conjunto de indexáveis recebe a própria URL, para que só a
  // régua de forma possa recusá-la. Sem isso, a checagem de pertinência recusaria estas URLs também
  // e a régua de forma seria verdadeira nos dois mundos — apagá-la deixaria a suíte verde.
  it.each([
    ['?utm=', `${ORIGIN}/produtos/pingente-pata?utm_source=x`],
    ['`&` extra depois de um ?variant= indexável', `${ORIGIN}/produtos/pingente-pata?variant=${variants[0].nuvemshop_id}&utm_source=x`],
    ['?variant= vazio', `${ORIGIN}/produtos/pingente-pata?variant=`],
    ['?variant= repetido', `${ORIGIN}/produtos/pingente-pata?variant=1&variant=2`],
  ])('SENSOR SVR-27 — %s é recusado pela FORMA, mesmo que constasse do conjunto', (_n, loc) => {
    expect(recusaDeQuery(loc, opcoesIndexaveis)).not.toBeNull()
    expect(recusaDeQuery(loc, new Set([...opcoesIndexaveis, loc]))).not.toBeNull()
  })

  it('SENSOR SVR-27 inverso — a `<loc>` de opção indexável e a da peça passam', () => {
    expect(recusaDeQuery(`${ORIGIN}/produtos/pingente-pata?variant=${variants[2].nuvemshop_id}`, opcoesIndexaveis)).toBeNull()
    expect(recusaDeQuery(`${ORIGIN}/produtos/pingente-pata`, opcoesIndexaveis)).toBeNull()
  })

  // ------------------------------------------------------------------------------------------
  // SVR-28 — sitemap ⊆ autocanônicas e autocanônicas ⊆ sitemap, com as funções que a produção chama.
  // ------------------------------------------------------------------------------------------
  it('SVR-28 (sitemap ⊆ autocanônicas): toda `<loc>` com ?variant= se declara canônica pela regra de SVR-07', () => {
    const comQuery = locs(entrada).filter(l => l.includes('?variant='))
    expect(comQuery.length).toBeGreaterThan(0)
    for (const loc of comQuery) {
      const url = new URL(loc)
      const slug = url.pathname.split('/').pop()
      const p = [pata, anel, colar].find(x => x.slug === slug)!
      const pagina = resolveVariantPage(comoProduto(p.id), url.searchParams.get('variant'))
      expect(pagina.kind).toBe('option')
      if (pagina.kind === 'option') expect(`${ORIGIN}${pagina.option.path}`).toBe(loc)
    }
  })

  it('SVR-28 (autocanônicas ⊆ sitemap): toda opção indexável de toda peça tem `<loc>`', () => {
    const saida = new Set(locs(entrada))
    expect(opcoesIndexaveis.size).toBe(2)
    for (const u of opcoesIndexaveis) expect(saida.has(u)).toBe(true)
  })

  it.each([
    ['a marcação é removida', { optionMarks: optionMarks.filter(m => m.option_value !== ROSE) }],
    // grupo desligado: a RLS deixa de devolver a linha — é a mesma entrada que a remoção
    ['o grupo é desligado (a RLS some com a marcação)', { optionMarks: optionMarks.filter(m => m.value_id !== 'rose') }],
    [
      'a opção perde a última variação elegível',
      { variants: variants.map(v => (v.product_id === 'p-pata' && v.option_values.Cor === ROSE ? { ...v, price: null } : v)) },
    ],
  ])('SVR-29: quando %s, a `<loc>` some na próxima geração e a URL passa a canonizar para a peça', (_n, mudanca) => {
    const rose = `${ORIGIN}/produtos/pingente-pata?variant=${variants[2].nuvemshop_id}`
    const depois = { ...entrada, ...mudanca }
    expect(locs(entrada)).toContain(rose)
    expect(locs(depois)).not.toContain(rose)
    expect(locs(depois)).toContain(`${ORIGIN}/produtos/pingente-pata?variant=${variants[0].nuvemshop_id}`)
    const pecaDepois = {
      product: { ...pata, option_marks: (depois.optionMarks ?? []).filter(m => m.product_id === 'p-pata') },
      variants: (depois.variants ?? []).filter(v => v.product_id === 'p-pata'),
    }
    expect(resolveVariantPage(pecaDepois, String(variants[2].nuvemshop_id)).kind).toBe('product')
  })
})

describe('sitemapUrls — categoria (SMP-03)', () => {
  const pai = categoria({ id: 'p', slug: 'joias-afetivas', sort_order: 1 })
  const filha = categoria({ id: 'f', slug: 'joia-de-leite-materno', parent_id: 'p', sort_order: 2 })

  it('raiz sai na raiz do domínio, em UM segmento', () => {
    expect(locs({ ...vazio, categories: [pai] })).toEqual([
      ...SITEMAP_STATIC_PATHS.map(p => (p === '/' ? ORIGIN : ORIGIN + p)),
      'https://umaestrelinha.com.br/joias-afetivas',
    ])
  })

  it('filha sai com o pai na frente, em DOIS segmentos — é a canônica de `AD-018`', () => {
    expect(locs({ ...vazio, categories: [pai, filha] })).toContain(
      'https://umaestrelinha.com.br/joias-afetivas/joia-de-leite-materno',
    )
  })

  it('filha NÃO sai também na forma de um segmento — seria a mesma página em dois endereços', () => {
    const saida = locs({ ...vazio, categories: [pai, filha] })
    expect(saida).not.toContain('https://umaestrelinha.com.br/joia-de-leite-materno')
  })

  it('filha com pai FORA da lista cai na forma de um segmento — que é a que a loja serve', () => {
    // Acontece quando a RLS esconde o pai (categoria desativada). `categoryHref` degrada para um
    // segmento, a página responde 200 e declara a própria canônica. Anunciar `/pai/filha` com o pai
    // invisível apontaria para uma URL que a loja redireciona.
    expect(locs({ ...vazio, categories: [filha] })).toContain(
      'https://umaestrelinha.com.br/joia-de-leite-materno',
    )
  })

  it('SENSOR — um gerador ingênuo (`/` + slug) REPROVA nesta mesma régua', () => {
    // Sem este caso, os testes acima passariam com uma implementação que devolvesse sempre um
    // segmento: a asserção de `toContain` da filha é a única que os distingue, e um `toContain` é
    // fácil de satisfazer por acidente. Aqui a régua é invertida de propósito.
    const ingenuo = [pai, filha].map(c => `${ORIGIN}/${c.slug}`)
    const real = locs({ ...vazio, categories: [pai, filha] })

    expect(ingenuo).toContain('https://umaestrelinha.com.br/joia-de-leite-materno')
    expect(real).not.toContain('https://umaestrelinha.com.br/joia-de-leite-materno')
    expect(real).toContain('https://umaestrelinha.com.br/joias-afetivas/joia-de-leite-materno')
  })
})

describe('sitemapUrls — as institucionais (SMP-04)', () => {
  it('emite uma entrada por caminho de `SITEMAP_STATIC_PATHS`', () => {
    const saida = locs(vazio)
    expect(saida).toHaveLength(SITEMAP_STATIC_PATHS.length)
  })

  it('a raiz sai como a origem NUA, sem barra final', () => {
    // `trailingSlash: false` no `vercel.json`: a forma canônica é sem barra. `origin + '/'` seria
    // um segundo endereço para a home.
    expect(locs(vazio)).toContain('https://umaestrelinha.com.br')
    expect(locs(vazio)).not.toContain('https://umaestrelinha.com.br/')
  })

  it('institucional não declara `lastmod` (SMP-08)', () => {
    for (const url of sitemapUrls(vazio)) {
      expect(url.lastmod).toBeNull()
    }
  })

  it('nenhuma rota privada ou transacional entra', () => {
    const saida = locs(vazio)
    for (const path of ['/carrinho', '/checkout', '/conta', '/favoritos', '/entrar', '/busca']) {
      expect(saida).not.toContain(ORIGIN + path)
    }
  })
})

describe('sitemapUrls — nenhuma forma legada (SMP-06)', () => {
  it('nenhuma `<loc>` casa com um `from` de `LEGACY_REDIRECTS`', () => {
    const saida = locs({
      ...vazio,
      products: [produto('x')],
      categories: [categoria({ slug: 'x' })],
    })

    // Âncora: a régua tem de ter o que comparar. Sem isto, esvaziar `LEGACY_REDIRECTS` faria o
    // laço abaixo não rodar nenhuma vez e o teste passar por vacuidade.
    expect(LEGACY_REDIRECTS.length).toBeGreaterThanOrEqual(4)

    for (const entry of LEGACY_REDIRECTS) {
      const prefixo = entry.from.replace('/:slug', '')
      expect(saida.some(loc => loc.startsWith(`${ORIGIN}${prefixo}/`))).toBe(false)
      expect(saida).not.toContain(`${ORIGIN}${entry.from}`)
    }
  })
})

describe('sitemapUrls — `lastmod` (SMP-08, SMP-15)', () => {
  it('produto com `updated_at` declara; sem, omite', () => {
    const saida = sitemapUrls({
      ...vazio,
      products: [produto('a', '2026-08-16T14:58:34.849605+00:00'), produto('b')],
    })

    expect(saida.find(u => u.loc.endsWith('/produtos/a')).lastmod).toBe(
      '2026-08-16T14:58:34.849605+00:00',
    )
    expect(saida.find(u => u.loc.endsWith('/produtos/b')).lastmod).toBeNull()
  })

  it('categoria com `updated_at` declara', () => {
    const saida = sitemapUrls({
      ...vazio,
      categories: [categoria({ slug: 'z', updated_at: '2026-08-16T14:57:33.625587+00:00' })],
    })
    expect(saida.find(u => u.loc.endsWith('/z')).lastmod).toBe('2026-08-16T14:57:33.625587+00:00')
  })
})

describe('sitemapUrls — origem (SMP-05)', () => {
  it('barra final na configuração não vira barra dupla na URL', () => {
    const saida = locs({ ...vazio, origin: 'https://umaestrelinha.com.br/', products: [produto('a')] })
    expect(saida).toContain('https://umaestrelinha.com.br/produtos/a')
    expect(saida.some(loc => loc.includes('//produtos'))).toBe(false)
  })

  it('toda `<loc>` é absoluta e nenhuma termina em barra', () => {
    const saida = locs({
      ...vazio,
      products: [produto('a')],
      categories: [categoria({ slug: 'b' })],
    })
    for (const loc of saida) {
      expect(loc.startsWith('https://')).toBe(true)
      expect(loc.endsWith('/')).toBe(false)
    }
  })
})

describe('sitemapUrls — ordem determinística (SMP-12)', () => {
  it('institucionais, depois categorias, depois produtos', () => {
    const saida = locs({
      ...vazio,
      products: [produto('p1')],
      categories: [categoria({ slug: 'c1' })],
    })

    const iCategoria = saida.indexOf(`${ORIGIN}/c1`)
    const iProduto = saida.indexOf(`${ORIGIN}/produtos/p1`)
    expect(saida.indexOf(ORIGIN)).toBeLessThan(iCategoria)
    expect(iCategoria).toBeLessThan(iProduto)
  })

  it('a mesma entrada EMBARALHADA produz o mesmo documento', () => {
    // É a propriedade que torna duas leituras comparáveis. O PostgREST não garante ordem entre
    // requisições, então sem esta normalização toda releitura pareceria uma reescrita completa.
    const products = [produto('c'), produto('a'), produto('b')]
    const categories = [
      categoria({ id: '2', slug: 'beta', sort_order: 2 }),
      categoria({ id: '1', slug: 'alfa', sort_order: 1 }),
    ]

    const a = locs({ ...vazio, products, categories })
    const b = locs({ ...vazio, products: [...products].reverse(), categories: [...categories].reverse() })

    expect(a).toEqual(b)
    expect(a.filter(l => l.includes('/produtos/'))).toEqual([
      `${ORIGIN}/produtos/a`,
      `${ORIGIN}/produtos/b`,
      `${ORIGIN}/produtos/c`,
    ])
  })

  it('categoria ordena por `sort_order` antes do slug', () => {
    const saida = locs({
      ...vazio,
      categories: [
        categoria({ id: '1', slug: 'zeta', sort_order: 1 }),
        categoria({ id: '2', slug: 'alfa', sort_order: 2 }),
      ],
    })
    expect(saida.indexOf(`${ORIGIN}/zeta`)).toBeLessThan(saida.indexOf(`${ORIGIN}/alfa`))
  })
})

describe('sitemapUrls — a recusa de duplicata', () => {
  it('lança quando duas entradas produzem a mesma `<loc>`', () => {
    expect(() =>
      sitemapUrls({ ...vazio, products: [produto('a'), produto('a')] }),
    ).toThrow(/duplicada/)
  })

  it('categoria com o slug de uma institucional colide, e a colisão é RECUSADA', () => {
    // É a armadilha que `AD-018` registra: com categoria na raiz do domínio, uma categoria chamada
    // "sobre" ocupa o mesmo endereço da página institucional. `reservedSlugRefusal` impede o
    // cadastro; aqui a recusa é a segunda rede, para o caso de a linha ter entrado por SQL na mão.
    expect(() =>
      sitemapUrls({ ...vazio, categories: [categoria({ slug: 'sobre' })] }),
    ).toThrow(/duplicada/)
  })
})

describe('originRefusal — a origem é configuração, e configuração errada erra em escala (SMP-18)', () => {
  it('aceita http e https absolutos', () => {
    expect(originRefusal('https://umaestrelinha.com.br')).toBeNull()
    expect(originRefusal('http://localhost:8082')).toBeNull()
    expect(originRefusal('https://umaestrelinha.com.br/')).toBeNull()
  })

  it('recusa origem ausente, nomeando a variável', () => {
    // Nomear a variável é o que separa "sitemap indisponível" de meia hora procurando no lugar
    // errado — a mesma lição do user-agent sem aspas do importador.
    expect(originRefusal('')).toMatch(/STORE_PUBLIC_URL/)
    expect(originRefusal(undefined as unknown as string)).toMatch(/STORE_PUBLIC_URL/)
    expect(originRefusal('   ')).toMatch(/STORE_PUBLIC_URL/)
  })

  it('recusa caminho relativo — produziria 719 `<loc>` sem host, todas válidas como XML', () => {
    expect(originRefusal('/loja')).toMatch(/absoluta/)
    expect(originRefusal('umaestrelinha.com.br')).toMatch(/absoluta/)
  })

  it('recusa esquema que não é http(s), e diz o valor recebido', () => {
    expect(originRefusal('ftp://umaestrelinha.com.br')).toMatch(/http ou https: ftp:/)
  })
})

describe('sitemapUrls — as perguntas frequentes, uma URL por pergunta', () => {
  const CINZAS = { id: '3f9a1c2e-0000-4000-8000-000000000001', question: 'Quanto de cinzas preciso enviar?' }
  const LEITE = { id: '7b2d4e6f-0000-4000-8000-000000000002', question: 'Como envio o leite materno?' }

  it('cada pergunta sai no endereço que a página declara como canônico', () => {
    expect(locs({ ...vazio, faqQuestions: [LEITE, CINZAS] })).toEqual(
      expect.arrayContaining([
        `${ORIGIN}/perguntas-frequentes/como-envio-o-leite-materno-7b2d4e6f`,
        `${ORIGIN}/perguntas-frequentes/quanto-de-cinzas-preciso-enviar-3f9a1c2e`,
      ]),
    )
  })

  it('vêm logo depois das institucionais, na ordem da página', () => {
    const todas = locs({ ...vazio, faqQuestions: [LEITE, CINZAS], products: [produto('anel')] })
    const n = SITEMAP_STATIC_PATHS.length
    expect(todas[n]).toMatch(/como-envio-o-leite-materno-7b2d4e6f$/)
    expect(todas[n + 1]).toMatch(/quanto-de-cinzas-preciso-enviar-3f9a1c2e$/)
    expect(todas.at(-1)).toBe(`${ORIGIN}/produtos/anel`)
  })

  it('sem perguntas, o documento é o de antes', () => {
    expect(locs({ ...vazio, faqQuestions: [] })).toEqual(locs(vazio))
  })

  it('pergunta não declara `lastmod` — não há coluna de onde derivar a data', () => {
    const url = sitemapUrls({ ...vazio, faqQuestions: [CINZAS] }).find(u => u.loc.includes('cinzas'))
    expect(url?.lastmod).toBeNull()
  })
})
