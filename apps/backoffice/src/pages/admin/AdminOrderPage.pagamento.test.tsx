// O pagamento registrado à mão, pela PÁGINA REAL do pedido: o bloco Pagamento mostra o registro, o
// comprovante abre por URL assinada curta, e os caminhos que levariam um pedido não pago a "Pago" (o
// Próximo passo e o "Outro status") abrem a tela de registro em vez de gravar.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DbOrder } from '@estrelinha/supabase/types'
import { DEFAULT_NOTIFICATIONS } from '@estrelinha/core/notifications'
import { enableRadixSelectInJsdom, RADIX_POINTER_DOWN } from '@/test/radix'

const { detailMock, updateStatus, assinadas } = vi.hoisted(() => ({
  detailMock: vi.fn(),
  updateStatus: vi.fn(),
  assinadas: [] as { bucket: string; path: string; segundos: number; opcoes: unknown }[],
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
      functions: { invoke: async () => ({ data: null, error: null }) },
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

const REGISTRO = {
  id: 'reg-1', method: 'transferencia', paid_at: '2026-11-08T15:30:00Z', note: 'Pagou no Itaú, conta da Adri',
  created_by_name: 'Adri Muniz', created_at: '2026-11-08T16:00:00Z', undone_at: null,
  order_manual_payment_receipts: [
    { id: 'c1', path: 'o1/a.pdf', content_type: 'application/pdf', size_bytes: 2048 },
    { id: 'c2', path: 'o1/b.heic', content_type: 'image/heic', size_bytes: 4096 },
  ],
}

const detail = (o: DbOrder, manualPayment: unknown = null) => ({
  order: o,
  items: [{ id: 'i1', order_id: 'o1', product_id: 'p1', product_name: 'Colar', quantity: 1, unit_price: 180, engraving_text: null, variant_label: null, material_kinds: [], requires_material: false }],
  history: [], notes: [], emails: [], itemsError: null, productRefs: {}, loading: false, error: null, reload: vi.fn(),
  manualPayment,
})

let local: { pathname: string; search: string } | null = null
const Onde = () => {
  const l = useLocation()
  local = { pathname: l.pathname, search: l.search }
  return null
}

const montar = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/admin/pedidos/o1']}>
        <Onde />
        <Routes>
          <Route path="/admin/pedidos/:id" element={<AdminOrderPage />} />
          <Route path="/admin/pedidos/:id/pagamento" element={<p>tela do registro</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const blocoPagamento = () => screen.getByRole('heading', { name: 'Pagamento' }).closest('section') as HTMLElement

beforeAll(enableRadixSelectInJsdom)

beforeEach(() => {
  assinadas.length = 0
  updateStatus.mockReset()
  local = null
})

describe('o bloco Pagamento mostra o registro manual', () => {
  it('meio pelo nome, data e hora de Brasília, quem registrou, observação e comprovantes', () => {
    detailMock.mockReturnValue(detail(order(), REGISTRO))
    montar()
    const bloco = within(blocoPagamento())
    expect(bloco.getByText('Registrado à mão')).toBeInTheDocument()
    expect(bloco.getByText('Transferência')).toBeInTheDocument()
    expect(bloco.queryByText('transferencia')).toBeNull()
    // 15h30 UTC é 12h30 em Brasília.
    expect(bloco.getByText('08/11/2026 às 12h30')).toBeInTheDocument()
    expect(bloco.getByText('Adri Muniz')).toBeInTheDocument()
    expect(bloco.getByText('Pagou no Itaú, conta da Adri')).toBeInTheDocument()
    expect(bloco.getByRole('button', { name: 'Abrir comprovante 1 (PDF)' })).toBeInTheDocument()
    expect(bloco.getByRole('button', { name: 'Baixar comprovante 2 (HEIC)' })).toBeInTheDocument()
  })

  it('o comprovante abre por URL assinada de cinco minutos do bucket privado; HEIC baixa', async () => {
    const janela = { opener: {}, location: { href: '' }, close: vi.fn() }
    const open = vi.spyOn(window, 'open').mockReturnValue(janela as unknown as Window)
    detailMock.mockReturnValue(detail(order(), REGISTRO))
    montar()
    await act(async () => {
      fireEvent.click(within(blocoPagamento()).getByRole('button', { name: 'Abrir comprovante 1 (PDF)' }))
    })
    expect(assinadas).toEqual([{ bucket: 'order-payment-receipts', path: 'o1/a.pdf', segundos: 300, opcoes: undefined }])
    expect(janela.location.href).toBe('https://local.invalid/sign/o1/a.pdf?token=t')
    expect(janela.opener).toBeNull()
    await act(async () => {
      fireEvent.click(within(blocoPagamento()).getByRole('button', { name: 'Baixar comprovante 2 (HEIC)' }))
    })
    expect(assinadas[1]).toEqual({ bucket: 'order-payment-receipts', path: 'o1/b.heic', segundos: 300, opcoes: { download: true } })
    open.mockRestore()
  })

  it('sem registro manual, o bloco não fala de registro', () => {
    detailMock.mockReturnValue(detail(order()))
    montar()
    expect(within(blocoPagamento()).queryByText('Registrado à mão')).toBeNull()
  })

  it('pedido com pagamento em aberto oferece "Registrar pagamento"; pedido pago não', () => {
    detailMock.mockReturnValue(detail(order({ status: 'pending', payment_status: 'expired', paid_at: null })))
    const { unmount } = montar()
    const link = within(blocoPagamento()).getByRole('link', { name: 'Registrar pagamento' })
    expect(link.getAttribute('href')).toBe('/admin/pedidos/o1/pagamento')
    unmount()
    detailMock.mockReturnValue(detail(order()))
    montar()
    expect(within(blocoPagamento()).queryByRole('link', { name: 'Registrar pagamento' })).toBeNull()
  })
})

describe('levar um pedido não pago a "Pago" abre o registro de pagamento', () => {
  it('"Avançar mesmo assim" de Pendente leva à tela, sem gravar status', async () => {
    detailMock.mockReturnValue(detail(order({ status: 'pending', payment_status: 'pending', paid_at: null })))
    montar()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Avançar mesmo assim/ }))
    })
    await waitFor(() => expect(local).toEqual({ pathname: '/admin/pedidos/o1/pagamento', search: '?para=paid' }))
    expect(updateStatus).not.toHaveBeenCalled()
  })

  it.each([
    ['Pago', 'paid'],
    ['Entregue', 'delivered'],
  ])('"Outro status" → %s num pedido não pago leva à tela, sem gravar status', async (opcao, para) => {
    detailMock.mockReturnValue(detail(order({ status: 'pending', payment_status: 'expired', paid_at: null })))
    montar()
    fireEvent.pointerDown(screen.getByRole('combobox', { name: 'Outro status' }), RADIX_POINTER_DOWN)
    await act(async () => {
      fireEvent.click(screen.getByRole('option', { name: opcao }))
    })
    await waitFor(() => expect(local).toEqual({ pathname: '/admin/pedidos/o1/pagamento', search: `?para=${para}` }))
    expect(screen.getByText('tela do registro')).toBeInTheDocument()
    expect(updateStatus).not.toHaveBeenCalled()
  })

  it('pedido pago avança pelo Próximo passo como sempre', async () => {
    updateStatus.mockResolvedValue({ error: null, emailSent: false })
    detailMock.mockReturnValue(detail(order({ status: 'paid' })))
    montar()
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Em Separação/ }))
    })
    await waitFor(() => expect(updateStatus).toHaveBeenCalled())
    expect(local?.pathname).toBe('/admin/pedidos/o1')
  })
})
