// A escrita da observação do pedido — o texto que só quem administra lê.
//
// UM dono, porque o painel e o app do ateliê gravam a mesma observação: escrita duas vezes, a regra
// (aparar, o teto, vazio apaga, quem editou) divergiria sem nada quebrar. O client é INJETADO, como
// no resto de `order-actions`; o supabase-js entra só como tipo.
//
// `updated_at` NÃO vai daqui: quem o escreve é o banco (o `default now()` na criação e o trigger
// `before update` na edição). O app do ateliê grava pelo celular, e o relógio do aparelho não é régua.
//
// O efeito é conferido pela linha devolvida (`.select(...)`): a RLS de quem não tem papel responde
// sem erro e sem linha, e isso nunca é sucesso.

import {
  adminNoteRefusal,
  normalizeAdminNote,
} from '../orders/adminNote.ts'
import type { OrderWriteDeps } from './types.ts'

/** As colunas de `order_admin_notes`, na ordem em que o painel as lê. */
export const ORDER_ADMIN_NOTE_COLUMNS = 'order_id, note, updated_by, updated_by_name, updated_at'

/** Uma linha de `order_admin_notes`. */
export interface AdminNoteRow {
  order_id: string
  note: string
  updated_by: string | null
  updated_by_name: string | null
  updated_at: string
}

export interface WriteAdminNoteInput {
  orderId: string
  /** O texto como digitado. Aparado aqui; vazio (ou só espaço) APAGA a observação. */
  texto: string
  /** Quem grava (`auth.uid()`). */
  userId: string | null
  /** O nome de quem grava, guardado na linha: o painel não lê `auth.users`. */
  userName: string | null
}

/**
 * O desfecho, discriminado por STRING (`strictNullChecks: false`). `ok` traz a linha gravada, ou
 * `null` quando a observação foi apagada. `recusado` é o teto, decidido antes da rede.
 */
export type AdminNoteOutcome =
  | { tipo: 'ok'; nota: AdminNoteRow | null }
  | { tipo: 'recusado'; motivo: string }
  | { tipo: 'nenhuma-linha' }
  | { tipo: 'falhou'; erro: unknown }

export async function writeAdminNote(
  { client }: Pick<OrderWriteDeps, 'client'>,
  { orderId, texto, userId, userName }: WriteAdminNoteInput,
): Promise<AdminNoteOutcome> {
  const motivo = adminNoteRefusal(texto)
  if (motivo !== null) return { tipo: 'recusado', motivo }

  const note = normalizeAdminNote(texto)
  const nome = normalizeAdminNote(userName)

  let resposta: { data: unknown; error: unknown }
  try {
    resposta =
      note === ''
        ? await client.from('order_admin_notes').delete().eq('order_id', orderId).select(ORDER_ADMIN_NOTE_COLUMNS)
        : await client
            .from('order_admin_notes')
            .upsert(
              {
                order_id: orderId,
                note,
                updated_by: userId,
                updated_by_name: nome === '' ? null : nome,
              },
              { onConflict: 'order_id' },
            )
            .select(ORDER_ADMIN_NOTE_COLUMNS)
  } catch (erro) {
    return { tipo: 'falhou', erro }
  }
  if (resposta.error) return { tipo: 'falhou', erro: resposta.error }
  if (!Array.isArray(resposta.data) || resposta.data.length === 0) return { tipo: 'nenhuma-linha' }

  return { tipo: 'ok', nota: note === '' ? null : (resposta.data[0] as AdminNoteRow) }
}
