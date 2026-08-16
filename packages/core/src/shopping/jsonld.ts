// Feature 30 · GSH-12 — o `Product`/`Offer` que a landing page declara.
//
// ---------------------------------------------------------------------------------------------
// POR QUE ISTO EXISTE
// ---------------------------------------------------------------------------------------------
// O Merchant Center **rastreia a página de destino** e compara o preço e a disponibilidade dela com
// os do feed. A loja é SPA sem SSR: sem este bloco escrito no HTML servido, o que o rastreador
// encontra é `<div id="root"></div>` — e o resultado não é "sem dado estruturado", é
// incompatibilidade em 3.233 itens, descoberta um dia depois do cutover.
//
// ---------------------------------------------------------------------------------------------
// O PREÇO DAQUI É O QUE A CLIENTE PAGA
// ---------------------------------------------------------------------------------------------
// No feed, `<g:price>` é o "de" e `<g:sale_price>` é o "por". Em `schema.org/Offer` existe **um**
// campo de preço, e ele é o que se cobra — logo `salePrice ?? price`. Emitir o "de" aqui faria a
// página declarar 120 enquanto o feed anuncia 84: a incompatibilidade que este módulo existe para
// impedir, criada por ele mesmo.

import type { OfferAvailability, ShoppingOffer } from './types.ts'

const SCHEMA = 'https://schema.org'

/** `OfferAvailability` no vocabulário de `schema.org`. */
export const schemaAvailability = (availability: OfferAvailability): string => {
  if (availability === 'in_stock') return `${SCHEMA}/InStock`
  if (availability === 'backorder') return `${SCHEMA}/BackOrder`
  return `${SCHEMA}/OutOfStock`
}

/** O que a cliente paga: o "por" quando existe, o preço cheio quando não. */
export const payablePrice = (offer: ShoppingOffer): number =>
  offer.salePrice != null ? offer.salePrice : offer.price

/**
 * O bloco `application/ld+json` da página do produto.
 *
 * Parte do **mesmo `ShoppingOffer`** que o feed serializa. É o que faz os dois números serem iguais
 * por construção, e não por alguém ter lembrado de mudar os dois lugares.
 */
export const productJsonLd = (offer: ShoppingOffer): Record<string, unknown> => ({
  '@context': SCHEMA,
  '@type': 'Product',
  name: offer.title,
  image: [offer.imageLink, ...offer.additionalImageLinks].filter(Boolean),
  sku: offer.id,
  offers: {
    '@type': 'Offer',
    url: offer.link,
    priceCurrency: 'BRL',
    // String e não number: `price` de `schema.org` é texto, e `0.1 + 0.2` em JSON vira
    // `0.30000000000000004` — que o rastreador leria como preço diferente do feed.
    price: payablePrice(offer).toFixed(2),
    availability: schemaAvailability(offer.availability),
  },
})
