// Feature 61 — a medição do Google Analytics 4. A regra pura: o ID, o host, o item, os eventos do
// navegador e a compra do servidor. Nenhum arquivo deste módulo importa React, Supabase ou Deno.
//
// ⚠️ Todo reexport leva a extensão `.ts` explícita, inclusive os de tipo: a edge function
// `mercado-pago` alcança este módulo por caminho relativo, e o Deno resolve o grafo de tipos junto.
// `denoReach.test.ts` deste diretório guarda isso, varrendo o diretório inteiro.

export { MEASUREMENT_ID_REFUSAL, measurementIdRefusal, normalizeMeasurementId } from './ids.ts'
export { trafficType } from './host.ts'
export {
  ANALYTICS_ITEM_BRAND,
  ANALYTICS_ITEM_KEYS,
  itemsValue,
  round2,
  toAnalyticsItem,
} from './items.ts'
export type { AnalyticsItem, AnalyticsItemInput } from './items.ts'
export {
  ANALYTICS_CURRENCY,
  PAYMENT_TYPE_LABELS,
  addPaymentInfoEvent,
  addShippingInfoEvent,
  addToCartEvent,
  addToWishlistEvent,
  beginCheckoutEvent,
  loginEvent,
  pageViewEvent,
  removeFromCartEvent,
  searchEvent,
  selectItemEvent,
  signUpEvent,
  viewCartEvent,
  viewItemEvent,
  viewItemListEvent,
} from './events.ts'
export type { AnalyticsEvent, AnalyticsPaymentMethod, StoreEventName } from './events.ts'
export {
  buildPurchaseBody,
  measurementProtocolUrl,
  purchaseDecision,
  syntheticClientId,
} from './purchase.ts'
export type {
  MeasurementProtocolBody,
  PurchaseDecision,
  PurchaseDecisionInput,
  PurchaseEventParams,
  PurchaseIds,
  PurchaseOrder,
} from './purchase.ts'
