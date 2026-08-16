// Feature 30 — a API pública de `@estrelinha/core/shopping`.
//
// Consumidores: `supabase/functions/google-feed`, `supabase/functions/product-page`,
// `apps/store` (o `?variant=`) e `apps/backoffice` (a contagem do que fica de fora).
//
// **As edge functions NÃO importam por este barrel**: Deno resolve por caminho relativo com extensão
// explícita (`../../../packages/core/src/shopping/identity.ts`), no precedente já estabelecido por
// `payment/payer.ts` e `payment/status.ts`. O barrel serve aos dois apps, que passam pelo Vite.

export type {
  OfferAvailability,
  OfferProductEligibility,
  OfferProductIdentity,
  OfferVariantEligibility,
  OfferVariantIdentity,
  ShoppingOffer,
} from './types.ts'

export { publicProductId, publicVariantId } from './identity.ts'
export { FEED_EXCLUSIONS, feedExclusion, type FeedExclusion } from './eligibility.ts'
export { offerAvailability, offerPricing, type OfferPrice } from './pricing.ts'
export {
  MAX_ADDITIONAL_IMAGES,
  offerDescription,
  offerImages,
  offerLink,
  pickCategoryProductCategory,
  representativeVariant,
  resolveOffer,
  variantByPublicId,
  type CategoryTaxonomy,
  type OfferContext,
} from './offer.ts'
export type { OfferInputProduct, OfferInputVariant } from './types.ts'
export {
  escapeXml,
  formatFeedPrice,
  renderFeedXml,
  type FeedChannel,
} from './xml.ts'
export { payablePrice, productJsonLd, schemaAvailability } from './jsonld.ts'
