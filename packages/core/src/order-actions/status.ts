// Feature `75` · `MAA-08`, `MAA-21`, `MAA-22`, A3, A4, A22, A24 — a escrita do status do pedido.
//
// Subiu de `useAdminOrders.updateStatus` (painel) com uma diferença declarada: o efeito é CONFERIDO
// por `.select('id')`. Um `update` que a RLS ou a guarda de status (`expectedFrom`) filtram responde
// sem erro e sem linha — antes isso passava como sucesso, gravava histórico e disparava aviso.
//
// O histórico é gravado e o resultado dele IGNORADO (paridade com o painel, Q8/R6): o status já
// mudou, e desfazê-lo porque a linha do histórico falhou seria pior. A saída atômica é a `BL-051`.
//
// O aviso fica FORA do `try`: a notificadora tem contrato de nunca lançar (`triggerOrderNotification`),
// e se um dia lançar quem chama precisa saber — é o que o painel prende hoje (`MAT-09`).

import type { OrderWriteDeps, WriteOutcome } from './types.ts'

export interface WriteOrderStatusInput {
  id: string
  to: string
  /** O status que a tela conhecia — vai para o histórico quando não há `expectedFrom`. */
  from: string | null | undefined
  /** A guarda: só grava se o pedido ainda estiver neste status. Vence `from` no histórico. */
  expectedFrom?: string
  note?: string
  /** Padrão `true`: dispara `order_status_changed`. */
  avisar?: boolean
}

export async function writeOrderStatus(
  { client, notify }: OrderWriteDeps,
  { id, to, from, expectedFrom, note, avisar = true }: WriteOrderStatusInput,
): Promise<WriteOutcome> {
  let resposta: { data: unknown; error: unknown }
  try {
    let consulta = client.from('orders').update({ status: to }).eq('id', id)
    if (expectedFrom != null) consulta = consulta.eq('status', expectedFrom)
    resposta = await consulta.select('id')
  } catch (erro) {
    return { tipo: 'falhou', erro }
  }
  if (resposta.error) return { tipo: 'falhou', erro: resposta.error }
  if (!Array.isArray(resposta.data) || resposta.data.length === 0) return { tipo: 'nenhuma-linha' }

  try {
    await client.from('order_status_history').insert({
      order_id: id,
      from_status: expectedFrom ?? from ?? null,
      to_status: to,
      note: note || null,
    })
  } catch {
    // ignorado — ver o cabeçalho
  }

  const emailSent = avisar ? await notify(id, 'order_status_changed') : false
  return { tipo: 'ok', emailSent }
}
