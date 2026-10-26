// `PED-27` — histórico é **um** fluxo.
//
// Feature `74` (`MAP-28`, `MAP-47`, `MAP-48`): `buildHistory` subiu BYTE A BYTE de
// `apps/backoffice/src/features/order-detail/model/history.ts` — o painel e o app do ateliê contam a
// mesma história de um pedido. As entradas são estruturais (`HistoryStatusRow`,
// `HistoryNotificationRow`, `HistoryNoteRow`): os tipos do painel as satisfazem. Os FILTROS por tipo
// (`HISTORY_FILTERS`, `filterHistory`) ficam no painel: só ele filtra.
//
// ---------------------------------------------------------------------------------------------
// POR QUE AS ABAS `Timeline` E `Notas` DEIXAM DE EXISTIR SEPARADAS
// ---------------------------------------------------------------------------------------------
// As duas respondiam a mesma pergunta — "o que aconteceu com este pedido?" — e a resposta ficava
// partida em dois lugares que **não se ordenavam entre si**. Para reconstruir a sequência real era
// preciso abrir uma aba, ler as datas, abrir a outra e intercalar de cabeça. E o terceiro fio, os
// e-mails, não aparecia em aba nenhuma: não havia como saber se a cliente tinha sido avisada.
//
// Todo especificador relativo leva `.ts` (alcançável pelo Deno).

import { NOTIFICATION_EVENT_NAMES } from '../notifications/catalog.ts'
import { NOTIFICATION_EVENT_LABELS, isNotificationEvent } from '../notifications/events.ts'
import { ORDER_STATUS_LABELS } from './labels.ts'

const STATUS_LABELS: Record<string, string> = ORDER_STATUS_LABELS

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

/** Uma linha de `order_status_history`, só com o que o histórico lê. */
export interface HistoryStatusRow {
  id: string
  from_status: string | null
  to_status: string
  note: string | null
  created_at: string
}

/** Uma linha de `order_notifications`, só com o que o histórico lê. */
export interface HistoryNotificationRow {
  id: string
  event: string
  channel?: string
  status: string
  attempts: number
  delivery_status: string | null
  error: string | null
  created_at: string
  sent_at: string | null
  /** Feature `79`: no canal `push`, `push:<entregues>/<total>` — a contagem dos aparelhos. */
  provider_message_id?: string | null
}

/** Uma linha de `order_notes`, só com o que o histórico lê. */
export interface HistoryNoteRow {
  id: string
  note: string
  created_at: string
  created_by: string | null
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

/**
 * O NOME do evento, para a linha de FALHA (`BUG-20261024-falha-de-aviso-diz-enviado`).
 *
 * `NOTIFICATION_EVENT_LABELS` responde "o que aconteceu com este pedido?" e está no passado
 * ("Aviso de postagem enviado") — certo para o e-mail que saiu, e contraditório dentro de "Falha ao
 * enviar". `NOTIFICATION_EVENT_NAMES` responde "que evento é este?" (`core/notifications/catalog.ts`),
 * e é a pergunta que a falha faz. São dois mapas de propósito; ver o cabeçalho de `catalog.ts`.
 */
const nomeDoEvento = (event: string): string =>
  isNotificationEvent(event) ? NOTIFICATION_EVENT_NAMES[event] : event

/** Como o canal aparece na linha. `email` fica implícito; o WhatsApp precisa se identificar. */
const rotuloDoCanal = (channel: string | undefined): string =>
  channel === 'whatsapp' ? 'WhatsApp' : channel === 'push' ? 'Celular' : 'E-mail'

/** Feature `79`: a falha do aviso no celular tem frase própria — não é a cliente quem deixou de saber. */
const PUSH_FALHOU = 'O aviso no celular não chegou.'

/**
 * Feature `79` (`MAN-09`): a entrega parcial do push. `push:2/3` vira "Entregue a 2 de 3 aparelhos";
 * entregue a todos (X = Y), ou qualquer outra forma, não diz nada.
 */
const entregaParcial = (e: HistoryNotificationRow): string | null => {
  if (e.channel !== 'push') return null
  const m = /^push:(\d+)\/(\d+)$/.exec(e.provider_message_id ?? '')
  if (!m) return null
  const [x, y] = [Number(m[1]), Number(m[2])]
  return x < y ? `Entregue a ${x} de ${y} aparelhos` : null
}

/**
 * Funde os três fios num só, do mais recente para o mais antigo.
 *
 * Ordem decrescente porque a pergunta que se faz ao abrir um pedido é "o que aconteceu por último?",
 * e não "como isso começou?".
 */
/** `event` é o nome de hoje; `type` é o da view de compatibilidade, durante a janela de deploy. */
const evento = (e: HistoryNotificationRow & { type?: string }): string => e.event ?? e.type ?? ''

/** O que o WhatsApp devolve de confirmação (feature 43). E-mail não tem — o Resend não avisa. */
const ROTULO_ENTREGA: Record<string, string> = {
  sent_to_server: 'Enviado ao servidor',
  delivered: 'Entregue',
  read: 'Lido',
}

// Genérica nas três entradas para o chamador passar as linhas como as tem (com `order_id` e o resto),
// sem o compilador recusar a coluna a mais: a regra só lê as da interface.
export const buildHistory = <
  S extends HistoryStatusRow,
  E extends HistoryNotificationRow,
  N extends HistoryNoteRow,
>(
  status: S[],
  emails: E[],
  notes: N[],
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
    // Feature `79` (`MAN-38`): o push que falhou não se reenvia — a linha não carrega `emailType` nem
    // `emailChannel`, e o painel só desenha "Reenviar" com `emailType`.
    if (e.channel === 'push' && !saiu) {
      eventos.push({
        id: `email-${e.id}`,
        kind: 'email',
        at: e.sent_at ?? e.created_at,
        title: PUSH_FALHOU,
        detail: e.error ?? null,
        emailSent: false,
      })
      continue
    }
    eventos.push({
      id: `email-${e.id}`,
      kind: 'email',
      // `sent_at` quando saiu, `created_at` quando não: a linha do tempo tem de marcar QUANDO a
      // coisa aconteceu, e para um e-mail que falhou o que aconteceu foi a tentativa.
      at: e.sent_at ?? e.created_at,
      title: saiu
        ? `${rotuloDoEvento(evento(e))} (${rotuloDoCanal(e.channel)})`
        : `Falha ao enviar o aviso: ${nomeDoEvento(evento(e))} (${rotuloDoCanal(e.channel)})`,
      detail: saiu
        ? [
            e.attempts > 1 ? `Enviado na ${e.attempts}ª tentativa` : null,
            e.delivery_status ? ROTULO_ENTREGA[e.delivery_status] : null,
            entregaParcial(e),
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
