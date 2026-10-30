// Feature `75` · `MAA-13`, `MAA-14`, `MAA-21`, A9, A25 — a escrita do código de rastreio.
//
// Subiu de `useAdminOrders.addTrackingCode` (painel). **Não normaliza nem valida o código**: a regra
// de A8 (`normalizeTrackingCode`, `trackingCodeRefusal`) vale só no app, e mora em `runAppAction`.
// Normalizar aqui mudaria o que o painel grava.
//
// `shipping_carrier` só entra no `update` quando o chamador a passa (A9): o app não tem campo de
// transportadora e não pode apagar a que o painel gravou. O painel passa `carrier.trim()` — a string
// vazia vai como `''`, como hoje.
//
// Sem histórico (é o que o painel faz). `statusIn` é a guarda de A25.

import { notifyWrite } from './notify.ts'
import type { OrderWriteDeps, WriteOutcome } from './types.ts'

export interface WriteTrackingCodeInput {
  id: string
  code: string
  carrier?: string | null
  /** A guarda: só grava se o pedido estiver num destes status. */
  statusIn?: string[]
  /** Padrão `true`: dispara `order_status_changed` (o outro lado do par, TRG-12). */
  avisar?: boolean
  /** Feature `88`: `false` ⇒ o gatilho sai sem os e-mails da cliente (`AVS-04`). Só vale com `avisar`. */
  avisarCliente?: boolean
}

export async function writeTrackingCode(
  { client, notify }: OrderWriteDeps,
  { id, code, carrier, statusIn, avisar = true, avisarCliente }: WriteTrackingCodeInput,
): Promise<WriteOutcome> {
  const valores: { tracking_code: string; shipping_carrier?: string | null } = { tracking_code: code }
  if (carrier !== undefined) valores.shipping_carrier = carrier

  let resposta: { data: unknown; error: unknown }
  try {
    let consulta = client.from('orders').update(valores).eq('id', id)
    if (statusIn != null) consulta = consulta.in('status', statusIn)
    resposta = await consulta.select('id')
  } catch (erro) {
    return { tipo: 'falhou', erro }
  }
  if (resposta.error) return { tipo: 'falhou', erro: resposta.error }
  if (!Array.isArray(resposta.data) || resposta.data.length === 0) return { tipo: 'nenhuma-linha' }

  const emailSent = avisar ? await notifyWrite(notify, id, 'order_status_changed', avisarCliente) : false
  return { tipo: 'ok', emailSent }
}
