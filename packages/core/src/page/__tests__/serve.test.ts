import { describe, expect, it, vi } from 'vitest'
import { GALLERY_STAGE_SIZES, RENDITION_WIDTHS, renditionUrl } from '../../media/rendition.ts'
import { escapeXml } from '../../xml/escape.ts'
import { productPageMeta } from '../../seo/pages.ts'
import { productHead, publicOptionMarks, type OptionMarkRow } from '../../seo/variant.ts'
import { productJsonLd, renderFeedXml, resolveOffer, withPageUrl } from '../../shopping/index.ts'
import { applyHead, injectIntoHead, jsonLdScript } from '../head.ts'
import { productPageImages } from '../images.ts'
import { PAGE_CACHE, servePage, type PageDeps, type ProductPageData } from '../serve.ts'

/**
 * Feature 69, T05 — o ramo de PRODUTO de `servePage`.
 *
 * Os casos deste arquivo moravam em `supabase/functions/product-page/__tests__/handlers.test.ts`
 * (75 casos) e mudaram de casa com a regra. **63 vieram**, com as asserções de antes; **12 não**, e
 * cada um pelo motivo de que a coisa medida deixou de existir:
 *
 * - `createShellCache` (5) — o shell agora é embutido no bundle no build (SSV-04), não buscado;
 * - "o único 5xx é o shell não carregar" e "não lê o produto quando o shell falhou" (2) — idem: não
 *   há busca de shell para falhar;
 * - a "fumaça de Deno" (5) — media o grafo do `handlers.ts` da function, que segue lá até a T12; o
 *   grafo de `core/page` é medido por `purity.test.ts`, ao lado.
 *
 * **Três casos portados mudaram de veredito, e é a spec que muda** (não a régua afrouxando): slug
 * desconhecido e `/produtos` sem slug passam de "shell 200" para **404 com `noindex`** (SSV-07), e o
 * `Cache-Control` passa a ser exatamente o da tabela do `design.md` (`public, s-maxage=300`, sem o
 * `stale-while-revalidate` da function).
 *
 * Os ramos novos (404, `product_redirects`, erro com `no-store`, categoria, página fixa, rota de app)
 * estão no fim.
 */

const SHELL =
  '<!doctype html><html><head><title>Uma Estrelinha</title></head><body><div id="root"></div></body></html>'

const ORIGEM = 'https://umaestrelinha.com.br'

const dados = (over: Partial<ProductPageData> = {}): ProductPageData => ({
  product: {
    id: '3f1c0a52-9b7e-4c11-8d02-6a5e4f8b1c93',
    nuvemshop_id: 281745761,
    name: 'Pulseira 7 Nós Ajustável Proteção Kabbalah',
    slug: 'pulseira-7-nos-ajustavel-protecao-kabbalah',
    description: '<p>Pulseira dos 7 n&oacute;s</p>',
    images: [{ url: 'https://cdn/p1.jpg' }],
    is_active: true,
    stock_policy: 'track',
  },
  variants: [
    {
      id: 'dd0e2171-4d3d-4e20-a868-21e5223bd917',
      nuvemshop_id: 1259936246,
      price: 19.9,
      compare_price: null,
      stock: 4,
      image_url: null,
      is_active: true,
      position: 0,
    },
    {
      id: 'aa11bb22-cc33-dd44-ee55-ff6677889900',
      nuvemshop_id: 1259936247,
      price: 24.9,
      compare_price: null,
      stock: 2,
      image_url: null,
      is_active: true,
      position: 1,
    },
  ],
  ...over,
})

const deps = (over: Partial<PageDeps> = {}, d: ProductPageData | null = dados()): PageDeps => ({
  shell: SHELL,
  origin: ORIGEM,
  readProduct: async () => d,
  readOptionMarks: async () => [],
  readProductRedirect: async () => null,
  readCategories: async () => [],
  readCategoryRedirect: async () => null,
  readInactiveFallback: async () => null,
  readSettings: async () => ({ defaultProductCategory: null, storeDescription: null }),
  log: () => {},
  ...over,
})

/** `?slug=x&variant=…` da function vira o caminho de verdade, com a query que sobrar. */
const url = (qs: string): URL => {
  const p = new URLSearchParams(qs.replace(/^\?/, ''))
  const slug = p.get('slug') ?? ''
  p.delete('slug')
  const resto = p.toString()
  return new URL(`https://x/produtos/${slug}${resto ? `?${resto}` : ''}`)
}

const ld = (corpo: string): Record<string, any> | null => {
  const m = corpo.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)
  return m ? JSON.parse(m[1].replace(/\\u003c/g, '<')) : null
}

describe('servePage, produto — o bloco é injetado', () => {
  it('responde 200 com HTML', async () => {
    const res = await servePage(deps(), url('?slug=pulseira-7-nos-ajustavel-protecao-kabbalah'))
    expect(res.status).toBe(200)
    expect(res.headers['Content-Type']).toContain('text/html')
  })

  it('o bloco entra ANTES de </head>', async () => {
    const corpo = (await servePage(deps(), url('?slug=pulseira-7-nos-ajustavel-protecao-kabbalah'))).body
    expect(corpo.indexOf('application/ld+json')).toBeLessThan(corpo.indexOf('</head>'))
  })

  it('o resto do shell sai intacto', async () => {
    const corpo = (await servePage(deps(), url('?slug=pulseira-7-nos-ajustavel-protecao-kabbalah'))).body
    // Quatro modificações: o preload, o JSON-LD, o <head> do produto e a canônica. Retirar as
    // quatro devolve o shell byte a byte.
    const semInjecao = corpo
      .replace(/<link rel="preload"[^>]*>/, '')
      .replace(/<link rel="canonical"[^>]*>/, '')
      .replace(/<script type="application\/ld\+json">[\s\S]*?<\/script>/, '')
      .replace(/<meta [^>]*>/g, '')
      .replace(/<title>[^<]*<\/title>/, '<title>Uma Estrelinha</title>')
    expect(semInjecao).toBe(SHELL)
  })

  it('são QUATRO modificações, e só quatro — a vizinha da asserção acima', async () => {
    const corpo = (await servePage(deps(), url('?slug=pulseira-7-nos-ajustavel-protecao-kabbalah'))).body
    expect(corpo.match(/<link rel="preload"/g)).toHaveLength(1)
    expect(corpo.match(/<script type="application\/ld\+json">/g)).toHaveLength(1)
    expect(corpo.match(/<title>/g)).toHaveLength(1)
    expect(corpo.match(/<link rel="canonical"/g)).toHaveLength(1)
    expect(corpo.match(/<meta /g)).toHaveLength(9)
  })

  it('declara Product com nome, imagem, sku e oferta', async () => {
    const corpo = (
      await servePage(deps(), url('?slug=pulseira-7-nos-ajustavel-protecao-kabbalah&variant=1259936246'))
    ).body
    const d = ld(corpo)!
    expect(d['@type']).toBe('Product')
    expect(d.name).toBe('Pulseira 7 Nós Ajustável Proteção Kabbalah')
    expect(d.image).toEqual(['https://cdn/p1.jpg'])
    expect(d.sku).toBe('1259936246')
    expect(d.offers.priceCurrency).toBe('BRL')
    expect(d.offers.availability).toBe('https://schema.org/InStock')
  })
})

describe('servePage, produto — o ?variant= (SSV-05)', () => {
  const preco = async (qs: string, d = dados()) => ld((await servePage(deps({}, d), url(qs))).body)!.offers.price

  it('casa por nuvemshop_id', async () => {
    expect(await preco('?slug=x&variant=1259936246')).toBe('19.90')
  })

  it('casa por UUID, e não pelo recuo ao representativo', async () => {
    expect(await preco('?slug=x&variant=aa11bb22-cc33-dd44-ee55-ff6677889900')).toBe('24.90')
  })

  it('a segunda variação anuncia o preço dela, não o da primeira', async () => {
    expect(await preco('?slug=x&variant=1259936247')).toBe('24.90')
  })

  it('desconhecido cai no representativo, sem erro', async () => {
    expect(await preco('?slug=x&variant=999999')).toBe('19.90')
  })

  it('malformado cai no representativo, sem erro', async () => {
    expect(await preco('?slug=x&variant=%25%25%25')).toBe('19.90')
  })

  it('ausente cai no representativo', async () => {
    expect(await preco('?slug=x')).toBe('19.90')
  })

  it('variação INATIVA é tratada como desconhecida', async () => {
    const d = dados()
    d.variants[0].is_active = false
    expect(await preco('?slug=x&variant=1259936246', d)).toBe('24.90')
  })

  it('o representativo pula a esgotada e pega a próxima disponível', async () => {
    const d = dados()
    d.variants[0].stock = 0
    expect(await preco('?slug=x', d)).toBe('24.90')
  })

  it('com a grade toda esgotada, usa a primeira e a declara indisponível', async () => {
    const d = dados()
    d.variants.forEach(v => (v.stock = 0))
    const corpo = (await servePage(deps({}, d), url('?slug=x'))).body
    expect(ld(corpo)!.offers.price).toBe('19.90')
    expect(ld(corpo)!.offers.availability).toBe('https://schema.org/OutOfStock')
  })
})

describe('servePage, produto — os caminhos de erro', () => {
  it('SSV-07: slug desconhecido ⇒ 404, o shell com noindex no HTML servido', async () => {
    const res = await servePage(deps({}, null), url('?slug=nao-existe'))
    expect(res.status).toBe(404)
    expect(res.body).toContain('<meta name="robots" content="noindex" data-owner="estrelinha-spa">')
    expect(res.body.match(/name="robots"/g)).toHaveLength(1)
    expect(res.body).toContain('<div id="root"></div>')
  })

  it('SSV-06: erro ao ler o produto ⇒ o shell intacto, com 200 e no-store', async () => {
    const res = await servePage(
      deps({
        readProduct: async () => {
          throw new Error('banco fora')
        },
      }),
      url('?slug=x'),
    )
    expect(res.status).toBe(200)
    expect(res.body).toBe(SHELL)
    expect(res.headers['Cache-Control']).toBe('no-store')
  })

  it('/produtos sem slug não é produto — 404, sem ir ao banco', async () => {
    const readProduct = vi.fn(async () => dados())
    const res = await servePage(deps({ readProduct }), new URL('https://x/produtos'))
    expect(res.status).toBe(404)
    expect(readProduct).not.toHaveBeenCalled()
  })

  it('produto sem variação elegível devolve o shell intacto, com 200', async () => {
    const d = dados()
    d.variants.forEach(v => (v.price = null))
    const res = await servePage(deps({}, d), url('?slug=x'))
    expect(res.status).toBe(200)
    expect(res.body).toBe(SHELL)
  })

  it('shell sem </head> volta intacto, sem quebrar a página', async () => {
    const res = await servePage(deps({ shell: '<html></html>' }), url('?slug=x'))
    expect(res.body).toBe('<html></html>')
  })
})

describe('jsonLdScript na resposta montada', () => {
  it('descrição hostil não escapa do script', async () => {
    const d = dados()
    d.product.description = '<p>Peça</p></script><script>alert(1)</script>'
    const corpo = (await servePage(deps({}, d), url('?slug=x'))).body
    expect(corpo).not.toContain('<script>alert(1)</script>')
  })
})

describe('a resposta pede cache de borda (SSV-03)', () => {
  it('o produto declara exatamente `public, s-maxage=300` — a tabela do design', async () => {
    const res = await servePage(deps(), url('?slug=x'))
    expect(res.headers['Cache-Control']).toBe('public, s-maxage=300')
    expect(PAGE_CACHE.page).toBe('public, s-maxage=300')
  })
})

describe('paridade: a página declara o que o feed anuncia', () => {
  it('mesmo preço para o mesmo offer_id', async () => {
    const d = dados()
    const corpo = (await servePage(deps({}, d), url('?slug=x&variant=1259936246'))).body
    const daPagina = ld(corpo)!.offers.price
    const oferta = resolveOffer(d.product, d.variants[0], { origin: ORIGEM })
    const xml = renderFeedXml([oferta], { title: 't', link: ORIGEM, description: 'd' })
    expect(daPagina).toBe(xml.match(/<g:price>([\d.]+) BRL<\/g:price>/)![1])
  })

  it('mesma URL nas duas superfícies', async () => {
    const d = dados()
    const corpo = (await servePage(deps({}, d), url('?slug=x&variant=1259936246'))).body
    const oferta = resolveOffer(d.product, d.variants[0], { origin: ORIGEM })
    expect(ld(corpo)!.offers.url).toBe(oferta.link)
  })
})

describe('servePage, produto — o preload da foto principal (PRF-06)', () => {
  const STORAGE =
    'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/object/public/product-images/pulseira.webp'
  const comFoto = (u: string) => dados({ product: { ...dados().product, images: [{ url: u }] } })
  const semFoto = () => dados({ product: { ...dados().product, images: [] } })
  const corpoDe = async (d: ProductPageData) => (await servePage(deps({}, d), url('?slug=x'))).body
  const linkDe = (corpo: string) => corpo.match(/<link rel="preload"[^>]*>/)?.[0] ?? ''
  /** O `href` isolado — a asserção mira o campo, nunca o elemento (o `imagesrcset` satisfaria tudo). */
  const hrefDe = (link: string) => link.match(/\shref="([^"]*)"/)?.[1] ?? ''

  it('produto com foto do Storage: o `href` do preload É a rendição de 720', async () => {
    const link = linkDe(await corpoDe(comFoto(STORAGE)))
    const href = hrefDe(link)
    expect(link).toContain('as="image"')
    expect(href).toBe(renditionUrl(STORAGE, 720).replace(/&/g, '&amp;'))
    expect(href).toContain('/storage/v1/render/image/public/product-images/pulseira.webp')
    expect(href).toContain('width=720')
    expect(href).toContain('quality=75')
  })

  it('o `href` NÃO é a URL original', async () => {
    const href = hrefDe(linkDe(await corpoDe(comFoto(STORAGE))))
    expect(href).not.toBe(STORAGE)
    expect(href).toContain('/render/image/')
    expect(href).not.toMatch(/\/object\/public\//)
  })

  it('o `href` NÃO é nenhuma das outras larguras do `imagesrcset`', async () => {
    const href = hrefDe(linkDe(await corpoDe(comFoto(STORAGE))))
    expect(href).not.toContain('width=360')
    expect(href).not.toContain('width=480')
  })

  it('o `imagesrcset` traz as três larguras que a galeria pede', async () => {
    const link = linkDe(await corpoDe(comFoto(STORAGE)))
    expect(link).toContain('imagesrcset="')
    for (const w of RENDITION_WIDTHS) expect(link).toContain(String(w) + 'w')
  })

  it('o `imagesizes` é o MESMO `sizes` que a galeria declara', async () => {
    expect(linkDe(await corpoDe(comFoto(STORAGE)))).toContain(
      'imagesizes="' + escapeXml(GALLERY_STAGE_SIZES) + '"',
    )
  })

  it('pede prioridade alta — é o LCP da página do produto', async () => {
    expect(linkDe(await corpoDe(comFoto(STORAGE)))).toContain('fetchpriority="high"')
  })

  it('o `&` da query sai ESCAPADO', async () => {
    const link = linkDe(await corpoDe(comFoto(STORAGE)))
    expect(link).toContain('&amp;quality=75')
    expect(link).not.toMatch(/[^;]&quality=75/)
  })

  it('foto em host de terceiro sai sem `imagesrcset`, com a URL intacta', async () => {
    const link = linkDe(await corpoDe(comFoto('https://cdn.terceiro.example/p1.jpg')))
    expect(link).toContain('href="https://cdn.terceiro.example/p1.jpg"')
    expect(link).not.toContain('imagesrcset')
    expect(link).not.toContain('/render/image/')
  })

  it('produto SEM foto não ganha preload nenhum', async () => {
    expect(await corpoDe(semFoto())).not.toContain('rel="preload"')
  })

  it('produto SEM foto responde o que a product-page respondia — byte a byte', async () => {
    const d = semFoto()
    const corpo = await corpoDe(d)
    const oferta = resolveOffer(d.product, d.variants[0], { origin: ORIGEM })
    const meta = productPageMeta(d.product)
    const head = applyHead(SHELL, {
      title: meta.title,
      description: meta.description,
      canonical: `${ORIGEM}/produtos/${d.product.slug}`,
      image: null,
      ogType: 'product',
    })
    expect(corpo).toBe(
      injectIntoHead(
        head,
        jsonLdScript(withPageUrl(productJsonLd(oferta), { url: `${ORIGEM}/produtos/${d.product.slug}` })),
      ),
    )
  })

  it('o preload vem antes do JSON-LD, e os dois dentro do `<head>`', async () => {
    const corpo = await corpoDe(comFoto(STORAGE))
    expect(corpo.indexOf('rel="preload"')).toBeLessThan(corpo.indexOf('application/ld+json'))
    expect(corpo.indexOf('application/ld+json')).toBeLessThan(corpo.indexOf('</head>'))
  })

  it('o `Content-Type` é `text/html; charset=utf-8`', async () => {
    const res = await servePage(deps({}, comFoto(STORAGE)), url('?slug=x'))
    expect(res.headers['Content-Type']).toBe('text/html; charset=utf-8')
  })

  it('o JSON-LD continua idêntico com e sem preload', async () => {
    const com = ld(await corpoDe(comFoto(STORAGE)))!
    const sem = ld(await corpoDe(comFoto('https://cdn.terceiro.example/p1.jpg')))!
    expect(com['@type']).toBe(sem['@type'])
    expect(com.offers).toEqual(sem.offers)
  })
})

/** Feature 68 — SVR-17..22, SVR-30..33: a página de opção servida. */
describe('servePage, produto — a página de opção (feature 68)', () => {
  const PRATA = 'Prata 925'
  const OURO = 'Prata 925 Folheado a Ouro'
  const ROSE = 'Prata 925 Folheado a Ouro Rose'
  const SLUG = 'pingente-afetivo-pata'
  const variacao = (n: number, cor: string, position: number) => ({
    id: `00000000-0000-4000-8000-00000000000${n}`,
    nuvemshop_id: 1349521830 + n,
    price: 100 + n,
    compare_price: null,
    stock: 3,
    image_url: null,
    is_active: true,
    position,
    option_values: { Cor: cor },
  })
  const pata = (over: Partial<ProductPageData['product']> = {}, cores = [PRATA, OURO, ROSE]): ProductPageData => ({
    product: {
      id: 'p-pata',
      nuvemshop_id: 300100200,
      name: 'Pingente Afetivo Pata',
      slug: SLUG,
      description: '<p>Feito à mão em resina.</p>',
      images: [{ url: 'https://cdn/pata.jpg' }],
      is_active: true,
      stock_policy: 'track',
      options: [{ name: 'Cor', values: cores }],
      ...over,
    },
    variants: [variacao(1, cores[0], 0), variacao(2, cores[1], 1), variacao(3, cores[2], 2), variacao(4, cores[2], 3)],
  })
  const linha = (option_value: string, is_active = true, option_name = 'Cor'): OptionMarkRow => ({
    option_name,
    option_value,
    value_id: `v-${option_value}`,
    filter_values: { filter_groups: { is_active } },
  })
  const MARCAS = [linha(PRATA), linha(ROSE), linha(OURO, false)]
  const servir = async (qs: string, over: Partial<PageDeps> = {}, d = pata()) => {
    const res = await servePage(
      deps({ readOptionMarks: async () => MARCAS, ...over }, d),
      new URL(`https://x/produtos/${SLUG}${qs ? `?${qs.replace(/^&/, '')}` : ''}`),
    )
    return { res, corpo: res.body }
  }
  const canonicas = (corpo: string) => [...corpo.matchAll(/<link rel="canonical" href="([^"]*)">/g)].map(m => m[1])
  const metaDe = (corpo: string, chave: string) =>
    [...corpo.matchAll(/<meta (?:name|property)="([^"]+)" content="([^"]*)"/g)].filter(m => m[1] === chave).map(m => m[2])
  const tituloDe = (corpo: string) => [...corpo.matchAll(/<title>([^<]*)<\/title>/g)].map(m => m[1])
  const daRegra = (d: ProductPageData, param: string | null, marcas = MARCAS) =>
    productHead({ product: { ...d.product, option_marks: publicOptionMarks(marcas) }, variants: d.variants }, param)
  const ROSE_REP = '1349521833'
  const ROSE_OUTRA = '1349521834'

  it('SVR-18: a peça sem ?variant= ganha UMA canônica absoluta, igual ao og:url', async () => {
    const { corpo } = await servir('')
    expect(canonicas(corpo)).toEqual([`${ORIGEM}/produtos/${SLUG}`])
    expect(metaDe(corpo, 'og:url')).toEqual(canonicas(corpo))
  })

  it('SVR-17/18: ?variant= de opção ⇒ <title>, description, og e twitter de productHead, e a canônica da opção', async () => {
    const { res, corpo } = await servir(`&variant=${ROSE_REP}`)
    const regra = daRegra(pata(), ROSE_REP)
    expect(res.status).toBe(200)
    expect(regra.page.kind).toBe('option')
    expect(regra.meta.title).toBe(`Pingente Afetivo Pata — ${ROSE}`)
    expect(tituloDe(corpo)).toEqual([regra.meta.title])
    for (const chave of ['og:title', 'twitter:title']) expect(metaDe(corpo, chave)).toEqual([regra.meta.title])
    for (const chave of ['description', 'og:description', 'twitter:description']) {
      expect(metaDe(corpo, chave)).toEqual([regra.meta.description])
    }
    expect(regra.meta.description.startsWith(`${ROSE}. `)).toBe(true)
    expect(canonicas(corpo)).toEqual([`${ORIGEM}/produtos/${SLUG}?variant=${ROSE_REP}`])
    expect(metaDe(corpo, 'og:url')).toEqual(canonicas(corpo))
  })

  it('SVR-17: a canônica de opção é byte a byte o <g:link> da representante', async () => {
    const d = pata()
    const { corpo } = await servir(`&variant=${ROSE_REP}`)
    expect(canonicas(corpo)).toEqual([resolveOffer(d.product, d.variants[2], { origin: ORIGEM }).link])
  })

  it('a NÃO representante do texto indexável: <head> da opção, canônica da representante, oferta da aberta', async () => {
    const d = pata()
    const { corpo } = await servir(`&variant=${ROSE_OUTRA}`)
    expect(tituloDe(corpo)).toEqual([`Pingente Afetivo Pata — ${ROSE}`])
    expect(canonicas(corpo)).toEqual([`${ORIGEM}/produtos/${SLUG}?variant=${ROSE_REP}`])
    const dado = ld(corpo)!
    expect(dado.sku).toBe(ROSE_OUTRA)
    expect(dado.offers.url).toBe(resolveOffer(d.product, d.variants[3], { origin: ORIGEM }).link)
    expect(dado.url).toBe(`${ORIGEM}/produtos/${SLUG}?variant=${ROSE_REP}`)
  })

  it('SVR-20: texto marcado em grupo INATIVO ⇒ <head> e canônica da peça', async () => {
    const { corpo } = await servir('&variant=1349521832')
    expect(tituloDe(corpo)).toEqual(['Pingente Afetivo Pata | Uma Estrelinha'])
    expect(canonicas(corpo)).toEqual([`${ORIGEM}/produtos/${SLUG}`])
  })

  it('SVR-20: o mesmo texto com o grupo ATIVO teria página — o recorte é o grupo, não o texto', async () => {
    const { corpo } = await servir('&variant=1349521832', { readOptionMarks: async () => [linha(OURO, true)] })
    expect(canonicas(corpo)).toEqual([`${ORIGEM}/produtos/${SLUG}?variant=1349521832`])
  })

  it.each([
    ['inválido', '&variant=xyz'],
    ['desconhecido', '&variant=999'],
    ['de texto sem marcação pública (Ouro, grupo inativo)', '&variant=1349521832'],
  ])('?variant= %s ⇒ o <head> e a canônica da peça, com 200', async (_n, qs) => {
    const { res, corpo } = await servir(qs)
    expect(res.status).toBe(200)
    expect(tituloDe(corpo)).toEqual(['Pingente Afetivo Pata | Uma Estrelinha'])
    expect(canonicas(corpo)).toEqual([`${ORIGEM}/produtos/${SLUG}`])
  })

  it('outros parâmetros (utm, gclid) nunca entram na canônica', async () => {
    const { corpo } = await servir(`&variant=${ROSE_REP}&utm_source=x&gclid=abc`)
    expect(canonicas(corpo)).toEqual([`${ORIGEM}/produtos/${SLUG}?variant=${ROSE_REP}`])
  })

  it('SVR-21: marcações que falham ⇒ 200, <head> e canônica da peça, e o log nomeia o slug', async () => {
    const log = vi.fn()
    const { res, corpo } = await servir(`&variant=${ROSE_REP}`, {
      log,
      readOptionMarks: async () => {
        throw new Error('marcações fora')
      },
    })
    expect(res.status).toBe(200)
    expect(tituloDe(corpo)).toEqual(['Pingente Afetivo Pata | Uma Estrelinha'])
    expect(canonicas(corpo)).toEqual([`${ORIGEM}/produtos/${SLUG}`])
    expect(ld(corpo)!.sku).toBe(ROSE_REP)
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ fn: 'page', erro: 'marcacoes', slug: SLUG }))
  })

  it('a leitura das marcações recebe o id da peça', async () => {
    const leitura = vi.fn(async () => MARCAS)
    await servir('', { readOptionMarks: leitura })
    expect(leitura).toHaveBeenCalledWith('p-pata')
  })

  it('sem marcação nenhuma, a peça não tem opção com página', async () => {
    const { corpo } = await servir(`&variant=${ROSE_REP}`, { readOptionMarks: async () => [] })
    expect(canonicas(corpo)).toEqual([`${ORIGEM}/produtos/${SLUG}`])
  })

  it.each([
    ['vazia', ''],
    ['relativa', '/loja'],
    ['sem esquema', 'umaestrelinha.com.br'],
  ])('SVR-19: origem %s ⇒ nenhuma canônica e nenhum og:url — nunca relativos', async (_n, origin) => {
    for (const qs of ['', `&variant=${ROSE_REP}`]) {
      const { corpo } = await servir(qs, { origin })
      expect(canonicas(corpo)).toEqual([])
      expect(corpo).not.toContain('rel="canonical"')
      expect(metaDe(corpo, 'og:url')).toEqual([])
      const dado = ld(corpo)!
      expect(dado['@type']).toBe('Product')
      expect(dado).not.toHaveProperty('url')
      expect(dado).not.toHaveProperty('hasVariant')
    }
  })

  it('SVR-18: um shell que já traga canônica fica com EXATAMENTE uma — a do produto', async () => {
    const shell = SHELL.replace('</head>', '  <link rel="canonical" href="https://outra/">\n</head>')
    const { corpo } = await servir('', { shell })
    expect(canonicas(corpo)).toEqual([`${ORIGEM}/produtos/${SLUG}`])
    expect(corpo.match(/rel="canonical"/g)).toHaveLength(1)
  })

  it('SVR-30/31: a peça sem ?variant= com opções em Cor declara UM ProductGroup, no lugar do Product', async () => {
    const d = pata()
    const { corpo } = await servir('')
    const dado = ld(corpo)!
    expect(dado['@type']).toBe('ProductGroup')
    expect(dado.name).toBe('Pingente Afetivo Pata')
    expect(dado.productGroupID).toBe('300100200')
    expect(dado.variesBy).toBe('https://schema.org/color')
    expect(dado.url).toBe(`${ORIGEM}/produtos/${SLUG}`)
    expect(dado.hasVariant.map((v: any) => [v.name, v.color, v.sku, v.url])).toEqual([
      [`Pingente Afetivo Pata — ${PRATA}`, PRATA, '1349521831', `${ORIGEM}/produtos/${SLUG}?variant=1349521831`],
      [`Pingente Afetivo Pata — ${ROSE}`, ROSE, ROSE_REP, `${ORIGEM}/produtos/${SLUG}?variant=${ROSE_REP}`],
    ])
    expect(dado.hasVariant[1].offers).toEqual(productJsonLd(resolveOffer(d.product, d.variants[2], { origin: ORIGEM })).offers)
    expect(corpo.match(/"@type":"Product(Group)?"/g)).toHaveLength(3)
    expect(corpo.match(/application\/ld\+json/g)).toHaveLength(1)
  })

  it('SVR-33: com ?variant= válido, o Product da aberta ganha inProductGroupWithID e a url da canônica', async () => {
    const { corpo } = await servir(`&variant=${ROSE_REP}`)
    const dado = ld(corpo)!
    expect(dado['@type']).toBe('Product')
    expect(dado.inProductGroupWithID).toBe('300100200')
    expect(dado.url).toBe(`${ORIGEM}/produtos/${SLUG}?variant=${ROSE_REP}`)
    expect(dado).not.toHaveProperty('hasVariant')
  })

  it('SVR-33: ?variant= válido que resolve para a PEÇA continua com o Product da aberta, url da peça', async () => {
    const { corpo } = await servir('&variant=1349521832')
    const dado = ld(corpo)!
    expect(dado['@type']).toBe('Product')
    expect(dado.sku).toBe('1349521832')
    expect(dado.url).toBe(`${ORIGEM}/produtos/${SLUG}`)
  })

  it('SVR-32: eixo fora da tabela (Tipos de elo) ⇒ o Product, com a url — sem ProductGroup', async () => {
    const d = pata({ options: [{ name: 'Tipos de elo', values: [PRATA, OURO, ROSE] }] })
    d.variants.forEach(v => (v.option_values = { 'Tipos de elo': v.option_values!.Cor }))
    const { corpo } = await servir('', { readOptionMarks: async () => [linha(PRATA, true, 'Tipos de elo')] }, d)
    const dado = ld(corpo)!
    expect(dado['@type']).toBe('Product')
    expect(dado.url).toBe(`${ORIGEM}/produtos/${SLUG}`)
  })

  it('SVR-22: preço, sku e offers.url com ?variant= de opção são os do feed para aquela variação', async () => {
    const d = pata()
    const { corpo } = await servir(`&variant=${ROSE_REP}`)
    const oferta = resolveOffer(d.product, d.variants[2], { origin: ORIGEM })
    const xml = renderFeedXml([oferta], { title: 't', link: ORIGEM, description: 'd' })
    expect(ld(corpo)!.offers.price).toBe(xml.match(/<g:price>([\d.]+) BRL<\/g:price>/)![1])
    expect(ld(corpo)!.offers.url).toBe(oferta.link)
    expect(ld(corpo)!.sku).toBe(oferta.id)
  })

  it('edge case: texto da opção com &, < e aspas sai escapado no HTML e no JSON-LD', async () => {
    const hostil = 'Prata "925" & <b>ouro</b>'
    const d = pata({}, [hostil, OURO, ROSE])
    const { corpo } = await servir('&variant=1349521831', { readOptionMarks: async () => [linha(hostil)] }, d)
    expect(corpo).not.toContain('<b>ouro</b>')
    expect(tituloDe(corpo)).toEqual(['Pingente Afetivo Pata — Prata "925" &amp; &lt;b&gt;ouro&lt;/b&gt;'])
    expect(metaDe(corpo, 'og:title')).toEqual([
      'Pingente Afetivo Pata — Prata &quot;925&quot; &amp; &lt;b&gt;ouro&lt;/b&gt;',
    ])
    expect(metaDe(corpo, 'description')[0].startsWith('Prata &quot;925&quot; &amp; &lt;b&gt;ouro&lt;/b&gt;. ')).toBe(true)
    const bloco = corpo.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)![1]
    expect(bloco).not.toContain('<')
  })
})

// ---------------------------------------------------------------------------------------------
// Os ramos NOVOS da feature 69
// ---------------------------------------------------------------------------------------------

// O robots servido leva `data-owner` depois do `content` (o cliente o reconhece como seu, feature 69).
const robots = (corpo: string) =>
  [...corpo.matchAll(/<meta name="robots" content="([^"]*)"[^>]*>/g)].map(m => m[1])
const canonicasDe = (corpo: string) =>
  [...corpo.matchAll(/<link rel="canonical" href="([^"]*)">/g)].map(m => m[1])
const metaDe = (corpo: string, chave: string) =>
  [...corpo.matchAll(/<meta (?:name|property)="([^"]+)" content="([^"]*)"/g)].filter(m => m[1] === chave).map(m => m[2])
const tituloDe = (corpo: string) => [...corpo.matchAll(/<title>([^<]*)<\/title>/g)].map(m => m[1])

describe('servePage, produto — 404 e product_redirects (SSV-07, SSV-12, SSV-31)', () => {
  it('SSV-07: produto INATIVO ⇒ 404 com noindex, mesmo que a leitura o devolva', async () => {
    const d = dados({ product: { ...dados().product, is_active: false } })
    const res = await servePage(deps({}, d), url('?slug=x'))
    expect(res.status).toBe(404)
    expect(robots(res.body)).toEqual(['noindex'])
  })

  it('SSV-07: a 404 traz o <head> da página não encontrada, sem canônica e sem JSON-LD', async () => {
    const res = await servePage(deps({}, null), url('?slug=inexistente-xyz'))
    expect(tituloDe(res.body)).toEqual(['Página não encontrada | Uma Estrelinha'])
    expect(canonicasDe(res.body)).toEqual([])
    expect(res.body).not.toContain('application/ld+json')
    expect(res.headers['Content-Type']).toBe('text/html; charset=utf-8')
  })

  it('SSV-12: a 404 tem cache de borda de 60 s — mais curto que o de 200', async () => {
    const res = await servePage(deps({}, null), url('?slug=inexistente-xyz'))
    expect(res.headers['Cache-Control']).toBe('public, s-maxage=60')
  })

  it('SSV-31: slug antigo em product_redirects ⇒ 301 para /produtos/<atual>, com a query junto', async () => {
    const lido = vi.fn(async () => 'pulseira-nova')
    const res = await servePage(
      deps({ readProductRedirect: lido }, null),
      new URL('https://x/produtos/pulseira-antiga?variant=1259936246'),
    )
    expect(res.status).toBe(301)
    expect(res.headers.Location).toBe('/produtos/pulseira-nova?variant=1259936246')
    expect(res.headers['Cache-Control']).toBe('public, s-maxage=300')
    expect(res.body).toBe('')
    expect(lido).toHaveBeenCalledWith('pulseira-antiga')
  })

  it('SSV-31: sem query, o destino é só o caminho', async () => {
    const res = await servePage(deps({ readProductRedirect: async () => 'pulseira-nova' }, null), url('?slug=a'))
    expect(res.headers.Location).toBe('/produtos/pulseira-nova')
  })

  it('produto ATIVO vence product_redirects — o redirect nem é lido', async () => {
    const lido = vi.fn(async () => 'outro')
    const res = await servePage(deps({ readProductRedirect: lido }), url('?slug=x'))
    expect(res.status).toBe(200)
    expect(lido).not.toHaveBeenCalled()
  })

  it('SSV-13: product_redirects que falha ⇒ 200 com o shell e no-store, nunca 404', async () => {
    const log = vi.fn()
    const res = await servePage(
      deps(
        {
          log,
          readProductRedirect: async () => {
            throw new Error('fora')
          },
        },
        null,
      ),
      url('?slug=x'),
    )
    expect(res.status).toBe(200)
    expect(res.body).toBe(SHELL)
    expect(res.headers['Cache-Control']).toBe('no-store')
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ fn: 'page', path: '/produtos/x' }))
  })

  it('SSV-06: o erro de leitura é registrado com o caminho', async () => {
    const log = vi.fn()
    await servePage(
      deps({
        log,
        readProduct: async () => {
          throw new Error('timeout')
        },
      }),
      url('?slug=x'),
    )
    expect(log).toHaveBeenCalledWith(
      expect.objectContaining({ fn: 'page', erro: 'leitura', path: '/produtos/x', detalhe: 'Error: timeout' }),
    )
  })

  it('configuração que falha não derruba a página — a descrição cai na do shell', async () => {
    const shell = SHELL.replace('</title>', '</title><meta name="description" content="Do shell.">')
    const d = dados({ product: { ...dados().product, description: '' } })
    const res = await servePage(
      deps(
        {
          shell,
          readSettings: async () => {
            throw new Error('fora')
          },
        },
        d,
      ),
      url('?slug=x'),
    )
    expect(res.status).toBe(200)
    expect(metaDe(res.body, 'description')).toEqual(['Do shell.'])
  })

  it('a descrição da configuração vence a do shell quando o produto não tem nenhuma (A16)', async () => {
    const d = dados({ product: { ...dados().product, description: '' } })
    const res = await servePage(
      deps({ readSettings: async () => ({ defaultProductCategory: null, storeDescription: 'Da configuração.' }) }, d),
      url('?slug=x'),
    )
    expect(metaDe(res.body, 'description')).toEqual(['Da configuração.'])
  })

  it('a categoria padrão da configuração chega ao JSON-LD da oferta', async () => {
    const res = await servePage(
      deps({ readSettings: async () => ({ defaultProductCategory: '200', storeDescription: null }) }),
      url('?slug=x&variant=1259936246'),
    )
    const d = dados()
    const esperado = productJsonLd(resolveOffer(d.product, d.variants[0], { origin: ORIGEM, defaultProductCategory: '200' }))
    expect(ld(res.body)!.offers).toEqual(esperado.offers)
  })
})

describe('servePage, produto — og:image vem de productPageImages (SSV-26)', () => {
  const STORAGE = 'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/object/public/product-images/a/b.webp'

  it('sem ?variant=, o og:image é byte a byte o [0] que o sitemap declara', async () => {
    const d = dados({ product: { ...dados().product, images: [{ url: STORAGE }, { url: 'https://cdn/p2.jpg' }] } })
    const res = await servePage(deps({}, d), url('?slug=x'))
    const [og] = metaDe(res.body, 'og:image')
    expect(og.replace(/&amp;/g, '&')).toBe(productPageImages(d.product, d.variants)[0])
    expect(og.replace(/&amp;/g, '&')).toBe(renditionUrl(STORAGE, 1200))
  })

  it('com ?variant= de uma variação com foto própria, o og:image é a foto DELA (como a product-page fazia)', async () => {
    const d = dados()
    d.variants[1].image_url = 'https://cdn/variacao.jpg'
    const res = await servePage(deps({}, d), url('?slug=x&variant=1259936247'))
    expect(metaDe(res.body, 'og:image')).toEqual(['https://cdn/variacao.jpg'])
  })

  it('produto sem foto: o card padrão do shell continua', async () => {
    const shell = SHELL.replace('</title>', '</title><meta property="og:image" content="https://loja/arte.jpg">')
    const d = dados({ product: { ...dados().product, images: [] } })
    const res = await servePage(deps({ shell }, d), url('?slug=x'))
    expect(metaDe(res.body, 'og:image')).toEqual(['https://loja/arte.jpg'])
  })
})

describe('servePage — categoria (SSV-08, SSV-13..21, SSV-32..34)', () => {
  const ARVORE = [
    { id: 'c-raiz', slug: 'joias-afetivas', parent_id: null, name: 'Joias afetivas', description: null },
    {
      id: 'c-pet',
      slug: 'joia-afetiva-linha-pet',
      parent_id: 'c-raiz',
      name: 'Joia afetiva linha pet',
      description: null,
      banner_url: null,
      image_url: null,
    },
    { id: 'c-pers', slug: 'personalizados', parent_id: null, name: 'Personalizados', description: null },
  ]
  const comArvore = (over: Partial<PageDeps> = {}) => deps({ readCategories: async () => ARVORE, ...over })
  const servir = (path: string, over: Partial<PageDeps> = {}) =>
    servePage(comArvore(over), new URL(`https://x${path}`))

  it('SSV-18: categoria ativa ⇒ 200, text/html, <title> e descrição de categoryPageMeta', async () => {
    const res = await servir('/joias-afetivas/joia-afetiva-linha-pet')
    expect(res.status).toBe(200)
    expect(res.headers['Content-Type']).toBe('text/html; charset=utf-8')
    expect(tituloDe(res.body)).toEqual(['Joia afetiva linha pet | Uma Estrelinha'])
    expect(metaDe(res.body, 'description')).toEqual([
      'Joia afetiva linha pet: joias afetivas feitas à mão em resina por Adri Muniz, em Porto Alegre.',
    ])
  })

  it('SSV-19: canônica absoluta de DOIS segmentos, og:url = canônica, og:type website', async () => {
    const res = await servir('/joias-afetivas/joia-afetiva-linha-pet')
    expect(canonicasDe(res.body)).toEqual([`${ORIGEM}/joias-afetivas/joia-afetiva-linha-pet`])
    expect(metaDe(res.body, 'og:url')).toEqual(canonicasDe(res.body))
    expect(metaDe(res.body, 'og:type')).toEqual(['website'])
    expect(metaDe(res.body, 'og:title')).toEqual(['Joia afetiva linha pet | Uma Estrelinha'])
    expect(metaDe(res.body, 'og:description')).toHaveLength(1)
  })

  it('subcategoria aberta por UM segmento ⇒ 200 com a canônica de dois (AD-018)', async () => {
    const res = await servir('/joia-afetiva-linha-pet')
    expect(res.status).toBe(200)
    expect(canonicasDe(res.body)).toEqual([`${ORIGEM}/joias-afetivas/joia-afetiva-linha-pet`])
  })

  it('SSV-19: og:image da categoria = banner_url (rendição de 1200), senão image_url', async () => {
    const STORAGE = 'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/object/public/category-images/b.webp'
    const arvore = [{ ...ARVORE[0], banner_url: STORAGE, image_url: 'https://cdn/img.jpg' }]
    const res = await servir('/joias-afetivas', { readCategories: async () => arvore })
    expect(metaDe(res.body, 'og:image').map(u => u.replace(/&amp;/g, '&'))).toEqual([renditionUrl(STORAGE, 1200)])

    const soImagem = [{ ...ARVORE[0], banner_url: null, image_url: 'https://cdn/img.jpg' }]
    const res2 = await servir('/joias-afetivas', { readCategories: async () => soImagem })
    expect(metaDe(res2.body, 'og:image')).toEqual(['https://cdn/img.jpg'])
  })

  it('SSV-19: sem arte, nenhum og:image da categoria — o card do shell continua', async () => {
    const shell = SHELL.replace('</title>', '</title><meta property="og:image" content="https://loja/arte.jpg">')
    const res = await servir('/joias-afetivas', { shell })
    expect(metaDe(res.body, 'og:image')).toEqual(['https://loja/arte.jpg'])
  })

  it('SSV-20: nenhuma tag duplicada no HTML da categoria', async () => {
    const shell = SHELL.replace(
      '</title>',
      '</title><meta name="description" content="x"><meta property="og:title" content="x"><link rel="canonical" href="https://outra/">',
    )
    const res = await servir('/joias-afetivas', { shell })
    expect(res.body.match(/<title>/g)).toHaveLength(1)
    expect(res.body.match(/rel="canonical"/g)).toHaveLength(1)
    expect(metaDe(res.body, 'description')).toHaveLength(1)
    expect(metaDe(res.body, 'og:title')).toHaveLength(1)
  })

  it('SSV-21: a categoria declara `public, s-maxage=300`', async () => {
    expect((await servir('/joias-afetivas')).headers['Cache-Control']).toBe('public, s-maxage=300')
  })

  it('categoria ativa não consulta category_redirects nem a RPC', async () => {
    const r = vi.fn(async () => null)
    const f = vi.fn(async () => null)
    await servir('/joias-afetivas', { readCategoryRedirect: r, readInactiveFallback: f })
    expect(r).not.toHaveBeenCalled()
    expect(f).not.toHaveBeenCalled()
  })

  it('SSV-33: pai errado na URL ⇒ 301 à canônica', async () => {
    const res = await servir('/personalizados/joia-afetiva-linha-pet')
    expect(res.status).toBe(301)
    expect(res.headers.Location).toBe('/joias-afetivas/joia-afetiva-linha-pet')
    expect(res.headers['Cache-Control']).toBe('public, s-maxage=300')
  })

  it('SSV-32: category_redirects para uma ativa ⇒ 301 à canônica dela', async () => {
    const r = vi.fn(async () => 'c-pet')
    const res = await servir('/linha-pet-antiga', { readCategoryRedirect: r })
    expect(res.status).toBe(301)
    expect(res.headers.Location).toBe('/joias-afetivas/joia-afetiva-linha-pet')
    expect(r).toHaveBeenCalledWith('linha-pet-antiga')
  })

  it('SSV-14: subcategoria inativa com pai ativo ⇒ 301 para o pai', async () => {
    const f = vi.fn(async () => 'c-pers')
    const res = await servir('/personalizados/profissoes', { readInactiveFallback: f })
    expect(res.status).toBe(301)
    expect(res.headers.Location).toBe('/personalizados')
    expect(f).toHaveBeenCalledWith('profissoes')
  })

  it('SSV-15: inativa sem ancestral ativo ⇒ 301 para /', async () => {
    const res = await servir('/raiz-inativa', {
      readInactiveFallback: async () => '00000000-0000-0000-0000-000000000000',
    })
    expect(res.status).toBe(301)
    expect(res.headers.Location).toBe('/')
  })

  it('SSV-16: ancestral ativo dois níveis acima ⇒ UM salto, direto para ele', async () => {
    const res = await servir('/pai-inativo/neto-inativo', { readInactiveFallback: async () => 'c-pet' })
    expect(res.status).toBe(301)
    expect(res.headers.Location).toBe('/joias-afetivas/joia-afetiva-linha-pet')
  })

  it('SSV-34: category_redirects vence a inativa', async () => {
    const res = await servir('/profissoes', {
      readCategoryRedirect: async () => 'c-pet',
      readInactiveFallback: async () => 'c-pers',
    })
    expect(res.headers.Location).toBe('/joias-afetivas/joia-afetiva-linha-pet')
  })

  it('SSV-08: nada disso ⇒ 404 com noindex e 60 s', async () => {
    const res = await servir('/qualquer-coisa-xyz')
    expect(res.status).toBe(404)
    expect(robots(res.body)).toEqual(['noindex'])
    expect(res.headers['Cache-Control']).toBe('public, s-maxage=60')
  })

  it('SSV-13: a árvore que falha ⇒ 200 com o shell e no-store, nunca 404', async () => {
    const res = await servir('/joias-afetivas', {
      readCategories: async () => {
        throw new Error('fora')
      },
    })
    expect(res.status).toBe(200)
    expect(res.body).toBe(SHELL)
    expect(res.headers['Cache-Control']).toBe('no-store')
  })

  it('SSV-13: category_redirects que falha ⇒ 200 shell no-store — nem 301 ao ancestral, nem 404', async () => {
    const res = await servir('/profissoes', {
      readCategoryRedirect: async () => {
        throw new Error('fora')
      },
      readInactiveFallback: async () => 'c-pers',
    })
    expect(res.status).toBe(200)
    expect(res.headers['Cache-Control']).toBe('no-store')
  })

  it('SSV-13: a RPC que falha, sem redirect ⇒ 200 shell no-store, nunca 404', async () => {
    const log = vi.fn()
    const res = await servir('/qualquer-coisa-xyz', {
      log,
      readInactiveFallback: async () => {
        throw new Error('rpc fora')
      },
    })
    expect(res.status).toBe(200)
    expect(res.body).toBe(SHELL)
    expect(res.headers['Cache-Control']).toBe('no-store')
    expect(log).toHaveBeenCalledWith(expect.objectContaining({ erro: 'category_fallback', path: '/qualquer-coisa-xyz' }))
  })

  it('a RPC que falha NÃO impede o redirect de category_redirects (que vence de qualquer jeito)', async () => {
    const res = await servir('/linha-pet-antiga', {
      readCategoryRedirect: async () => 'c-pet',
      readInactiveFallback: async () => {
        throw new Error('rpc fora')
      },
    })
    expect(res.status).toBe(301)
    expect(res.headers.Location).toBe('/joias-afetivas/joia-afetiva-linha-pet')
  })

  it('origem não absoluta: categoria sem canônica', async () => {
    const res = await servir('/joias-afetivas', { origin: '' })
    expect(canonicasDe(res.body)).toEqual([])
  })
})

describe('servePage — página fixa, rota de app, 3+ segmentos', () => {
  it('SSV-22: página fixa ⇒ 200, <title> e descrição de staticPageMeta, canônica absoluta, 3600 s', async () => {
    const res = await servePage(deps(), new URL('https://x/politica-de-privacidade'))
    expect(res.status).toBe(200)
    expect(tituloDe(res.body)).toEqual(['Política de Privacidade | Uma Estrelinha'])
    expect(metaDe(res.body, 'description')[0]).toContain('Quais dados a Uma Estrelinha guarda')
    expect(canonicasDe(res.body)).toEqual([`${ORIGEM}/politica-de-privacidade`])
    expect(metaDe(res.body, 'og:type')).toEqual(['website'])
    expect(res.headers['Cache-Control']).toBe('public, s-maxage=3600')
  })

  it('SSV-22: a página fixa não toca no banco', async () => {
    const leituras = {
      readProduct: vi.fn(),
      readCategories: vi.fn(),
      readSettings: vi.fn(),
    }
    await servePage(deps(leituras as any), new URL('https://x/sobre'))
    for (const f of Object.values(leituras)) expect(f).not.toHaveBeenCalled()
  })

  it('SSV-10: rota de app ⇒ 200 com o shell intacto e 3600 s', async () => {
    for (const p of ['/carrinho', '/conta/dados', '/pedido/abc/pagamento', '/perguntas-frequentes/x-1a2b3c4d']) {
      const res = await servePage(deps(), new URL(`https://x${p}`))
      expect(res.status).toBe(200)
      expect(res.body).toBe(SHELL)
      expect(res.headers['Cache-Control']).toBe('public, s-maxage=3600')
    }
  })

  it('SSV-09: três segmentos não declarados ⇒ 404', async () => {
    const res = await servePage(deps(), new URL('https://x/a/b/c'))
    expect(res.status).toBe(404)
    expect(robots(res.body)).toEqual(['noindex'])
  })

  it('caminho com extensão ⇒ 404 sem ler nada', async () => {
    const readCategories = vi.fn(async () => [])
    const res = await servePage(deps({ readCategories }), new URL('https://x/x.png'))
    expect(res.status).toBe(404)
    expect(readCategories).not.toHaveBeenCalled()
  })

  it('exceção inesperada (uma dep que lança SÍNCRONO, fora da promessa) ⇒ 200 shell no-store, com log', async () => {
    const log = vi.fn()
    const res = await servePage(
      deps({
        log,
        readCategories: (() => {
          throw new Error('síncrono')
        }) as any,
      }),
      new URL('https://x/joias-afetivas'),
    )
    expect(res.status).toBe(200)
    expect(res.headers['Cache-Control']).toBe('no-store')
    expect(log).toHaveBeenCalled()
  })
})
