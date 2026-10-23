// Conserto do QA da feature `73` (`BUG-20261022-situacao-fala-com-a-cliente-no-atelie`): os rótulos
// de `orders.status` e de `payment_status` subiram para `@estrelinha/core/orders`, porque o selo do
// app do ateliê lê as mesmas palavras. O painel REEXPORTA — e a régua é `toBe`, nunca `toEqual`:
// igualdade estrutural passaria com uma cópia colada, que é exatamente o segundo dono.
import { describe, expect, it } from 'vitest'
import { ORDER_PAYMENT_STATUS_LABELS, ORDER_STATUS_LABELS } from '@estrelinha/core/orders'
import { PAYMENT_STATUS_LABELS } from './orderQuery'
import { STATUS_LABELS } from './useAdminOrders'

describe('os rótulos do painel são os de core, por referência', () => {
  it('STATUS_LABELS é ORDER_STATUS_LABELS', () => {
    expect(STATUS_LABELS).toBe(ORDER_STATUS_LABELS)
  })

  it('PAYMENT_STATUS_LABELS é ORDER_PAYMENT_STATUS_LABELS', () => {
    expect(PAYMENT_STATUS_LABELS).toBe(ORDER_PAYMENT_STATUS_LABELS)
  })

  it('sensor: uma cópia com os mesmos valores reprova na régua', () => {
    const copia = { ...ORDER_STATUS_LABELS }
    expect(copia).toEqual(ORDER_STATUS_LABELS)
    expect(copia).not.toBe(ORDER_STATUS_LABELS)
  })
})
