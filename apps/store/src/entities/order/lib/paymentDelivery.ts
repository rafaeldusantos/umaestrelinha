// Pagamento e entrega do pedido — os rótulos e as linhas do endereço (feature 59, `DET-11`).
// Puro, fora do componente: o arquivo de UI exporta só componente (Fast Refresh).

import {
  PAYMENT_METHOD_LABELS as CORE_PAYMENT_METHOD_LABELS,
  paymentMethodLabel as coreMethodLabel,
} from '@estrelinha/core/orders'

/**
 * As formas de pagamento, na voz da CLIENTE. Partem do mapa de `core` (`PAYMENT_METHOD_LABELS`, o
 * mesmo que o ateliê e o painel leem) e trocam só a voz de `manual` — "Combinado com a loja" é como a
 * cliente entende o que o ateliê chama de "Manual".
 *
 * Até o conserto do QA da `74` esta era uma SEGUNDA lista inteira, e só ela sabia que `card` (o meio
 * que o checkout da loja grava) é "Cartão de crédito": o ateliê mostrava "card" cru
 * (`BUG-20261024-pagamento-por-cartao-aparece-como-card`, defeito 01). Um meio novo entra em `core`;
 * aqui só entra uma troca de VOZ, e `paymentDelivery.test.ts` recusa qualquer outra diferença.
 */
export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  ...CORE_PAYMENT_METHOD_LABELS,
  manual: 'Combinado com a loja',
}

/** Valor desconhecido não vira texto técnico na tela da cliente (o recuo é o de `core`). */
export const paymentMethodLabel = (method: string | null | undefined): string =>
  coreMethodLabel(method, PAYMENT_METHOD_LABELS)

export interface OrderDeliveryInput {
  payment_method: string | null
  paid_at?: string | null
  customer_name?: string | null
  address_street?: string | null
  address_number?: string | null
  address_complement?: string | null
  address_neighborhood?: string | null
  address_city?: string | null
  address_state?: string | null
  address_zip?: string | null
  /** Feature 63: `'retirada'` é pedido de retirada no escritório (`isPickupOrder`). */
  shipping_service_id?: string | null
}

export const limpo = (v: string | null | undefined): string => (v ?? '').trim()

/**
 * As linhas do endereço: nome · rua, número, complemento · bairro · cidade/UF · CEP. Linha sem
 * dado some inteira — nunca uma vírgula ou uma barra sobrando.
 */
export const addressLines = (o: OrderDeliveryInput): string[] => {
  const rua = [o.address_street, o.address_number, o.address_complement].map(limpo).filter(Boolean)
  const cidade = [o.address_city, o.address_state].map(limpo).filter(Boolean).join('/')
  return [limpo(o.customer_name), rua.join(', '), limpo(o.address_neighborhood), cidade].filter(Boolean)
}
