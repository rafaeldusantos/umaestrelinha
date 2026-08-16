// Feature 30 — o que é uma OFERTA do Google Shopping, como dado puro.
//
// Este módulo roda em **três runtimes**: Deno (as duas edge functions), o navegador (a loja resolve
// o `?variant=` pela mesma identidade que produziu o `offer_id`) e Node (os testes). Por isso ele não
// importa React, nem Supabase client, nem toca `document` — e há guarda varrendo o diretório para
// impedir que isso mude.
//
// ---------------------------------------------------------------------------------------------
// POR QUE UM DONO SÓ
// ---------------------------------------------------------------------------------------------
// O Merchant Center **compara o preço do feed com o preço da landing page** e reprova o item quando
// discordam. Duas escritas da mesma oferta — uma no gerador do XML, outra no gerador do JSON-LD —
// seriam duas chances de reprovar 3.233 ofertas, e a divergência não quebraria build, tipo nem teste
// de componente. É o mesmo defeito que a `24` matou na derivação da Home e a `25` no desenho da
// prévia, aplicado a um lugar onde o custo é externo e demorado de descobrir.
//
// ---------------------------------------------------------------------------------------------
// POR QUE TIPO ESTRUTURAL PRÓPRIO, E NÃO `DbProduct`
// ---------------------------------------------------------------------------------------------
// O feed lê uma **projeção** do catálogo, não o produto inteiro. Declarar aqui só os campos lidos faz
// o contrato dizer a verdade sobre a dependência, e a tipagem estrutural do TypeScript aceita um
// `DbProduct` real sem conversão nenhuma. Mesmo precedente de `PricedItem`/`PricingContext` em
// `@estrelinha/core/pricing`.

/** O mínimo para responder "qual é o id público desta variação". */
export interface OfferVariantIdentity {
  /** O UUID local. Recuo quando a linha não veio da Nuvemshop. */
  id: string
  /**
   * O id da variação na Nuvemshop, quando a linha veio do import.
   *
   * **É o `offer_id` que o Merchant Center já conhece** — medido em 2026-08-16 contra a conta
   * `685367464`: `offerId=1259936246` é a linha `product_variants.nuvemshop_id = 1259936246`.
   * `null` = linha criada no admin, que nunca esteve no Google.
   */
  nuvemshop_id?: number | null
}

/** O mínimo para responder "qual é o id público deste produto" (o `item_group_id`). */
export interface OfferProductIdentity {
  id: string
  /** Medido: o campo *ID do grupo de itens* da oferta `1259936246` vale `281745761`. */
  nuvemshop_id?: number | null
}

/** O mínimo para decidir se o produto pode gerar oferta (`GSH-04`). */
export interface OfferProductEligibility {
  is_active: boolean
}

/** O mínimo para decidir se a variação pode gerar oferta (`GSH-04`). */
export interface OfferVariantEligibility {
  is_active: boolean
  /** `null` = linha sem preço: não é vendável, e um `<g:price>` vazio reprova a oferta. */
  price: number | null
}

/** Disponibilidade no vocabulário do Google. Não é a nossa `stock_policy`. */
export type OfferAvailability = 'in_stock' | 'out_of_stock' | 'backorder'

/**
 * O mínimo para precificar a oferta (`GSH-06`).
 *
 * Não declara `price_override` **de propósito**: a coluna está depreciada e nenhum código novo a lê.
 * Deixá-la fora do contrato é o que impede alguém de passar a lê-la sem decidir.
 */
export interface OfferPricingVariant {
  price: number | null
  compare_price: number | null
  stock: number
}

/** O mínimo para decidir disponibilidade (`GSH-07`). A política é do PRODUTO, o saldo é da LINHA. */
export interface OfferPricingProduct {
  stock_policy: 'track' | 'backorder' | 'none'
}

/** O que `resolveOffer` lê do produto. Projeção, não `DbProduct` inteiro. */
export interface OfferInputProduct
  extends OfferProductIdentity,
    OfferProductEligibility,
    OfferPricingProduct {
  name: string
  slug: string
  description: string
  images: { url: string }[]
  brand?: string | null
  mpn?: string | null
  age_group?: string | null
  gender?: string | null
  google_product_category?: string | null
  /** `null` = nunca decidido; herda o padrão da loja, que é não ter identificador. */
  identifier_exists?: boolean | null
}

/** O que `resolveOffer` lê da variação. */
export interface OfferInputVariant
  extends OfferVariantIdentity,
    OfferVariantEligibility,
    OfferPricingVariant {
  image_url: string | null
  /** Ordem da grade. Decide qual linha representa o produto quando a URL não indica nenhuma. */
  position?: number
}

/**
 * Uma oferta pronta, independente de serialização.
 *
 * `renderFeedXml` e `productJsonLd` **partem daqui** — é isto que garante que o feed e a página
 * declarem o mesmo número.
 */
export interface ShoppingOffer {
  id: string
  itemGroupId: string
  title: string
  description: string
  link: string
  imageLink: string
  additionalImageLinks: string[]
  availability: OfferAvailability
  price: number
  /** `null` quando não há "de/por" incondicional. Pix e promoção por quantidade **nunca** entram. */
  salePrice: number | null
  brand: string | null
  mpn: string | null
  ageGroup: string | null
  gender: string | null
  googleProductCategory: string | null
  /** `false` ⇒ o feed emite `identifier_exists: no` e **nenhum** `gtin`. */
  identifierExists: boolean
  condition: 'new'
}
