import { describe, expect, it } from 'vitest'
import { payablePrice, productJsonLd, schemaAvailability } from '../jsonld'
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
