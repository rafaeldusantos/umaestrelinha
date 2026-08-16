// @vitest-environment jsdom
import { describe, expect, it } from 'vitest'
import { resolveOffer } from '../offer'
import { renderFeedXml } from '../xml'
import { productJsonLd } from '../jsonld'
import type { OfferInputProduct, OfferInputVariant } from '../types'

/**
 * `GSH-12`, `GSH-13` — **o guarda que justifica a arquitetura inteira.**
 *
 * O Merchant Center compara o preço do feed com o preço da landing page e reprova o item quando eles
 * discordam. As duas superfícies partem do mesmo `ShoppingOffer` justamente para não poderem
 * discordar — e este arquivo mede isso pelas **serializações reais**, não pela função intermediária:
 * ele parseia o XML que sai de `renderFeedXml` e lê o objeto que sai de `productJsonLd`, sem
 * reimplementar nenhuma das duas.
 *
 * Se este arquivo puder ser satisfeito por duas implementações separadas, a arquitetura falhou.
 */

const ORIGEM = 'https://umaestrelinha.com.br'

const CANAL = {
  title: 'Uma Estrelinha',
  link: ORIGEM,
  description: 'Joias afetivas artesanais em resina',
}

const produto: OfferInputProduct = {
  id: '3f1c0a52-9b7e-4c11-8d02-6a5e4f8b1c93',
  nuvemshop_id: 281745761,
  name: 'Pulseira 7 Nós Ajustável Proteção Kabbalah',
  slug: 'pulseira-7-nos-ajustavel-protecao-kabbalah',
  description: '<p>Pulseira dos 7 n&oacute;s</p>',
  images: [{ url: 'https://cdn/p1.jpg' }],
  is_active: true,
  stock_policy: 'track',
}

const variacao = (over: Partial<OfferInputVariant> = {}): OfferInputVariant => ({
  id: 'dd0e2171-4d3d-4e20-a868-21e5223bd917',
  nuvemshop_id: 1259936246,
  price: 19.9,
  compare_price: null,
  stock: 4,
  image_url: null,
  is_active: true,
  ...over,
})

const NS = 'http://base.google.com/ns/1.0'

/** Lê do XML SERVIDO, não do objeto intermediário. */
const doFeed = (xml: string) => {
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  expect(doc.querySelector('parsererror')).toBeNull()
  const g = (n: string) => doc.getElementsByTagNameNS(NS, n)[0]?.textContent ?? null
  const price = g('price')
  const sale = g('sale_price')
  return {
    id: g('id'),
    // O que a cliente paga: o "por" quando existe. É este número que o rastreador confere.
    precoCobrado: (sale ?? price)?.replace(' BRL', '') ?? null,
    availability: g('availability'),
    link: doc.getElementsByTagName('link')[1]?.textContent ?? null,
  }
}

const daPagina = (ld: Record<string, unknown>) => {
  const offers = ld.offers as Record<string, unknown>
  return {
    id: ld.sku as string,
    precoCobrado: offers.price as string,
    availability: offers.availability as string,
    link: offers.url as string,
  }
}

const casos: { nome: string; variante: OfferInputVariant }[] = [
  { nome: 'preço simples', variante: variacao() },
  { nome: 'com "de/por" incondicional', variante: variacao({ compare_price: 120, price: 84 }) },
  { nome: 'esgotada', variante: variacao({ stock: 0 }) },
  { nome: 'centavo que não fecha em binário', variante: variacao({ price: 0.3 }) },
  { nome: 'preço alto', variante: variacao({ price: 1234.56 }) },
]

describe('paridade feed ↔ landing page', () => {
  for (const { nome, variante } of casos) {
    it(`declara o MESMO preço nas duas superfícies — ${nome}`, () => {
      const oferta = resolveOffer(produto, variante, { origin: ORIGEM })
      const feed = doFeed(renderFeedXml([oferta], CANAL))
      const pagina = daPagina(productJsonLd(oferta))
      expect(pagina.precoCobrado).toBe(feed.precoCobrado)
    })

    it(`declara a MESMA disponibilidade nas duas superfícies — ${nome}`, () => {
      const oferta = resolveOffer(produto, variante, { origin: ORIGEM })
      const feed = doFeed(renderFeedXml([oferta], CANAL))
      const pagina = daPagina(productJsonLd(oferta))
      const equivalente: Record<string, string> = {
        in_stock: 'https://schema.org/InStock',
        out_of_stock: 'https://schema.org/OutOfStock',
        backorder: 'https://schema.org/BackOrder',
      }
      expect(pagina.availability).toBe(equivalente[feed.availability as string])
    })
  }

  it('a página e o feed apontam para a mesma URL', () => {
    const oferta = resolveOffer(produto, variacao(), { origin: ORIGEM })
    expect(daPagina(productJsonLd(oferta)).link).toBe(doFeed(renderFeedXml([oferta], CANAL)).link)
  })

  it('a página e o feed falam do mesmo item', () => {
    const oferta = resolveOffer(produto, variacao(), { origin: ORIGEM })
    expect(daPagina(productJsonLd(oferta)).id).toBe(doFeed(renderFeedXml([oferta], CANAL)).id)
  })
})

/**
 * **Sensor embutido.** A régua acima só vale se ela reprovaria uma divergência de verdade — e a
 * divergência plausível não é aleatória: é a landing page anunciar o "de" (`price`) enquanto o feed
 * cobra o "por" (`sale_price`), que é exatamente o que uma segunda implementação escreveria sem
 * perceber. O sensor constrói esse par errado à mão e assere que a comparação o **derruba**.
 *
 * Sem isto, a suíte passaria igual com o preço divergente — que é a pior falha possível num guarda
 * de paridade.
 */
describe('sensor: a régua reprova a divergência que ela existe para pegar', () => {
  it('a página anunciando o "de" enquanto o feed cobra o "por" NÃO passa', () => {
    const oferta = resolveOffer(produto, variacao({ compare_price: 120, price: 84 }), {
      origin: ORIGEM,
    })
    const feed = doFeed(renderFeedXml([oferta], CANAL))

    // A segunda implementação plausível: ignora `salePrice` e publica `price`.
    const paginaErrada = { precoCobrado: oferta.price.toFixed(2) }

    expect(feed.precoCobrado).toBe('84.00')
    expect(paginaErrada.precoCobrado).toBe('120.00')
    expect(paginaErrada.precoCobrado).not.toBe(feed.precoCobrado)
  })

  it('a página anunciando disponibilidade fixa NÃO passa numa variação esgotada', () => {
    const oferta = resolveOffer(produto, variacao({ stock: 0 }), { origin: ORIGEM })
    const feed = doFeed(renderFeedXml([oferta], CANAL))
    const paginaErrada = { availability: 'https://schema.org/InStock' }

    expect(feed.availability).toBe('out_of_stock')
    expect(paginaErrada.availability).not.toBe('https://schema.org/OutOfStock')
  })
})
