import { describe, expect, it } from 'vitest'

import { PAYMENT_ALERT_KINDS, paymentFlags, paymentNotRecorded } from '../paymentAlerts.ts'
import * as barril from '../index.ts'

/** Um pedido que a loja não viu pago: pagamento pendente, sem `paid_at`. */
const naoPago = (status: string) => ({ status, payment_status: 'pending', paid_at: null })

describe('"Pagamento não registrado" — o pedido levado à mão para Pago ou além, sem pagamento', () => {
  it.each(['paid', 'separating', 'shipped', 'delivered'])('em %s sem pagamento aprovado, sim', (status) => {
    expect(paymentNotRecorded(naoPago(status))).toBe(true)
  })

  it.each(['pending', 'cancelled'])('em %s, não: o pedido não foi levado adiante', (status) => {
    expect(paymentNotRecorded(naoPago(status))).toBe(false)
  })

  it('com o pagamento aprovado (pela loja ou registrado), não', () => {
    expect(paymentNotRecorded({ status: 'separating', payment_status: 'approved', paid_at: '2026-11-09T12:00:00Z' })).toBe(false)
  })

  it('com o pagamento recusado ou vencido e o pedido em Enviado, sim', () => {
    expect(paymentNotRecorded({ status: 'shipped', payment_status: 'rejected', paid_at: null })).toBe(true)
    expect(paymentNotRecorded({ status: 'shipped', payment_status: 'expired', paid_at: null })).toBe(true)
  })
})

describe('os selos do bloco Pagamento', () => {
  const pago = { status: 'paid', payment_status: 'approved', paid_at: '2026-11-09T12:00:00Z' }

  it('pago duas vezes', () => {
    expect(paymentFlags(pago, [{ kind: 'paid_twice' }])).toEqual([
      { key: 'paid_twice', label: 'Pago duas vezes — devolver um dos valores' },
    ])
  })

  it('pago depois de cancelado', () => {
    expect(paymentFlags({ status: 'cancelled', payment_status: 'pending', paid_at: null }, [{ kind: 'paid_after_cancel' }])).toEqual([
      { key: 'paid_after_cancel', label: 'Pago depois de cancelado — devolver o valor' },
    ])
  })

  it('pagamento não registrado, sem marcador nenhum', () => {
    expect(paymentFlags(naoPago('separating'), [])).toEqual([
      { key: 'not_recorded', label: 'Pagamento não registrado' },
    ])
  })

  it('o mesmo marcador gravado duas vezes (duas cobranças a mais) vira um selo só', () => {
    expect(paymentFlags(pago, [{ kind: 'paid_twice' }, { kind: 'paid_twice' }])).toHaveLength(1)
  })

  it('marcador desconhecido não vira selo, nem texto técnico', () => {
    expect(paymentFlags(pago, [{ kind: 'qualquer_coisa' }])).toEqual([])
  })

  it('pedido pago sem marcador: nenhum selo', () => {
    expect(paymentFlags(pago, [])).toEqual([])
  })

  it('os dois tipos de marcador são exatamente estes (a cópia do `check` do banco é guardada contra esta lista)', () => {
    expect([...PAYMENT_ALERT_KINDS]).toEqual(['paid_twice', 'paid_after_cancel'])
  })

  it('o barril de `orders` expõe a regra', () => {
    expect(barril.paymentFlags).toBe(paymentFlags)
    expect(barril.paymentNotRecorded).toBe(paymentNotRecorded)
  })
})
