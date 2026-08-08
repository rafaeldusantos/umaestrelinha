import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import AccountPage from '../AccountPage'

/* eslint-disable @typescript-eslint/no-explicit-any */

vi.mock('@estrelinha/supabase/client', () => ({ supabase: {} }))

const { authState, openSpy } = vi.hoisted(() => ({
  authState: { user: null as any, customer: null as any, loading: false, signOut: vi.fn() },
  openSpy: vi.fn(),
}))

vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => authState }))
vi.mock('@/features/auth', () => ({ useAuthUiStore: (sel: any) => sel({ open: openSpy }) }))

vi.mock('@/features/checkout/ui/PixPayment', () => ({
  default: ({ orderId }: any) => <div data-testid="pix-payment" data-order={orderId} />,
}))

const baseOrder = {
  order_number: 'NP-1',
  customer_name: 'Ana',
  customer_email: 'ana@x.com',
  status: 'pending',
  payment_method: 'pix',
  subtotal: 50,
  discount: 0,
  shipping_cost: 0,
  total: 50,
  created_at: '2026-07-18T10:00:00Z',
  order_items: [],
}

vi.mock('@/entities/order/api/useOrders', () => ({
  useOrdersByCustomerId: () => ({
    data: [
      { ...baseOrder, id: 'order-pending', order_number: 'NP-1', payment_status: 'pending' },
      { ...baseOrder, id: 'order-paid', order_number: 'NP-2', payment_status: 'approved' },
    ],
    isLoading: false,
  }),
}))

const renderPage = () =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  authState.user = { id: 'u1', email: 'ana@x.com' }
  authState.customer = { id: 'c1', name: 'Ana', email: 'ana@x.com' }
  authState.loading = false
})

describe('AccountPage — login gating (AUTH-01, AUTH-05)', () => {
  it('deslogado abre o overlay de login com returnTo=/conta', () => {
    authState.user = null
    authState.customer = null
    renderPage()
    expect(openSpy).toHaveBeenCalledWith({ returnTo: '/conta' })
  })
})

describe('AccountPage — pagar pedido PIX pendente (PAY-18)', () => {
  it('pedido com payment_status pending exibe o CTA "Pagar com PIX"; approved não exibe', () => {
    renderPage()

    const ctas = screen.getAllByRole('button', { name: /pagar com pix/i })
    expect(ctas).toHaveLength(1)
  })

  it('clicar no CTA abre o PixPayment com o order_id do pedido pendente', () => {
    renderPage()

    fireEvent.click(screen.getByRole('button', { name: /pagar com pix/i }))

    const pix = screen.getByTestId('pix-payment')
    expect(pix.getAttribute('data-order')).toBe('order-pending')
  })
})
