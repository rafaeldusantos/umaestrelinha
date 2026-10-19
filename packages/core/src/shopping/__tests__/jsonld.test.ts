import { describe, expect, it } from 'vitest'
import { foldTokens } from '../../filters/suggest'
import { indexableOptions, optionPlainTitle } from '../../seo/variant'
import { publicProductId } from '../identity'
import {
  VARIES_BY,
  payablePrice,
  productGroupJsonLd,
  productJsonLd,
  schemaAvailability,
  variesByFor,
  withPageUrl,
} from '../jsonld'
import { resolveOffer } from '../offer'
import type { ShoppingOffer } from '../types'

/** `GSH-12` — o `Product`/`Offer` que a landing page declara para o rastreador. */

const oferta = (over: Partial<ShoppingOffer> = {}): ShoppingOffer => ({
  id: '1259936246',
  itemGroupId: '281745761',
  title: 'Pulseira 7 Nós Ajustável Proteção Kabbalah',
  description: 'Pulseira dos 7 nós',
  link: 'https://umaestrelinha.com.br/produtos/pulseira-7-nos-ajustavel-protecao-kabbalah?variant=1259936246',
  imageLink: 'https://cdn/p1.jpg',
  additionalImageLinks: [],
  availability: 'in_stock',
  price: 19.9,
  salePrice: null,
  brand: null,
  mpn: null,
  ageGroup: null,
  gender: null,
  googleProductCategory: null,
  identifierExists: false,
  condition: 'new',
  ...over,
})

describe('productJsonLd — a forma', () => {
  it('declara contexto e tipo', () => {
    const ld = productJsonLd(oferta())
    expect(ld['@context']).toBe('https://schema.org')
    expect(ld['@type']).toBe('Product')
  })

  it('leva nome, imagem e sku', () => {
    const ld = productJsonLd(oferta())
    expect(ld.name).toBe('Pulseira 7 Nós Ajustável Proteção Kabbalah')
    expect(ld.image).toEqual(['https://cdn/p1.jpg'])
    expect(ld.sku).toBe('1259936246')
  })

  it('o sku é o mesmo offer_id que o feed publica', () => {
    const o = oferta()
    expect(productJsonLd(o).sku).toBe(o.id)
  })

  it('junta as imagens adicionais na lista', () => {
    const ld = productJsonLd(oferta({ additionalImageLinks: ['https://cdn/p2.jpg'] }))
    expect(ld.image).toEqual(['https://cdn/p1.jpg', 'https://cdn/p2.jpg'])
  })
})

describe('productJsonLd — a oferta', () => {
  it('declara url, moeda e preço', () => {
    const ld = productJsonLd(oferta()) as { offers: Record<string, unknown> }
    expect(ld.offers['@type']).toBe('Offer')
    expect(ld.offers.url).toBe(oferta().link)
    expect(ld.offers.priceCurrency).toBe('BRL')
    expect(ld.offers.price).toBe('19.90')
  })

  it('o preço é o que a cliente paga: o "por", não o "de"', () => {
    const ld = productJsonLd(oferta({ price: 120, salePrice: 84 })) as {
      offers: Record<string, unknown>
    }
    expect(ld.offers.price).toBe('84.00')
  })

  it('o preço é STRING com duas casas — número em JSON traz erro de ponto flutuante', () => {
    const ld = productJsonLd(oferta({ price: 0.3 })) as { offers: Record<string, unknown> }
    expect(ld.offers.price).toBe('0.30')
    expect(typeof ld.offers.price).toBe('string')
  })

  it('a url da oferta é a mesma do g:link, com o ?variant=', () => {
    const ld = productJsonLd(oferta()) as { offers: Record<string, unknown> }
    expect(ld.offers.url).toContain('?variant=1259936246')
  })
})

describe('schemaAvailability — os três valores', () => {
  it('in_stock', () => {
    expect(schemaAvailability('in_stock')).toBe('https://schema.org/InStock')
  })

  it('out_of_stock', () => {
    expect(schemaAvailability('out_of_stock')).toBe('https://schema.org/OutOfStock')
  })

  it('backorder', () => {
    expect(schemaAvailability('backorder')).toBe('https://schema.org/BackOrder')
  })

  it('chega no bloco montado', () => {
    const ld = productJsonLd(oferta({ availability: 'out_of_stock' })) as {
      offers: Record<string, unknown>
    }
    expect(ld.offers.availability).toBe('https://schema.org/OutOfStock')
  })
})

describe('payablePrice', () => {
  it('sem promoção é o preço cheio', () => {
    expect(payablePrice(oferta())).toBe(19.9)
  })

  it('com promoção é o "por"', () => {
    expect(payablePrice(oferta({ price: 120, salePrice: 84 }))).toBe(84)
  })
})

describe('productJsonLd — serializável', () => {
  it('JSON.stringify não lança e não produz undefined', () => {
    const texto = JSON.stringify(productJsonLd(oferta()))
    expect(texto).not.toContain('undefined')
    expect(JSON.parse(texto)['@type']).toBe('Product')
  })
})

describe('withPageUrl — SVR-22, SVR-33', () => {
  it('só ACRESCENTA url: o resto é productJsonLd intocado', () => {
    const ld = productJsonLd(oferta())
    const antes = JSON.stringify(ld)
    const comUrl = withPageUrl(ld, { url: 'https://loja/produtos/x' })
    expect(comUrl).toEqual({ ...ld, url: 'https://loja/produtos/x' })
    expect(comUrl).not.toHaveProperty('inProductGroupWithID')
    expect(JSON.stringify(ld)).toBe(antes)
  })

  it('url nula (origem não absoluta) não acrescenta url nenhuma — nunca relativa', () => {
    const ld = productJsonLd(oferta())
    expect(withPageUrl(ld, { url: null })).toEqual(ld)
    expect(withPageUrl(ld, { url: null, groupId: '9' })).toEqual({ ...ld, inProductGroupWithID: '9' })
  })

  it('com groupId acrescenta inProductGroupWithID, e offers.url continua o <g:link>', () => {
    const o = oferta()
    const ld = withPageUrl(productJsonLd(o), { url: 'https://loja/produtos/x', groupId: '281745761' })
    expect(ld.inProductGroupWithID).toBe('281745761')
    expect((ld.offers as Record<string, unknown>).url).toBe(o.link)
    expect(ld['@type']).toBe('Product')
  })
})

describe('variesByFor — SVR-32', () => {
  it('a tabela é Cor → color e Tamanho → size', () => {
    expect(VARIES_BY).toEqual({ cor: 'https://schema.org/color', tamanho: 'https://schema.org/size' })
  })

  it.each(['Cor', 'cor', 'COR', 'Còr'])('%s casa color (dobra de acento e caixa)', eixo => {
    expect(variesByFor(eixo)).toBe('https://schema.org/color')
  })

  it.each(['Tamanho', 'TAMANHO', 'Tamânho'])('%s casa size', eixo => {
    expect(variesByFor(eixo)).toBe('https://schema.org/size')
  })

  it.each(['Tipos de elo', 'Cores', ' Cor', 'Cor ', 'Letra', 'constructor', '', null])(
    '%s fica fora da tabela (igualdade exata)',
    eixo => {
      expect(variesByFor(eixo as string | null)).toBeNull()
    },
  )

  it('a dobra concorda com a de core/filters nas chaves da tabela', () => {
    for (const [chave] of Object.entries(VARIES_BY)) {
      expect(foldTokens(chave.toUpperCase()).join(' ')).toBe(chave)
      expect(variesByFor(chave.toUpperCase())).toBe(VARIES_BY[chave])
    }
  })
})

describe('productGroupJsonLd — SVR-30, SVR-31', () => {
  const ORIGEM = 'https://umaestrelinha.com.br'
  const peca = {
    id: 'p-1',
    nuvemshop_id: 281745761,
    name: 'Pingente Pata',
    slug: 'pingente-pata',
    description: '<p>Feito à mão.</p>',
    images: [{ url: 'https://cdn/pata.jpg' }],
    is_active: true,
    stock_policy: 'track' as const,
    options: [{ name: 'Cor', values: ['Prata 925', 'Ouro', 'Rose'] }],
    option_marks: [
      { option_name: 'Cor', option_value: 'Prata 925', value_id: 'a' },
      { option_name: 'Cor', option_value: 'Rose', value_id: 'b' },
    ],
  }
  const v = (n: number, cor: string, price: number, compare: number | null = null) => ({
    id: `00000000-0000-4000-8000-00000000000${n}`,
    nuvemshop_id: 500 + n,
    price,
    compare_price: compare,
    stock: n === 3 ? 0 : 2,
    image_url: `https://cdn/v${n}.jpg`,
    is_active: true,
    position: n,
    option_values: { Cor: cor },
  })
  const grade = [v(1, 'Prata 925', 100), v(2, 'Ouro', 110), v(3, 'Rose', 90, 120)]
  const opcoes = indexableOptions({ product: peca, variants: grade })
  const grupo = productGroupJsonLd({
    name: peca.name,
    groupId: publicProductId(peca),
    variesBy: variesByFor(opcoes[0].axis)!,
    url: `${ORIGEM}/produtos/pingente-pata`,
    variants: opcoes.map(o => ({
      offer: resolveOffer(peca, o.variant, { origin: ORIGEM }),
      name: optionPlainTitle(peca.name, o.text),
      value: o.text,
      url: `${ORIGEM}${o.path}`,
    })),
  })

  it('é UM ProductGroup, com name, productGroupID = publicProductId e variesBy', () => {
    expect(grupo['@context']).toBe('https://schema.org')
    expect(grupo['@type']).toBe('ProductGroup')
    expect(grupo.name).toBe('Pingente Pata')
    expect(grupo.productGroupID).toBe('281745761')
    expect(grupo.variesBy).toBe('https://schema.org/color')
    expect(grupo.url).toBe(`${ORIGEM}/produtos/pingente-pata`)
  })

  it('hasVariant: um Product por opção indexável, com name sem marca, sku, image, color, url', () => {
    const variantes = grupo.hasVariant as Record<string, unknown>[]
    expect(variantes).toHaveLength(2)
    expect(variantes.map(x => x.color)).toEqual(['Prata 925', 'Rose'])
    expect(variantes.map(x => x.name)).toEqual(['Pingente Pata — Prata 925', 'Pingente Pata — Rose'])
    expect(variantes.map(x => x.sku)).toEqual(['501', '503'])
    expect(variantes.map(x => x.url)).toEqual([
      `${ORIGEM}/produtos/pingente-pata?variant=501`,
      `${ORIGEM}/produtos/pingente-pata?variant=503`,
    ])
    expect(variantes[1].image).toEqual(['https://cdn/v3.jpg', 'https://cdn/pata.jpg'])
    for (const x of variantes) {
      expect(x['@type']).toBe('Product')
      expect(x).not.toHaveProperty('@context')
    }
  })

  it('o offers de cada variante é o de productJsonLd(resolveOffer(representante)) — o preço do feed', () => {
    const variantes = grupo.hasVariant as Record<string, unknown>[]
    opcoes.forEach((o, i) => {
      const doFeed = resolveOffer(peca, o.variant, { origin: ORIGEM })
      expect(variantes[i].offers).toEqual(productJsonLd(doFeed).offers)
    })
    // a Rose tem de/por e está esgotada: o JSON-LD declara o "por" e OutOfStock, como o feed
    expect((variantes[1].offers as Record<string, unknown>).price).toBe('90.00')
    expect((variantes[1].offers as Record<string, unknown>).availability).toBe('https://schema.org/OutOfStock')
  })

  it('Tamanho declara size na propriedade', () => {
    const g = productGroupJsonLd({
      name: 'X',
      groupId: '1',
      variesBy: variesByFor('Tamanho')!,
      url: 'u',
      variants: [{ offer: oferta(), name: 'X — P', value: 'P', url: 'u?variant=1' }],
    })
    const [x] = g.hasVariant as Record<string, unknown>[]
    expect(x.size).toBe('P')
    expect(x).not.toHaveProperty('color')
  })
})
