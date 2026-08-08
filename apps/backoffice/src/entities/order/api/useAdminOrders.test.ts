import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendOrderEmailMock = vi.fn<(orderId: string, type: string) => Promise<boolean>>()

/** Resultado do `.update().eq()` — trocado por teste para exercitar o caminho de falha. */
let updateResult: { error: unknown } = { error: null }
const updateCalls: Array<{ table: string; values: Record<string, unknown> }> = []

vi.mock('@estrelinha/supabase/client', () => {
  // Cadeia mínima: só a superfície que `useAdminOrders` usa. Um dublê que imita o supabase-js
  // inteiro dá falso verde (mesma regra dos dublês das edge functions).
  function makeChain(table: string) {
    const chain: any = {
      select: () => chain,
      order: () => chain,
      eq: () => chain,
      gte: () => chain,
      lte: () => chain,
      or: () => chain,
      range: () => Promise.resolve({ data: [], error: null, count: 0 }),
      insert: () => Promise.resolve({ error: null }),
      update: (values: Record<string, unknown>) => {
        updateCalls.push({ table, values })
        return { eq: () => Promise.resolve(updateResult) }
      },
      // Awaitable sem terminador — é como `fetchStatusCounts` lê `select('status')`.
      then: (resolve: (v: unknown) => unknown) =>
        Promise.resolve({ data: [], error: null, count: 0 }).then(resolve),
    }
    return chain
  }

  const channel: any = { on: () => channel, subscribe: () => channel }

  return {
    supabase: {
      from: (table: string) => makeChain(table),
      channel: () => channel,
      removeChannel: () => {},
    },
  }
})

vi.mock('./sendOrderEmail', () => ({
  sendOrderEmail: (orderId: string, type: string) => sendOrderEmailMock(orderId, type),
}))

import { useAdminOrders } from './useAdminOrders'

const ORDER_ID = 'ord-1'

async function mountHook() {
  const view = renderHook(() => useAdminOrders())
  await waitFor(() => expect(view.result.current.loading).toBe(false))
  return view
}

beforeEach(() => {
  updateResult = { error: null }
  updateCalls.length = 0
  sendOrderEmailMock.mockReset()
  sendOrderEmailMock.mockResolvedValue(true)
})

describe('TRG-12 — os DOIS escritores tentam o e-mail de enviado', () => {
  it('updateStatus para `shipped` tenta o e-mail order_shipped', async () => {
    const { result } = await mountHook()

    await act(async () => {
      await result.current.updateStatus(ORDER_ID, 'shipped')
    })

    expect(sendOrderEmailMock).toHaveBeenCalledWith(ORDER_ID, 'order_shipped')
  })

  it('addTrackingCode tenta SEMPRE — é o outro lado do par, e cobre o Melhor Envio', async () => {
    const { result } = await mountHook()

    await act(async () => {
      await result.current.addTrackingCode(ORDER_ID, 'NA123456789BR', 'Correios')
    })

    expect(sendOrderEmailMock).toHaveBeenCalledWith(ORDER_ID, 'order_shipped')
    expect(updateCalls.find((c) => 'tracking_code' in c.values)?.values).toEqual({
      tracking_code: 'NA123456789BR',
      shipping_carrier: 'Correios',
    })
  })

  it.each(['pending', 'paid', 'delivered', 'cancelled'])(
    'updateStatus para `%s` NÃO tenta e-mail de enviado',
    async (status) => {
      const { result } = await mountHook()

      await act(async () => {
        await result.current.updateStatus(ORDER_ID, status)
      })

      expect(sendOrderEmailMock).not.toHaveBeenCalled()
    },
  )

  it('propaga emailSent para quem chamou, para o toast poder ser honesto', async () => {
    const { result } = await mountHook()
    sendOrderEmailMock.mockResolvedValue(false)

    let outcome: any
    await act(async () => {
      outcome = await result.current.updateStatus(ORDER_ID, 'shipped')
    })

    expect(outcome).toEqual({ error: null, emailSent: false })
  })
})

describe('UX-02 — falha de escrita não é engolida e não dispara e-mail', () => {
  it('erro no update de status volta em `error` e NÃO tenta e-mail', async () => {
    updateResult = { error: { message: 'violates check constraint "orders_status_check"' } }
    const { result } = await mountHook()

    let outcome: any
    await act(async () => {
      outcome = await result.current.updateStatus(ORDER_ID, 'shipped')
    })

    expect(outcome.error).toEqual({ message: 'violates check constraint "orders_status_check"' })
    expect(outcome.emailSent).toBe(false)
    expect(sendOrderEmailMock).not.toHaveBeenCalled()
  })

  it('erro no update de rastreio volta em `error` e NÃO tenta e-mail', async () => {
    updateResult = { error: { message: 'permission denied' } }
    const { result } = await mountHook()

    let outcome: any
    await act(async () => {
      outcome = await result.current.addTrackingCode(ORDER_ID, 'NA1', 'Correios')
    })

    expect(outcome.error).toEqual({ message: 'permission denied' })
    expect(sendOrderEmailMock).not.toHaveBeenCalled()
  })
})
