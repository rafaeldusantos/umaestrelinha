// Feature 61 · CMP-02, CMP-04..06, CMP-08 — a compra, enviada pelo SERVIDOR.
//
// O `purchase` tem um dono só: a edge function `mercado-pago`, no instante em que
// `apply_payment_approval` devolve `applied`. O navegador não consegue garantir "uma vez só" — o
// PIX aprovado com a aba fechada nunca chegaria, e um F5 na confirmação contaria duas. Este arquivo
// é a regra pura que a function chama: decidir se envia, e montar o corpo do Measurement Protocol.
//
// ⚠️ Imports por caminho relativo com extensão explícita: este é o arquivo que a edge function
// importa por caminho, e o Deno resolve o grafo de tipos junto.

import { measurementIdRefusal, normalizeMeasurementId } from './ids.ts'
import { trafficType } from './host.ts'
import { round2, toAnalyticsItem, type AnalyticsItem, type AnalyticsItemInput } from './items.ts'
import { ANALYTICS_CURRENCY } from './events.ts'

/** O que a decisão precisa saber. */
export interface PurchaseDecisionInput {
  /** `store_settings.analytics` — só `enabled` e `measurement_id` importam aqui. */
  settings: { enabled: boolean; measurement_id: string } | null | undefined
  /** A chave do Measurement Protocol, lida de `analytics_secrets`. Ausente ⇒ `null`. */
  apiSecret: string | null | undefined
  /** `orders.analytics_declined`. */
  declined: boolean
}

/**
 * O resultado gravado em `orders.ga_purchase_status` quando a compra NÃO sai, ou `'send'`.
 *
 * Os valores casam com o `check` da migration da 61 — `analyticsSchema.test.ts` lê os cinco de lá.
 */
export type PurchaseDecision = 'send' | 'skipped_declined' | 'skipped_disabled'

/**
 * Enviar ou não, e por quê.
 *
 * **Desligado vem primeiro**: com a medição desligada (ou sem chave, ou com ID inválido) nada sai
 * de pedido nenhum, e o motivo registrado é esse — não a recusa da cliente, que só decide quando a
 * medição está de pé (`CMP-04`, `CMP-06`).
 */
export function purchaseDecision(input: PurchaseDecisionInput): PurchaseDecision {
  const s = input.settings
  const secret = typeof input.apiSecret === 'string' ? input.apiSecret.trim() : ''
  if (!s || s.enabled !== true || measurementIdRefusal(s.measurement_id) !== null || secret === '') {
    return 'skipped_disabled'
  }
  if (input.declined === true) return 'skipped_declined'
  return 'send'
}

/**
 * Um `client_id` estável para o pedido sem cookie do GA (`CMP-05`).
 *
 * **Determinístico**: o mesmo pedido produz sempre o mesmo id — uma segunda tentativa não inventa
 * um segundo "usuário". Formato `<int>.<int>`, o mesmo do cookie `_ga`. São dois FNV-1a de 32 bits
 * com sementes diferentes; não é criptografia, e não precisa ser: o id não autoriza nada.
 */
export function syntheticClientId(orderId: string): string {
  const fnv = (semente: number): number => {
    let h = semente >>> 0
    for (let i = 0; i < orderId.length; i++) {
      h ^= orderId.charCodeAt(i)
      h = Math.imul(h, 0x01000193) >>> 0
    }
    return h >>> 0
  }
  // `|| 1` impede um zero, que o GA4 lê como id ausente.
  return `${fnv(0x811c9dc5) || 1}.${fnv(0x01000193 ^ 0x5bd1e995) || 1}`
}

/** O pedido, com só o que a compra precisa. Nada de nome, e-mail, telefone, CPF ou endereço. */
export interface PurchaseOrder {
  /** UUID — semente do `client_id` sintético. */
  id: string
  /** `orders.order_number` cru (`0244`, `NS-169`) — é ele que vira `transaction_id`, sem `#`. */
  order_number: string
  /** O que foi cobrado. */
  total: number
  shipping_cost: number
  /** O desconto total do pedido (cupom + Pix + promoção), somado por quem chama. */
  discount: number
  coupon_code: string | null
}

export interface PurchaseIds {
  /** `orders.ga_client_id`. Ausente ⇒ sintético. */
  clientId: string | null | undefined
  /** `orders.ga_session_id`. Só entra quando existe. */
  sessionId: string | null | undefined
  /** O host da loja que vendeu (de `STORE_PUBLIC_URL`). */
  storeHost: string | null | undefined
  /** `store_settings.analytics.production_host`. */
  productionHost: string | null | undefined
}

export interface PurchaseEventParams {
  transaction_id: string
  value: number
  currency: string
  shipping: number
  discount?: number
  coupon?: string
  session_id?: string
  traffic_type?: 'internal'
  items: AnalyticsItem[]
}

/** O corpo do `POST /mp/collect`. */
export interface MeasurementProtocolBody {
  client_id: string
  events: [{ name: 'purchase'; params: PurchaseEventParams }]
}

const texto = (v: string | null | undefined): string => (typeof v === 'string' ? v.trim() : '')

/**
 * O corpo do Measurement Protocol para a compra (`CMP-02`, `CMP-05`, `CMP-08`).
 *
 * `transaction_id` é o `order_number` CRU (`0244`, `NS-169`), sem o `#`. O `#` é apresentação —
 * quem o põe é `formatOrderNumber`, na tela e no e-mail —, e o `transaction_id` é chave: é por ele
 * que o GA4 deduplica e que um relatório se cruza com o banco. Com o prefixo, a chave carregaria um
 * caractere que a coluna não tem, e o cruzamento passaria a exigir uma tradução em cada consulta.
 */
export function buildPurchaseBody(
  order: PurchaseOrder,
  items: readonly AnalyticsItemInput[],
  ids: PurchaseIds,
): MeasurementProtocolBody {
  const clientId = texto(ids.clientId) || syntheticClientId(order.id)

  const params: PurchaseEventParams = {
    transaction_id: texto(order.order_number),
    value: round2(order.total),
    currency: ANALYTICS_CURRENCY,
    shipping: round2(order.shipping_cost),
    items: items.map(toAnalyticsItem),
  }
  const desconto = round2(order.discount)
  if (desconto > 0) params.discount = desconto
  const cupom = texto(order.coupon_code)
  if (cupom !== '') params.coupon = cupom
  const sessao = texto(ids.sessionId)
  if (sessao !== '') params.session_id = sessao
  if (trafficType(ids.storeHost, ids.productionHost) === 'internal') params.traffic_type = 'internal'

  return { client_id: clientId, events: [{ name: 'purchase', params }] }
}

/** A URL do Measurement Protocol. Ela CARREGA A CHAVE — nunca a registre em log. */
export function measurementProtocolUrl(measurementId: string, apiSecret: string): string {
  const id = encodeURIComponent(normalizeMeasurementId(measurementId))
  const secret = encodeURIComponent(apiSecret.trim())
  return `https://www.google-analytics.com/mp/collect?measurement_id=${id}&api_secret=${secret}`
}
