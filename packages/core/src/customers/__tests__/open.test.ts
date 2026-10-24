import { describe, expect, it } from 'vitest'

import { toPostgrestFilter, type QueueCond, type QueueRule } from '../../orders/queue.ts'
import { OPEN_ORDER_RULE, OPEN_ORDER_STATUSES, openOrdersSqlFilter } from '../open.ts'

/** Avalia uma regra da fila sobre um pedido (dado), sem SQL — o que a regra DIZ. */
const casa = (rule: QueueRule, pedido: Record<string, string | null>): boolean => {
  const um = (c: QueueCond): boolean => {
    if ('any' in c) return c.any.some(um)
    const v = pedido[c.col]
    if (c.op === 'eq') return v === c.value
    if (c.op === 'in') return c.value.includes(v as string)
    return v === null
  }
  return rule.every(um)
}

describe('OPEN_ORDER_RULE (Q2b)', () => {
  it('os estados em andamento são quatro, na ordem', () => {
    expect([...OPEN_ORDER_STATUSES]).toEqual(['pending', 'paid', 'separating', 'shipped'])
  })

  it('a regra é "pagamento aprovado" E "status em andamento"', () => {
    expect(OPEN_ORDER_RULE).toEqual([
      { col: 'payment_status', op: 'eq', value: 'approved' },
      { col: 'status', op: 'in', value: ['pending', 'paid', 'separating', 'shipped'] },
    ])
  })

  it('os quatro pares da Q2b, como DADO', () => {
    // Pix expirado fica `pending` para sempre: NÃO é pedido em aberto.
    expect(casa(OPEN_ORDER_RULE, { status: 'pending', payment_status: 'expired' })).toBe(false)
    // Entregue e pago: terminou.
    expect(casa(OPEN_ORDER_RULE, { status: 'delivered', payment_status: 'approved' })).toBe(false)
    // Cancelado (mesmo com pagamento aprovado antes): terminou.
    expect(casa(OPEN_ORDER_RULE, { status: 'cancelled', payment_status: 'approved' })).toBe(false)
    // Pago e a caminho: em aberto.
    expect(casa(OPEN_ORDER_RULE, { status: 'paid', payment_status: 'approved' })).toBe(true)
  })

  it('os demais pares: pendente aprovado, em separação e enviado contam; pix pendente/rejeitado não', () => {
    for (const status of ['pending', 'separating', 'shipped'])
      expect(casa(OPEN_ORDER_RULE, { status, payment_status: 'approved' })).toBe(true)
    for (const pay of ['pending', 'rejected', 'cancelled', 'refunded'])
      expect(casa(OPEN_ORDER_RULE, { status: 'pending', payment_status: pay })).toBe(false)
  })

  it('a forma PostgREST da regra também sai (uma única regra, dois tradutores)', () => {
    expect(toPostgrestFilter(OPEN_ORDER_RULE)).toBe(
      'and(payment_status.eq.approved,status.in.(pending,paid,separating,shipped))',
    )
  })
})

describe('openOrdersSqlFilter — a forma que a migration carrega', () => {
  it('com o alias "v", por extenso', () => {
    expect(openOrdersSqlFilter('v')).toBe(
      "count(v.order_id) filter (where v.payment_status = 'approved' and v.status in ('pending', 'paid', 'separating', 'shipped'))",
    )
  })

  it('o alias padrão é "v"', () => {
    expect(openOrdersSqlFilter()).toBe(openOrdersSqlFilter('v'))
  })

  it('outro alias muda só o alias', () => {
    expect(openOrdersSqlFilter('o')).toBe(
      "count(o.order_id) filter (where o.payment_status = 'approved' and o.status in ('pending', 'paid', 'separating', 'shipped'))",
    )
  })

  it('alias inválido LANÇA (nada vira SQL fora do vocabulário)', () => {
    for (const ruim of ['', 'v; drop table', 'V', '1v', 'v.x']) expect(() => openOrdersSqlFilter(ruim)).toThrow()
  })
})
