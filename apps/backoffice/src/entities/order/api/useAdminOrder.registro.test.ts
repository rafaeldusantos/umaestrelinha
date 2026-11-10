// O pedido lê os registros manuais de pagamento com os comprovantes: o VIVO é `manualPayment`, e os
// desfeitos continuam à vista em `undoneManualPayments` (desfazer não apaga o registro).
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarDuble, type Registro, type Resposta } from '@/test/dubleSupabase'

const estado = vi.hoisted(() => ({ from: null as null | ((t: string) => unknown) }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: (t: string) => estado.from!(t) } }))

import { MANUAL_PAYMENT_COLUMNS, useAdminOrder } from './useAdminOrder'

const ID = 'ord-1'
let calls: Registro[]
let registros: unknown

const responder = (r: Registro): Resposta => {
  if (r.table === 'orders') return { data: { id: ID, status: 'paid', customer_email: 'x@exemplo.invalid' }, error: null }
  if (r.table === 'order_manual_payments') return { data: registros, error: null }
  if (r.table === 'customer_list') return { data: null, error: null }
  return { data: [], error: null }
}

beforeEach(() => {
  registros = [
    {
      id: 'reg-1', method: 'transferencia', paid_at: '2026-11-09T15:30:00Z', note: 'Pagou no Itaú',
      created_by_name: 'Adri Muniz', created_at: '2026-11-09T15:40:00Z', undone_at: null,
      order_manual_payment_receipts: [{ id: 'c1', path: 'ord-1/a.pdf', content_type: 'application/pdf', size_bytes: 10 }],
    },
  ]
  const duble = criarDuble(responder)
  calls = duble.calls
  estado.from = duble.from as (t: string) => unknown
})

describe('useAdminOrder — o registro manual de pagamento', () => {
  it('pede os registros deste pedido, com os comprovantes, e o vivo é `manualPayment`', async () => {
    const { result } = renderHook(() => useAdminOrder(ID))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const leitura = calls.find((c) => c.table === 'order_manual_payments')!
    expect(leitura.select).toEqual([MANUAL_PAYMENT_COLUMNS])
    expect(MANUAL_PAYMENT_COLUMNS).toContain('order_manual_payment_receipts(')
    expect(leitura.filters).toEqual([
      { method: 'eq', args: ['order_id', ID] },
      { method: 'order', args: ['created_at', { ascending: false }] },
    ])
    expect(result.current.manualPayment).toEqual(registros[0])
    expect(result.current.undoneManualPayments).toEqual([])
  })

  it('o registro desfeito não vira `manualPayment`: fica em `undoneManualPayments`', async () => {
    const desfeito = {
      id: 'reg-0', method: 'pix_direto', paid_at: '2026-11-08T15:30:00Z', note: 'Engano de pedido',
      created_by_name: 'Adri Muniz', created_at: '2026-11-08T15:40:00Z', undone_at: '2026-11-08T16:00:00Z',
      undone_by_name: 'Adri Muniz', undone_reason: 'Era de outro pedido', order_manual_payment_receipts: [],
    }
    registros = [...(registros as unknown[]), desfeito]
    const { result } = renderHook(() => useAdminOrder(ID))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.manualPayment).toEqual((registros as unknown[])[0])
    expect(result.current.undoneManualPayments).toEqual([desfeito])
  })

  it('sem registro vivo, `manualPayment` é null', async () => {
    registros = []
    const { result } = renderHook(() => useAdminOrder(ID))
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.manualPayment).toBeNull()
  })
})
