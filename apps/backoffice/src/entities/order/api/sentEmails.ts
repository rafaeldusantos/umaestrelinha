// Feature `88` (`AVS-19`, `AVS-21`) — o que as clientes JÁ receberam, para a previsão do lote e do
// cartão do celular.
//
// UMA consulta por gesto, e só quando a Adri aciona: `order_id in (ids)`, canal e-mail, status `sent`.
// Ler por linha seria uma ida ao servidor por pedido; ler ao abrir a lista seria ler o que ninguém
// pediu. Quem decide o que conta como "já recebeu" é `sentCustomerEvents` (`core`), não este arquivo.
//
// A leitura que falha LANÇA: sem saber o que já saiu, a previsão diria "sai de novo" a quem já recebeu,
// e o diálogo perguntaria a coisa errada. Quem chama diz "nada foi alterado" e não grava.

import { supabase } from '@estrelinha/supabase/client'
import { sentCustomerEvents, type NotificationEvent } from '@estrelinha/core/notifications'

export const SENT_EMAILS_READ_FAILED = 'Não consegui conferir os e-mails já enviados. Nada foi alterado.'

type Linha = { order_id: string; event: string; channel: string | null; status: string }

export async function fetchSentEmails(ids: readonly string[]): Promise<Map<string, Set<NotificationEvent>>> {
  const porPedido = new Map<string, Set<NotificationEvent>>()
  if (ids.length === 0) return porPedido

  const { data, error } = await supabase
    .from('order_notifications')
    .select('order_id, event, channel, status')
    .in('order_id', [...ids])
    .eq('channel', 'email')
    .eq('status', 'sent')
  if (error) throw new Error(SENT_EMAILS_READ_FAILED)

  const linhas = (data ?? []) as Linha[]
  for (const id of ids) {
    porPedido.set(id, sentCustomerEvents(linhas.filter((l) => l.order_id === id)))
  }
  return porPedido
}
