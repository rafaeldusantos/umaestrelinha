// Feature 69 · SSV-24, SSV-26 — as fotos que a página do produto declara.
//
// ---------------------------------------------------------------------------------------------
// UM DONO SÓ PARA "A FOTO DA PÁGINA"
// ---------------------------------------------------------------------------------------------
// Duas superfícies fazem esta pergunta: o `og:image` da página do produto (que é o `[0]`) e as
// `<image:loc>` do sitemap (a lista toda). Escrita em cada uma, a primeira foto do sitemap e o card
// do WhatsApp divergiriam no dia em que a régua da representante mudasse — e o juiz seria o Google
// Imagens, semanas depois. A régua de QUAL variação representa o produto e de QUAL foto é a principal
// continua em `core/shopping` (`representativeVariant`, `offerImages`); daqui só sai a lista pronta,
// cada uma pedida na largura do card social.
//
// ---------------------------------------------------------------------------------------------
// ALCANÇÁVEL PELO DENO
// ---------------------------------------------------------------------------------------------
// A function `sitemap` (e a página servida) importa este arquivo por caminho relativo. Todo import
// daqui é por ARQUIVO e com a extensão explícita — inclusive o de tipo —, e nenhum é de pacote:
// `imagesDenoReach.test.ts` caminha o grafo e recusa as duas coisas.

import { renditionUrl } from '../media/rendition.ts'
import { offerImages, representativeVariant } from '../shopping/offer.ts'
import type { OfferInputProduct, OfferInputVariant } from '../shopping/types.ts'

/** A largura do `og:image`: o card social do WhatsApp e do Facebook pede 1200px. */
export const OG_IMAGE_WIDTH = 1200

/**
 * O que esta função lê do produto. Projeção, no molde de `core/shopping/types.ts`: um
 * `OfferInputProduct` inteiro passa sem conversão, e o sitemap passa só as colunas que leu.
 */
export type PageImagesProduct = Pick<OfferInputProduct, 'images' | 'is_active' | 'stock_policy'>

/**
 * O que esta função lê da variação — o que decide a representante (`feedExclusion`,
 * `offerAvailability`, `position`) e a foto dela. **`stock` está aqui de propósito**: sem ele toda
 * linha de peça `track` pareceria esgotada, a representante viraria a primeira por posição, e o
 * `[0]` divergiria do `og:image` da página sem erro nenhum.
 */
export type PageImagesVariant = Pick<
  OfferInputVariant,
  'is_active' | 'price' | 'stock' | 'image_url' | 'position'
>

/**
 * As fotos que a página do produto declara, já na URL de 1200px.
 *
 * - `[0]` é a foto principal da **representante** (`offerImages`): a da variação quando ela tem uma,
 *   a primeira do produto quando não. É byte a byte o `og:image` que a página serve (SSV-26).
 * - depois, **todas** as fotos de `products.images`, na ordem do array (SSV-24), sem a principal.
 *   O teto de 10 de `additionalImageLinks` é do Merchant Center e NÃO vale aqui — o sitemap de
 *   imagens declara cada foto; o teto do protocolo (1.000) é aplicado por quem serializa.
 * - sem duplicatas depois da rendição, e vazia quando o produto não tem foto nenhuma.
 *
 * Sem variação elegível, a principal é a primeira do produto — o recuo de `offerImages`, com uma
 * variação sem foto.
 *
 * Os dois `as` abaixo são a única fachada do arquivo: `representativeVariant` e `offerImages`
 * declaram o tipo inteiro, mas leem só as colunas das projeções acima (`feedExclusion`,
 * `offerAvailability`, `position`, `images`, `image_url`). `images.test.ts` prova o resultado contra
 * a montagem real da `product-page`, com o produto inteiro.
 */
export const productPageImages = (
  product: PageImagesProduct,
  variants: readonly PageImagesVariant[],
): string[] => {
  const produto = product as OfferInputProduct
  const representante =
    representativeVariant(produto, variants as readonly OfferInputVariant[]) ??
    ({ image_url: null } as OfferInputVariant)
  const { imageLink } = offerImages(produto, representante)

  const doProduto = (product.images ?? []).map(i => i?.url).filter(Boolean)
  const vistas = new Set<string>()
  const fotos: string[] = []
  for (const url of [imageLink, ...doProduto]) {
    if (!url) continue
    const pedida = renditionUrl(url, OG_IMAGE_WIDTH)
    if (vistas.has(pedida)) continue
    vistas.add(pedida)
    fotos.push(pedida)
  }
  return fotos
}
