// Feature 63 — o pedido de retirada no escritório, pela PÁGINA real (`RET-14`, `RET-16`).
//
// Um arquivo à parte, e não casos novos em `AdminOrderPage.test.tsx`, por um motivo só: aquele
// arquivo dubla o `MelhorEnvioTab` inteiro (ele fala com uma API externa), e `RET-14` é exatamente
// sobre o que esse bloco mostra. Aqui o bloco é o REAL, montado pela página — a única dublagem é a
// porta de rede (`supabase.functions.invoke`), espionada para provar que nada foi cotado.
//
// A configuração do escritório vem de `useMaterialSettings`; o dublê declara os exports que a página
// alcança por esse módulo.

import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { DbOrder } from '@estrelinha/supabase/types'
import { supabase } from '@estrelinha/supabase/client'
import { DEFAULT_NOTIFICATIONS } from '@estrelinha/core/notifications'

const { detailMock, reloadMock, updateStatusMock, materialState } = vi.hoisted(() => ({
  detailMock: vi.fn(),
  reloadMock: vi.fn(),
  updateStatusMock: vi.fn(),
  materialState: {
    value: {
      recipient: 'Adri Muniz', street: 'Rua Dona Laura', number: '455', complement: 'Sala 7',
      neighborhood: 'Rio Branco', city: 'Porto Alegre', state: 'RS', zip: '90430091', notes: '',
    },
  },
}))

vi.mock('@/entities/order/api/useAdminOrder', () => ({ useAdminOrder: detailMock }))
vi.mock('@/entities/order/api/useAdminOrders', async importOriginal => ({
  ...(await importOriginal<typeof import('@/entities/order/api/useAdminOrders')>()),
  useAdminOrders: () => ({
    updateStatus: updateStatusMock,
    cancelOrder: vi.fn(),
    addTrackingCode: vi.fn(),
    addNote: vi.fn(),
    setMaterialStatus: vi.fn(),
    setMaterialTracking: vi.fn(),
  }),
}))
vi.mock('@/entities/order/api/notifyOrder', () => ({
  resendNotification: vi.fn(),
  notifyOrder: vi.fn().mockResolvedValue(true),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), info: vi.fn() } }))
vi.mock('@/features/pick-slip', () => ({ openPickSlips: vi.fn() }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useMaterialSettings: () => materialState.value,
  // Feature `88`: a página prevê o aviso pelas configurações de notificação — aqui, os padrões.
  useNotificationSettings: () => DEFAULT_NOTIFICATIONS,
}))

import AdminOrderPage from './AdminOrderPage'

const order = (over: Partial<DbOrder> & Record<string, unknown> = {}): DbOrder =>
  ({
    id: 'o1',
    order_number: '1042',
    customer_id: 'c1',
    customer_name: 'Luciana Prado',
    customer_email: 'lu.prado@example.com',
    status: 'separating',
    payment_method: 'pix',
    payment_status: 'approved',
    paid_at: '2026-08-20T14:35:00Z',
    pix_discount: 0,
    subtotal: 389,
    discount: 0,
    shipping_cost: 0,
    total: 389,
    tracking_code: null,
    material_tracking_code: null,
    material_status: 'material_recebido',
    notes: null,
    address_street: 'Rua Marcelo Gama',
    address_number: '1120',
    address_city: 'Porto Alegre',
    address_state: 'RS',
    address_zip: '90540-041',
    shipping_service_id: 'retirada',
    shipping_method: 'Retirada no escritório',
    shipping_carrier: 'Uma Estrelinha',
    melhor_envio_id: null,
    created_at: '2026-08-20T14:32:00Z',
    ...over,
  }) as unknown as DbOrder

const detail = (o: DbOrder) => ({
  order: o,
  items: [
    {
      id: 'i1', order_id: 'o1', product_id: 'p1', product_name: 'Pingente Gota · Cinzas',
      quantity: 1, unit_price: 389, engraving_text: null,
      variant_label: null, material_kinds: [], requires_material: false,
    },
  ],
  history: [],
  notes: [],
  emails: [],
  itemsError: null,
  productRefs: {},
  loading: false,
  error: null,
  reload: reloadMock,
})

const renderPage = (o: DbOrder) => {
  detailMock.mockReturnValue(detail(o))
  return render(
    <MemoryRouter initialEntries={['/admin/pedidos/o1']}>
      <Routes>
        <Route path="/admin/pedidos/:id" element={<AdminOrderPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const LINHA = 'Escritório - Uma Estrelinha - Rua Dona Laura, Rio Branco, Porto Alegre/RS'

let invoke: ReturnType<typeof vi.spyOn>

beforeEach(() => {
  vi.clearAllMocks()
  updateStatusMock.mockResolvedValue({ error: null, emailSent: false })
  invoke = vi.spyOn(supabase.functions, 'invoke').mockResolvedValue({ data: [], error: null } as never)
  materialState.value = {
    recipient: 'Adri Muniz', street: 'Rua Dona Laura', number: '455', complement: 'Sala 7',
    neighborhood: 'Rio Branco', city: 'Porto Alegre', state: 'RS', zip: '90430091', notes: '',
  }
})

describe('RET-14 — o cartão Entrega de um pedido de retirada', () => {
  it('diz "Retirada no escritório" e a linha do escritório, sem número nem complemento', () => {
    renderPage(order())
    const bloco = screen.getByTestId('entrega-retirada')

    expect(within(bloco).getByText('Retirada no escritório')).toBeInTheDocument()
    expect(within(bloco).getByText(LINHA)).toBeInTheDocument()
    expect(bloco.textContent).not.toContain('455')
    expect(bloco.textContent).not.toContain('Sala 7')
  })

  it('não oferece o rastreio de saída — retirada não tem postagem', () => {
    renderPage(order())
    expect(screen.queryByText('Rastreio da joia (saída)')).toBeNull()
    expect(screen.queryByRole('textbox', { name: 'Código de rastreio da joia' })).toBeNull()
  })

  it('sem o endereço do escritório configurado, diz onde preencher em vez de uma linha quebrada', () => {
    materialState.value = { ...materialState.value, street: '' }
    renderPage(order())
    expect(screen.getByTestId('pickup-location')).toHaveTextContent(
      'Endereço do escritório não cadastrado — preencha o Material na seção Frete e Material.',
    )
  })

  it('o par: pedido dos Correios mostra o rastreio de saída e nenhuma linha de retirada', () => {
    renderPage(order({ shipping_service_id: '1', shipping_method: 'PAC', shipping_carrier: 'Correios' }))
    expect(screen.queryByTestId('entrega-retirada')).toBeNull()
    expect(screen.getByText('Rastreio da joia (saída)')).toBeInTheDocument()
  })
})

describe('RET-14 — o bloco do Melhor Envio, montado pela página', () => {
  it('pedido de retirada: diz que não há etiqueta, e não oferece cotar nem gerar', () => {
    renderPage(order())
    const bloco = screen.getByTestId('melhor-envio-retirada')

    expect(within(bloco).getByText('Pedido de retirada no escritório — sem etiqueta.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /cotar|calcular frete/i })).toBeNull()
    expect(screen.queryByRole('button', { name: /gerar etiqueta/i })).toBeNull()
    expect(invoke).not.toHaveBeenCalled()
  })

  it('o par: pedido dos Correios mostra o bloco de cotação de sempre', () => {
    renderPage(order({ shipping_service_id: '1', shipping_method: 'PAC', shipping_carrier: 'Correios' }))
    expect(screen.queryByTestId('melhor-envio-retirada')).toBeNull()
    // Âncora: o bloco real está montado e oferece a cotação — sem ela, a ausência acima seria
    // verdadeira também com o bloco inteiro sumido.
    expect(screen.getByRole('button', { name: /cota/i })).toBeInTheDocument()
  })
})

describe('RET-16 — o próximo passo da retirada, pela página', () => {
  it('em separação, o botão é "Marcar como retirado" e leva a `delivered`', async () => {
    renderPage(order())
    const botao = screen.getByRole('button', { name: /Marcar como retirado/ })
    fireEvent.click(botao)

    await vi.waitFor(() => expect(updateStatusMock).toHaveBeenCalled())
    expect(updateStatusMock.mock.calls[0]).toContain('delivered')
    expect(updateStatusMock.mock.calls[0]).not.toContain('shipped')
  })

  it('o par: o mesmo pedido pelos Correios oferece "Enviado"', () => {
    renderPage(order({ shipping_service_id: '1', shipping_method: 'PAC', shipping_carrier: 'Correios' }))
    expect(screen.queryByRole('button', { name: /Marcar como retirado/ })).toBeNull()
    expect(screen.getByRole('button', { name: /^Enviado/ })).toBeInTheDocument()
  })
})
