// A escrita do pagamento registrado à mão — um pagamento feito por fora da loja.
//
// O pedido é escrito SÓ pela RPC `record_manual_payment`, que aprova pelo mesmo corpo do webhook
// (`apply_payment_approval`, com a data e o autor): "este pedido foi pago?" continua tendo um dono.
// Este módulo faz o que a RPC não pode: recusar antes da rede (os arquivos, a data, a observação),
// enviar os comprovantes ao bucket privado, e disparar o gatilho `payment_recorded` com a escolha da
// caixa (feature `88`).
//
// Desfecho sem gravação — o pagamento aprovado enquanto o formulário estava aberto, uma recusa, a
// RPC falhando — APAGA os comprovantes que foram enviados: o registro não ficou, e eles não ficam.
//
// O client é injetado; o supabase-js entra só como tipo (`purity.test.ts`).

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  MANUAL_PAYMENT_NOTE_MAX,
  RECEIPTS_BUCKET,
  paidAtRefusal,
  receiptContentType,
  receiptExtension,
  receiptRefusal,
  undoReasonRefusal,
  type ReceiptFileInput,
} from '../orders/manualPayment.ts'
import { closeOrderCharge } from './charge.ts'
import { notifyWrite } from './notify.ts'
import type { OrderWriteDeps } from './types.ts'

/** A superfície do client que o registro usa: o bucket, a RPC e a function de notificação. */
export interface ManualPaymentDeps {
  client: Pick<SupabaseClient, 'rpc' | 'storage' | 'functions'>
  notify: OrderWriteDeps['notify']
}

export interface RecordManualPaymentInput {
  orderId: string
  /** `orders.created_at` — a data do pagamento não pode ser anterior a ele. */
  createdAt: string
  /** Um de `MANUAL_PAYMENT_METHODS`, ou `null` (o meio é opcional). */
  method: string | null
  /** O instante do pagamento (ISO), já convertido da hora de Brasília. Vazio ⇒ agora (o campo é opcional). */
  paidAt: string | null
  note: string | null
  /** Os comprovantes. O `File` do navegador satisfaz; o corpo enviado é o próprio objeto. */
  files: readonly ReceiptFileInput[]
  /** O nome de quem registra, gravado no registro: o painel não lê `auth.users`. */
  authorName: string | null
  /** Feature `88`: `false` ⇒ o gatilho sai sem o e-mail da cliente. Ausente ⇒ o gatilho de sempre. */
  avisarCliente?: boolean
  /** Para teste: o relógio e o gerador do nome do arquivo. */
  agora?: Date
  novoId?: () => string
}

/** O desfecho, discriminado por STRING (`strictNullChecks: false`). */
export type ManualPaymentOutcome =
  | { tipo: 'ok'; status: string; emailSent: boolean }
  | { tipo: 'recusado'; motivo: string }
  | { tipo: 'ja-pago' }
  | { tipo: 'sem-papel' }
  | { tipo: 'falhou-envio'; erro: unknown }
  | { tipo: 'falhou'; erro: unknown }

/** As recusas do banco, na voz do painel. As de data são as mesmas de `paidAtRefusal`. */
const RECUSAS_DO_BANCO: Record<string, string> = {
  data_futura: 'A data do pagamento não pode estar no futuro.',
  data_antes_do_pedido: 'A data do pagamento não pode ser anterior à criação do pedido.',
  pedido_cancelado: 'Pedido cancelado não recebe registro de pagamento.',
  indisponivel: 'O pagamento deste pedido foi estornado ou cancelado e não pode ser registrado.',
  nao_encontrado: 'Este pedido não existe (ou foi removido).',
  meio_invalido: 'Escolha um meio de pagamento da lista.',
  observacao_longa: `A observação passa de ${MANUAL_PAYMENT_NOTE_MAX} caracteres.`,
  comprovantes_invalidos: 'Algum comprovante não chegou ao armazenamento. Envie de novo.',
}

const novoIdPadrao = (): string => globalThis.crypto.randomUUID()

export async function recordManualPayment(
  { client, notify }: ManualPaymentDeps,
  input: RecordManualPaymentInput,
): Promise<ManualPaymentOutcome> {
  const { orderId, files, avisarCliente } = input
  const nota = (input.note ?? '').trim()
  const agora = input.agora ?? new Date()
  const paidAt = input.paidAt ?? agora.toISOString()

  // Tudo o que se decide sem rede, antes da rede.
  const recusa =
    receiptRefusal(files) ??
    paidAtRefusal(paidAt, input.createdAt, agora) ??
    (nota.length > MANUAL_PAYMENT_NOTE_MAX ? `A observação passa de ${MANUAL_PAYMENT_NOTE_MAX} caracteres.` : null)
  if (recusa !== null) return { tipo: 'recusado', motivo: recusa }

  const bucket = client.storage.from(RECEIPTS_BUCKET)
  const novoId = input.novoId ?? novoIdPadrao
  const comprovantes: { path: string; content_type: string; size_bytes: number }[] = []

  const apagarEnviados = async (): Promise<void> => {
    if (comprovantes.length === 0) return
    try {
      await bucket.remove(comprovantes.map((c) => c.path))
    } catch {
      // Sobra um objeto no bucket privado, sem registro que aponte para ele: só admin o vê.
    }
  }

  for (const arquivo of files) {
    const contentType = receiptContentType(arquivo) as string
    const path = `${orderId}/${novoId()}.${receiptExtension(contentType)}`
    let erro: unknown = null
    try {
      const r = await bucket.upload(path, arquivo as unknown as Blob, { contentType, upsert: false })
      erro = r.error
    } catch (e) {
      erro = e
    }
    if (erro) {
      await apagarEnviados()
      return { tipo: 'falhou-envio', erro }
    }
    comprovantes.push({ path, content_type: contentType, size_bytes: arquivo.size })
  }

  let resposta: { data: unknown; error: unknown }
  try {
    resposta = await client.rpc('record_manual_payment', {
      p_order_id: orderId,
      p_method: input.method ?? null,
      p_paid_at: paidAt,
      p_note: nota === '' ? null : nota,
      p_receipts: comprovantes,
      p_author_name: input.authorName,
    })
  } catch (erro) {
    await apagarEnviados()
    return { tipo: 'falhou', erro }
  }
  if (resposta.error) {
    await apagarEnviados()
    return { tipo: 'falhou', erro: resposta.error }
  }

  const dado = (resposta.data ?? {}) as { result?: string; status?: string }
  if (dado.result !== 'ok') {
    await apagarEnviados()
    if (dado.result === 'ja_pago') return { tipo: 'ja-pago' }
    if (dado.result === 'sem_papel') return { tipo: 'sem-papel' }
    const motivo = RECUSAS_DO_BANCO[dado.result ?? '']
    return motivo ? { tipo: 'recusado', motivo } : { tipo: 'falhou', erro: dado }
  }

  // Registrado, a cobrança que ficou aberta no Mercado Pago (o PIX copiado antes, o cartão em análise)
  // é fechada: senão a cliente ainda poderia pagar de novo. Não lança e não desfaz o registro.
  await closeOrderCharge(client, orderId)

  const emailSent = await notifyWrite(notify, orderId, 'payment_recorded', avisarCliente)
  return { tipo: 'ok', status: dado.status ?? 'paid', emailSent }
}

/** A superfície do client que o desfazer usa: só a RPC. Nenhum aviso sai — não há notificadora. */
export interface UndoManualPaymentDeps {
  client: Pick<SupabaseClient, 'rpc'>
}

export interface UndoManualPaymentInput {
  orderId: string
  /** O motivo, obrigatório (aparado aqui e no banco). */
  reason: string
  /** O nome de quem desfaz, gravado no registro: o painel não lê `auth.users`. */
  authorName: string | null
}

/** O desfecho do desfazer, discriminado por STRING. Sem `emailSent`: desfazer não manda e-mail. */
export type UndoManualPaymentOutcome =
  | { tipo: 'ok'; status: string }
  | { tipo: 'recusado'; motivo: string }
  | { tipo: 'sem-papel' }
  | { tipo: 'falhou'; erro: unknown }

/** As recusas da RPC `undo_manual_payment`, na voz do painel. */
const RECUSAS_DO_DESFAZER: Record<string, string> = {
  nao_encontrado: 'Este pedido não existe (ou foi removido).',
  motivo_vazio: 'Informe o motivo para desfazer o registro.',
  motivo_longo: 'O motivo é longo demais.',
  sem_registro: 'Este pedido não tem pagamento registrado à mão para desfazer.',
  fora_de_pago: 'Só dá para desfazer com o pedido em Pago.',
  indisponivel: 'O pagamento deste pedido mudou depois do registro e não pode ser desfeito aqui.',
  pago_duas_vezes: 'A loja também recebeu este pagamento: o pedido continua Pago. Devolva um dos valores fora do painel.',
}

/**
 * Desfaz o pagamento registrado à mão, pela RPC `undo_manual_payment` — a única exceção de "aprovado
 * não regride", e só para o registro manual: o pedido volta a Pendente com o `payment_status` de antes,
 * o estoque baixado e o uso do cupom devolvidos. Nenhum aviso sai (não há gatilho para o desfazer).
 */
export async function undoManualPayment(
  { client }: UndoManualPaymentDeps,
  input: UndoManualPaymentInput,
): Promise<UndoManualPaymentOutcome> {
  const recusa = undoReasonRefusal(input.reason)
  if (recusa !== null) return { tipo: 'recusado', motivo: recusa }

  let resposta: { data: unknown; error: unknown }
  try {
    resposta = await client.rpc('undo_manual_payment', {
      p_order_id: input.orderId,
      p_reason: input.reason.trim(),
      p_author_name: input.authorName,
    })
  } catch (erro) {
    return { tipo: 'falhou', erro }
  }
  if (resposta.error) return { tipo: 'falhou', erro: resposta.error }

  const dado = (resposta.data ?? {}) as { result?: string; status?: string }
  if (dado.result === 'ok') return { tipo: 'ok', status: dado.status ?? 'pending' }
  if (dado.result === 'sem_papel') return { tipo: 'sem-papel' }
  const motivo = RECUSAS_DO_DESFAZER[dado.result ?? '']
  return motivo ? { tipo: 'recusado', motivo } : { tipo: 'falhou', erro: dado }
}
