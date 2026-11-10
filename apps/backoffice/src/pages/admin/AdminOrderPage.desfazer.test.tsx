// Desfazer o pagamento registrado à mão, pela PÁGINA REAL do pedido e pelo dono real da escrita
// (`core/order-actions`), com só o client do Supabase dublado: a ação aparece só com o pedido em Pago
// e com registro manual vivo, pede o motivo, grava pela RPC e não passa pelo portão de e-mail.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { toast } from 'sonner'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DbOrder } from '@estrelinha/supabase/types'
import { DEFAULT_NOTIFICATIONS } from '@estrelinha/core/notifications'

const { detailMock, rpcs, invocacoes, notifyOrder, reload, resposta } = vi.hoisted(() => ({
  detailMock: vi.fn(),
  rpcs: [] as { fn: string; args: unknown }[],
  invocacoes: [] as unknown[],
  notifyOrder: vi.fn(),
  reload: vi.fn(),
  resposta: { atual: { data: { result: 'ok', status: 'pending' }, error: null } as { data: unknown; error: unknown } },
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
      rpc: async (fn: string, args: unknown) => {
        rpcs.push({ fn, args })
        return resposta.atual
      },
      functions: {
        invoke: async (...a: unknown[]) => {
          invocacoes.push(a)
          return { data: null, error: null }
        },
      },
      storage: { from: () => ({ createSignedUrl: async () => ({ data: null, error: null }) }) },
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
    updateStatus: vi.fn(), cancelOrder: vi.fn(), addTrackingCode: vi.fn(), addNote: vi.fn(),
    setMaterialStatus: vi.fn(), setMaterialTracking: vi.fn(),
  }),
}))
vi.mock('@/entities/order/api/notifyOrder', () => ({ resendNotification: vi.fn(), notifyOrder }))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn() } }))
vi.mock('@/features/order-management/ui/MelhorEnvioTab', () => ({ default: () => null }))
vi.mock('@/features/order-admin-note', () => ({ OrderAdminNoteCard: () => null }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', async importOriginal => ({
  ...(await importOriginal<typeof import('@estrelinha/core/hooks/useStoreSettings')>()),
  useNotificationSettings: () => DEFAULT_NOTIFICATIONS,
}))

import AdminOrderPage from './AdminOrderPage'

// A página relida de verdade: o `reload` do dublê troca o pedido e força a página a desenhar de novo.
let forcar: () => void = () => {}
const PaginaRelida = () => {
  const [, set] = useState(0)
  forcar = () => set(n => n + 1)
  return <AdminOrderPage />
}

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
  id: 'reg-1', method: 'transferencia', paid_at: '2026-11-08T15:30:00Z', note: 'Pagou no Itaú',
  created_by_name: 'Adri Muniz', created_at: '2026-11-08T16:00:00Z', undone_at: null,
  order_manual_payment_receipts: [],
}

const detail = (o: DbOrder, manualPayment: unknown = null, paymentAlerts: { kind: string }[] = []) => ({
  order: o,
  items: [{ id: 'i1', order_id: 'o1', product_id: 'p1', product_name: 'Colar', quantity: 1, unit_price: 180, engraving_text: null, variant_label: null, material_kinds: [], requires_material: false }],
  history: [], notes: [], emails: [], itemsError: null, productRefs: {}, loading: false, error: null, reload,
  manualPayment, paymentAlerts,
})

const montar = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter initialEntries={['/admin/pedidos/o1']}>
        <Routes>
          <Route path="/admin/pedidos/:id" element={<PaginaRelida />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

const blocoPagamento = () => screen.getByRole('heading', { name: 'Pagamento' }).closest('section') as HTMLElement
const botaoDesfazer = () => within(blocoPagamento()).queryByRole('button', { name: 'Desfazer registro' })

beforeEach(() => {
  rpcs.length = 0
  invocacoes.length = 0
  notifyOrder.mockReset()
  reload.mockReset()
  vi.mocked(toast.error).mockReset()
  vi.mocked(toast.success).mockReset()
  resposta.atual = { data: { result: 'ok', status: 'pending' }, error: null }
})

describe('"Desfazer registro" só existe para o registro manual de um pedido em Pago', () => {
  it('pedido em Pago com registro manual: a ação aparece no bloco Pagamento', () => {
    detailMock.mockReturnValue(detail(order(), REGISTRO))
    montar()
    expect(botaoDesfazer()).toBeInTheDocument()
  })

  it('pagamento aprovado pela loja (sem registro manual): a ação não aparece', () => {
    detailMock.mockReturnValue(detail(order()))
    montar()
    expect(botaoDesfazer()).toBeNull()
  })

  it.each(['separating', 'shipped', 'delivered'])('pedido em %s com registro manual: a ação não aparece', status => {
    detailMock.mockReturnValue(detail(order({ status }), REGISTRO))
    montar()
    expect(screen.getByText('Registrado à mão')).toBeInTheDocument()
    expect(botaoDesfazer()).toBeNull()
  })
})

describe('pedido pago duas vezes: a loja também recebeu, e o registro não se desfaz', () => {
  it('com o selo "Pago duas vezes", o registro continua à vista e "Desfazer registro" não aparece', () => {
    detailMock.mockReturnValue(detail(order(), REGISTRO, [{ kind: 'paid_twice' }]))
    montar()
    expect(within(blocoPagamento()).getByText('Pago duas vezes — devolver um dos valores')).toBeInTheDocument()
    expect(within(blocoPagamento()).getByText('Registrado à mão')).toBeInTheDocument()
    expect(botaoDesfazer()).toBeNull()
  })

  it('o par sem o selo, com o mesmo registro e o pedido em Pago, oferece "Desfazer registro"', () => {
    detailMock.mockReturnValue(detail(order(), REGISTRO, [{ kind: 'paid_after_cancel' }]))
    montar()
    expect(botaoDesfazer()).toBeInTheDocument()
  })
})

describe('depois de desfazer, o histórico não leva a cliente a receber "Pagamento aprovado"', () => {
  const AVISO_PULADO = {
    id: 'n1', order_id: 'o1', event: 'order_paid', channel: 'email', status: 'skipped', attempts: 0,
    delivery_status: null, error: null, created_at: '2026-11-08T16:00:05Z', sent_at: null,
  }
  const HISTORICO = [
    { id: 'h2', order_id: 'o1', from_status: 'paid', to_status: 'pending', note: 'Registro de pagamento desfeito. Motivo: Engano', created_at: '2026-11-08T17:00:00Z', created_by: 'u-admin' },
    { id: 'h1', order_id: 'o1', from_status: 'pending', to_status: 'paid', note: 'Pagamento registrado manualmente', created_at: '2026-11-08T16:00:00Z', created_by: 'u-admin' },
  ]
  const historico = () => screen.getByRole('heading', { name: 'Histórico' }).closest('section') as HTMLElement
  const ofertaDoEmail = () =>
    within(historico()).queryByRole('button', { name: 'Enviar agora o e-mail “Pagamento aprovado” para a cliente' })

  it('pedido desfeito para Pendente: a linha do aviso pulado fica, sem a oferta de enviar o e-mail', () => {
    detailMock.mockReturnValue({
      ...detail(order({ status: 'pending', payment_status: 'expired', paid_at: null })),
      history: HISTORICO,
      emails: [AVISO_PULADO],
    })
    montar()
    expect(within(historico()).getByText('Aviso à cliente não enviado: Pagamento aprovado')).toBeInTheDocument()
    expect(ofertaDoEmail()).toBeNull()
  })

  it('o par ainda pago, com o mesmo aviso pulado, continua oferecendo enviar o e-mail', () => {
    detailMock.mockReturnValue({ ...detail(order(), REGISTRO), history: HISTORICO.slice(1), emails: [AVISO_PULADO] })
    montar()
    expect(ofertaDoEmail()).toBeInTheDocument()
  })
})

describe('desfazer pede o motivo e não abre o portão de e-mail', () => {
  const abrir = async () => {
    detailMock.mockReturnValue(detail(order(), REGISTRO))
    montar()
    await act(async () => {
      fireEvent.click(botaoDesfazer() as HTMLElement)
    })
    return screen.getByRole('dialog')
  }

  it('o diálogo pede o motivo, e sem ele não confirma nem grava', async () => {
    const dialogo = await abrir()
    const motivo = within(dialogo).getByRole('textbox', { name: 'Motivo' })
    expect(motivo).toBeInTheDocument()
    const confirmar = within(dialogo).getByRole('button', { name: 'Desfazer o registro' })
    expect(confirmar).toBeDisabled()
    fireEvent.change(motivo, { target: { value: '   ' } })
    expect(confirmar).toBeDisabled()
    await act(async () => {
      fireEvent.click(confirmar)
    })
    expect(rpcs).toEqual([])
  })

  it('com o motivo, grava pela RPC com motivo e autor, relê o pedido, e nenhum e-mail sai', async () => {
    const dialogo = await abrir()
    expect(within(dialogo).queryByRole('checkbox')).toBeNull()
    expect(within(dialogo).getByText(/nenhum e-mail sai/i)).toBeInTheDocument()
    fireEvent.change(within(dialogo).getByRole('textbox', { name: 'Motivo' }), {
      target: { value: '  Comprovante era de outro pedido  ' },
    })
    await act(async () => {
      fireEvent.click(within(dialogo).getByRole('button', { name: 'Desfazer o registro' }))
    })
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(rpcs).toEqual([
      {
        fn: 'undo_manual_payment',
        args: { p_order_id: 'o1', p_reason: 'Comprovante era de outro pedido', p_author_name: 'Adri Muniz' },
      },
    ])
    expect(reload).toHaveBeenCalledWith('revalidar')
    expect(notifyOrder).not.toHaveBeenCalled()
    expect(invocacoes).toEqual([])
    expect(screen.queryByRole('alertdialog')).toBeNull()
  })

  it.each([
    ['o pedido saiu de Pago', 'fora_de_pago', 'Só dá para desfazer com o pedido em Pago.', () => detail(order({ status: 'separating' }), REGISTRO)],
    ['outra admin já desfez', 'sem_registro', 'Este pedido não tem pagamento registrado à mão para desfazer.', () => detail(order({ status: 'pending', payment_status: 'expired', paid_at: null }), null)],
  ])('o banco recusando porque %s, a releitura tira a ação e a frase chega assim mesmo', async (_caso, result, frase, relido) => {
    resposta.atual = { data: { result }, error: null }
    reload.mockImplementation(() => {
      detailMock.mockReturnValue(relido())
      forcar()
    })
    const dialogo = await abrir()
    fireEvent.change(within(dialogo).getByRole('textbox', { name: 'Motivo' }), { target: { value: 'Engano' } })
    await act(async () => {
      fireEvent.click(within(dialogo).getByRole('button', { name: 'Desfazer o registro' }))
    })
    expect(reload).toHaveBeenCalledWith('revalidar')
    await waitFor(() => expect(botaoDesfazer()).toBeNull())
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(toast.error).toHaveBeenCalledWith(frase)
    expect(toast.success).not.toHaveBeenCalled()
  })

  it('sem papel, nada é relido: o diálogo fica aberto com a frase e o motivo', async () => {
    resposta.atual = { data: { result: 'sem_papel' }, error: null }
    const dialogo = await abrir()
    const motivo = within(dialogo).getByRole('textbox', { name: 'Motivo' })
    fireEvent.change(motivo, { target: { value: 'Engano' } })
    await act(async () => {
      fireEvent.click(within(dialogo).getByRole('button', { name: 'Desfazer o registro' }))
    })
    expect(within(dialogo).getByRole('alert')).toHaveTextContent('Sua conta não tem acesso de administração.')
    expect((motivo as HTMLTextAreaElement).value).toBe('Engano')
    expect(reload).not.toHaveBeenCalled()
  })
})
