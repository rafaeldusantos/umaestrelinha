// Feature `76` · `MAC-05` (R1 do Design) — a página seguinte de uma lista ordenada por
// `last_activity_at desc nulls last, id asc`, nunca por `offset`: uma cliente que muda de posição
// entre duas leituras não repete nem pula ninguém.
//
// Três ramos quando o cursor tem data: mais antiga; mesma data com `id` maior (o desempate estável);
// e todos os nulos (que vêm depois de toda data com `nulls last`). Com o cursor já nos nulos, só o
// desempate por `id`. O instante vai ENTRE ASPAS e CRU, como o servidor devolveu (microssegundos e
// `+00:00` — passar por `Date` truncaria e o `eq` do desempate deixaria de casar; o probe da T02
// provou as nove janelas com empate, dois nulos e corte em cada fronteira).
import { isCustomerId } from './id.ts'

export const CUSTOMER_PAGE_SIZE = 25
export const CUSTOMER_ORDERS_PAGE_SIZE = 20

/** As strings do servidor, sem tratamento. */
export interface CustomerCursor {
  last_activity_at: string | null
  id: string
}

export const customerCursorFilter = (cursor: CustomerCursor): string => {
  // O id vai para uma string de `or()`: dado externo nunca entra sem validar.
  if (!isCustomerId(cursor?.id)) throw new Error('cursor de clientes com id que não é uuid')
  const id = cursor.id
  const t = cursor.last_activity_at
  if (t === null || t === undefined) return `and(last_activity_at.is.null,id.gt.${id})`
  if (typeof t !== 'string' || /["\\]/.test(t)) throw new Error('cursor de clientes com data inválida')
  const q = `"${t}"`
  return `last_activity_at.lt.${q},and(last_activity_at.eq.${q},id.gt.${id}),last_activity_at.is.null`
}
