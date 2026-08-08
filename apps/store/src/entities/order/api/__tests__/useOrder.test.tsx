import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// CNF-03: a confirmação é rota, então o pedido é lido do banco por id — nunca de estado do
//         checkout. Recarregar `/pedido/:id` refaz esta busca.
// CNF-04: a página precisa do pedido **com os itens** e da janela de estimativa (SHP-08).
// Erro e "não encontrado" são estados distintos: erro rejeita, inexistente resolve `null`.

const { fromMock, selectMock, eqMock, maybeSingleMock } = vi.hoisted(() => ({
  fromMock: vi.fn(),
  selectMock: vi.fn(),
  eqMock: vi.fn(),
  maybeSingleMock: vi.fn(),
}))

vi.mock('@nanapin/supabase/client', () => ({ supabase: { from: fromMock } }))

import { useOrder } from '../useOrder'

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider
    client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
  >
    {children}
  </QueryClientProvider>
)

const dbOrder = {
  id: 'order-1',
  order_number: 'NP-4821',
  customer_email: 'marina@email.com',
  status: 'pending',
  payment_status: 'approved',
  paid_at: '2026-07-27T12:00:00Z',
  total: 109.9,
  delivery_estimate_min: '2026-08-04',
  delivery_estimate_max: '2026-08-06',
  order_items: [{ id: 'oi-1', product_name: 'Pin Gojo', quantity: 2, unit_price: 50 }],
}

beforeEach(() => {
  fromMock.mockReset()
  selectMock.mockReset()
  eqMock.mockReset()
  maybeSingleMock.mockReset()

  fromMock.mockReturnValue({ select: selectMock })
  selectMock.mockReturnValue({ eq: eqMock })
  eqMock.mockReturnValue({ maybeSingle: maybeSingleMock })
  maybeSingleMock.mockResolvedValue({ data: dbOrder, error: null })
})

describe('useOrder — busca por id (CNF-03)', () => {
  it('consulta `orders` com os itens do pedido', async () => {
    const { result } = renderHook(() => useOrder('order-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fromMock).toHaveBeenCalledWith('orders')
    expect(selectMock).toHaveBeenCalledWith('*, order_items(*)')
  })

  it('filtra pelo id recebido', async () => {
    const { result } = renderHook(() => useOrder('order-42'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(eqMock).toHaveBeenCalledWith('id', 'order-42')
  })

  it('devolve o pedido com paid_at e a janela de estimativa', async () => {
    const { result } = renderHook(() => useOrder('order-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toMatchObject({
      order_number: 'NP-4821',
      paid_at: '2026-07-27T12:00:00Z',
      delivery_estimate_min: '2026-08-04',
      delivery_estimate_max: '2026-08-06',
      total: 109.9,
    })
  })

  it('devolve os itens do pedido junto', async () => {
    const { result } = renderHook(() => useOrder('order-1'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.order_items).toHaveLength(1)
  })

  it('sem id não dispara requisição', () => {
    renderHook(() => useOrder(undefined), { wrapper })

    expect(fromMock).not.toHaveBeenCalled()
  })
})

describe('useOrder — erro e não encontrado são estados distintos', () => {
  it('pedido inexistente resolve com null, sem erro', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: null })

    const { result } = renderHook(() => useOrder('order-inexistente'), { wrapper })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toBeNull()
    expect(result.current.isError).toBe(false)
  })

  it('erro do banco vira isError, com a mensagem preservada', async () => {
    maybeSingleMock.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    const { result } = renderHook(() => useOrder('order-1'), { wrapper })

    await waitFor(() => expect(result.current.isError).toBe(true))
    expect(result.current.error?.message).toBe('permission denied')
  })
})
