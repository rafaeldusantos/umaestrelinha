import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
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

const listagem = {
  current: [
    { ...baseOrder, id: 'order-pending', order_number: 'NP-1', payment_status: 'pending' },
    { ...baseOrder, id: 'order-paid', order_number: 'NP-2', payment_status: 'approved' },
  ] as Record<string, unknown>[],
}

vi.mock('@/entities/order/api/useOrders', () => ({
  useOrdersByCustomerId: () => ({ data: listagem.current, isLoading: false }),
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
  listagem.current = [
    { ...baseOrder, id: 'order-pending', order_number: 'NP-1', payment_status: 'pending' },
    { ...baseOrder, id: 'order-paid', order_number: 'NP-2', payment_status: 'approved' },
  ]
})

describe('AccountPage — login gating (AUTH-01, AUTH-05)', () => {
  it('deslogado abre o overlay de login com returnTo=/conta', () => {
    authState.user = null
    authState.customer = null
    renderPage()
    expect(openSpy).toHaveBeenCalledWith({ returnTo: '/conta' })
  })
})

/**
 * ⚠️ Este bloco media o **diálogo** de pagamento dentro da lista. A feature `58` o removeu
 * (`PIX-P3-04`): duas superfícies montando o mesmo pagamento são dois donos de "onde se paga um
 * pedido pendente", e a daqui já nascia errada — montava sem `amount`, então o valor em destaque
 * (`CNF-01`) não aparecia. Os casos foram **invertidos**, não apagados.
 */
describe('AccountPage — a conta LINKA para a rota do pagamento (PIX-P3-04)', () => {
  it('pedido pendente de PIX exibe "Pagar com PIX"; o aprovado não exibe', () => {
    renderPage()

    expect(screen.getAllByRole('link', { name: /pagar com pix/i })).toHaveLength(1)
  })

  it('a ação é um LINK para `/pedido/<id>/pagamento`, não um botão que abre diálogo', () => {
    renderPage()

    expect(screen.getByRole('link', { name: /pagar com pix/i })).toHaveAttribute(
      'href',
      '/pedido/order-pending/pagamento',
    )
    expect(screen.queryByRole('button', { name: /pagar com pix/i })).not.toBeInTheDocument()
  })

  it('nenhuma superfície de pagamento é montada nesta tela', () => {
    // A metade que o link sozinho não prova: um diálogo montado e fechado continuaria existindo na
    // árvore em algumas formas de implementação, e o QR voltaria junto.
    const { container } = renderPage()

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(container.querySelector('svg[aria-label="QR Code PIX"]')).toBeNull()
    expect(screen.queryByLabelText(/copia e cola/i)).not.toBeInTheDocument()
  })

  it('pedido pendente de CARTÃO não ganha "Pagar com PIX"', () => {
    // Antes da feature `58` o botão aparecia em qualquer pedido pendente, inclusive de cartão — e
    // levava a um QR que o pedido não podia receber.
    listagem.current = [
      { ...baseOrder, id: 'order-card', order_number: 'NP-3', payment_status: 'pending', payment_method: 'card' },
    ]
    renderPage()

    expect(screen.queryByRole('link', { name: /pagar com pix/i })).not.toBeInTheDocument()
  })
})
