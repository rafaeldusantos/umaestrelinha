// Feature `76` · `MAC-23`, `MAC-24` (Q2b do `AD-060`) — "pedido em aberto" como DADO, no molde de
// `QUEUE_BLOCKS`. Em aberto é pedido PAGO (`payment_status = 'approved'`) e ainda em andamento
// (`pending`, `paid`, `separating`, `shipped`). O par `approved` é obrigatório: sem ele, um Pix
// expirado, rejeitado ou cancelado — que fica `pending` para sempre — deixaria a cliente "em aberto"
// indefinidamente, dizendo à Adri que há peça em andamento que não existe.
//
// A migration de `orders_open` carrega `openOrdersSqlFilter('v')` BYTE A BYTE; o guarda de schema lê
// a migration e compara. Importa só o arquivo-folha da fila (sem import), alcançável pelo Deno.
import { toSqlPredicate, type QueueRule } from '../orders/queue.ts'

export const OPEN_ORDER_STATUSES = ['pending', 'paid', 'separating', 'shipped'] as const

export const OPEN_ORDER_RULE: QueueRule = [
  { col: 'payment_status', op: 'eq', value: 'approved' },
  { col: 'status', op: 'in', value: OPEN_ORDER_STATUSES },
]

/** `count(v.order_id) filter (where …)` — a forma que a migration carrega. */
export const openOrdersSqlFilter = (alias = 'v'): string =>
  `count(${alias}.order_id) filter (where ${toSqlPredicate(OPEN_ORDER_RULE, alias)})`
