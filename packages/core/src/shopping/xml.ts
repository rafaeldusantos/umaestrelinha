// Feature 30 · GSH-09 — a serialização RSS 2.0 que o Merchant Center busca.
//
// ---------------------------------------------------------------------------------------------
// AS DUAS RECUSAS QUE ESTE MÓDULO FAZ, E POR QUE ELAS SÃO EXCEÇÃO
// ---------------------------------------------------------------------------------------------
// `renderFeedXml` **lança** em dois casos, em vez de devolver documento:
//
//   1. lista vazia          — um feed sem item é lido pelo Google como "remova tudo"
//   2. `offer_id` repetido  — item duplicado é descartado do lado dele, em silêncio
//
// Nos dois, devolver um documento tecnicamente válido seria pior que falhar: quem chama transforma o
// throw em **503**, o Google mantém a última leitura boa e tenta de novo. Nenhum dos dois é
// recuperável dentro do serializador.

import type { ShoppingOffer } from './types.ts'

const NS = 'http://base.google.com/ns/1.0'

/**
 * Escape de conteúdo textual de XML.
 *
 * Os caracteres de controle C0 (exceto tab, LF e CR) **não têm representação** em XML 1.0 — nem
 * escapados. Removê-los é a única saída que produz documento bem-formado, e a descrição de 679
 * produtos vem de uma origem que não os proíbe.
 */
export const escapeXml = (value: string): string =>
  String(value ?? '')
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')

/** Preço no formato que o Google lê: duas casas e a moeda. */
export const formatFeedPrice = (value: number): string => `${value.toFixed(2)} BRL`

/** Tag simples. **Valor vazio omite a tag inteira** — `<g:brand></g:brand>` reprova a oferta. */
const tag = (name: string, value: string | null | undefined): string =>
  value == null || value === '' ? '' : `      <${name}>${escapeXml(String(value))}</${name}>\n`

export interface FeedChannel {
  title: string
  link: string
  description: string
}

const item = (offer: ShoppingOffer): string =>
  '    <item>\n' +
  tag('g:id', offer.id) +
  tag('g:item_group_id', offer.itemGroupId) +
  tag('title', offer.title) +
  tag('description', offer.description) +
  tag('link', offer.link) +
  tag('g:image_link', offer.imageLink) +
  offer.additionalImageLinks.map(u => tag('g:additional_image_link', u)).join('') +
  tag('g:availability', offer.availability) +
  tag('g:price', formatFeedPrice(offer.price)) +
  (offer.salePrice != null ? tag('g:sale_price', formatFeedPrice(offer.salePrice)) : '') +
  tag('g:condition', offer.condition) +
  tag('g:brand', offer.brand) +
  tag('g:mpn', offer.mpn) +
  tag('g:age_group', offer.ageGroup) +
  tag('g:gender', offer.gender) +
  tag('g:google_product_category', offer.googleProductCategory) +
  // Nunca emitimos `<g:gtin>`: joia artesanal não tem código de barras, e um GTIN inventado é pior
  // que nenhum — o Google recusa o item e o aviso da própria Nuvemshop manda deixar em branco.
  tag('g:identifier_exists', offer.identifierExists ? 'yes' : 'no') +
  '    </item>\n'

/**
 * O documento do feed.
 *
 * @throws se a lista estiver vazia ou tiver `offer_id` repetido.
 */
export const renderFeedXml = (
  offers: readonly ShoppingOffer[],
  channel: FeedChannel,
): string => {
  if (offers.length === 0) {
    throw new Error(
      'feed vazio: um RSS sem item instrui o Merchant Center a remover o catálogo inteiro',
    )
  }

  const vistos = new Set<string>()
  for (const o of offers) {
    if (vistos.has(o.id)) {
      throw new Error(`offer_id duplicado no feed: ${o.id}`)
    }
    vistos.add(o.id)
  }

  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<rss version="2.0" xmlns:g="${NS}">\n` +
    '  <channel>\n' +
    `    <title>${escapeXml(channel.title)}</title>\n` +
    `    <link>${escapeXml(channel.link)}</link>\n` +
    `    <description>${escapeXml(channel.description)}</description>\n` +
    offers.map(item).join('') +
    '  </channel>\n' +
    '</rss>\n'
  )
}
