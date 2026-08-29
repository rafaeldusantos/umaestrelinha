import { describe, it, expect } from 'vitest'
import { SITEMAP_STATIC_PATHS, LEGACY_REDIRECTS } from '../../routes/index.ts'
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

  it('nenhuma `<loc>` carrega query — em particular `?variant=` (SMP-07)', () => {
    // O `<g:link>` do feed do Shopping carrega `?variant=`, e é o link mais visível do catálogo.
    // Copiá-lo para o sitemap anunciaria 3.233 URLs no lugar de 680 canônicas.
    for (const loc of locs({ ...vazio, products: [produto('x')] })) {
      expect(loc).not.toContain('?')
    }
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
