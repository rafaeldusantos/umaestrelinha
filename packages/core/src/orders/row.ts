// Feature `74` (`MAP-16`, `MAP-17`, `MAP-47`) — o que a LINHA de um pedido diz sobre o tempo e a
// compra, com UM dono para o painel e para o app do ateliê. Subiu BYTE A BYTE de
// `apps/backoffice/src/entities/order/api/orderQuery.ts`; o painel reexporta por referência.
//
// A entrada é ESTRUTURAL (só as colunas lidas): este diretório não importa `@estrelinha/supabase`
// (`purity.test.ts`), e o `AdminOrderRow` do painel satisfaz a interface.
//
// Todo especificador relativo leva `.ts` (alcançável pelo Deno).

import { queueAge, type QueueAge } from '../material/aging.ts'

/** As colunas que a idade da linha lê. */
export interface RowQueueInput {
  created_at: string
  material_received_at: string | null
  material_status?: string | null
}

/**
 * Desde quando este pedido espera — a data que alimenta `queueAge`.
 *
 * Enquanto o envelope não chegou, o relógio corre desde a compra: é quando a cliente foi orientada
 * a mandar. Depois que chega, corre desde o recebimento — porque aí a espera é de outra coisa (a
 * bancada), e continuar contando desde a compra faria um pedido recém-recebido nascer vermelho.
 */
export const queueSince = (row: Pick<RowQueueInput, 'created_at' | 'material_received_at'>): string =>
  row.material_received_at ?? row.created_at

/** A idade da linha na fila, ou `null` quando o pedido não espera material nenhum. */
export const rowQueueAge = (
  row: Pick<RowQueueInput, 'created_at' | 'material_received_at' | 'material_status'>,
  now?: Date,
): QueueAge | null => {
  if (!row.material_status || row.material_status === 'nao_aplicavel') return null
  return queueAge(queueSince(row), now)
}

/**
 * A ordinal da compra, em texto: `1ª compra`, `3ª compra`.
 *
 * Aparece ao lado do nome porque muda o tom de tudo: alguém na terceira compra já confiou duas
 * vezes, e saber isso antes de escrever a mensagem importa num negócio memorial.
 */
export const purchaseOrdinalLabel = (n: number | null | undefined): string | null =>
  !n || n < 1 ? null : `${n}ª compra`
