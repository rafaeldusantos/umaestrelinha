// O link de pagamento por cartão, pela PÁGINA REAL do pedido: o botão aparece no bloco Pagamento só
// para pedido de cartão não pago e não cancelado, gera o link pela function e copia o link que ela
// devolve — o painel não monta o endereço.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DbOrder } from '@estrelinha/supabase/types'
import { DEFAULT_NOTIFICATIONS } from '@estrelinha/core/notifications'

const { detailMock, updateStatus, assinadas, invokeMock } = vi.hoisted(() => ({
  detailMock: vi.fn(),
  updateStatus: vi.fn(),
  assinadas: [] as { bucket: string; path: string; segundos: number; opcoes: unknown }[],
  invokeMock: vi.fn(),
}))

vi.mock('@estrelinha/supabase/client', () => {
  const vazio = () => {
    const b: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'in', 'maybeSingle', 'order', 'limit']) b[m] = () => b
    b.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(ok)
    return b
  }
  return {
    supabase: {
      from: () => vazio(),
      functions: { invoke: (...a: unknown[]) => invokeMock(...a) },
      storage: {
        from: (bucket: string) => ({
          createSignedUrl: async (path: string, segundos: number, opcoes?: unknown) => {
            assinadas.push({ bucket, path, segundos, opcoes })
            return { data: { signedUrl: `https://local.invalid/sign/${path}?token=t` }, error: null }
          },
        }),
      },
    },
  }
})
vi.mock('@estrelinha/auth', () => ({
  useAuthContext: () => ({ user: { id: 'u-admin', email: 'adri@exemplo.invalid' }, customer: { name: 'Adri Muniz' } }),
}))
vi.mock('@/entities/order/api/useAdminOrder', () => ({ useAdminOrder: detailMock }))
vi.mock('@/entities/order/api/useAdminOrders', async importOriginal => ({
  ...(await importOriginal<typeof import('@/entities/order/api/useAdminOrders')>()),
  useAdminOrders: () => ({
    updateStatus, cancelOrder: vi.fn(), addTrackingCode: vi.fn(), addNote: vi.fn(),
    setMaterialStatus: vi.fn(), setMaterialTracking: vi.fn(),
  }),
}))
vi.mock('@/entities/order/api/notifyOrder', () => ({ resendNotification: vi.fn(), notifyOrder: vi.fn().mockResolvedValue(true) }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/features/order-management/ui/MelhorEnvioTab', () => ({ default: () => null }))
vi.mock('@/features/order-admin-note', () => ({ OrderAdminNoteCard: () => null }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', async importOriginal => ({
  ...(await importOriginal<typeof import('@estrelinha/core/hooks/useStoreSettings')>()),
  useNotificationSettings: () => DEFAULT_NOTIFICATIONS,
}))

import AdminOrderPage from './AdminOrderPage'

const order = (over: Record<string, unknown> = {}): DbOrder =>
  ({
    id: 'o1', order_number: '1042', customer_id: 'c1', customer_name: 'Luciana Prado',
    customer_email: 'lu.prado@example.com', status: 'paid', payment_method: 'pix', payment_status: 'approved',
    paid_at: '2026-11-08T15:30:00Z', pix_discount: 0, subtotal: 180, discount: 0, shipping_cost: 0,
    total: 180, tracking_code: null, material_tracking_code: null, material_status: 'nao_aplicavel',
    notes: null, address_street: 'Rua A', address_number: '1', address_city: 'Porto Alegre', address_state: 'RS',
    address_zip: '90540-041', created_at: '2026-11-07T14:32:00Z',
    ...over,
  }) as unknown as DbOrder


const detail = (o: DbOrder) => ({
  order: o,
  items: [{ id: 'i1', order_id: 'o1', product_id: 'p1', product_name: 'Colar', quantity: 1, unit_price: 180, engraving_text: null, variant_label: null, material_kinds: [], requires_material: false }],
  history: [], notes: [], emails: [], itemsError: null, productRefs: {}, loading: false, error: null, reload: vi.fn(),
  manualPayment: null,
})

const LINK = (n: number) => `https://umaestrelinha.com.br/pagar-com-cartao#tok-${n}`

const CARTAO_RECUSADO = { status: 'pending', payment_method: 'card', payment_status: 'rejected', paid_at: null }

const montar = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/admin/pedidos/o1']}>
        <Routes>
          <Route path="/admin/pedidos/:id" element={<AdminOrderPage />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const blocoPagamento = () => screen.getByRole('heading', { name: 'Pagamento' }).closest('section') as HTMLElement
const chamadas = () => invokeMock.mock.calls.filter(([nome]) => nome === 'mercado-pago?action=card-link')

let copiado: string | null = null
beforeEach(() => {
  assinadas.length = 0
  updateStatus.mockReset()
  invokeMock.mockReset()
  invokeMock.mockImplementation(async (nome: string) =>
    nome === 'mercado-pago?action=card-link' ? { data: { link: LINK(1) }, error: null } : { data: null, error: null },
  )
  copiado = null
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async (t: string) => { copiado = t } },
  })
})

describe('o botão "Gerar link de cartão" no bloco Pagamento', () => {
  it.each([
    ['recusado', 'rejected'],
    ['pendente', 'pending'],
    ['vencido', 'expired'],
  ])('aparece para pedido de cartão com pagamento %s, não pago e não cancelado', (_n, payment_status) => {
    detailMock.mockReturnValue(detail(order({ ...CARTAO_RECUSADO, payment_status })))
    montar()
    expect(within(blocoPagamento()).getByRole('button', { name: 'Gerar link de cartão' })).toBeInTheDocument()
  })

  it.each([
    ['feito com PIX', { ...CARTAO_RECUSADO, payment_method: 'pix' }],
    ['pago', { status: 'paid', payment_method: 'card', payment_status: 'approved', paid_at: '2026-11-08T15:30:00Z' }],
    ['cancelado', { ...CARTAO_RECUSADO, status: 'cancelled' }],
    ['em análise', { ...CARTAO_RECUSADO, payment_status: 'in_process' }],
  ])('não aparece para pedido %s', (_n, over) => {
    detailMock.mockReturnValue(detail(order(over)))
    montar()
    expect(within(blocoPagamento()).queryByRole('button', { name: /link de cartão/ })).toBeNull()
  })

  it('gera o link pela function, mostra o link que ela devolveu e copia esse link', async () => {
    detailMock.mockReturnValue(detail(order(CARTAO_RECUSADO)))
    montar()
    await act(async () => {
      fireEvent.click(within(blocoPagamento()).getByRole('button', { name: 'Gerar link de cartão' }))
    })

    expect(chamadas()).toEqual([['mercado-pago?action=card-link', { body: { order_id: 'o1' } }]])
    const campo = await screen.findByTestId('link-de-cartao')
    expect(campo).toHaveValue(LINK(1))

    await act(async () => {
      fireEvent.click(within(blocoPagamento()).getByRole('button', { name: 'Copiar link' }))
    })
    expect(copiado).toBe(LINK(1))
    expect(within(blocoPagamento()).getByRole('button', { name: 'Link copiado' })).toBeInTheDocument()
  })

  it('gerar outro troca o link na tela pelo novo', async () => {
    let n = 0
    invokeMock.mockImplementation(async () => ({ data: { link: LINK(++n) }, error: null }))
    detailMock.mockReturnValue(detail(order(CARTAO_RECUSADO)))
    montar()
    await act(async () => {
      fireEvent.click(within(blocoPagamento()).getByRole('button', { name: 'Gerar link de cartão' }))
    })
    await act(async () => {
      fireEvent.click(within(blocoPagamento()).getByRole('button', { name: 'Gerar outro link de cartão' }))
    })
    expect(chamadas()).toHaveLength(2)
    await waitFor(() =>
      expect(screen.getByTestId('link-de-cartao')).toHaveValue(LINK(2)),
    )
  })

  it('sem a loja configurada no servidor (503): a frase dele, sem link', async () => {
    invokeMock.mockImplementation(async () => ({
      data: null,
      error: { context: new Response(JSON.stringify({ error: 'A loja não está configurada para montar o link. Nada foi gerado.' }), { status: 503 }) },
    }))
    detailMock.mockReturnValue(detail(order(CARTAO_RECUSADO)))
    montar()
    await act(async () => {
      fireEvent.click(within(blocoPagamento()).getByRole('button', { name: 'Gerar link de cartão' }))
    })
    expect(await within(blocoPagamento()).findByRole('alert')).toHaveTextContent('A loja não está configurada para montar o link.')
    expect(screen.queryByTestId('link-de-cartao')).toBeNull()
  })

  it('a recusa do servidor aparece com o motivo, sem link', async () => {
    invokeMock.mockImplementation(async () => ({
      data: null,
      error: { context: new Response(JSON.stringify({ error: 'Este pedido já foi pago.' }), { status: 409 }) },
    }))
    detailMock.mockReturnValue(detail(order(CARTAO_RECUSADO)))
    montar()
    await act(async () => {
      fireEvent.click(within(blocoPagamento()).getByRole('button', { name: 'Gerar link de cartão' }))
    })
    expect(await within(blocoPagamento()).findByRole('alert')).toHaveTextContent('Este pedido já foi pago.')
    expect(screen.queryByTestId('link-de-cartao')).toBeNull()
  })
})
