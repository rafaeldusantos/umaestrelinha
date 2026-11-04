// A origem do pedido montado pelo painel, pela PÁGINA REAL do pedido (feature 89, T20: `HIS-02`).
//
// Molde de `AdminOrderPage.test.tsx` (as mesmas fronteiras dubladas: a leitura do pedido, as escritas,
// o toast, o Melhor Envio e as configurações). O que é desta feature — a linha "Montado pelo painel ·
// P-0001" e "Desconto combinado — {motivo}" — vem do `functions.invoke` REAL do client dublado, porque
// o número e o motivo moram em `order_proposals`, que só a function `order-proposals` lê.

import { render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DbOrder } from '@estrelinha/supabase/types'
import { DEFAULT_NOTIFICATIONS } from '@estrelinha/core/notifications'

const { detailMock, invocacoes, estado } = vi.hoisted(() => ({
  detailMock: vi.fn(),
  invocacoes: [] as { nome: string; corpo: unknown }[],
  estado: { invocar: (_n: string): unknown => ({ data: null, error: null }) },
}))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    functions: {
      invoke: async (nome: string, opcoes: { body: unknown }) => {
        invocacoes.push({ nome, corpo: opcoes?.body })
        return estado.invocar(nome)
      },
    },
  },
}))
vi.mock('@/entities/order/api/useAdminOrder', () => ({ useAdminOrder: detailMock }))
vi.mock('@/entities/order/api/useAdminOrders', async importOriginal => ({
  ...(await importOriginal<typeof import('@/entities/order/api/useAdminOrders')>()),
  useAdminOrders: () => ({
    updateStatus: vi.fn(), cancelOrder: vi.fn(), addTrackingCode: vi.fn(), addNote: vi.fn(),
    setMaterialStatus: vi.fn(), setMaterialTracking: vi.fn(),
  }),
}))
vi.mock('@/entities/order/api/notifyOrder', () => ({ resendNotification: vi.fn(), notifyOrder: vi.fn().mockResolvedValue(true) }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/features/order-management/ui/MelhorEnvioTab', () => ({ default: () => null }))
vi.mock('@/features/pick-slip', () => ({ openPickSlips: vi.fn() }))
// A observação do pedido lê e grava sozinha (sessão e cache próprios); a prova dela pela página real é
// `AdminOrderPage.observacao.test.tsx`. Aqui ela fica fora do caminho, como o Melhor Envio.
vi.mock('@/features/order-admin-note', () => ({
  OrderAdminNoteCard: () => null,
  useOrderAdminNote: () => ({ nota: null, carregando: false, falhou: false, tentarDeNovo: () => {}, salvar: async () => ({ tipo: 'ok', nota: null }) }),
}))
vi.mock('@estrelinha/core/hooks/useStoreSettings', async importOriginal => ({
  ...(await importOriginal<typeof import('@estrelinha/core/hooks/useStoreSettings')>()),
  useNotificationSettings: () => DEFAULT_NOTIFICATIONS,
}))

import AdminOrderPage from './AdminOrderPage'

const PROPOSTA = '99999999-9999-4999-8999-999999999999'

const order = (over: Record<string, unknown> = {}): DbOrder =>
  ({
    id: 'o1', order_number: '1042', customer_id: 'c1', customer_name: 'Luciana Prado',
    customer_email: 'lu.prado@example.com', status: 'paid', payment_method: 'pix', payment_status: 'approved',
    paid_at: '2026-08-20T14:35:00Z', pix_discount: 6.5, subtotal: 180, discount: 18, shipping_cost: 0,
    total: 135.5, tracking_code: null, material_tracking_code: null, material_status: 'nao_aplicavel', notes: null,
    address_street: 'Rua A', address_number: '1', address_city: 'Porto Alegre', address_state: 'RS',
    address_zip: '90540-041', created_at: '2026-08-20T14:32:00Z',
    ...over,
  }) as unknown as DbOrder

const detail = (o: DbOrder) => ({
  order: o,
  items: [{ id: 'i1', order_id: 'o1', product_id: 'p1', product_name: 'Colar', quantity: 1, unit_price: 180, engraving_text: null, variant_label: null, material_kinds: [], requires_material: false }],
  history: [], notes: [], emails: [], itemsError: null, productRefs: {}, loading: false, error: null, reload: vi.fn(),
})

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

const resumoDePagamento = () => within(screen.getByText('Desconto Pix').closest('dl') as HTMLElement)

beforeEach(() => {
  invocacoes.length = 0
  estado.invocar = (nome) =>
    nome === 'order-proposals?action=get'
      ? { data: { proposal: { id: PROPOSTA, number: 'P-0001', manual_discount_reason: 'Cliente antiga' }, state: 'completed', actions: {} }, error: null }
      : { data: null, error: null }
})

describe('HIS-02: o pedido que nasceu de uma proposta', () => {
  it('mostra "Montado pelo painel · P-0001" com link para a proposta', async () => {
    detailMock.mockReturnValue(detail(order({ proposal_id: PROPOSTA, manual_discount: 20 })))
    montar()
    const origem = await screen.findByRole('link', { name: 'Montado pelo painel · P-0001' })
    expect(origem).toHaveAttribute('href', `/admin/pedidos/montados/${PROPOSTA}`)
    expect(invocacoes).toEqual([{ nome: 'order-proposals?action=get', corpo: { id: PROPOSTA } }])
  })

  it('o desconto combinado aparece no Pagamento COM o motivo, e o valor é o do pedido (o cobrado)', async () => {
    detailMock.mockReturnValue(detail(order({ proposal_id: PROPOSTA, manual_discount: 20 })))
    montar()
    const linha = await screen.findByTestId('desconto-combinado')
    await waitFor(() => expect(linha).toHaveTextContent('Desconto combinado — Cliente antiga'))
    expect(linha).toHaveTextContent(/− R\$\s?20,00/)
    // Na mesma lista do resumo, entre o desconto e o desconto Pix.
    expect(resumoDePagamento().getByTestId('desconto-combinado')).toBe(linha)
    // Prova em navegador da T27: com a fonte a 200 % em 390 o rótulo com o motivo e o valor não
    // cabiam na linha e passavam da tela; a linha embrulha (o valor desce). Token exato.
    expect((linha.getAttribute('class') ?? '').split(/\s+/)).toContain('flex-wrap')
  })

  it('a proposta ainda não lida (ou que falhou) não esconde a origem: o rótulo fica sem o número', async () => {
    estado.invocar = () => ({ data: null, error: { message: 'x' } })
    detailMock.mockReturnValue(detail(order({ proposal_id: PROPOSTA, manual_discount: 20 })))
    montar()
    expect(await screen.findByRole('link', { name: 'Montado pelo painel' })).toHaveAttribute('href', `/admin/pedidos/montados/${PROPOSTA}`)
    expect(screen.getByTestId('desconto-combinado')).toHaveTextContent(/^Desconto combinado− R\$\s?20,00$/)
  })

  it('proposta sem desconto combinado não ganha a linha', async () => {
    detailMock.mockReturnValue(detail(order({ proposal_id: PROPOSTA, manual_discount: 0 })))
    montar()
    await screen.findByRole('link', { name: 'Montado pelo painel · P-0001' })
    expect(screen.queryByTestId('desconto-combinado')).toBeNull()
  })
})

describe('o pedido da loja continua idêntico ao de hoje', () => {
  it('sem proposal_id: nenhuma origem, nenhuma linha de desconto combinado, e nenhuma chamada nova', async () => {
    detailMock.mockReturnValue(detail(order()))
    montar()
    expect(screen.getByText('Pedido #1042')).toBeInTheDocument()
    expect(screen.queryByTestId('origem-do-pedido')).toBeNull()
    expect(screen.queryByText(/Montado pelo painel/)).toBeNull()
    expect(screen.queryByText(/Desconto combinado/)).toBeNull()
    await new Promise((r) => setTimeout(r, 20))
    expect(invocacoes).toHaveLength(0)
  })

  it('`manual_discount` sem proposta (dado estranho) não é mostrado como combinado', () => {
    detailMock.mockReturnValue(detail(order({ manual_discount: 15 })))
    montar()
    expect(screen.queryByTestId('desconto-combinado')).toBeNull()
    expect(invocacoes).toHaveLength(0)
  })
})
