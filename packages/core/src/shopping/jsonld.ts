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

// ---------------------------------------------------------------------------------------------
// Feature 68 · SVR-22, SVR-30..33 — a página de opção e o `ProductGroup`
// ---------------------------------------------------------------------------------------------
// `productJsonLd` acima NÃO muda: é a serialização que `shoppingParity.test.ts` compara com o feed.
// O que a `68` acrescenta são invólucros AO LADO dela, que partem do mesmo `ShoppingOffer`.

/**
 * O eixo da peça → a propriedade de `schema.org` que o `variesBy` declara (SVR-32). A chave é o nome
 * do eixo DOBRADO (sem acento, sem caixa), comparado por igualdade exata. "Tipos de elo" mistura
 * formato e acabamento e não tem propriedade: declarar `material` para "Chaveiro" seria afirmação
 * falsa, então eixo fora da tabela não gera `ProductGroup`.
 */
export const VARIES_BY: Readonly<Record<string, string>> = {
  cor: `${SCHEMA}/color`,
  tamanho: `${SCHEMA}/size`,
}

const dobra = (texto: string): string => String(texto ?? '').normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()

/** O `variesBy` de um eixo, ou `null` quando o eixo não está na tabela. */
export const variesByFor = (axis: string | null | undefined): string | null => {
  const chave = dobra(axis ?? '')
  return Object.prototype.hasOwnProperty.call(VARIES_BY, chave) ? VARIES_BY[chave] : null
}

/**
 * O `Product` de uma página acrescido do endereço dela (SVR-22) e, quando a URL abriu uma variação
 * válida, do grupo a que ela pertence (SVR-33). Só ACRESCENTA: preço, `sku` e `offers.url` são os de
 * `productJsonLd`, intocados.
 */
export const withPageUrl = (
  ld: Record<string, unknown>,
  page: { url: string | null; groupId?: string | null },
): Record<string, unknown> => ({
  ...ld,
  // Sem origem absoluta não há canônica a declarar — e uma `url` relativa seria pior que nenhuma.
  ...(page.url ? { url: page.url } : {}),
  ...(page.groupId ? { inProductGroupWithID: page.groupId } : {}),
})

export interface ProductGroupVariant {
  /** A oferta da REPRESENTANTE da opção, montada por `resolveOffer` — o mesmo preço do feed. */
  offer: ShoppingOffer
  /** O título da opção SEM a marca. */
  name: string
  /** O texto da opção, na propriedade do eixo (`color`/`size`). */
  value: string
  /** O caminho canônico da opção, absoluto. */
  url: string
}

/**
 * O `ProductGroup` da página da PEÇA quando ela tem opções indexáveis num eixo da tabela (SVR-30,
 * SVR-31): um `Product` por opção em `hasVariant`, cada um com o `offers` da representante.
 */
export const productGroupJsonLd = (group: {
  name: string
  groupId: string
  variesBy: string
  url: string
  variants: readonly ProductGroupVariant[]
}): Record<string, unknown> => {
  const propriedade = group.variesBy.slice(`${SCHEMA}/`.length)
  return {
    '@context': SCHEMA,
    '@type': 'ProductGroup',
    name: group.name,
    productGroupID: group.groupId,
    variesBy: group.variesBy,
    url: group.url,
    hasVariant: group.variants.map(v => {
      const { '@context': _contexto, ...produto } = productJsonLd(v.offer)
      return { ...produto, name: v.name, [propriedade]: v.value, url: v.url }
    }),
  }
}
