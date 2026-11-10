// O pagamento registrado à mão, pela PÁGINA REAL do pedido e pela LEITURA REAL do pedido
// (`useAdminOrder`), com só o client do Supabase dublado. No bloco Pagamento o meio é um só, pelo nome
// (nunca o valor técnico do banco); no Histórico, a linha do registro diz quem registrou.

import { render, screen, waitFor, within } from '@testing-library/react'
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
const blocoHistorico = () => screen.getByRole('heading', { name: 'Histórico' }).closest('section') as HTMLElement

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
      id: 'reg-1', method: 'transferencia', paid_at: '2026-11-08T15:30:00Z', note: null,
      created_by_name: 'Adri Muniz', created_at: '2026-11-08T16:00:00.296649+00:00', undone_at: null,
      undone_by_name: null, undone_reason: null, order_manual_payment_receipts: [],
    },
  ]
  // A linha que o registro grava nasce na mesma transação: o mesmo instante do registro.
  banco.historico = [
    { id: 'h0', order_id: 'o1', from_status: null, to_status: 'pending', note: null, created_at: '2026-11-07T14:32:00Z', created_by: null },
    { id: 'h1', order_id: 'o1', from_status: 'pending', to_status: 'paid', note: 'Pagamento registrado manualmente', created_at: '2026-11-08T16:00:00.296649+00:00', created_by: 'u-admin' },
  ]
})

describe('o bloco Pagamento de um pedido registrado à mão', () => {
  it('mostra um meio só, o informado, pelo nome — sem a linha "Método" com o valor técnico do pedido', async () => {
    montar()
    await waitFor(() => expect(within(blocoPagamento()).getByTestId('registro-manual')).toBeInTheDocument())
    const bloco = blocoPagamento()
    expect(within(bloco).queryByText('Método')).toBeNull()
    expect(within(bloco).queryByText('pix', { normalizer: (t) => t })).toBeNull()
    expect(within(bloco).queryByText('PIX')).toBeNull()
    const registro = within(bloco).getByTestId('registro-manual')
    expect(within(registro).getByText('Meio')).toBeInTheDocument()
    expect(within(registro).getByText('Transferência')).toBeInTheDocument()
  })

  it('sem registro vivo (nunca houve, ou foi desfeito), o método do pedido aparece pelo nome, nunca o valor técnico', async () => {
    banco.registros = banco.registros.map((r) => ({ ...r, undone_at: '2026-11-08T17:00:00Z', undone_by_name: 'Adri Muniz', undone_reason: 'Era de outro pedido' }))
    banco.pedido = { ...banco.pedido, status: 'pending', payment_status: 'expired', paid_at: null }
    montar()
    await waitFor(() => expect(within(blocoPagamento()).getByTestId('registro-desfeito')).toBeInTheDocument())
    const bloco = blocoPagamento()
    const metodo = within(bloco).getByText('Método').closest('div') as HTMLElement
    expect(within(metodo).getByText('PIX', { normalizer: (t) => t })).toBeInTheDocument()
    expect(within(bloco).queryByText('pix', { normalizer: (t) => t })).toBeNull()
  })
})

describe('o Histórico de um pedido registrado à mão', () => {
  it('a linha "Pagamento registrado manualmente" diz quem registrou', async () => {
    montar()
    await waitFor(() => expect(within(blocoHistorico()).getByText('Pagamento registrado manualmente')).toBeInTheDocument())
    const linha = within(blocoHistorico()).getByText('Pagamento registrado manualmente').closest('li') as HTMLElement
    expect(within(linha).getByText('Pendente → Pago')).toBeInTheDocument()
    expect(within(linha).getByText('Registrado por Adri Muniz')).toBeInTheDocument()
  })

  it('depois de desfeito, a linha do registro continua dizendo quem registrou', async () => {
    banco.registros = banco.registros.map((r) => ({ ...r, undone_at: '2026-11-08T17:00:00Z', undone_by_name: 'Bia Souza', undone_reason: 'Era de outro pedido' }))
    banco.pedido = { ...banco.pedido, status: 'pending', payment_status: 'expired', paid_at: null }
    banco.historico = [
      { id: 'h2', order_id: 'o1', from_status: 'paid', to_status: 'pending', note: 'Registro de pagamento desfeito. Motivo: Era de outro pedido', created_at: '2026-11-08T17:00:00Z', created_by: 'u-bia' },
      ...banco.historico,
    ]
    montar()
    await waitFor(() => expect(within(blocoHistorico()).getByText('Pagamento registrado manualmente')).toBeInTheDocument())
    const linha = within(blocoHistorico()).getByText('Pagamento registrado manualmente').closest('li') as HTMLElement
    expect(within(linha).getByText('Registrado por Adri Muniz')).toBeInTheDocument()
    const desfazer = within(blocoHistorico()).getByText(/^Registro de pagamento desfeito/).closest('li') as HTMLElement
    expect(within(desfazer).queryByText(/^Registrado por/)).toBeNull()
  })
})

// O e-mail de quem registrou é uma palavra só, sem ponto de quebra: em 390 com a fonte a 200 % ele
// passava da borda e fazia o pedido inteiro rolar de lado. Ele tem de poder quebrar em qualquer ponto
// (`overflow-wrap: anywhere`) nas duas superfícies que o mostram. jsdom não mede layout, então a régua
// é o token exato da classe no próprio nó do texto — `break-words` (`overflow-wrap: break-word`) não
// basta, porque não encolhe a largura mínima do item flex e o `dd` continua do tamanho do e-mail.
const QUEBRA_EM_QUALQUER_PONTO = '[overflow-wrap:anywhere]'
const temToken = (el: Element, token: string): boolean => el.className.split(/\s+/).includes(token)

describe('a régua do e-mail que quebra', () => {
  it('casa o token exato, e não uma classe vizinha nem um pedaço dela', () => {
    const no = (classe: string) => Object.assign(document.createElement('p'), { className: classe })
    expect(temToken(no('min-w-0 [overflow-wrap:anywhere] text-right'), QUEBRA_EM_QUALQUER_PONTO)).toBe(true)
    expect(temToken(no('min-w-0 break-words text-right'), QUEBRA_EM_QUALQUER_PONTO)).toBe(false)
    expect(temToken(no('md:[overflow-wrap:anywhere]'), QUEBRA_EM_QUALQUER_PONTO)).toBe(false)
    expect(temToken(no('text-sm'), QUEBRA_EM_QUALQUER_PONTO)).toBe(false)
  })
})

describe('o e-mail longo de quem registrou quebra dentro da largura', () => {
  const EMAIL = 'administracao.do.atelie.uma.estrelinha@umaestrelinha.dev'

  beforeEach(() => {
    banco.registros = banco.registros.map((r) => ({ ...r, created_by_name: EMAIL }))
  })

  it('no bloco Pagamento, o "Registrado por" do registro à mão', async () => {
    montar()
    await waitFor(() => expect(within(blocoPagamento()).getByTestId('registro-manual')).toBeInTheDocument())
    const registro = within(blocoPagamento()).getByTestId('registro-manual')
    const dd = within(registro).getByText(EMAIL)
    expect(dd.tagName).toBe('DD')
    expect(temToken(dd, QUEBRA_EM_QUALQUER_PONTO)).toBe(true)
    expect(temToken(dd, 'min-w-0')).toBe(true)
  })

  it('no bloco Pagamento, o "Registrado por" de um registro desfeito', async () => {
    banco.registros = banco.registros.map((r) => ({ ...r, undone_at: '2026-11-08T17:00:00Z', undone_by_name: 'Adri Muniz', undone_reason: 'Era de outro pedido' }))
    banco.pedido = { ...banco.pedido, status: 'pending', payment_status: 'expired', paid_at: null }
    montar()
    await waitFor(() => expect(within(blocoPagamento()).getByTestId('registro-desfeito')).toBeInTheDocument())
    const dd = within(within(blocoPagamento()).getByTestId('registro-desfeito')).getByText(EMAIL)
    expect(temToken(dd, QUEBRA_EM_QUALQUER_PONTO)).toBe(true)
  })

  it('no Histórico, a linha "Registrado por …"', async () => {
    montar()
    await waitFor(() => expect(within(blocoHistorico()).getByText('Pagamento registrado manualmente')).toBeInTheDocument())
    const linha = within(blocoHistorico()).getByText('Pagamento registrado manualmente').closest('li') as HTMLElement
    const p = within(linha).getByText(`Registrado por ${EMAIL}`)
    expect(p.tagName).toBe('P')
    expect(temToken(p, QUEBRA_EM_QUALQUER_PONTO)).toBe(true)
    // O contêiner flex da linha deixa o texto encolher abaixo do e-mail.
    expect(temToken(p.parentElement as HTMLElement, 'min-w-0')).toBe(true)
  })
})
