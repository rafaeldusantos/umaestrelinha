// A aba "Montados" da lista de Pedidos, pela PÁGINA REAL (feature 89, T19: `LNK-04`, `A-14`; e o
// "Montar pedido" do cabeçalho, `MON-01`).
//
// Dublados: a lista de PEDIDOS (`useAdminOrderList`, provada na suíte irmã — aqui ela só precisa
// existir), as escritas do pedido, o toast e o `functions.invoke` do client, que é por onde a lista
// de propostas chega. `ProposalsList`, `useProposalList`, o React Query e `queryUrl.ts` são os reais.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ORDER_VIEWS } from '@estrelinha/core/orders'
import { DEFAULT_NOTIFICATIONS } from '@estrelinha/core/notifications'

const { estado, listMock } = vi.hoisted(() => ({
  listMock: vi.fn(),
  estado: {
    invocar: (_nome: string): unknown => ({ data: { proposals: [] }, error: null }),
    invocacoes: [] as string[],
  },
}))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    from: () => {
      throw new Error('a aba Montados não lê tabela nenhuma pelo PostgREST')
    },
    functions: {
      invoke: async (nome: string) => {
        estado.invocacoes.push(nome)
        return estado.invocar(nome)
      },
    },
  },
}))
vi.mock('@/entities/order/api/useAdminOrderList', () => ({ useAdminOrderList: listMock }))
vi.mock('@/entities/order/api/useAdminOrders', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/entities/order/api/useAdminOrders')>()),
  useAdminOrders: () => ({ setMaterialStatus: vi.fn(), updateStatus: vi.fn() }),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), message: vi.fn() } }))
vi.mock('@/features/pick-slip', () => ({ openPickSlips: vi.fn() }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@estrelinha/core/hooks/useStoreSettings')>()),
  useNotificationSettings: () => DEFAULT_NOTIFICATIONS,
}))

import AdminOrdersPage from './AdminOrdersPage'
import { PROPOSALS_EMPTY, PROPOSALS_READ_FAILED } from '@/features/order-proposal'
import {
  isProposalsView,
  orderListHref,
  orderQueryFromParams,
  orderQueryToParams,
  proposalsViewHref,
} from '@/features/order-list/model/queryUrl'

const listResult = () => ({
  rows: [],
  total: 0,
  loading: false,
  error: null,
  viewCounts: { 'precisa-acao': 0, tudo: 0, 'fila-material': 0, 'a-separar': 0, 'em-transito': 0, concluidos: 0 },
  tileCounts: { aguardando: 0, 'a-separar': 0, 'sem-rastreio': 0, 'pix-aguardando': 0 },
  oldestWaitingAt: null,
  refetch: vi.fn(),
  fetchAllFiltered: vi.fn(),
})

const proposta = (over: Record<string, unknown>) => ({
  id: 'p', number: 'P-0001', status: 'open', version: 1, expires_at: '2026-11-07T15:00:00Z', viewed_at: null,
  order_id: null, order_number: null, customer_name: 'Ana', customer_email: 'ana@x.invalid',
  items_total: 100, created_at: '2026-10-31T15:00:00Z', state: 'open', ...over,
})

const CINCO = [
  proposta({ id: 'p1', number: 'P-0001', customer_name: 'Ana Souza', items_total: 142, state: 'open' }),
  proposta({ id: 'p2', number: 'P-0002', customer_name: 'Bia Lima', items_total: 90, state: 'viewed', viewed_at: '2026-10-31T16:00:00Z' }),
  proposta({ id: 'p3', number: 'P-0003', customer_name: 'Carla Dias', items_total: 300, state: 'completed', status: 'completed', order_id: 'o3', order_number: '0244' }),
  proposta({ id: 'p4', number: 'P-0004', customer_name: 'Duda Reis', items_total: 55, state: 'expired' }),
  proposta({ id: 'p5', number: 'P-0005', customer_name: 'Eva Alves', items_total: 70, state: 'cancelled', status: 'cancelled' }),
]

let local = ''
const Onde = () => {
  const l = useLocation()
  local = l.pathname + l.search
  return null
}

let qc: QueryClient
const montar = (rota: string) => {
  qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[rota]}>
        <Onde />
        <AdminOrdersPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

const tabelaDeMontados = () => within(within(screen.getByTestId('lista-de-montados')).getByRole('table'))

beforeEach(() => {
  estado.invocacoes = []
  estado.invocar = () => ({ data: { proposals: CINCO }, error: null })
  listMock.mockReturnValue(listResult())
  window.localStorage.clear()
})

describe('MON-01: o cabeçalho de Pedidos leva à montagem', () => {
  it('"Montar pedido" é um link para /admin/pedidos/montar, com alvo de 44px no celular', () => {
    montar('/admin/pedidos')
    const link = screen.getByRole('link', { name: 'Montar pedido' })
    expect(link).toHaveAttribute('href', '/admin/pedidos/montar')
    expect(link.className.split(/\s+/)).toContain('min-h-[44px]')
  })
})

describe('A aba "Montados" (LNK-04, A-14)', () => {
  it('é uma aba a mais, fora de ORDER_VIEWS, e ORDER_VIEWS segue com as seis de pedidos', () => {
    montar('/admin/pedidos')
    expect(ORDER_VIEWS.map((v) => v.id)).toEqual(['precisa-acao', 'tudo', 'fila-material', 'a-separar', 'em-transito', 'concluidos'])
    const abas = within(screen.getByRole('tablist')).getAllByRole('tab')
    expect(abas.map((a) => a.textContent?.replace(/\d+$/, '').trim())).toEqual([...ORDER_VIEWS.map((v) => v.label), 'Montados'])
    expect(screen.getByRole('tab', { name: 'Montados' })).toHaveAttribute('aria-selected', 'false')
    // Fora da aba, a lista de propostas nem é pedida.
    expect(estado.invocacoes).toHaveLength(0)
  })

  it('clicar na aba escreve ?visao=montados e mostra a lista de propostas no lugar da de pedidos', async () => {
    montar('/admin/pedidos')
    fireEvent.click(screen.getByRole('tab', { name: 'Montados' }))
    expect(local).toBe('/admin/pedidos?visao=montados')
    expect(screen.getByRole('tab', { name: 'Montados' })).toHaveAttribute('aria-selected', 'true')
    for (const v of ORDER_VIEWS) expect(screen.getByRole('tab', { name: new RegExp(v.label) })).toHaveAttribute('aria-selected', 'false')
    await screen.findByTestId('lista-de-montados')
    expect(estado.invocacoes).toEqual(['order-proposals?action=list'])
    // A busca e os filtros de PEDIDOS saem de cena.
    expect(screen.queryByPlaceholderText(/Buscar/)).toBeNull()
  })

  it('abrir a URL com ?visao=montados abre direto na aba (o F5 não a perde)', async () => {
    montar('/admin/pedidos?visao=montados')
    expect(screen.getByRole('tab', { name: 'Montados' })).toHaveAttribute('aria-selected', 'true')
    await screen.findByTestId('lista-de-montados')
  })

  // Achado na prova em navegador da T27: os dois casos acima asseriam ANTES do debounce da busca
  // (300 ms). No navegador, o debounce roda de novo quando a URL muda (o `setSearchParams` do
  // react-router troca de identidade) e reescrevia a URL a partir da consulta de pedidos, que não
  // conhece "montados" — a aba sumia 300 ms depois do clique, e o F5 nunca a abria.
  const passarDoDebounce = () => act(() => new Promise((r) => setTimeout(r, 700)))

  it('a aba continua aberta depois do debounce da busca — pelo clique', async () => {
    montar('/admin/pedidos')
    fireEvent.click(screen.getByRole('tab', { name: 'Montados' }))
    await passarDoDebounce()
    expect(local).toBe('/admin/pedidos?visao=montados')
    expect(screen.getByRole('tab', { name: 'Montados' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByTestId('lista-de-montados')).toBeInTheDocument()
  })

  it('a aba continua aberta depois do debounce da busca — pela URL (F5)', async () => {
    montar('/admin/pedidos?visao=montados')
    await passarDoDebounce()
    expect(local).toBe('/admin/pedidos?visao=montados')
    expect(screen.getByRole('tab', { name: 'Montados' })).toHaveAttribute('aria-selected', 'true')
  })

  it('o debounce sem mudança de busca não reescreve a URL de pedidos (o que ela não modela fica)', async () => {
    // `utm_source` não faz parte da consulta de pedidos: reescrever a URL a partir dela o apagaria.
    montar('/admin/pedidos?visao=tudo&utm_source=prova')
    await passarDoDebounce()
    expect(local).toBe('/admin/pedidos?visao=tudo&utm_source=prova')
  })

  it('voltar a uma aba de pedidos sai de "Montados" (o outro sentido da URL)', async () => {
    montar('/admin/pedidos?visao=montados')
    await screen.findByTestId('lista-de-montados')
    fireEvent.click(screen.getByRole('tab', { name: /Tudo/ }))
    expect(local).toBe('/admin/pedidos?visao=tudo')
    expect(screen.getByRole('tab', { name: 'Montados' })).toHaveAttribute('aria-selected', 'false')
    expect(screen.queryByTestId('lista-de-montados')).toBeNull()
  })

  it('queryUrl: "montados" é lido nos dois sentidos e nunca vira uma visão de pedidos', () => {
    const p = new URLSearchParams('visao=montados')
    expect(isProposalsView(p)).toBe(true)
    expect(orderQueryFromParams(p).filters.view).toBe(orderQueryFromParams(new URLSearchParams()).filters.view)
    expect(orderQueryToParams(orderQueryFromParams(p)).get('visao')).not.toBe('montados')
    expect(isProposalsView(new URLSearchParams('visao=tudo'))).toBe(false)
    expect(proposalsViewHref()).toBe('/admin/pedidos?visao=montados')
    expect(orderListHref(orderQueryFromParams(p))).toBe('/admin/pedidos')
  })

  it('LNK-04: cada proposta com número, cliente, total, criada em e o estado — os cinco estados', async () => {
    montar('/admin/pedidos?visao=montados')
    await screen.findByTestId('lista-de-montados')
    const t = tabelaDeMontados()
    expect(t.getAllByRole('columnheader').map((h) => h.textContent)).toEqual(['Número', 'Cliente', 'Total', 'Criada em', 'Estado', 'Ações'])
    const linhas = t.getAllByRole('row').slice(1)
    expect(linhas).toHaveLength(5)
    const estados = linhas.map((l) => within(l).getAllByRole('cell')[4].textContent)
    expect(estados).toEqual([
      'Aberta',
      'Aberta — vista pela cliente',
      expect.stringMatching(/^Concluída/),
      'Expirada',
      'Cancelada',
    ])
    const [num, cli, total, criada] = within(linhas[0]).getAllByRole('cell')
    expect(within(num).getByRole('link', { name: 'P-0001' })).toHaveAttribute('href', '/admin/pedidos/montados/p1')
    expect(cli).toHaveTextContent('Ana Souza')
    expect(total).toHaveTextContent(/R\$\s?142,00/)
    expect(criada).toHaveTextContent('31/10/2026')
  })

  it('LNK-04: a Concluída leva ao pedido; as outras não têm link de pedido', async () => {
    montar('/admin/pedidos?visao=montados')
    await screen.findByTestId('lista-de-montados')
    const linhas = tabelaDeMontados().getAllByRole('row').slice(1)
    expect(within(linhas[2]).getByRole('link', { name: 'Pedido #0244' })).toHaveAttribute('href', '/admin/pedidos/o3')
    for (const i of [0, 1, 3, 4]) expect(within(linhas[i]).queryByRole('link', { name: /^Pedido/ })).toBeNull()
    // O cartão do celular diz o mesmo (os dois existem no DOM; quem esconde é a media query).
    const cartoes = within(screen.getByRole('list', { name: 'Pedidos montados' })).getAllByRole('listitem')
    expect(cartoes).toHaveLength(5)
    expect(within(cartoes[2]).getByRole('link', { name: 'Pedido #0244' })).toBeInTheDocument()
    expect(within(cartoes[1])).toBeTruthy()
    expect(cartoes[1]).toHaveTextContent('Aberta — vista pela cliente')
  })

  it('sem nenhuma proposta, diz isso e oferece montar', async () => {
    estado.invocar = () => ({ data: { proposals: [] }, error: null })
    montar('/admin/pedidos?visao=montados')
    expect(await screen.findByText(PROPOSALS_EMPTY)).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: 'Montar pedido' }).length).toBeGreaterThanOrEqual(2)
  })

  it('falha da primeira leitura diz a frase e oferece tentar de novo — nunca "nenhum pedido montado"', async () => {
    estado.invocar = () => ({ data: null, error: { message: 'x' } })
    montar('/admin/pedidos?visao=montados')
    expect(await screen.findByRole('alert')).toHaveTextContent(PROPOSALS_READ_FAILED)
    expect(screen.queryByText(PROPOSALS_EMPTY)).toBeNull()
    expect(screen.getByRole('button', { name: 'Tentar de novo' })).toBeInTheDocument()
  })

  it('a releitura NÃO pisca: com a resposta no ar, as linhas ficam; e uma releitura que falha também as mantém', async () => {
    montar('/admin/pedidos?visao=montados')
    await screen.findByTestId('lista-de-montados')

    let soltar: (v: unknown) => void = () => {}
    estado.invocar = () => new Promise((r) => { soltar = r })
    act(() => {
      void qc.invalidateQueries()
    })
    await waitFor(() => expect(estado.invocacoes).toHaveLength(2))
    expect(screen.getByTestId('lista-de-montados')).toBeInTheDocument()
    expect(tabelaDeMontados().getAllByRole('row')).toHaveLength(6)
    expect(document.querySelector('[aria-busy="true"]')).toBeNull()

    await act(async () => soltar({ data: null, error: { message: 'caiu' } }))
    expect(await screen.findByRole('alert')).toHaveTextContent(`${PROPOSALS_READ_FAILED} Mostrando a última leitura.`)
    expect(tabelaDeMontados().getAllByRole('row')).toHaveLength(6)
  })
})
