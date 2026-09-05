// `PED-27` — histórico é **um** fluxo.
//
// ---------------------------------------------------------------------------------------------
// POR QUE AS ABAS `Timeline` E `Notas` DEIXAM DE EXISTIR SEPARADAS
// ---------------------------------------------------------------------------------------------
// As duas respondiam a mesma pergunta — "o que aconteceu com este pedido?" — e a resposta ficava
// partida em dois lugares que **não se ordenavam entre si**. Para reconstruir a sequência real era
// preciso abrir uma aba, ler as datas, abrir a outra e intercalar de cabeça. E o terceiro fio, os
// e-mails, não aparecia em aba nenhuma: não havia como saber se a cliente tinha sido avisada.
//
// Aqui os três viram uma lista só, ordenada por tempo, filtrável por tipo. O filtro é o que
// devolve a aba a quem a queria — sem obrigar quem quer a sequência a montá-la na cabeça.

import { STATUS_LABELS } from '@/entities/order/api/useAdminOrders'
import type { OrderEmailEvent } from '@/entities/order/api/useAdminOrder'
import type { DbOrderNote, DbOrderStatusHistory } from '@estrelinha/supabase/types'

export type HistoryKind = 'status' | 'email' | 'note'

export interface HistoryEvent {
  id: string
  kind: HistoryKind
  at: string
  title: string
  detail: string | null
  /** Só para `email`: se saiu. `false` habilita o reenviar (`PED-28`). */
  emailSent?: boolean
  /** O `type` do e-mail, para o reenvio saber qual template repetir. */
  emailType?: string
  author?: string | null
}

const EMAIL_LABELS: Record<string, string> = {
  order_shipped: 'Aviso de postagem enviado',
  material_received: 'Aviso de material recebido enviado',
  order_confirmed: 'Confirmação do pedido enviada',
  payment_approved: 'Aviso de pagamento aprovado enviado',
}

const rotuloDoEmail = (type: string): string => EMAIL_LABELS[type] ?? `E-mail ${type} enviado`

/**
 * Funde os três fios num só, do mais recente para o mais antigo.
 *
 * Ordem decrescente porque a pergunta que se faz ao abrir um pedido é "o que aconteceu por último?",
 * e não "como isso começou?".
 */
export const buildHistory = (
  status: DbOrderStatusHistory[],
  emails: OrderEmailEvent[],
  notes: DbOrderNote[],
): HistoryEvent[] => {
  const eventos: HistoryEvent[] = []

  for (const h of status) {
    eventos.push({
      id: `status-${h.id}`,
      kind: 'status',
      at: h.created_at,
      title: h.from_status
        ? `${STATUS_LABELS[h.from_status] ?? h.from_status} → ${STATUS_LABELS[h.to_status] ?? h.to_status}`
        : `Pedido ${STATUS_LABELS[h.to_status] ?? h.to_status}`,
      detail: h.note,
    })
  }

  for (const e of emails) {
    const saiu = e.status === 'sent'
    eventos.push({
      id: `email-${e.id}`,
      kind: 'email',
      // `sent_at` quando saiu, `created_at` quando não: a linha do tempo tem de marcar QUANDO a
      // coisa aconteceu, e para um e-mail que falhou o que aconteceu foi a tentativa.
      at: e.sent_at ?? e.created_at,
      title: saiu ? rotuloDoEmail(e.type) : `Falha ao enviar ${e.type}`,
      detail: saiu
        ? e.attempts > 1
          ? `Enviado na ${e.attempts}ª tentativa`
          : null
        : (e.error ?? 'A cliente NÃO foi avisada'),
      emailSent: saiu,
      emailType: e.type,
    })
  }

  for (const n of notes) {
    eventos.push({
      id: `note-${n.id}`,
      kind: 'note',
      at: n.created_at,
      title: 'Nota interna',
      detail: n.note,
      author: n.created_by,
    })
  }

  return eventos.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
}

export const HISTORY_FILTERS: { id: HistoryKind | 'all'; label: string }[] = [
  { id: 'all', label: 'Tudo' },
  { id: 'status', label: 'Status' },
  { id: 'email', label: 'E-mails' },
  { id: 'note', label: 'Notas' },
]

export const filterHistory = (
  eventos: HistoryEvent[],
  filtro: HistoryKind | 'all',
): HistoryEvent[] => (filtro === 'all' ? eventos : eventos.filter(e => e.kind === filtro))
