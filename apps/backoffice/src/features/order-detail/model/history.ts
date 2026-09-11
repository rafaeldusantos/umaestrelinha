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
import { NOTIFICATION_EVENT_LABELS, isNotificationEvent } from '@estrelinha/core/notifications'
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
  /** O evento, para o reenvio saber qual mensagem repetir. */
  emailType?: string
  /** O canal da tentativa — o reenvio repete no MESMO canal. */
  emailChannel?: string
  author?: string | null
}

/**
 * O rótulo vem de `core` (`FIX-02`), e é um `Record` COMPLETO: evento novo sem rótulo é erro de
 * compilação, não fallback.
 *
 * O que existia aqui antes era um `Record<string, string>` com QUATRO chaves, das quais duas
 * (`order_confirmed`, `payment_approved`) **nunca existiram** no vocabulário do banco — e as duas
 * que de fato ocorriam (`order_received`, `order_paid`) caíam no fallback, fazendo a admin ler
 * "E-mail order_received enviado". Nenhum teste cobria os rótulos.
 */
const rotuloDoEvento = (event: string): string =>
  isNotificationEvent(event) ? NOTIFICATION_EVENT_LABELS[event] : `Aviso ${event} enviado`

/** Como o canal aparece na linha. `email` fica implícito; o WhatsApp precisa se identificar. */
const rotuloDoCanal = (channel: string | undefined): string =>
  channel === 'whatsapp' ? 'WhatsApp' : 'E-mail'

/**
 * Funde os três fios num só, do mais recente para o mais antigo.
 *
 * Ordem decrescente porque a pergunta que se faz ao abrir um pedido é "o que aconteceu por último?",
 * e não "como isso começou?".
 */
/** `event` é o nome de hoje; `type` é o da view de compatibilidade, durante a janela de deploy. */
const evento = (e: OrderEmailEvent & { type?: string }): string => e.event ?? e.type ?? ''

/** O que o WhatsApp devolve de confirmação (feature 43). E-mail não tem — o Resend não avisa. */
const ROTULO_ENTREGA: Record<string, string> = {
  sent_to_server: 'Enviado ao servidor',
  delivered: 'Entregue',
  read: 'Lido',
}

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
      title: saiu
        ? `${rotuloDoEvento(evento(e))} (${rotuloDoCanal(e.channel)})`
        : `Falha ao enviar ${rotuloDoEvento(evento(e)).toLowerCase()} (${rotuloDoCanal(e.channel)})`,
      detail: saiu
        ? [
            e.attempts > 1 ? `Enviado na ${e.attempts}ª tentativa` : null,
            e.delivery_status ? ROTULO_ENTREGA[e.delivery_status] : null,
          ]
            .filter(Boolean)
            .join(' · ') || null
        : (e.error ?? 'A cliente NÃO foi avisada'),
      emailSent: saiu,
      emailType: evento(e),
      emailChannel: e.channel ?? 'email',
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
