// Depois de confirmar o registro no portão: a frase do "sem e-mail" diz o que de fato aconteceu com a
// anotação do aviso pulado, e o foco vai ao título do pedido. Pelas DUAS páginas reais (o registro e o
// pedido), com o dono da escrita de `core` e a porta do aviso de verdade — só o client do Supabase é
// dublado, na fronteira (o bucket, a RPC e a function).

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { toast } from 'sonner'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DbOrder } from '@estrelinha/supabase/types'
import { DEFAULT_NOTIFICATIONS } from '@estrelinha/core/notifications'
import { simularFocoDoNavegador } from '@/test/focoDoNavegador'

const { detailMock, estado, dubleDoClient } = vi.hoisted(() => {
  const estado = {
    // O que a function `send-notification` responde ao gatilho (a rede caindo é `{ data: null, error }`).
    gatilho: { data: null, error: null } as { data: unknown; error: unknown },
    invocacoes: [] as { nome: string; body: unknown }[],
    // Onde a árvore está, e se o pedido já carregou (a volta ao pedido passa pelo esqueleto).
    pagina: 'registro' as 'registro' | 'pedido',
    pedidoPronto: false,
  }
  const vazio = () => {
    const b: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'in', 'maybeSingle', 'order', 'limit']) b[m] = () => b
    b.then = (ok: (v: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(ok)
    return b
  }
  const dubleDoClient = {
    from: () => vazio(),
    rpc: async (fn: string) =>
      fn === 'record_manual_payment'
        ? { data: { result: 'ok', id: 'reg-1', status: 'paid' }, error: null }
        : { data: null, error: null },
    functions: {
      invoke: async (nome: string, opcoes: { body: unknown }) => {
        estado.invocacoes.push({ nome, body: opcoes?.body })
        if (nome.startsWith('send-notification?action=trigger')) return estado.gatilho
        return { data: { result: 'nada_aberto' }, error: null }
      },
    },
    storage: {
      from: () => ({
        upload: async (path: string) => ({ data: { path }, error: null }),
        remove: async () => ({ data: [], error: null }),
        createSignedUrl: async () => ({ data: null, error: null }),
      }),
    },
  }
  return { detailMock: vi.fn(), estado, dubleDoClient }
})

vi.mock('@estrelinha/supabase/client', async importOriginal => ({
  ...(await importOriginal<typeof import('@estrelinha/supabase/client')>()),
  supabase: dubleDoClient,
}))
vi.mock('@estrelinha/supabase', async importOriginal => ({
  ...(await importOriginal<typeof import('@estrelinha/supabase')>()),
  supabase: dubleDoClient,
}))
vi.mock('@estrelinha/auth', () => ({
  useAuthContext: () => ({ user: { id: 'u-admin', email: 'adri@exemplo.invalid' }, customer: { name: 'Adri Muniz' } }),
}))
vi.mock('@/entities/order/api/useAdminOrder', () => ({ useAdminOrder: detailMock }))
vi.mock('@/entities/order/api/useAdminOrders', async importOriginal => ({
  ...(await importOriginal<typeof import('@/entities/order/api/useAdminOrders')>()),
  useAdminOrders: () => ({
    updateStatus: vi.fn(), cancelOrder: vi.fn(), addTrackingCode: vi.fn(), addNote: vi.fn(),
    setMaterialStatus: vi.fn(), setMaterialTracking: vi.fn(),
  }),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/features/order-management/ui/MelhorEnvioTab', () => ({ default: () => null }))
vi.mock('@/features/order-admin-note', () => ({ OrderAdminNoteCard: () => null }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', async importOriginal => ({
  ...(await importOriginal<typeof import('@estrelinha/core/hooks/useStoreSettings')>()),
  useNotificationSettings: () => DEFAULT_NOTIFICATIONS,
}))

import AdminRecordPaymentPage from './AdminRecordPaymentPage'
import AdminOrderPage from './AdminOrderPage'

const order = (over: Record<string, unknown> = {}): DbOrder =>
  ({
    id: 'o1', order_number: '1042', customer_id: 'c1', customer_name: 'Luciana Prado',
    customer_email: 'lu.prado@example.com', status: 'pending', payment_method: 'pix', payment_status: 'expired',
    paid_at: null, pix_discount: 0, subtotal: 180, discount: 0, shipping_cost: 0, total: 180, tracking_code: null,
    material_tracking_code: null, material_status: 'nao_aplicavel', notes: null, address_street: 'Rua A',
    address_number: '1', address_city: 'Porto Alegre', address_state: 'RS', address_zip: '90540-041',
    created_at: '2020-01-01T12:00:00Z',
    ...over,
  }) as unknown as DbOrder

const detail = () => ({
  order: order(),
  items: [{ id: 'i1', order_id: 'o1', product_id: 'p1', product_name: 'Colar', quantity: 1, unit_price: 180, engraving_text: null, variant_label: null, material_kinds: [], requires_material: false }],
  history: [], notes: [], emails: [], emailsError: false, itemsError: null, productRefs: {}, loading: false,
  error: null, reload: vi.fn(), manualPayment: null, paymentAlerts: [],
})

let local = ''
const Onde = () => {
  local = useLocation().pathname
  return null
}

// O pedido como o navegador o abre: primeiro o esqueleto (a leitura está no ar), depois a página.
let forcar: () => void = () => {}
const Registro = () => {
  estado.pagina = 'registro'
  return <AdminRecordPaymentPage />
}
const Pedido = () => {
  estado.pagina = 'pedido'
  const [, set] = useState(0)
  forcar = () => set((n) => n + 1)
  return <AdminOrderPage />
}

const montar = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/admin/pedidos/o1/pagamento']}>
        <Onde />
        <Routes>
          <Route path="/admin/pedidos/:id/pagamento" element={<Registro />} />
          <Route path="/admin/pedidos/:id" element={<Pedido />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

/** Registra pelo portão, com a caixa do e-mail desmarcada, como a Adri faz. */
const registrarSemEmail = async () => {
  const botao = screen.getByRole('button', { name: 'Registrar pagamento' })
  botao.focus()
  await act(async () => {
    fireEvent.click(botao)
  })
  const dialogo = await screen.findByRole('dialog')
  fireEvent.click(within(dialogo).getByRole('checkbox'))
  await act(async () => {
    fireEvent.click(within(dialogo).getByRole('button', { name: 'Registrar pagamento' }))
  })
  await waitFor(() => expect(local).toBe('/admin/pedidos/o1'))
}

const frasesDeSucesso = () => vi.mocked(toast.success).mock.calls.map((c) => String(c[0]))

/** O motor gravou o aviso pulado: a resposta da porta `trigger` com `customer: false`. */
const MOTOR_ANOTOU = {
  data: {
    sent: false,
    customer_sent: false,
    trigger: 'payment_recorded',
    results: [{ ok: false, event: 'order_paid', channel: 'email', skipped: 'admin_opt_out' }],
  },
  error: null,
}

let pararFoco: () => void = () => {}

beforeEach(() => {
  estado.gatilho = MOTOR_ANOTOU
  estado.invocacoes = []
  estado.pagina = 'registro'
  estado.pedidoPronto = false
  local = ''
  vi.mocked(toast.success).mockReset()
  vi.mocked(toast.error).mockReset()
  detailMock.mockImplementation(() =>
    estado.pagina === 'pedido' && !estado.pedidoPronto ? { ...detail(), order: null, loading: true } : detail(),
  )
  pararFoco = simularFocoDoNavegador()
})

afterEach(() => {
  pararFoco()
})

describe('a frase do registro sem e-mail diz o que aconteceu com a anotação', () => {
  it('a anotação do aviso pulado não chegou (a rede caiu): a tela não diz "anotado no histórico"', async () => {
    estado.gatilho = { data: null, error: new Error('Failed to send a request to the Edge Function') }
    montar()
    await registrarSemEmail()

    expect(estado.invocacoes.some((i) => i.nome === 'send-notification?action=trigger')).toBe(true)
    const frases = frasesDeSucesso()
    expect(frases.some((f) => f.includes('anotado no histórico'))).toBe(false)
    expect(frases).toContain(
      'Pagamento registrado · sem e-mail à cliente — a anotação de que ela não foi avisada não foi gravada no histórico',
    )
  })

  it('o motor respondeu que não conseguiu gravar o aviso pulado: a mesma frase verdadeira', async () => {
    estado.gatilho = {
      data: {
        sent: false, customer_sent: false, trigger: 'payment_recorded',
        results: [{ ok: false, event: 'order_paid', channel: 'email', reason: 'skip_failed' }],
      },
      error: null,
    }
    montar()
    await registrarSemEmail()

    expect(frasesDeSucesso()).toContain(
      'Pagamento registrado · sem e-mail à cliente — a anotação de que ela não foi avisada não foi gravada no histórico',
    )
  })

  it('o motor gravou o aviso pulado: a frase de sempre, "anotado no histórico"', async () => {
    montar()
    await registrarSemEmail()

    expect(frasesDeSucesso()).toEqual(['Pagamento registrado · sem e-mail à cliente (anotado no histórico)'])
  })
})

describe('depois de confirmar, o foco vai ao título do pedido', () => {
  it('a volta ao pedido passa pelo esqueleto; carregado, o foco está no título do pedido, não no <body>', async () => {
    montar()
    await registrarSemEmail()
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull()

    estado.pedidoPronto = true
    act(() => forcar())

    const titulo = await screen.findByRole('heading', { level: 1, name: 'Pedido #1042' })
    await waitFor(() => expect(document.activeElement).toBe(titulo))
  })
})
