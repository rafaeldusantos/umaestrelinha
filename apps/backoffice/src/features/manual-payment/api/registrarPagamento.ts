// A porta do painel para o registro manual de pagamento: o dono da escrita (`core/order-actions`)
// com o client do painel e a notificadora de sempre. A regra não mora aqui.

import { supabase } from '@estrelinha/supabase/client'
import {
  recordManualPayment,
  type ManualPaymentOutcome,
  type RecordManualPaymentInput,
} from '@estrelinha/core/order-actions'
import { notifyOrder, notifyOrderReport } from '@/entities/order/api/notifyOrder'

/**
 * O desfecho do dono, mais — só quando a caixa do e-mail foi desmarcada — se o aviso pulado ficou
 * anotado no histórico. `avisoAnotado: false` é a rede que caiu (ou o motor que não gravou) depois de
 * o pagamento já estar registrado: a tela não pode dizer "anotado".
 */
export type RegistroDePagamento = ManualPaymentOutcome & { avisoAnotado?: boolean }

export const registrarPagamento = async (input: RecordManualPaymentInput): Promise<RegistroDePagamento> => {
  if (input.avisarCliente !== false) return recordManualPayment({ client: supabase, notify: notifyOrder }, input)

  let avisoAnotado = false
  const r = await recordManualPayment(
    {
      client: supabase,
      notify: async (orderId, trigger, opcoes) => {
        const relatorio = await notifyOrderReport(orderId, trigger, opcoes)
        avisoAnotado = relatorio.skipRecorded
        return relatorio.customerSent
      },
    },
    input,
  )
  return r.tipo === 'ok' ? { ...r, avisoAnotado } : r
}
