// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { escapeXml, formatFeedPrice, renderFeedXml } from '../xml'
import type { ShoppingOffer } from '../types'

/**
 * `GSH-09` (AC 12) — o documento do feed.
 *
 * **O documento é conferido por um parser de verdade**, não por `includes` de string: um XML
 * malformado com a substring certa passaria num teste de string e seria recusado inteiro pelo
 * Merchant Center — 3.233 ofertas fora do ar por um `&` não escapado.
 *
 * O ambiente deste arquivo é `jsdom` (o resto de `core` roda em `node`) porque é de onde vem o
 * `DOMParser`.
 */

const CANAL = {
  title: 'Uma Estrelinha',
  link: 'https://umaestrelinha.com.br',
  description: 'Joias afetivas artesanais em resina',
}

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

const parse = (xml: string): Document => {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const erro = doc.querySelector('parsererror')
  expect(erro, erro?.textContent ?? '').toBeNull()
  return doc
}

const g = (doc: Document, nome: string): string | null =>
  doc.getElementsByTagNameNS('http://base.google.com/ns/1.0', nome)[0]?.textContent ?? null

describe('renderFeedXml — o documento', () => {
  it('é XML bem-formado', () => {
    expect(() => parse(renderFeedXml([oferta()], CANAL))).not.toThrow()
  })

  it('declara o namespace do Google', () => {
    const doc = parse(renderFeedXml([oferta()], CANAL))
    expect(doc.documentElement.getAttribute('xmlns:g')).toBe('http://base.google.com/ns/1.0')
  })

  it('é RSS 2.0', () => {
    const doc = parse(renderFeedXml([oferta()], CANAL))
    expect(doc.documentElement.nodeName).toBe('rss')
    expect(doc.documentElement.getAttribute('version')).toBe('2.0')
  })

  it('emite um <item> por oferta', () => {
    const xml = renderFeedXml([oferta(), oferta({ id: '999' })], CANAL)
    expect(parse(xml).getElementsByTagName('item')).toHaveLength(2)
  })

  it('leva o id e o item_group_id que o Merchant Center já indexou', () => {
    const doc = parse(renderFeedXml([oferta()], CANAL))
    expect(g(doc, 'id')).toBe('1259936246')
    expect(g(doc, 'item_group_id')).toBe('281745761')
  })

  it('formata o preço com duas casas e a moeda', () => {
    const doc = parse(renderFeedXml([oferta()], CANAL))
    expect(g(doc, 'price')).toBe('19.90 BRL')
  })

  it('emite sale_price só quando há promoção incondicional', () => {
    const semPromo = parse(renderFeedXml([oferta()], CANAL))
    expect(g(semPromo, 'sale_price')).toBeNull()

    const comPromo = parse(renderFeedXml([oferta({ price: 120, salePrice: 84 })], CANAL))
    expect(g(comPromo, 'price')).toBe('120.00 BRL')
    expect(g(comPromo, 'sale_price')).toBe('84.00 BRL')
  })
})

describe('renderFeedXml — identificadores', () => {
  it('declara identifier_exists no por padrão', () => {
    expect(g(parse(renderFeedXml([oferta()], CANAL)), 'identifier_exists')).toBe('no')
  })

  it('declara yes quando o produto afirma ter identificador', () => {
    const doc = parse(renderFeedXml([oferta({ identifierExists: true })], CANAL))
    expect(g(doc, 'identifier_exists')).toBe('yes')
  })

  it('NUNCA emite g:gtin — GTIN inventado é pior que nenhum', () => {
    const xml = renderFeedXml([oferta({ identifierExists: true })], CANAL)
    expect(xml).not.toContain('gtin')
  })
})

describe('renderFeedXml — campo vazio omite a tag', () => {
  it('não emite g:brand quando a marca é nula', () => {
    expect(renderFeedXml([oferta()], CANAL)).not.toContain('<g:brand>')
  })

  it('emite g:brand quando preenchida', () => {
    const doc = parse(renderFeedXml([oferta({ brand: 'Uma Estrelinha' })], CANAL))
    expect(g(doc, 'brand')).toBe('Uma Estrelinha')
  })

  it('não emite tag vazia para nenhum campo opcional', () => {
    const xml = renderFeedXml([oferta()], CANAL)
    expect(xml).not.toMatch(/<g:[a-z_]+><\/g:[a-z_]+>/)
  })

  it('emite uma g:additional_image_link por imagem extra', () => {
    const doc = parse(
      renderFeedXml([oferta({ additionalImageLinks: ['https://cdn/a.jpg', 'https://cdn/b.jpg'] })], CANAL),
    )
    expect(
      doc.getElementsByTagNameNS('http://base.google.com/ns/1.0', 'additional_image_link'),
    ).toHaveLength(2)
  })
})

describe('renderFeedXml — texto hostil continua bem-formado', () => {
  it('escapa & e < na descrição', () => {
    const doc = parse(
      renderFeedXml([oferta({ description: 'Prata & ouro <18k> "fino" e o \'resto\'' })], CANAL),
    )
    expect(doc.getElementsByTagName('description')[1].textContent).toBe(
      'Prata & ouro <18k> "fino" e o \'resto\'',
    )
  })

  it('remove caractere de controle, que XML 1.0 não representa nem escapado', () => {
    const doc = parse(renderFeedXml([oferta({ description: 'antes\u0000\u0008depois' })], CANAL))
    expect(doc.getElementsByTagName('description')[1].textContent).toBe('antesdepois')
  })

  it('preserva tab e quebra de linha, que são válidos em XML', () => {
    expect(escapeXml('a\tb\nc')).toBe('a\tb\nc')
  })
})

describe('renderFeedXml — as duas recusas', () => {
  it('lança em lista vazia: feed sem item manda o Google remover o catálogo', () => {
    expect(() => renderFeedXml([], CANAL)).toThrow(/vazio/i)
  })

  it('lança em offer_id duplicado, com o id na mensagem', () => {
    expect(() => renderFeedXml([oferta(), oferta()], CANAL)).toThrow(/1259936246/)
  })

  it('ids distintos não disparam a recusa de duplicata', () => {
    expect(() => renderFeedXml([oferta(), oferta({ id: '42' })], CANAL)).not.toThrow()
  })
})

describe('formatFeedPrice', () => {
  it('sempre duas casas, mesmo em valor redondo', () => {
    expect(formatFeedPrice(84)).toBe('84.00 BRL')
  })
})
