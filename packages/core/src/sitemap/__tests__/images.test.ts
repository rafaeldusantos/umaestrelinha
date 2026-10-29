import { describe, it, expect } from 'vitest'
import { JSDOM } from 'jsdom'
import { renditionUrl } from '../../media/rendition.ts'
import { representativeVariant, resolveOffer } from '../../shopping/offer.ts'
import type { OfferInputProduct, OfferInputVariant } from '../../shopping/types.ts'
import { OG_IMAGE_WIDTH } from '../../page/images.ts'
import {
  SITEMAP_IMAGE_NS,
  SITEMAP_MAX_IMAGES_PER_URL,
  renderSitemapXml,
} from '../render.ts'
import { sitemapUrls } from '../urls.ts'
import type { SitemapCategory, SitemapProduct, SitemapVariant } from '../types.ts'

/**
 * Feature 69 · SSV-24..30 — as fotos dos produtos no sitemap.
 *
 * O documento é conferido por parser de XML de verdade (`jsdom` com `text/xml` LANÇA em documento
 * malformado), no molde de `render.test.ts`: um `&` cru numa `<image:loc>` é o defeito que quebra o
 * parser e passa por qualquer `toContain`.
 */

const ORIGIN = 'https://umaestrelinha.com.br'
const STORAGE = 'https://hgk.supabase.co/storage/v1/object/public/products'
const RENDER = 'https://hgk.supabase.co/storage/v1/render/image/public/products'
const CAUDA = 'width=1200&resize=contain&quality=80'
const foto = (nome: string) => `${STORAGE}/${nome}.webp`
const rendida = (nome: string) => `${RENDER}/${nome}.webp?${CAUDA}`

const parse = (xml: string) => new JSDOM(xml, { contentType: 'text/xml' }).window.document

/** As `<image:loc>` de cada `<url>`, pelo namespace — nunca pelo prefixo escrito. */
const fotosPorLoc = (xml: string): Record<string, string[]> => {
  const doc = parse(xml)
  const saida: Record<string, string[]> = {}
  for (const url of [...doc.getElementsByTagName('url')]) {
    const loc = url.getElementsByTagName('loc')[0].textContent
    saida[loc] = [...url.getElementsByTagNameNS(SITEMAP_IMAGE_NS, 'loc')].map(n => n.textContent)
  }
  return saida
}

const categoria: SitemapCategory = {
  id: 'c1',
  name: 'Pingentes',
  slug: 'pingentes',
  parent_id: null,
  sort_order: 0,
  active: true,
  updated_at: null,
}

const PRATA = 'Prata 925'
const OURO = 'Prata 925 Folheado a Ouro'
const cor = { name: 'Cor', values: [PRATA, OURO], position: 0 }

const pata: SitemapProduct = {
  id: 'p-pata',
  slug: 'pingente-pata',
  updated_at: '2026-10-01T10:00:00+00:00',
  is_active: true,
  stock_policy: 'track',
  options: [cor],
  images: [{ url: foto('a') }, { url: foto('b') }, { url: foto('c') }],
}
const semFoto: SitemapProduct = {
  id: 'p-nua',
  slug: 'peca-sem-foto',
  is_active: true,
  stock_policy: 'track',
  images: [],
}

const variantes: SitemapVariant[] = [
  {
    id: '00000000-0000-4000-8000-000000000001',
    product_id: 'p-pata',
    nuvemshop_id: 9001,
    price: 100,
    is_active: true,
    position: 0,
    stock: 0,
    image_url: foto('esgotada'),
    option_values: { Cor: PRATA },
  },
  {
    id: '00000000-0000-4000-8000-000000000002',
    product_id: 'p-pata',
    nuvemshop_id: 9002,
    price: 120,
    is_active: true,
    position: 1,
    stock: 2,
    image_url: foto('ouro'),
    option_values: { Cor: OURO },
  },
]
// A opção Prata é indexável — é o que põe uma `<url>` com `?variant=` no documento (SSV-28).
const optionMarks = [{ product_id: 'p-pata', option_name: 'Cor', option_value: PRATA, value_id: 'prata' }]

const entrada = {
  origin: ORIGIN,
  staticPaths: ['/', '/sobre'],
  categories: [categoria],
  products: [pata, semFoto],
  variants: variantes,
  optionMarks,
}

describe('sitemapUrls — as fotos (SSV-24, SSV-26, SSV-28)', () => {
  const urls = sitemapUrls(entrada)
  const daPeca = urls.find(u => u.loc === `${ORIGIN}/produtos/pingente-pata`)

  it('SSV-24/26: a peça leva a foto da representante e depois as do produto, na ordem do array', () => {
    // A representante é a variação Ouro (a Prata, primeira por posição, está esgotada).
    expect(daPeca.images).toEqual([rendida('ouro'), rendida('a'), rendida('b'), rendida('c')])
  })

  it('SSV-26: a primeira foto é byte a byte o og:image que a product-page monta', () => {
    // A montagem de hoje da `product-page`, com o produto inteiro e as funções que ela chama.
    const produto = {
      id: 'p-pata',
      name: 'Pingente Pata',
      slug: 'pingente-pata',
      description: '',
      images: pata.images.map(i => ({ ...i })),
      is_active: true,
      stock_policy: 'track',
    } as OfferInputProduct
    const vs = variantes.map(v => ({ ...v, compare_price: null })) as OfferInputVariant[]
    const oferta = resolveOffer(produto, representativeVariant(produto, vs), { origin: ORIGIN })
    expect(daPeca.images[0]).toBe(renditionUrl(oferta.imageLink, OG_IMAGE_WIDTH))
  })

  it('SSV-28: a `<url>` de opção (`?variant=`) não leva foto', () => {
    const opcoes = urls.filter(u => u.loc.includes('?variant='))
    expect(opcoes.map(u => u.loc)).toEqual([`${ORIGIN}/produtos/pingente-pata?variant=9001`])
    for (const u of opcoes) expect(u.images).toBeUndefined()
  })

  it('SSV-28: categoria e página fixa não levam foto', () => {
    const outras = urls.filter(u => !u.loc.includes('/produtos/'))
    expect(outras.map(u => u.loc)).toEqual([ORIGIN, `${ORIGIN}/sobre`, `${ORIGIN}/pingentes`])
    for (const u of outras) expect(u.images).toBeUndefined()
  })

  it('SSV-27: peça sem foto sai sem `images`', () => {
    expect(urls.find(u => u.loc === `${ORIGIN}/produtos/peca-sem-foto`).images).toBeUndefined()
  })

  it('sem `images` lido, o documento é o de antes da 69', () => {
    const semColuna = { ...pata, images: undefined }
    expect(sitemapUrls({ ...entrada, products: [semColuna] }).every(u => u.images === undefined)).toBe(
      true,
    )
  })

  it('peça sem variação lida: a principal é a primeira do produto', () => {
    const urlsSemVariacao = sitemapUrls({ ...entrada, variants: [], optionMarks: [] })
    expect(urlsSemVariacao.find(u => u.loc === `${ORIGIN}/produtos/pingente-pata`).images).toEqual([
      rendida('a'),
      rendida('b'),
      rendida('c'),
    ])
  })

  it('SSV-30: com 1.001 fotos, declara só as 1.000 primeiras', () => {
    expect(SITEMAP_MAX_IMAGES_PER_URL).toBe(1000)
    const muitas = Array.from({ length: 1001 }, (_, i) => ({ url: foto(`f${i}`) }))
    const [peca] = sitemapUrls({
      origin: ORIGIN,
      staticPaths: [],
      categories: [],
      products: [{ ...semFoto, images: muitas }],
    })
    expect(peca.images).toHaveLength(1000)
    expect(peca.images[0]).toBe(rendida('f0'))
    expect(peca.images[999]).toBe(rendida('f999'))
    expect(peca.images).not.toContain(rendida('f1000'))
  })
})

describe('renderSitemapXml — as fotos (SSV-24, SSV-25, SSV-27, SSV-29)', () => {
  const xml = renderSitemapXml(sitemapUrls(entrada))

  it('SSV-25: declara o namespace de imagens do Google', () => {
    expect(SITEMAP_IMAGE_NS).toBe('http://www.google.com/schemas/sitemap-image/1.1')
    expect(parse(xml).documentElement.getAttribute('xmlns:image')).toBe(
      'http://www.google.com/schemas/sitemap-image/1.1',
    )
  })

  it('SSV-24/28: uma `<image:image>` por foto, só na `<url>` da peça', () => {
    expect(fotosPorLoc(xml)).toEqual({
      [ORIGIN]: [],
      [`${ORIGIN}/sobre`]: [],
      [`${ORIGIN}/pingentes`]: [],
      [`${ORIGIN}/produtos/peca-sem-foto`]: [],
      [`${ORIGIN}/produtos/pingente-pata`]: [rendida('ouro'), rendida('a'), rendida('b'), rendida('c')],
      [`${ORIGIN}/produtos/pingente-pata?variant=9001`]: [],
    })
  })

  it('SSV-24: cada `<image:loc>` está dentro de um `<image:image>`', () => {
    const doc = parse(xml)
    const blocos = [...doc.getElementsByTagNameNS(SITEMAP_IMAGE_NS, 'image')]
    expect(blocos).toHaveLength(4)
    for (const b of blocos) expect(b.getElementsByTagNameNS(SITEMAP_IMAGE_NS, 'loc')).toHaveLength(1)
  })

  it('SSV-27: nenhum `<image:loc>` vazio e nenhum bloco sem foto', () => {
    const doc = parse(xml)
    for (const n of [...doc.getElementsByTagNameNS(SITEMAP_IMAGE_NS, 'loc')]) {
      expect(n.textContent).not.toBe('')
    }
    const docVazio = renderSitemapXml([{ loc: `${ORIGIN}/produtos/x`, images: [] }])
    expect(docVazio).not.toContain('image:image')
    expect(renderSitemapXml([{ loc: `${ORIGIN}/produtos/x`, images: [''] }])).not.toContain(
      'image:image',
    )
  })

  it('SSV-29: `&`, `<` e aspas saem escapados, e o parser devolve a URL original', () => {
    const crua = 'https://cdn.exemplo.invalid/f.jpg?a=1&b=<2>&c="3"&d=\'4\''
    const doc = renderSitemapXml([{ loc: `${ORIGIN}/produtos/x`, images: [crua] }])
    expect(doc).toContain(
      '<image:loc>https://cdn.exemplo.invalid/f.jpg?a=1&amp;b=&lt;2&gt;&amp;c=&quot;3&quot;&amp;d=&apos;4&apos;</image:loc>',
    )
    expect(fotosPorLoc(doc)[`${ORIGIN}/produtos/x`]).toEqual([crua])
  })

  it('SSV-29: a URL de rendição (com `&` nos parâmetros) parseia e volta byte a byte', () => {
    expect(xml).toContain(`<image:loc>${rendida('a').replace(/&/g, '&amp;')}</image:loc>`)
    expect(fotosPorLoc(xml)[`${ORIGIN}/produtos/pingente-pata`][1]).toBe(rendida('a'))
  })

  it('a foto não é percent-encodada de novo — um `%20` continua `%20`', () => {
    const doc = renderSitemapXml([{ loc: `${ORIGIN}/produtos/x`, images: [`${STORAGE}/a%20b.webp`] }])
    expect(fotosPorLoc(doc)[`${ORIGIN}/produtos/x`]).toEqual([`${STORAGE}/a%20b.webp`])
  })
})
