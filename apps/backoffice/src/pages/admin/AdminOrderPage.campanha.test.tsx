// O desconto de campanha na PÁGINA REAL do pedido no painel.
//
// Molde de `AdminOrderPage.desconto.test.tsx` (as mesmas fronteiras dubladas). A peça de campanha
// mostra o preço de tabela riscado e o cobrado, e o cartão Pagamento tem a linha "Desconto de
// campanha" — a mesma composição do resumo da loja e do app. Valores literais deste arquivo.

import { render, screen, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import type { DbOrder } from '@estrelinha/supabase/types'
import { DEFAULT_NOTIFICATIONS } from '@estrelinha/core/notifications'

const { detailMock } = vi.hoisted(() => ({ detailMock: vi.fn() }))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { functions: { invoke: async () => ({ data: null, error: null }) } },
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
// Feature `95`: a observação do pedido lê a sessão (`useAuthContext`), e esta suíte monta a página sem
// `AuthProvider`. A prova da observação pela página real é `AdminOrderPage.observacao.test.tsx`.
vi.mock('@/features/order-admin-note', () => ({
  OrderAdminNoteCard: () => null,
  useOrderAdminNote: () => ({ nota: null, carregando: false, falhou: false, tentarDeNovo: () => {}, salvar: async () => ({ tipo: 'ok', nota: null }) }),
}))
vi.mock('@estrelinha/core/hooks/useStoreSettings', async importOriginal => ({
  ...(await importOriginal<typeof import('@estrelinha/core/hooks/useStoreSettings')>()),
  useNotificationSettings: () => DEFAULT_NOTIFICATIONS,
}))

import AdminOrderPage from './AdminOrderPage'

const pedido = (over: Record<string, unknown>): DbOrder =>
  ({
    id: 'o1', order_number: '1042', customer_id: 'c1', customer_name: 'Luciana Prado',
    customer_email: 'lu.prado@example.com', status: 'paid', payment_method: 'pix', payment_status: 'approved',
    paid_at: '2026-08-20T14:35:00Z', coupon_code: null, tracking_code: null, material_tracking_code: null,
    material_status: 'nao_aplicavel', notes: null, address_street: 'Rua A', address_number: '1',
    address_city: 'Porto Alegre', address_state: 'RS', address_zip: '90540-041', created_at: '2026-08-20T14:32:00Z',
    ...over,
  }) as unknown as DbOrder

const linha = (over: Record<string, unknown>) => ({
  order_id: 'o1', quantity: 1, engraving_text: null, variant_id: null, variant_label: null,
  material_kinds: [], requires_material: false, ...over,
})

const detail = (order: DbOrder, items: unknown[]) => ({
  order, items,
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

const pagamento = () =>
  screen.getByRole('heading', { name: 'Pagamento' }).closest('section')!.querySelector('dl') as HTMLElement

/** As linhas do cartão Pagamento até o Total, como a dona as lê: rótulo e valor crus. */
const linhasDoResumo = () => {
  const linhas = [...pagamento().querySelectorAll(':scope > div')].map(div => [
    (div.querySelector('dt')?.textContent ?? '').replace(/\u00a0/g, ' '),
    (div.querySelector('dd')?.textContent ?? '').replace(/\u00a0/g, ' '),
  ])
  return linhas.slice(0, linhas.findIndex(([rotulo]) => rotulo === 'Total') + 1)
}

const reais = (texto: string) => Number(texto.replace(/[^\d,]/g, '').replace(',', '.'))

// A peça de campanha (209,90 → 167,92) e a comum (100,00), cupom de 10%, PIX de 5%, frete de 20.
const comCampanha = () =>
  detail(
    pedido({
      subtotal: 267.92, discount: 10, coupon_code: 'DEZ', pix_discount: 12.9, shipping_cost: 20, total: 265.02,
      buy_together_discount: 0, promotion_discount: 0, order_bump_discount: 0, campaign_discount: 41.98,
    }),
    [
      linha({ id: 'i1', product_id: 'peca', product_name: 'Pingente Estrela', unit_price: 167.92, full_unit_price: 209.9, campaign_id: 'camp-black', campaign_percent: 20 }),
      linha({ id: 'i2', product_id: 'comum', product_name: 'Corrente Veneziana', unit_price: 100, full_unit_price: 100 }),
    ],
  )

describe('o pedido com desconto de campanha no painel', () => {
  it('a peça de campanha mostra o preço de tabela riscado e o cobrado', () => {
    detailMock.mockReturnValue(comCampanha())
    montar()
    const linhaDaPeca = screen.getByText('Pingente Estrela', { selector: 'p, a' }).closest('li') as HTMLElement
    const dePor = within(linhaDaPeca).getByTestId('item-de-por')
    expect(dePor.textContent).toMatch(/^R\$\s209,90R\$\s167,92$/)
  })

  it('o cartão Pagamento tem a linha do desconto de campanha, e a conta fecha', () => {
    detailMock.mockReturnValue(comCampanha())
    montar()
    const linhas = linhasDoResumo()
    expect(linhas.slice(0, 4)).toEqual([
      ['Subtotal', 'R$ 309,90'],
      ['Desconto de campanha', '− R$ 41,98'],
      ['Cupom DEZ', '− R$ 10,00'],
      ['Desconto PIX', '− R$ 12,90'],
    ])
    expect(linhas.at(-1)).toEqual(['Total', 'R$ 265,02'])
  })
})
