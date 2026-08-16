// Feature 30 · GSH-03, GSH-08 — a oferta inteira, montada uma vez só.
//
// `renderFeedXml` e `productJsonLd` partem DAQUI. É o que faz o preço do feed e o preço da landing
// page serem o mesmo número por construção, em vez de por coincidência — e é a única coisa que
// impede o Merchant Center de reprovar 3.233 itens por incompatibilidade.

import { productPath } from '../routes/routes.ts'
import { htmlToText, stripFaqBlock } from '../faq/block.ts'
import { feedExclusion } from './eligibility.ts'
import { publicProductId, publicVariantId } from './identity.ts'
import { offerAvailability, offerPricing } from './pricing.ts'
import type { OfferInputProduct, OfferInputVariant, ShoppingOffer } from './types.ts'

/** O que o Google aceita de imagem extra por oferta. Acima disso ele ignora o excedente. */
export const MAX_ADDITIONAL_IMAGES = 10

/** Origem sem barra final, para o link não sair com `//produtos/...`. */
const trimOrigin = (origin: string): string => String(origin ?? '').replace(/\/+$/, '')

export interface OfferContext {
  /** `https://umaestrelinha.com.br`. Sem ela o `<g:link>` sairia relativo — 3.233 ofertas quebradas. */
  origin: string
  /** `store_settings.google_shopping.default_product_category`. O último recuo. */
  defaultProductCategory?: string | null
  /**
   * A taxonomia herdada das categorias deste produto (`GSH-23`), já resolvida por
   * `pickCategoryProductCategory`. Fica entre o produto e o padrão da loja.
   */
  categoryProductCategory?: string | null
}

/** O mínimo para a categoria participar da precedência (`GSH-23`). */
export interface CategoryTaxonomy {
  name: string
  sort_order: number
  google_product_category?: string | null
}

/**
 * Qual categoria empresta a taxonomia ao produto, quando ele está em mais de uma.
 *
 * **Menor `sort_order`, desempate por nome.** É a mesma régua de `bySortOrder` (`core/menu`) e de
 * `displayCategory` (PST-06), que já decide qual categoria representa o produto no selo do card e na
 * trilha. Uma terceira régua aqui faria o mesmo produto ser "da categoria X" na vitrine e "da
 * categoria Y" no Google.
 *
 * Sem o desempate por nome, dois empates em `sort_order` alternariam entre leituras — e a taxonomia
 * de um produto mudaria sozinha entre duas gerações do feed.
 */
export const pickCategoryProductCategory = (
  categories: readonly CategoryTaxonomy[],
): string | null => {
  const comValor = categories.filter(c => (c.google_product_category ?? '') !== '')
  if (comValor.length === 0) return null
  const escolhida = [...comValor].sort(
    (a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name, 'pt-BR'),
  )[0]
  return escolhida.google_product_category ?? null
}

/**
 * O `<g:link>` da oferta: a canônica do produto mais a variação anunciada.
 *
 * **Montado por `productPath`, nunca por concatenação local.** A `AD-018` fixou que existe UMA
 * canônica por conteúdo e que ela é construída por função única; uma quarta cópia da regra aqui
 * divergiria no dia em que o formato mudasse, e divergiria em silêncio.
 *
 * Sem barra final (o `vercel.json` tem `trailingSlash: false`, e a barra custaria um 308 antes de
 * cada visita) e **sem `pf=mc`**, que é tag interna da Nuvemshop e não significa nada aqui.
 */
export const offerLink = (
  product: OfferInputProduct,
  variant: OfferInputVariant,
  origin: string,
): string => `${trimOrigin(origin)}${productPath(product.slug)}?variant=${publicVariantId(variant)}`

/**
 * A descrição que vai para o Google: **a mesma que a loja mostra**, reduzida a texto.
 *
 * Passa por `stripFaqBlock` porque a loja também passa (`27`/`28`) — mandar o bloco de perguntas que
 * a página filtra faria o feed descrever uma página que não existe. Vazia, recua para o nome: o
 * `<g:description>` é obrigatório e uma oferta sem ele é recusada.
 */
export const offerDescription = (product: OfferInputProduct): string =>
  htmlToText(stripFaqBlock(product.description)) || product.name

/**
 * A imagem da oferta.
 *
 * A da variação quando existe; a primeira do produto quando não. Medido no banco em 2026-08-16:
 * **191** variações ativas com preço caem no recuo, e **todo** produto tem ao menos uma imagem — por
 * isso o recuo é suficiente e não há terceiro nível.
 */
export const offerImages = (
  product: OfferInputProduct,
  variant: OfferInputVariant,
): { imageLink: string; additionalImageLinks: string[] } => {
  const doProduto = (product.images ?? []).map(i => i.url).filter(Boolean)
  const principal = variant.image_url || doProduto[0] || ''
  return {
    imageLink: principal,
    additionalImageLinks: doProduto.filter(u => u !== principal).slice(0, MAX_ADDITIONAL_IMAGES),
  }
}

/**
 * A variação que **representa o produto** quando a URL não indica nenhuma.
 *
 * Existe por um motivo estreito: a landing page precisa declarar um preço mesmo sem `?variant=`, e
 * declarar um preço diferente do que a página renderiza é a incompatibilidade que esta feature
 * inteira existe para evitar.
 *
 * A regra espelha `initialSelection` da loja (`entities/product/lib/variantSelection`): **primeira
 * por `position` que esteja disponível; sem nenhuma disponível, a primeira que exista.** Não é
 * byte-a-byte a mesma função — `initialSelection` trabalha por *eixo* e trata grade que não cobre
 * todos os eixos, caso que não muda o preço representativo. A exposição é pequena e conhecida: o
 * Merchant Center **sempre** chega com `?variant=`, porque é o que o `<g:link>` carrega. Este ramo
 * serve ao resultado orgânico.
 *
 * `null` quando o produto não tem nenhuma linha elegível — aí a página não declara oferta nenhuma.
 */
export const representativeVariant = (
  product: OfferInputProduct,
  variants: readonly OfferInputVariant[],
): OfferInputVariant | null => {
  const elegiveis = variants
    .filter(v => feedExclusion(product, v) === null)
    .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
  if (elegiveis.length === 0) return null
  return elegiveis.find(v => offerAvailability(product, v) !== 'out_of_stock') ?? elegiveis[0]
}

/**
 * A variação apontada por um `?variant=`, ou `null`.
 *
 * Casa pelo **id público** (o `<g:id>` do feed) **e** pelo UUID local, e as duas formas resolvem a
 * mesma linha. Aceitar as duas não é conveniência: o id público de uma linha importada é o
 * `nuvemshop_id`, mas todo link interno da loja que venha a carregar variação usaria o UUID, e uma
 * regra que aceitasse só um dos dois faria metade dos links cair na seleção padrão **sem erro
 * nenhum** — o pior modo de falhar, porque a página abre.
 *
 * Não há ambiguidade possível: UUID tem hífen, `nuvemshop_id` é só dígito.
 */
export const variantByPublicId = (
  variants: readonly OfferInputVariant[],
  id: string | null | undefined,
): OfferInputVariant | null => {
  const alvo = String(id ?? '').trim()
  if (alvo === '') return null
  return variants.find(v => publicVariantId(v) === alvo || v.id === alvo) ?? null
}

/** A oferta pronta. Serializar é problema de quem chama. */
export const resolveOffer = (
  product: OfferInputProduct,
  variant: OfferInputVariant,
  context: OfferContext,
): ShoppingOffer => {
  const { price, salePrice } = offerPricing(variant)
  const { imageLink, additionalImageLinks } = offerImages(product, variant)
  return {
    id: publicVariantId(variant),
    itemGroupId: publicProductId(product),
    title: product.name,
    description: offerDescription(product),
    link: offerLink(product, variant, context.origin),
    imageLink,
    additionalImageLinks,
    availability: offerAvailability(product, variant),
    price,
    salePrice,
    brand: product.brand || null,
    mpn: product.mpn || null,
    ageGroup: product.age_group || null,
    gender: product.gender || null,
    // `GSH-23` — precedência: produto > categoria > padrão da loja. O produto vence porque é a
    // decisão mais específica que alguém tomou; a categoria existe para a dona não repetir a
    // escolha em 689 produtos.
    googleProductCategory:
      product.google_product_category ||
      context.categoryProductCategory ||
      context.defaultProductCategory ||
      null,
    // `null` na coluna significa "nunca decidido" e herda o padrão da loja, que é **não ter GTIN** —
    // joia artesanal não tem código de barras, e é o que a própria Nuvemshop marca hoje
    // ("produto único ou vintage sem identificador").
    identifierExists: product.identifier_exists === true,
    condition: 'new',
  }
}
