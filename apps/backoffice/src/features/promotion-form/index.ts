// O editor deixou de ser modal na feature 18: quem monta a tela é
// `pages/admin/AdminPromotionFormPage`, e este slice exporta as peças dela.
export { default as ScopePicker } from './ui/ScopePicker'
export { default as TierRepeater } from './ui/TierRepeater'
export { default as PromotionShowcaseCard } from './ui/PromotionShowcaseCard'
export {
  promotionSchema,
  emptyPromotionForm,
  toWriteInput,
  toDateInput,
  SCOPE_WITHOUT_CATEGORY,
  MIN_QTY_TOO_LOW,
  NO_TIERS,
  UNIT_PRICE_NOT_POSITIVE,
  PERCENT_OUT_OF_RANGE,
  duplicateMinQty,
  type PromotionFormValues,
} from './model/schema'
export { tierPreview, type TierPreview } from './model/tierPreview'
export { useEligiblePreview, type EligiblePreview } from './api/useEligiblePreview'
