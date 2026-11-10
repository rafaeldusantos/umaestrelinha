// O registro desfeito continua à vista, pela PÁGINA REAL do pedido e pela LEITURA REAL do pedido
// (`useAdminOrder`), com só o client do Supabase dublado — e o dublê guarda o estado do banco e
// respeita os filtros da leitura do registro. A Adri desfaz um pagamento registrado à mão, e a
// observação e os comprovantes continuam no bloco Pagamento, marcados como desfeitos, com o motivo; o
// comprovante segue abrindo pelo link assinado.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEFAULT_NOTIFICATIONS } from '@estrelinha/core/notifications'

interface Recibo { id: string; path: string; content_type: string; size_bytes: number }
interface Registro {
  id: string; method: string; paid_at: string; note: string | null; created_by_name: string | null
  created_at: string; undone_at: string | null; undone_by_name: string | null; undone_reason: string | null
  order_manual_payment_receipts: Recibo[]
}

const { banco, assinadas, rpcs } = vi.hoisted(() => ({
  banco: {
    pedido: {} as Record<string, unknown>,
    registros: [] as Registro[],
    historico: [] as Record<string, unknown>[],
  },
  assinadas: [] as { bucket: string; path: string }[],
  rpcs: [] as { fn: string; args: Record<string, unknown> }[],
}))

vi.mock('@estrelinha/supabase/client', () => {
  // Um builder que registra os filtros e responde pelo estado de `banco` — o registro manual é
  // filtrado como o PostgREST filtraria (`eq`, `is`), para a leitura que pede só o vivo ver só o vivo.
  const from = (tabela: string) => {
    const filtros: { metodo: string; args: unknown[] }[] = []
    const responder = () => {
      if (tabela === 'orders') return { data: { ...banco.pedido }, error: null }
      if (tabela === 'order_manual_payments') {
        let linhas = banco.registros.map((r) => ({ ...r }))
        for (const f of filtros) {
          if (f.metodo === 'is' && f.args[0] === 'undone_at' && f.args[1] === null) linhas = linhas.filter((r) => r.undone_at === null)
          if (f.metodo === 'eq' && f.args[0] === 'order_id' && f.args[1] !== banco.pedido.id) linhas = []
        }
        return { data: linhas, error: null }
      }
      if (tabela === 'order_status_history') return { data: banco.historico.map((h) => ({ ...h })), error: null }
      if (tabela === 'customer_list') return { data: null, error: null }
      return { data: [], error: null }
    }
    const b: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'in', 'neq', 'is', 'or', 'order', 'limit', 'range']) {
      b[m] = (...args: unknown[]) => {
        filtros.push({ metodo: m, args })
        return b
      }
    }
    b.maybeSingle = () => Promise.resolve(responder())
    b.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(responder()).then(ok, ko)
    return b
  }
  return {
    supabase: {
      from,
      // `undo_manual_payment`, como o banco a faz: o pedido volta a Pendente com o pagamento de antes, e o
      // registro ganha quando, quem e o motivo — e FICA.
      rpc: async (fn: string, args: Record<string, unknown>) => {
        rpcs.push({ fn, args })
        if (fn !== 'undo_manual_payment') return { data: null, error: { message: 'rpc inesperada' } }
        banco.pedido = { ...banco.pedido, status: 'pending', payment_status: 'expired', paid_at: null }
        banco.registros = banco.registros.map((r) =>
          r.undone_at === null
            ? { ...r, undone_at: '2026-11-08T17:00:00Z', undone_by_name: String(args.p_author_name), undone_reason: String(args.p_reason) }
            : r,
        )
        banco.historico = [
          { id: 'h2', order_id: 'o1', from_status: 'paid', to_status: 'pending', note: `Registro de pagamento desfeito. Motivo: ${String(args.p_reason)}`, created_at: '2026-11-08T17:00:00Z', created_by: 'u-admin' },
          ...banco.historico,
        ]
        return { data: { result: 'ok', status: 'pending' }, error: null }
      },
      functions: { invoke: async () => ({ data: null, error: null }) },
      storage: {
        from: (bucket: string) => ({
          createSignedUrl: async (path: string) => {
            assinadas.push({ bucket, path })
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
vi.mock('@/entities/order/api/useAdminOrders', async importOriginal => ({
  ...(await importOriginal<typeof import('@/entities/order/api/useAdminOrders')>()),
  useAdminOrders: () => ({
    updateStatus: vi.fn(), cancelOrder: vi.fn(), addTrackingCode: vi.fn(), addNote: vi.fn(),
    setMaterialStatus: vi.fn(), setMaterialTracking: vi.fn(),
  }),
}))
vi.mock('@/entities/order/api/notifyOrder', () => ({ resendNotification: vi.fn(), notifyOrder: vi.fn() }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/features/order-management/ui/MelhorEnvioTab', () => ({ default: () => null }))
vi.mock('@/features/order-admin-note', () => ({ OrderAdminNoteCard: () => null }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', async importOriginal => ({
  ...(await importOriginal<typeof import('@estrelinha/core/hooks/useStoreSettings')>()),
  useNotificationSettings: () => DEFAULT_NOTIFICATIONS,
}))

import AdminOrderPage from './AdminOrderPage'

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

beforeEach(() => {
  assinadas.length = 0
  rpcs.length = 0
  banco.pedido = {
    id: 'o1', order_number: '1042', customer_id: 'c1', customer_name: 'Luciana Prado',
    customer_email: 'lu.prado@example.com', status: 'paid', payment_method: 'pix', payment_status: 'approved',
    paid_at: '2026-11-08T15:30:00Z', pix_discount: 0, subtotal: 180, discount: 0, shipping_cost: 0,
    total: 180, tracking_code: null, material_tracking_code: null, material_status: 'nao_aplicavel',
    notes: null, address_street: 'Rua A', address_number: '1', address_city: 'Porto Alegre', address_state: 'RS',
    address_zip: '90540-041', created_at: '2026-11-07T14:32:00Z',
  }
  banco.registros = [
    {
      id: 'reg-1', method: 'transferencia', paid_at: '2026-11-08T15:30:00Z', note: 'Combinado no WhatsApp',
      created_by_name: 'Adri Muniz', created_at: '2026-11-08T16:00:00Z', undone_at: null,
      undone_by_name: null, undone_reason: null,
      order_manual_payment_receipts: [{ id: 'c1', path: 'o1/comprovante.png', content_type: 'image/png', size_bytes: 2048 }],
    },
  ]
  banco.historico = [
    { id: 'h1', order_id: 'o1', from_status: 'pending', to_status: 'paid', note: 'Pagamento registrado manualmente', created_at: '2026-11-08T16:00:00Z', created_by: 'u-admin' },
  ]
})

describe('depois de desfazer, o registro continua à vista, marcado como desfeito', () => {
  it('a observação, quem registrou e o comprovante ficam no bloco Pagamento, com quando e o motivo do desfazer', async () => {
    montar()
    await waitFor(() => expect(within(blocoPagamento()).getByText('Combinado no WhatsApp')).toBeInTheDocument())

    await act(async () => {
      fireEvent.click(within(blocoPagamento()).getByRole('button', { name: 'Desfazer registro' }))
    })
    const dialogo = screen.getByRole('dialog')
    fireEvent.change(within(dialogo).getByRole('textbox', { name: 'Motivo' }), {
      target: { value: 'Comprovante era de outro pedido' },
    })
    await act(async () => {
      fireEvent.click(within(dialogo).getByRole('button', { name: 'Desfazer o registro' }))
    })

    expect(rpcs.map((r) => r.fn)).toEqual(['undo_manual_payment'])
    // A releitura trouxe o pedido em Pendente: a ação de desfazer saiu e a de registrar voltou.
    await waitFor(() =>
      expect(within(blocoPagamento()).getByRole('link', { name: 'Registrar pagamento' })).toBeInTheDocument(),
    )
    const bloco = blocoPagamento()
    expect(within(bloco).queryByRole('button', { name: 'Desfazer registro' })).toBeNull()

    const desfeito = within(bloco).getByTestId('registro-desfeito')
    expect(within(desfeito).getByText('Combinado no WhatsApp')).toBeInTheDocument()
    expect(within(desfeito).getByText('Adri Muniz')).toBeInTheDocument()
    expect(within(desfeito).getByText(/^Desfeito em 08\/11\/2026 às 14h00 por Adri Muniz — Comprovante era de outro pedido$/)).toBeInTheDocument()

    const janela = { opener: {}, location: { href: '' }, close: vi.fn() }
    const open = vi.spyOn(window, 'open').mockReturnValue(janela as unknown as Window)
    await act(async () => {
      fireEvent.click(within(desfeito).getByRole('button', { name: 'Abrir comprovante 1 (PNG)' }))
    })
    expect(assinadas).toEqual([{ bucket: 'order-payment-receipts', path: 'o1/comprovante.png' }])
    expect(janela.location.href).toBe('https://local.invalid/sign/o1/comprovante.png?token=t')
    open.mockRestore()
  })
})
