// O desconto do Compre Junto na PÁGINA REAL do pedido no painel.
//
// Molde de `AdminOrderPage.acompanha.test.tsx` (as mesmas fronteiras dubladas). A peça com desconto
// mostra o preço cheio riscado e o cobrado; a linha gravada partida (a parte com o desconto casado e a
// parte avulsa da mesma peça) aparece em duas, e só a primeira diz o que acompanha. O cartão Pagamento
// parte do preço cheio e tem uma linha por desconto — a mesma composição do resumo da loja. Os valores
// esperados são literais deste arquivo, nunca recalculados pela regra.

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

// O pedido com o Compre Junto: o pingente (cheio), e a corrente que o acompanha gravada partida —
// uma unidade com 20% a menos e outra avulsa, pelo preço cheio. PIX de R$ 19,00 e frete de R$ 25,00.
const comCompreJunto = () =>
  detail(
    pedido({
      subtotal: 380, discount: 0, pix_discount: 19, shipping_cost: 25, total: 386,
      buy_together_discount: 20, promotion_discount: 0, order_bump_discount: 0,
    }),
    [
      linha({ id: 'i1', product_id: 'joia', product_name: 'Pingente Estrela', unit_price: 200, full_unit_price: 200 }),
      linha({ id: 'i2', product_id: 'corrente', product_name: 'Corrente Veneziana', unit_price: 80, full_unit_price: 100, accompanies_product_ids: ['joia'] }),
      linha({ id: 'i3', product_id: 'corrente', product_name: 'Corrente Veneziana', unit_price: 100, full_unit_price: 100, accompanies_product_ids: ['joia'] }),
    ],
  )

describe('o pedido com desconto do Compre Junto no painel', () => {
  it('a peça com desconto mostra o preço cheio riscado e o cobrado', () => {
    detailMock.mockReturnValue(comCompreJunto())
    montar()

    const [comDesconto] = screen.getAllByText('Corrente Veneziana').map(n => n.closest('li') as HTMLElement)
    const dePor = within(comDesconto).getByTestId('item-de-por')
    expect(dePor.querySelector('s')?.textContent).toMatch(/^R\$\s100,00$/)
    expect(dePor.textContent).toMatch(/^R\$\s100,00R\$\s80,00$/)
    expect(within(comDesconto).getByText('Acompanha o Pingente Estrela')).toBeInTheDocument()

    // O principal não teve desconto: preço único, nada riscado.
    const principal = screen.getByText('Pingente Estrela', { selector: 'p, a' }).closest('li') as HTMLElement
    expect(principal.querySelector('s')).toBeNull()
    expect(within(principal).getByText('R$ 200,00')).toBeInTheDocument()
  })

  it('a linha mista aparece partida em duas: só a parte com o desconto casado diz o que acompanha', () => {
    detailMock.mockReturnValue(comCompreJunto())
    montar()

    const partes = screen.getAllByText('Corrente Veneziana').map(n => n.closest('li') as HTMLElement)
    expect(partes).toHaveLength(2)
    const [, avulsa] = partes
    expect(avulsa.querySelector('s')).toBeNull()
    expect(within(avulsa).getByText('R$ 100,00')).toBeInTheDocument()
    expect(within(avulsa).queryByText(/Acompanha o /)).toBeNull()
  })

  it('o cartão Pagamento parte do cheio, diz quanto foi o desconto do Compre Junto, e a conta fecha', () => {
    detailMock.mockReturnValue(comCompreJunto())
    montar()

    expect(linhasDoResumo()).toEqual([
      ['Subtotal', 'R$ 400,00'],
      ['Desconto do Compre Junto', '− R$ 20,00'],
      ['Desconto PIX', '− R$ 19,00'],
      ['Frete', 'R$ 25,00'],
      ['Total', 'R$ 386,00'],
    ])

    // A conta que a dona faz de cabeça: subtotal − descontos + frete = total.
    const valores = Object.fromEntries(linhasDoResumo().map(([r, v]) => [r, reais(v)]))
    expect(valores.Subtotal - valores['Desconto do Compre Junto'] - valores['Desconto PIX'] + valores.Frete).toBe(valores.Total)
  })
})

describe('o pedido de antes das colunas de preço cheio fica como era', () => {
  it('subtotal gravado, o desconto do cupom e o PIX; nada riscado e nenhuma linha do Compre Junto', () => {
    detailMock.mockReturnValue(
      detail(
        pedido({ subtotal: 180, discount: 18, pix_discount: 6.5, shipping_cost: 0, total: 155.5 }),
        [linha({ id: 'i1', product_id: 'p1', product_name: 'Colar', unit_price: 180 })],
      ),
    )
    montar()

    expect(linhasDoResumo().map(([r]) => r)).toEqual(['Subtotal', 'Desconto', 'Desconto PIX', 'Frete', 'Total'])
    expect(within(pagamento()).getByText('Subtotal').nextElementSibling).toHaveTextContent(/^R\$\s?180,00$/)
    expect(within(pagamento()).getByText('Frete').nextElementSibling).toHaveTextContent('Grátis')
    expect(within(pagamento()).getByText('Total').nextElementSibling).toHaveTextContent(/^R\$\s?155,50$/)
    expect(screen.queryByText(/Compre Junto/)).toBeNull()
    expect(document.querySelector('ul s')).toBeNull()
    expect(within(screen.getByText('Colar').closest('li') as HTMLElement).getByText('R$ 180,00')).toBeInTheDocument()
  })
})
