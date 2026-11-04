// A observação do pedido, pela PÁGINA REAL do pedido.
//
// Molde de `AdminOrderPage.origem.test.tsx` (as mesmas fronteiras dubladas: a leitura do pedido, as
// escritas do pedido, o toast, o Melhor Envio e as configurações). A observação vem do client dublado
// na fronteira (`@estrelinha/supabase/client`), que guarda a linha como o banco guardaria, e a escrita
// passa pelo dono de `core` DE VERDADE (só espiado).

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { DbOrder } from '@estrelinha/supabase/types'
import { DEFAULT_NOTIFICATIONS } from '@estrelinha/core/notifications'

type Passo = [string, ...unknown[]]

const { detailMock, estado, writeSpy, pickSlipsMock } = vi.hoisted(() => ({
  detailMock: vi.fn(),
  estado: {
    linha: null as unknown,
    leituraFalha: false,
    cadeias: [] as { tabela: string; passos: [string, ...unknown[]][] }[],
  },
  writeSpy: vi.fn(),
  pickSlipsMock: vi.fn(),
}))

vi.mock('@estrelinha/supabase/client', () => {
  const builder = (cadeia: { tabela: string; passos: Passo[] }) => {
    const b: Record<string, unknown> = {}
    for (const m of ['select', 'eq', 'maybeSingle', 'upsert', 'delete']) {
      b[m] = (...args: unknown[]) => {
        cadeia.passos.push([m, ...args])
        return b
      }
    }
    b.then = (resolve: (v: unknown) => unknown) => {
      const primeiro = cadeia.passos[0]?.[0]
      let r: unknown
      if (primeiro === 'select') {
        r = estado.leituraFalha ? { data: null, error: { message: 'falhou' } } : { data: estado.linha, error: null }
      } else if (primeiro === 'delete') {
        const antes = estado.linha
        estado.linha = null
        r = { data: antes ? [antes] : [], error: null }
      } else {
        // O instante é do banco (default e trigger): quem grava não o manda, o banco dublado o põe.
        estado.linha = { updated_by_name: null, ...(cadeia.passos[0][1] as object), updated_at: '2026-11-03T15:00:00.000Z' }
        r = { data: [estado.linha], error: null }
      }
      return Promise.resolve(r).then(resolve)
    }
    return b
  }
  return {
    supabase: {
      from: (tabela: string) => {
        const cadeia = { tabela, passos: [] as Passo[] }
        estado.cadeias.push(cadeia)
        return builder(cadeia)
      },
      functions: { invoke: async () => ({ data: null, error: null }) },
    },
  }
})
vi.mock('@estrelinha/auth', () => ({
  useAuthContext: () => ({ user: { id: 'u-admin', email: 'adri@exemplo.invalid' }, customer: { name: 'Adri Muniz' } }),
}))
vi.mock('@estrelinha/core/order-actions', async (importOriginal) => {
  const real = await importOriginal<typeof import('@estrelinha/core/order-actions')>()
  return {
    ...real,
    writeAdminNote: (...args: Parameters<typeof real.writeAdminNote>) => {
      writeSpy(...args)
      return real.writeAdminNote(...args)
    },
  }
})
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
vi.mock('@/features/pick-slip', () => ({ openPickSlips: pickSlipsMock }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', async importOriginal => ({
  ...(await importOriginal<typeof import('@estrelinha/core/hooks/useStoreSettings')>()),
  useNotificationSettings: () => DEFAULT_NOTIFICATIONS,
}))

import AdminOrderPage from './AdminOrderPage'

const order = (over: Record<string, unknown> = {}): DbOrder =>
  ({
    id: 'o1', order_number: '1042', customer_id: 'c1', customer_name: 'Luciana Prado',
    customer_email: 'lu.prado@example.com', status: 'paid', payment_method: 'pix', payment_status: 'approved',
    paid_at: '2026-08-20T14:35:00Z', pix_discount: 0, subtotal: 180, discount: 0, shipping_cost: 0,
    total: 180, tracking_code: null, material_tracking_code: null, material_status: 'nao_aplicavel',
    notes: 'Embale para presente',
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

const campo = () => screen.findByRole('textbox', { name: 'Observação' })

const salvar = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole('button', { name: 'Salvar observação' }))
  })
}

beforeEach(() => {
  estado.linha = null
  estado.leituraFalha = false
  estado.cadeias.length = 0
  writeSpy.mockClear()
  pickSlipsMock.mockClear()
})

describe('Recado, Observação e Nota interna são três coisas distintas', () => {
  it('o Recado da cliente, o card Observação e o campo da nota interna aparecem separados', async () => {
    detailMock.mockReturnValue(detail(order()))
    montar()
    const observacao = (await campo()).closest('section') as HTMLElement
    const recado = screen.getByText('Recado da cliente').closest('section') as HTMLElement
    expect(recado).not.toBe(observacao)
    expect(within(observacao).queryByText('Embale para presente')).toBeNull()
    expect(within(observacao).getByText('Só quem administra vê. A cliente não recebe.')).toBeInTheDocument()
    const notaInterna = screen.getByRole('textbox', { name: 'Nova nota interna' })
    expect(observacao.contains(notaInterna)).toBe(false)
    // O card vem logo depois do Recado.
    expect(recado.nextElementSibling).toBe(observacao)
  })

  it('a observação lida é a deste pedido (`order_id`)', async () => {
    detailMock.mockReturnValue(detail(order()))
    montar()
    await campo()
    const leitura = estado.cadeias.find((c) => c.tabela === 'order_admin_notes' && c.passos[0][0] === 'select')
    expect(leitura?.passos).toContainEqual(['eq', 'order_id', 'o1'])
  })
})

describe('cadastra e edita em qualquer status — pelo dono de `core`', () => {
  it.each([
    ['concluído (entregue)', 'delivered'],
    ['cancelado', 'cancelled'],
    ['montado pelo painel, pendente', 'pending'],
  ])('pedido %s: cadastra, e depois edita', async (_nome, status) => {
    detailMock.mockReturnValue(detail(order({ status, proposal_id: status === 'pending' ? 'p-1' : null })))
    montar()
    fireEvent.change(await campo(), { target: { value: 'Gravar "Ana" na frente' } })
    await salvar()
    await waitFor(() => expect(screen.getByText(/Atualizada em .* por Adri Muniz/)).toBeInTheDocument())
    expect(writeSpy).toHaveBeenCalledTimes(1)
    expect(writeSpy.mock.calls[0][1]).toMatchObject({ orderId: 'o1', texto: 'Gravar "Ana" na frente' })

    fireEvent.change(await campo(), { target: { value: 'Gravar "Ana" atrás' } })
    await salvar()
    await waitFor(() => expect(writeSpy).toHaveBeenCalledTimes(2))
    expect(estado.linha).toMatchObject({ order_id: 'o1', note: 'Gravar "Ana" atrás', updated_by: 'u-admin' })
  })
})

describe('a leitura que falha não se apresenta como "sem observação"', () => {
  it('a página mostra o erro com "Tentar de novo", sem campo de observação', async () => {
    estado.leituraFalha = true
    detailMock.mockReturnValue(detail(order()))
    montar()
    expect(await screen.findByText('Não consegui ler a observação deste pedido.')).toBeInTheDocument()
    expect(screen.queryByRole('textbox', { name: 'Observação' })).toBeNull()
  })
})

describe('a folha de separação deste pedido leva a observação', () => {
  it('o botão passa a observação lida à folha', async () => {
    estado.linha = { order_id: 'o1', note: 'Conferir o fecho', updated_by: null, updated_by_name: null, updated_at: '2026-11-03T15:00:00Z' }
    detailMock.mockReturnValue(detail(order()))
    montar()
    await waitFor(async () => expect(await campo()).toHaveValue('Conferir o fecho'))
    fireEvent.click(screen.getByRole('button', { name: /Folha de separação/ }))
    expect(pickSlipsMock).toHaveBeenCalledTimes(1)
    expect(pickSlipsMock.mock.calls[0][0][0]).toMatchObject({ id: 'o1', notes: 'Embale para presente', admin_note: 'Conferir o fecho' })
  })

  it('sem observação, a folha recebe `admin_note` nulo', async () => {
    detailMock.mockReturnValue(detail(order()))
    montar()
    await campo()
    fireEvent.click(screen.getByRole('button', { name: /Folha de separação/ }))
    expect(pickSlipsMock.mock.calls[0][0][0].admin_note).toBeNull()
  })
})
