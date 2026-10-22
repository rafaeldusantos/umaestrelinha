// Feature 71 · o Dashboard com o bloco "Movimento da loja" — a PÁGINA real e o WIDGET real.
//
// Só o client do Supabase e os widgets alheios ao bloco (`SalesChart`, `AlertsPanel`,
// `TopProductsCard`, `QuickActions`) e a `AdminTable` são dublados. O bloco, o hook dele e o hook do
// canal de pedidos são os de produção: um teste que montasse o bloco ao lado da página provaria a
// composição que ele mesmo escreveu, e passaria com o bloco apagado do Dashboard.
//
// - `VIS-01` (posição): o bloco é o PRIMEIRO irmão depois do `PageHeader`.
// - `VIS-10 (d)`: um canal só (`admin-orders-realtime`), mesmo com re-render; o aviso dele relê as
//   estatísticas E o movimento, e isso se prova pelo que muda NA TELA, não pela contagem de chamadas.
// - `VIS-02` no Dashboard: trocar de aba não lê nada.

import { act, fireEvent, render, renderHook, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { StoreMovement } from '@/entities/stats'

type Chamada = [metodo: string, args: unknown[]]
interface Consulta { tabela: string; chamadas: Chamada[] }
interface Canal { nome: string; aviso: (() => void) | null; on: (...a: unknown[]) => Canal; subscribe: () => Canal }

const db = vi.hoisted(() => ({
  consultas: [] as Consulta[],
  canais: [] as Canal[],
  /** Quantos pedidos `pending` a contagem devolve — lido no instante em que a consulta resolve. */
  pendentes: 2,
}))

const { from, rpc, channel, removeChannel } = vi.hoisted(() => {
  const METODOS = ['select', 'gte', 'lte', 'eq', 'neq', 'order', 'limit'] as const
  const from = vi.fn((tabela: string) => {
    const registro: Consulta = { tabela, chamadas: [] }
    db.consultas.push(registro)
    const consulta: Record<string, unknown> = {}
    for (const metodo of METODOS) {
      consulta[metodo] = (...args: unknown[]) => {
        registro.chamadas.push([metodo, args])
        return consulta
      }
    }
    consulta.then = (ok: (v: unknown) => unknown, falha: (e: unknown) => unknown) => {
      const pendente = registro.chamadas.some(([m, a]) => m === 'eq' && a[0] === 'status' && a[1] === 'pending')
      const resposta = { data: [], count: pendente ? db.pendentes : 0, error: null }
      return Promise.resolve(resposta).then(ok, falha)
    }
    return consulta
  })
  const channel = vi.fn((nome: string) => {
    const canal: Canal = {
      nome,
      aviso: null,
      on: (...a: unknown[]) => {
        canal.aviso = a[2] as () => void
        return canal
      },
      subscribe: () => canal,
    }
    db.canais.push(canal)
    return canal
  })
  return { from, rpc: vi.fn(), channel, removeChannel: vi.fn() }
})

vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from, rpc, channel, removeChannel } }))
vi.mock('@/widgets/sales-chart/ui/SalesChart', () => ({ default: () => <div data-dublado="grafico" /> }))
vi.mock('@/widgets/alerts-panel/ui/AlertsPanel', () => ({ default: () => <div data-dublado="alertas" /> }))
vi.mock('@/widgets/top-products/ui/TopProductsCard', () => ({ default: () => <div data-dublado="mais-vendidos" /> }))
vi.mock('@/widgets/quick-actions/ui/QuickActions', () => ({ default: () => <div data-dublado="atalhos" /> }))
vi.mock('@/shared/ui', async importOriginal => ({
  ...(await importOriginal<typeof import('@/shared/ui')>()),
  AdminTable: () => <div data-dublado="tabela" />,
}))

import AdminDashboard from './AdminDashboard'
import { useAdminStats } from '@/entities/stats/api/useAdminStats'

const periodo = (visitas: number) => ({ visitas, vendas: 0, faturamento: 0, ticket: null as number | null })

/** Quarta-feira, 21/10, 15h32 em Brasília. */
const movimento = (visitasHoje: number): StoreMovement => ({
  hoje: '2026-10-21',
  ontem: '2026-10-20',
  inicio_semana: '2026-10-19',
  expira_em: '2026-10-22T03:00:00+00:00',
  lido_em: '2026-10-21T18:32:05.123+00:00',
  production_host: 'umaestrelinha.com.br',
  contagem_desde: '2026-10-01T12:00:00+00:00',
  contagem_desde_dia: '2026-10-01',
  ultima_visita: '2026-10-21T18:10:00+00:00',
  ultima_visita_dia: '2026-10-21',
  teto_dia: null,
  periodos: { hoje: periodo(visitasHoje), ontem: periodo(7), semana: periodo(2000) },
})

let client: QueryClient
const Provedor = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={client}>{children}</QueryClientProvider>
)
const montar = () => render(<AdminDashboard />, { wrapper: Provedor })

/** O valor de um card: o segundo `<p>` do PRÓPRIO card cujo rótulo é `rotulo` (nunca subir ao vizinho). */
const valorDoCard = (rotulo: string, escopo: HTMLElement = document.body) => {
  const rotulos = within(escopo).getAllByText(rotulo, { selector: 'p' })
  expect(rotulos).toHaveLength(1)
  const card = rotulos[0].parentElement!.parentElement!
  return card.querySelectorAll('p')[1]?.textContent ?? null
}

const secaoMovimento = () => screen.getByRole('region', { name: 'Movimento da loja' })
const carregado = () => screen.findByText('Hoje, 21/10')

beforeEach(() => {
  db.consultas.length = 0
  db.canais.length = 0
  db.pendentes = 2
  from.mockClear()
  channel.mockClear()
  removeChannel.mockClear()
  rpc.mockReset()
  rpc.mockResolvedValue({ data: movimento(1234), error: null })
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

describe('VIS-01 — o bloco é a primeira seção depois do `PageHeader`', () => {
  it('a raiz da página tem, nesta ordem: o cabeçalho "Dashboard" e o bloco "Movimento da loja"', async () => {
    const { container } = montar()
    await carregado()

    const filhos = Array.from(container.firstElementChild!.children)
    expect(filhos[0].querySelector('h1')?.textContent).toBe('Dashboard')
    expect(filhos[1]).toBe(secaoMovimento())
  })

  it('o bloco é o real: as abas e os quatro cards do período, com o número que a RPC devolveu', async () => {
    montar()
    await carregado()
    const secao = secaoMovimento()
    expect(within(secao).getAllByRole('tab').map(a => a.textContent)).toEqual(['Hoje', 'Ontem', 'Esta semana'])
    expect(valorDoCard('Visitas únicas', secao)).toBe('1.234')
  })
})

describe('VIS-10 (d) — um canal de pedidos, duas releituras', () => {
  it('o Dashboard montado abre UM canal, `admin-orders-realtime`, e continua com um depois de re-render', async () => {
    const { rerender } = montar()
    await carregado()
    await waitFor(() => expect(valorDoCard('Pendentes')).toBe('2'))

    rerender(<AdminDashboard />)
    rerender(<AdminDashboard />)

    expect(channel).toHaveBeenCalledTimes(1)
    expect(channel.mock.calls[0]).toEqual(['admin-orders-realtime'])
    expect(removeChannel).not.toHaveBeenCalled()
  })

  it('o aviso do canal relê as estatísticas E o movimento — os dois números mudam na tela', async () => {
    montar()
    await carregado()
    await waitFor(() => expect(valorDoCard('Pendentes')).toBe('2'))
    expect(valorDoCard('Visitas únicas', secaoMovimento())).toBe('1.234')

    db.pendentes = 5
    rpc.mockResolvedValue({ data: movimento(1240), error: null })
    expect(db.canais).toHaveLength(1)
    act(() => db.canais[0].aviso!())

    await waitFor(() => expect(valorDoCard('Pendentes')).toBe('5'))
    await waitFor(() => expect(valorDoCard('Visitas únicas', secaoMovimento())).toBe('1.240'))
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('desmontar o Dashboard remove o MESMO canal que ele abriu', async () => {
    const { unmount } = montar()
    await carregado()
    unmount()
    expect(removeChannel).toHaveBeenCalledTimes(1)
    expect(removeChannel.mock.calls[0][0]).toBe(db.canais[0])
  })

  it('`useAdminStats` sozinho NÃO abre canal — o dono do canal é `useOrdersRealtime`', async () => {
    const { result } = renderHook(() => useAdminStats())
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(channel).not.toHaveBeenCalled()
  })
})

describe('VIS-02 no Dashboard — trocar de aba não lê nada', () => {
  it('Ontem e Esta semana mostram o próprio período, sem nenhuma chamada nova à RPC nem às tabelas', async () => {
    montar()
    await carregado()
    await waitFor(() => expect(valorDoCard('Pendentes')).toBe('2'))
    const rpcAntes = rpc.mock.calls.length
    const consultasAntes = from.mock.calls.length

    // O `TabsTrigger` do Radix troca de aba no `mousedown`, não no `click`.
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Ontem' }), { button: 0, ctrlKey: false })
    await screen.findByText('Ontem, 20/10')
    fireEvent.mouseDown(screen.getByRole('tab', { name: 'Esta semana' }), { button: 0, ctrlKey: false })
    await screen.findByText('De 19/10 a 21/10')

    expect(rpcAntes).toBe(1)
    expect(rpc.mock.calls.length).toBe(rpcAntes)
    expect(from.mock.calls.length).toBe(consultasAntes)
  })
})

// Feature 71 · `VIS-35` — **assunção PENDENTE de confirmação do usuário** (task 27, isolada para
// poder ser revertida). Os dois cards contavam o dia em UTC e pedido não pago; ao lado do bloco,
// dariam duas respostas para "hoje".
describe('VIS-35 — saem "Pedidos Hoje" e "Fat. Hoje"', () => {
  /** A grade dos cards antigos: a que contém o card "Pendentes" (e não a do bloco). */
  const gradeAntiga = () => {
    const rotulo = screen.getByText('Pendentes', { selector: 'p' })
    const grade = rotulo.parentElement!.parentElement!.parentElement!
    expect(grade.querySelector('[data-grade="movimento"]')).toBeNull()
    return grade
  }
  const temToken = (el: Element, token: string) => (el.getAttribute('class') ?? '').split(/\s+/).includes(token)

  it('o Dashboard renderizado não contém "Pedidos Hoje" nem "Fat. Hoje"', async () => {
    montar()
    await carregado()
    await waitFor(() => expect(valorDoCard('Pendentes')).toBe('2'))
    expect(screen.queryByText('Pedidos Hoje')).toBeNull()
    expect(screen.queryByText('Fat. Hoje')).toBeNull()
  })

  it('os quatro que ficam, nesta ordem: Fat. do Mês, Produtos Ativos, Clientes Novos, Pendentes', async () => {
    montar()
    await carregado()
    await waitFor(() => expect(valorDoCard('Pendentes')).toBe('2'))
    const rotulos = Array.from(gradeAntiga().children).map(card => card.querySelector('p')?.textContent)
    expect(rotulos).toEqual(['Fat. do Mês', 'Produtos Ativos', 'Clientes Novos', 'Pendentes'])
  })

  it('a grade é `grid-cols-2 lg:grid-cols-4`, por token exato — e não guarda as colunas de seis cards', async () => {
    montar()
    await carregado()
    const grade = gradeAntiga()
    expect(temToken(grade, 'grid-cols-2')).toBe(true)
    expect(temToken(grade, 'lg:grid-cols-4')).toBe(true)
    expect(temToken(grade, 'lg:grid-cols-6')).toBe(false)
    expect(temToken(grade, 'md:grid-cols-3')).toBe(false)
  })
})
