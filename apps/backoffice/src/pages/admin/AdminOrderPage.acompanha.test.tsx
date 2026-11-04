// A peça levada pelo Compre Junto, pela PÁGINA REAL do pedido no painel.
//
// Molde de `AdminOrderPage.origem.test.tsx` (as mesmas fronteiras dubladas: a leitura do pedido, as
// escritas, o toast, o Melhor Envio e as configurações). O item adicional diz que acompanha o
// principal; o nome vem da outra linha do MESMO pedido, nunca do catálogo.

import { render, screen, within } from '@testing-library/react'
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

const order = (): DbOrder =>
  ({
    id: 'o1', order_number: '1042', customer_id: 'c1', customer_name: 'Luciana Prado',
    customer_email: 'lu.prado@example.com', status: 'paid', payment_method: 'pix', payment_status: 'approved',
    paid_at: '2026-08-20T14:35:00Z', pix_discount: 0, subtotal: 260, discount: 0, shipping_cost: 0,
    total: 260, tracking_code: null, material_tracking_code: null, material_status: 'nao_aplicavel', notes: null,
    address_street: 'Rua A', address_number: '1', address_city: 'Porto Alegre', address_state: 'RS',
    address_zip: '90540-041', created_at: '2026-08-20T14:32:00Z',
  }) as unknown as DbOrder

const linha = (over: Record<string, unknown>) => ({
  order_id: 'o1', quantity: 1, unit_price: 100, engraving_text: null, variant_label: null,
  material_kinds: [], requires_material: false, ...over,
})

const detail = (items: unknown[]) => ({
  order: order(), items,
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

const itemDe = (nome: string) => screen.getByText(nome).closest('li') as HTMLElement

beforeEach(() => {
  invocacoes.length = 0
  estado.invocar = () => ({ data: null, error: null })
})

describe('o item do pedido no painel diz o que acompanha', () => {
  it('a corrente adicional diz "Acompanha o Pingente Estrela"; o pingente não ganha frase', () => {
    detailMock.mockReturnValue(
      detail([
        linha({ id: 'i1', product_id: 'joia', product_name: 'Pingente Estrela', unit_price: 180 }),
        linha({ id: 'i2', product_id: 'corrente', product_name: 'Corrente Veneziana', unit_price: 80, accompanies_product_ids: ['joia'], accompanies_list_ids: ['7f1c2a9e-3b4d-4e5f-8a6b-1c2d3e4f5a6b'] }),
      ]),
    )
    montar()

    expect(within(itemDe('Corrente Veneziana')).getByText('Acompanha o Pingente Estrela')).toBeInTheDocument()
    expect(within(itemDe('Pingente Estrela')).queryByText(/Acompanha o /)).toBeNull()
  })

  it('dois principais no pedido: cada adicional nomeia o seu ("o X" e "o Y")', () => {
    detailMock.mockReturnValue(
      detail([
        linha({ id: 'i1', product_id: 'joia', product_name: 'Pingente Estrela' }),
        linha({ id: 'i2', product_id: 'anel', product_name: 'Anel Lua' }),
        linha({ id: 'i3', product_id: 'corrente', product_name: 'Corrente Veneziana', accompanies_product_ids: ['joia'] }),
        linha({ id: 'i4', product_id: 'brinco', product_name: 'Brinco Gota', accompanies_product_ids: ['anel'] }),
      ]),
    )
    montar()

    expect(within(itemDe('Corrente Veneziana')).getByText('Acompanha o Pingente Estrela')).toBeInTheDocument()
    expect(within(itemDe('Brinco Gota')).getByText('Acompanha o Anel Lua')).toBeInTheDocument()
  })

  it('a mesma linha que acompanha dois principais diz "Acompanha o X e o Y"', () => {
    detailMock.mockReturnValue(
      detail([
        linha({ id: 'i1', product_id: 'joia', product_name: 'Pingente Estrela' }),
        linha({ id: 'i2', product_id: 'anel', product_name: 'Anel Lua' }),
        linha({ id: 'i3', product_id: 'corrente', product_name: 'Corrente Veneziana', accompanies_product_ids: ['joia', 'anel'], accompanies_list_ids: [null, null] }),
      ]),
    )
    montar()

    expect(within(itemDe('Corrente Veneziana')).getByText('Acompanha o Pingente Estrela e o Anel Lua')).toBeInTheDocument()
  })

  it('o pedido de quem não usou o Compre Junto fica igual: nenhuma frase', () => {
    detailMock.mockReturnValue(
      detail([
        linha({ id: 'i1', product_id: 'joia', product_name: 'Pingente Estrela' }),
        linha({ id: 'i2', product_id: 'corrente', product_name: 'Corrente Veneziana', accompanies_product_ids: null }),
      ]),
    )
    montar()

    expect(screen.getByText('Corrente Veneziana')).toBeInTheDocument()
    expect(screen.queryByText(/Acompanha o /)).toBeNull()
  })
})
