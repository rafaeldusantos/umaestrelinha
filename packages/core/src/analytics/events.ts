// Feature 61 · EVT-01..12, EVT-16..17 — os eventos que o NAVEGADOR envia.
//
// Um builder por evento, cada um devolvendo `{ name, params }` pronto para o gtag. A loja nunca
// monta parâmetro à mão: quem chama passa dado de domínio e recebe o evento. É o que torna `EVT-14`
// (nenhum dado pessoal) uma propriedade destas funções, testável sem navegador.
//
// O `purchase` NÃO está aqui, e não por esquecimento: a compra tem um dono só, o servidor
// (`purchase.ts`, `CMP-09`). Um builder de `purchase` exportado para a loja seria a porta por onde
// a compra em dobro volta.
//
// ⚠️ Imports por caminho relativo com extensão explícita (ver `items.ts`).

import { itemsValue, toAnalyticsItem, type AnalyticsItem, type AnalyticsItemInput } from './items.ts'

/** A moeda de todo evento com valor. */
export const ANALYTICS_CURRENCY = 'BRL'

export type StoreEventName =
  | 'page_view'
  | 'view_item_list'
  | 'select_item'
  | 'view_item'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'view_cart'
  | 'add_to_wishlist'
  | 'search'
  | 'begin_checkout'
  | 'add_shipping_info'
  | 'add_payment_info'
  | 'login'
  | 'sign_up'

export interface AnalyticsEvent {
  name: StoreEventName
  params: Record<string, unknown>
}

/** Meio de pagamento como a loja o nomeia, e como o GA4 o recebe em `payment_type`. */
export type AnalyticsPaymentMethod = 'pix' | 'card'
export const PAYMENT_TYPE_LABELS: Record<AnalyticsPaymentMethod, string> = {
  pix: 'PIX',
  card: 'Cartão de crédito',
}

const texto = (v: string | null | undefined): string => (typeof v === 'string' ? v.trim() : '')

/** Itens + `currency` + `value` — o miolo dos eventos de comércio. */
function comercio(inputs: readonly AnalyticsItemInput[]): {
  currency: string
  value: number
  items: AnalyticsItem[]
} {
  const items = inputs.map(toAnalyticsItem)
  return { currency: ANALYTICS_CURRENCY, value: itemsValue(items), items }
}

/** `coupon` só entra quando há cupom — string vazia no relatório seria um "cupom" chamado nada. */
function comCupom<T extends Record<string, unknown>>(params: T, coupon: string | null | undefined): T {
  const c = texto(coupon)
  return c === '' ? params : { ...params, coupon: c }
}

/** `EVT-01`. A loja dispara por mudança de pathname; a medição automática do GA4 fica desligada. */
export function pageViewEvent(input: { location: string; title: string }): AnalyticsEvent {
  return { name: 'page_view', params: { page_location: input.location, page_title: input.title } }
}

/**
 * `EVT-02`. Os itens levam `index` — a posição na listagem, a partir de 0 — salvo quando a entrada
 * já traz o seu (uma página 2 da listagem começa no 24, não no 0).
 */
export function viewItemListEvent(input: {
  listId: string
  listName: string
  items: readonly AnalyticsItemInput[]
}): AnalyticsEvent {
  return {
    name: 'view_item_list',
    params: {
      item_list_id: input.listId,
      item_list_name: input.listName,
      items: input.items.map((it, i) => toAnalyticsItem({ ...it, index: it.index ?? i })),
    },
  }
}

/** `EVT-03`. A lista de origem e a posição do card tocado. */
export function selectItemEvent(input: {
  listId: string
  listName: string
  item: AnalyticsItemInput
}): AnalyticsEvent {
  return {
    name: 'select_item',
    params: {
      item_list_id: input.listId,
      item_list_name: input.listName,
      items: [toAnalyticsItem(input.item)],
    },
  }
}

/** `EVT-04`. */
export function viewItemEvent(input: { item: AnalyticsItemInput }): AnalyticsEvent {
  return { name: 'view_item', params: comercio([input.item]) }
}

/** `EVT-05`. **Uma** chamada com a quantidade adicionada, nunca uma por unidade. */
export function addToCartEvent(input: { item: AnalyticsItemInput }): AnalyticsEvent {
  return { name: 'add_to_cart', params: comercio([input.item]) }
}

/** `EVT-06`. `quantity` é a quantidade RETIRADA, não a que sobra. */
export function removeFromCartEvent(input: { item: AnalyticsItemInput }): AnalyticsEvent {
  return { name: 'remove_from_cart', params: comercio([input.item]) }
}

/** `EVT-07`. */
export function viewCartEvent(input: { items: readonly AnalyticsItemInput[] }): AnalyticsEvent {
  return { name: 'view_cart', params: comercio(input.items) }
}

/** `EVT-08`. Só ao favoritar — desfavoritar não gera evento (quem decide é o chamador). */
export function addToWishlistEvent(input: { item: AnalyticsItemInput }): AnalyticsEvent {
  return { name: 'add_to_wishlist', params: comercio([input.item]) }
}

/** `EVT-09`. Termo vazio (só espaço) não é busca: devolve `null`. */
export function searchEvent(input: { term: string }): AnalyticsEvent | null {
  const termo = texto(input.term)
  return termo === '' ? null : { name: 'search', params: { search_term: termo } }
}

/** `EVT-10`. */
export function beginCheckoutEvent(input: {
  items: readonly AnalyticsItemInput[]
  coupon?: string | null
}): AnalyticsEvent {
  return { name: 'begin_checkout', params: comCupom(comercio(input.items), input.coupon) }
}

/** `EVT-11`. `shipping_tier` é o nome do serviço escolhido (`PAC`, `SEDEX`, `Frete padrão`). */
export function addShippingInfoEvent(input: {
  items: readonly AnalyticsItemInput[]
  shippingTier: string
  coupon?: string | null
}): AnalyticsEvent {
  return {
    name: 'add_shipping_info',
    params: comCupom({ ...comercio(input.items), shipping_tier: texto(input.shippingTier) }, input.coupon),
  }
}

/** `EVT-12`. */
export function addPaymentInfoEvent(input: {
  items: readonly AnalyticsItemInput[]
  paymentType: AnalyticsPaymentMethod
  coupon?: string | null
}): AnalyticsEvent {
  return {
    name: 'add_payment_info',
    params: comCupom(
      { ...comercio(input.items), payment_type: PAYMENT_TYPE_LABELS[input.paymentType] },
      input.coupon,
    ),
  }
}

/** `EVT-16` (P2). `method` é como entrou — `codigo`, `senha` ou `google` (`AuthMethod`, na loja). */
export function loginEvent(input: { method: string }): AnalyticsEvent {
  return { name: 'login', params: { method: texto(input.method) } }
}

/** `EVT-17` (P2). */
export function signUpEvent(input: { method: string }): AnalyticsEvent {
  return { name: 'sign_up', params: { method: texto(input.method) } }
}
