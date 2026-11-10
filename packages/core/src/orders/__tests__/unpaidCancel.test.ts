import { describe, expect, it } from 'vitest'

import { REPIX_WINDOW_DAYS } from '../repix.ts'
import { UNPAID_CANCEL_DAYS, cancelledForNonPayment, unpaidCancelDue } from '../unpaidCancel.ts'

/**
 * A regra do recorte, sozinha. A function que cancela também filtra a consulta e a gravação pelo
 * banco — a garantia é repartida entre as duas —, e por isso cada metade precisa de prova própria:
 * aqui, sem consulta nenhuma na frente, a regra tem de recusar por si.
 */

const agora = new Date('2026-12-20T12:00:00.000Z')
const desde = '2026-11-01T00:00:00.000Z'
const vencido = {
  status: 'pending',
  payment_status: 'expired',
  paid_at: null,
  material_status: 'nao_aplicavel',
  nuvemshop_id: null,
  created_at: '2026-12-10T12:00:00.000Z',
}

describe('o prazo do cancelamento', () => {
  it('é o mesmo da janela da oferta do PIX novo — passado um, passou o outro', () => {
    expect(UNPAID_CANCEL_DAYS).toBe(REPIX_WINDOW_DAYS)
    expect(UNPAID_CANCEL_DAYS).toBe(7)
  })
})

describe('unpaidCancelDue', () => {
  it('o pendente sem pagamento, de 10 dias, depois do corte: vence', () => {
    expect(unpaidCancelDue(vencido, { agora, desde })).toBe(true)
  })

  it('com o material da cliente enviado ou recebido: nunca', () => {
    expect(unpaidCancelDue({ ...vencido, material_status: 'material_enviado' }, { agora, desde })).toBe(false)
    expect(unpaidCancelDue({ ...vencido, material_status: 'material_recebido' }, { agora, desde })).toBe(false)
  })

  it('criado antes da data de corte: nunca', () => {
    expect(unpaidCancelDue({ ...vencido, created_at: '2026-10-31T23:59:59.000Z' }, { agora, desde })).toBe(false)
  })

  it('importado da Nuvemshop: nunca', () => {
    expect(unpaidCancelDue({ ...vencido, nuvemshop_id: 99 }, { agora, desde })).toBe(false)
  })

  it('aprovado ou com `paid_at`, mesmo em Pendente: nunca', () => {
    expect(unpaidCancelDue({ ...vencido, payment_status: 'approved' }, { agora, desde })).toBe(false)
    expect(unpaidCancelDue({ ...vencido, paid_at: '2026-12-11T00:00:00.000Z' }, { agora, desde })).toBe(false)
  })

  it('fora de Pendente: nunca', () => {
    for (const status of ['paid', 'separating', 'shipped', 'delivered', 'cancelled']) {
      expect(unpaidCancelDue({ ...vencido, status }, { agora, desde }), status).toBe(false)
    }
  })
})

describe('cancelledForNonPayment — a marca, não o texto', () => {
  it('cancelado com a marca: sim; cancelado sem ela (pela admin): não', () => {
    expect(cancelledForNonPayment({ status: 'cancelled', unpaid_cancelled_at: '2026-12-20T12:00:00Z' })).toBe(true)
    expect(cancelledForNonPayment({ status: 'cancelled', unpaid_cancelled_at: null })).toBe(false)
    expect(cancelledForNonPayment({ status: 'cancelled', unpaid_cancelled_at: '  ' })).toBe(false)
  })

  it('com a marca e fora de cancelado: não', () => {
    expect(cancelledForNonPayment({ status: 'pending', unpaid_cancelled_at: '2026-12-20T12:00:00Z' })).toBe(false)
  })
})
