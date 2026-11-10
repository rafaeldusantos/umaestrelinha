// Os selos do bloco Pagamento do pedido no painel: o dinheiro que entrou a mais, e o pedido levado
// adiante sem pagamento.
//
// Dois selos vêm de um MARCADOR gravado pelo banco (`order_payment_alerts`, só admin lê): quem decide
// que uma aprovação chegou num pedido já pago, ou num pedido cancelado, é `apply_payment_approval` —
// o corpo do webhook —, com o pedido travado. O terceiro é DERIVADO do próprio pedido, e por isso não
// tem marcador: "levado a Pago ou além sem pagamento aprovado" é a mesma régua que pede o registro ao
// avançar (`needsPaymentRecord`).
//
// `PAYMENT_ALERT_KINDS` é cópia deliberada do `check` da tabela: o guarda da migration
// (`pagamentoAMaisSchema.test.ts`, suíte da loja) importa esta lista e a compara com o SQL.
//
// Todo especificador relativo leva `.ts` (alcançável pelo Deno).

import { needsPaymentRecord, type ManualPaymentOrderInput } from './manualPayment.ts'

/** Os dois marcadores que o banco grava, na ordem em que o bloco os mostra. */
export const PAYMENT_ALERT_KINDS = ['paid_twice', 'paid_after_cancel'] as const

export type PaymentAlertKind = (typeof PAYMENT_ALERT_KINDS)[number]

/** O que a regra lê de cada linha de `order_payment_alerts`. */
export interface PaymentAlertInput {
  kind: string
}

export const PAYMENT_ALERT_LABELS: Record<PaymentAlertKind, string> = {
  paid_twice: 'Pago duas vezes — devolver um dos valores',
  paid_after_cancel: 'Pago depois de cancelado — devolver o valor',
}

export const PAYMENT_NOT_RECORDED_LABEL = 'Pagamento não registrado'

/** Um selo do bloco Pagamento. */
export interface PaymentFlag {
  key: PaymentAlertKind | 'not_recorded'
  label: string
}

/**
 * O pedido foi levado (à mão) a Pago ou além, e o pagamento não foi aprovado nem registrado. O bloco
 * Pagamento diz "Pagamento não registrado", e a ação de registrar continua lá.
 */
export const paymentNotRecorded = (order: ManualPaymentOrderInput): boolean =>
  needsPaymentRecord(order, order.status)

/** Os selos do bloco, um por tipo: dois marcadores do mesmo tipo (duas cobranças a mais) são um selo. */
export const paymentFlags = (
  order: ManualPaymentOrderInput,
  alerts: readonly PaymentAlertInput[],
): PaymentFlag[] => {
  const tipos = new Set((alerts ?? []).map((a) => a.kind))
  const selos: PaymentFlag[] = PAYMENT_ALERT_KINDS.filter((k) => tipos.has(k)).map((k) => ({
    key: k,
    label: PAYMENT_ALERT_LABELS[k],
  }))
  if (paymentNotRecorded(order)) selos.push({ key: 'not_recorded', label: PAYMENT_NOT_RECORDED_LABEL })
  return selos
}
