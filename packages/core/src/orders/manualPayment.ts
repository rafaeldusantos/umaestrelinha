// O pagamento registrado à mão: um pagamento feito por fora da loja (PIX direto, transferência,
// dinheiro, maquininha) que a admin registra no painel.
//
// As regras moram aqui, e não na tela, porque são lidas por mais de um lugar: a tela do registro
// recusa antes da rede, o dono da escrita (`order-actions/manualPayment.ts`) recusa antes de enviar
// qualquer arquivo, e a RPC `record_manual_payment` repete as recusas de data no banco — a única que
// impede requisição forjada. A cópia do SQL é deliberada; a do formato do arquivo é o bucket.
//
// Todo especificador relativo leva `.ts` (alcançável pelo Deno).

import { PROXIMO } from './nextStep.ts'
import type { PaymentAlertInput, PaymentAlertKind } from './paymentAlerts.ts'

/** O teto da observação do registro (o `check` da tabela tem o mesmo número). */
export const MANUAL_PAYMENT_NOTE_MAX = 1000

/** No máximo três comprovantes por registro. */
export const RECEIPT_MAX_FILES = 3

/** 10 MB por comprovante (o `file_size_limit` do bucket tem o mesmo número). */
export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024

/** O bucket PRIVADO dos comprovantes. Só admin lê e grava; a leitura é por URL assinada curta. */
export const RECEIPTS_BUCKET = 'order-payment-receipts'

/** Quanto dura o link de um comprovante aberto pelo painel: cinco minutos. */
export const RECEIPT_LINK_SECONDS = 300

/** A linha de histórico do registro, a mesma do banco (`record_manual_payment`). */
export const MANUAL_PAYMENT_HISTORY_NOTE = 'Pagamento registrado manualmente'

/** Os tipos aceitos, com as extensões que os reconhecem quando o navegador não informa o tipo. */
const TIPOS: Record<string, string> = {
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  heic: 'image/heic',
  heif: 'image/heif',
  pdf: 'application/pdf',
}

/** Os tipos que o bucket aceita (`allowed_mime_types`). */
export const RECEIPT_CONTENT_TYPES: readonly string[] = [...new Set(Object.values(TIPOS))]

/** O que a regra lê de um arquivo — o `File` do navegador satisfaz. */
export interface ReceiptFileInput {
  name: string
  type: string
  size: number
}

const extensao = (nome: string): string => {
  const ponto = nome.lastIndexOf('.')
  return ponto < 0 ? '' : nome.slice(ponto + 1).toLowerCase()
}

/**
 * O tipo do comprovante: o que o navegador informou, se é aceito; senão, o da extensão (a foto HEIC
 * do iPhone costuma chegar sem tipo). `null` quando nada o reconhece.
 */
export const receiptContentType = (arquivo: ReceiptFileInput): string | null => {
  const informado = (arquivo.type ?? '').trim().toLowerCase()
  if (RECEIPT_CONTENT_TYPES.includes(informado)) return informado
  if (informado !== '' && informado !== 'application/octet-stream') return null
  return TIPOS[extensao(arquivo.name)] ?? null
}

/** A extensão que o arquivo guardado leva, pelo tipo. */
export const receiptExtension = (contentType: string): string =>
  Object.keys(TIPOS).find((ext) => TIPOS[ext] === contentType && ext !== 'jpeg') ?? 'bin'

/** A recusa dos comprovantes, ANTES de qualquer envio. `null` quando todos passam. */
export const receiptRefusal = (arquivos: readonly ReceiptFileInput[]): string | null => {
  if (arquivos.length > RECEIPT_MAX_FILES) return `São no máximo ${RECEIPT_MAX_FILES} comprovantes por pagamento.`
  for (const a of arquivos) {
    if (receiptContentType(a) === null) return `${a.name} não é JPG, PNG, WebP, HEIC ou PDF.`
    if (!(a.size > 0)) return `${a.name} está vazio.`
    if (a.size > RECEIPT_MAX_BYTES) return `${a.name} passa de 10 MB.`
  }
  return null
}

const minuto = (ms: number): number => Math.floor(ms / 60000)

/**
 * A recusa da data e hora do pagamento: nunca no futuro, nunca antes da criação do pedido. A
 * comparação é por MINUTO — o campo não tem segundos, e o pedido criado às 12h00m30s pode ter sido
 * pago "às 12h00".
 */
export const paidAtRefusal = (
  paidAt: string | null | undefined,
  createdAt: string,
  agora: Date = new Date(),
): string | null => {
  const instante = paidAt ? new Date(paidAt).getTime() : NaN
  if (Number.isNaN(instante)) return 'Informe a data e a hora do pagamento.'
  if (minuto(instante) > minuto(agora.getTime())) return 'A data do pagamento não pode estar no futuro.'
  if (minuto(instante) < minuto(new Date(createdAt).getTime())) {
    return 'A data do pagamento não pode ser anterior à criação do pedido.'
  }
  return null
}

/** O que as duas regras de pedido leem. */
export interface ManualPaymentOrderInput {
  status: string
  payment_status: string | null
  paid_at: string | null
}

const PAGAMENTO_EM_ABERTO = ['pending', 'rejected', 'expired']

/** O registro existe para pagamento pendente, recusado ou vencido, e pedido não cancelado. */
export const canRecordManualPayment = (order: ManualPaymentOrderInput): boolean =>
  order.status !== 'cancelled' && !order.paid_at && PAGAMENTO_EM_ABERTO.includes(order.payment_status ?? '')

/** Os status que só um pedido pago alcança: Pago e tudo o que vem depois dele. */
const SO_PAGO = new Set(Object.values(PROXIMO).filter((s): s is string => Boolean(s)))

/**
 * O status é de um pedido que já passou pelo Pago (Pago, Separando, Enviado, Entregue)? É o recorte
 * que a oferta de pagar à cliente lê (`repix.ts`): um pedido que a loja avançou à mão sem pagamento
 * não tem nada a pagar na tela da cliente.
 */
export const reachedOnlyWhenPaid = (status: string | null | undefined): boolean => SO_PAGO.has(status ?? '')

/**
 * Levar o pedido a `para` pede o registro de pagamento? Sim quando o destino é Pago ou além, e o
 * pagamento não foi aprovado. É o que faz o "Avançar mesmo assim", o "Outro status" e o lote não
 * marcarem pago sem pagamento.
 */
export const needsPaymentRecord = (order: Pick<ManualPaymentOrderInput, 'payment_status' | 'paid_at'>, para: string): boolean =>
  SO_PAGO.has(para) && order.payment_status !== 'approved' && !order.paid_at

/** O teto do motivo de desfazer um registro (a RPC `undo_manual_payment` tem o mesmo número). */
export const MANUAL_PAYMENT_UNDO_REASON_MAX = 500

/** O marcador do pedido que a loja também recebeu (`order_payment_alerts`). */
const PAGO_DUAS_VEZES: PaymentAlertKind = 'paid_twice'

/**
 * Desfazer o pagamento registrado à mão: só com um registro manual VIVO e o pedido em Pago. Pagamento
 * aprovado pela loja não tem registro; em Separando, Enviado ou Entregue a peça já anda. E nunca no
 * pedido pago duas vezes: a loja também recebeu, então ele não tem por que voltar a Pendente nem sair
 * das vendas — a devolução de um dos valores é feita fora do painel. A RPC repete as três recusas — é
 * ela que impede a requisição forjada.
 */
export const canUndoManualPayment = (
  order: Pick<ManualPaymentOrderInput, 'status'>,
  temRegistroVivo: boolean,
  alertas: readonly PaymentAlertInput[] = [],
): boolean =>
  temRegistroVivo && order.status === 'paid' && !(alertas ?? []).some((a) => a.kind === PAGO_DUAS_VEZES)

/** A recusa do motivo do desfazer, antes da rede. `null` quando passa. */
export const undoReasonRefusal = (motivo: string | null | undefined): string | null => {
  const texto = (motivo ?? '').trim()
  if (texto === '') return 'Informe o motivo para desfazer o registro.'
  if (texto.length > MANUAL_PAYMENT_UNDO_REASON_MAX) {
    return `O motivo passa de ${MANUAL_PAYMENT_UNDO_REASON_MAX} caracteres.`
  }
  return null
}
