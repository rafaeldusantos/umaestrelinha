// Feature 69 · SSV-24, SSV-26 — `productPageImages`, o dono de "as fotos que a página declara".
//
// A asserção que importa é a CRUZADA: o `[0]` tem de ser byte a byte o `og:image` que a
// `product-page` monta hoje (`renditionUrl(oferta.imageLink, OG_IMAGE_WIDTH)` sobre a oferta da
// representante). Ela é reescrita aqui com as MESMAS funções de `core/shopping` que a function chama,
// e não com a função sob teste — senão o teste provaria que a função é igual a si mesma.

import { describe, expect, it } from 'vitest'
import { renditionUrl } from '../../media/rendition.ts'
import { representativeVariant, resolveOffer } from '../../shopping/offer.ts'
import type { OfferInputProduct, OfferInputVariant } from '../../shopping/types.ts'
import { OG_IMAGE_WIDTH, productPageImages } from '../images.ts'

const STORAGE = 'https://hgk.supabase.co/storage/v1/object/public/products'
const RENDER = 'https://hgk.supabase.co/storage/v1/render/image/public/products'
const CAUDA = 'width=1200&resize=contain&quality=80'

const foto = (nome: string) => `${STORAGE}/${nome}.webp`
const rendida = (nome: string) => `${RENDER}/${nome}.webp?${CAUDA}`

const produto = (extra: Partial<OfferInputProduct> = {}): OfferInputProduct => ({
  id: 'p-1',
  nuvemshop_id: 281745761,
  name: 'Pingente Estrela',
  slug: 'pingente-estrela',
  description: '<p>Feito à mão.</p>',
  images: [{ url: foto('a') }, { url: foto('b') }, { url: foto('c') }],
  is_active: true,
  stock_policy: 'track',
  ...extra,
})

const variacao = (extra: Partial<OfferInputVariant> = {}): OfferInputVariant => ({
  id: 'v-1',
  nuvemshop_id: 1259936246,
  price: 189.9,
  compare_price: null,
  stock: 3,
  image_url: null,
  is_active: true,
  position: 0,
  ...extra,
})

/** A montagem de hoje da `product-page` (`handlers.ts`), com as funções que ela chama. */
const ogImageDaProductPage = (p: OfferInputProduct, vs: OfferInputVariant[]): string | null => {
  const variante = representativeVariant(p, vs)
  if (!variante) return null
  const oferta = resolveOffer(p, variante, { origin: 'https://umaestrelinha.com.br' })
  return oferta.imageLink ? renditionUrl(oferta.imageLink, OG_IMAGE_WIDTH) : null
}

describe('OG_IMAGE_WIDTH', () => {
  it('é 1200, o card social', () => {
    expect(OG_IMAGE_WIDTH).toBe(1200)
  })
})

describe('productPageImages', () => {
  it('SSV-24 — todas as fotos do produto, na ordem do array, em 1200px', () => {
    expect(productPageImages(produto(), [variacao()])).toEqual([
      rendida('a'),
      rendida('b'),
      rendida('c'),
    ])
  })

  it('SSV-24 — sem o teto de 10 do Merchant Center: 14 fotos saem 14', () => {
    const muitas = Array.from({ length: 14 }, (_, i) => ({ url: foto(`f${i}`) }))
    const fotos = productPageImages(produto({ images: muitas }), [variacao()])
    expect(fotos).toHaveLength(14)
    expect(fotos[13]).toBe(rendida('f13'))
  })

  it('SSV-26 — a foto da representante vem primeiro, e a do produto segue na ordem', () => {
    const vs = [variacao({ image_url: foto('var') })]
    expect(productPageImages(produto(), vs)).toEqual([
      rendida('var'),
      rendida('a'),
      rendida('b'),
      rendida('c'),
    ])
  })

  it('SSV-26 — a foto da representante que já está no produto não se repete', () => {
    const vs = [variacao({ image_url: foto('b') })]
    expect(productPageImages(produto(), vs)).toEqual([rendida('b'), rendida('a'), rendida('c')])
  })

  it('a representante é a de `representativeVariant` — a primeira disponível por posição', () => {
    const vs = [
      variacao({ id: 'v-esgotada', position: 0, stock: 0, image_url: foto('esgotada') }),
      variacao({ id: 'v-ok', position: 1, stock: 2, image_url: foto('ok') }),
    ]
    expect(productPageImages(produto(), vs)[0]).toBe(rendida('ok'))
  })

  it('sem duplicatas — a mesma URL duas vezes no array sai uma vez', () => {
    const p = produto({ images: [{ url: foto('a') }, { url: foto('a') }, { url: foto('b') }] })
    expect(productPageImages(p, [variacao()])).toEqual([rendida('a'), rendida('b')])
  })

  it('vazia quando o produto não tem foto nenhuma', () => {
    expect(productPageImages(produto({ images: [] }), [variacao()])).toEqual([])
    expect(productPageImages(produto({ images: null }), [variacao()])).toEqual([])
  })

  it('entrada vazia do array é pulada, nunca vira URL vazia', () => {
    const p = produto({ images: [{ url: '' }, { url: foto('a') }] })
    expect(productPageImages(p, [variacao()])).toEqual([rendida('a')])
  })

  it('foto fora do Storage sai inalterada (o recuo de `renditionUrl`)', () => {
    const p = produto({ images: [{ url: 'https://cdn.exemplo.invalid/x.jpg?a=1&b=2' }] })
    expect(productPageImages(p, [variacao()])).toEqual(['https://cdn.exemplo.invalid/x.jpg?a=1&b=2'])
  })

  it('sem variação elegível, a principal é a primeira do produto', () => {
    const vs = [variacao({ is_active: false, image_url: foto('inativa') })]
    expect(productPageImages(produto(), vs)).toEqual([rendida('a'), rendida('b'), rendida('c')])
  })

  describe('SSV-26 — o [0] é byte a byte o og:image que a product-page monta', () => {
    const casos: Array<[string, OfferInputProduct, OfferInputVariant[]]> = [
      ['variação sem foto', produto(), [variacao()]],
      ['variação com foto própria', produto(), [variacao({ image_url: foto('var') })]],
      [
        'a primeira esgotada, a segunda disponível',
        produto(),
        [
          variacao({ id: 'v-0', position: 0, stock: 0, image_url: foto('x') }),
          variacao({ id: 'v-1', position: 1, stock: 4, image_url: foto('y') }),
        ],
      ],
      [
        'backorder: a primeira por posição',
        produto({ stock_policy: 'backorder' }),
        [
          variacao({ id: 'v-1', position: 1, image_url: foto('segunda') }),
          variacao({ id: 'v-0', position: 0, stock: 0, image_url: foto('primeira') }),
        ],
      ],
      [
        'foto com query no Storage',
        produto({ images: [{ url: `${STORAGE}/q.webp?v=3` }] }),
        [variacao()],
      ],
    ]

    it.each(casos)('%s', (_nome, p, vs) => {
      const og = ogImageDaProductPage(p, vs)
      expect(og).not.toBeNull()
      expect(productPageImages(p, vs)[0]).toBe(og)
    })

    it('sensor — a âncora cruzada não é vazia: o og:image é a URL de rendição esperada', () => {
      expect(ogImageDaProductPage(produto(), [variacao({ image_url: foto('var') })])).toBe(
        rendida('var'),
      )
    })
  })
})
