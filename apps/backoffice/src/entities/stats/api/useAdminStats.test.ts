// Feature 71 · `VIS-35` — **assunção PENDENTE de confirmação do usuário** (spec, *Assumptions*:
// "Remover 'Pedidos Hoje' e 'Fat. Hoje'"). A task 27 é isolada para poder ser revertida sozinha.
//
// `useAdminStats` definia "hoje" pelo dia em UTC (a data ISO cortada nos dez primeiros caracteres):
// em Porto Alegre esse "hoje" começa às 21h da véspera, e contava pedido CRIADO, inclusive PIX que
// nunca foi pago. Ao lado do bloco "Movimento da loja" (dia de Brasília decidido no banco, venda
// paga), daria duas respostas para "quanto vendi hoje?". O hook deixa de calcular os dois números —
// sem campo morto — e deixa de fazer a consulta que só eles usavam.

import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

type Chamada = [metodo: string, args: unknown[]]
interface Consulta { tabela: string; chamadas: Chamada[] }

const db = vi.hoisted(() => ({ consultas: [] as Consulta[] }))

const { from } = vi.hoisted(() => {
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
    consulta.then = (ok: (v: unknown) => unknown, falha: (e: unknown) => unknown) =>
      Promise.resolve({ data: [{ id: 'p1', total: 100, created_at: '2026-10-21T12:00:00Z' }], count: 3, error: null }).then(ok, falha)
    return consulta
  })
  return { from }
})

vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from, channel: vi.fn(), removeChannel: vi.fn() } }))

import { useAdminStats } from './useAdminStats'

/** Um dia sem hora (`AAAA-MM-DD`): a forma do recorte de "hoje" em UTC. Os outros recortes são instantes. */
const SO_DIA = /^\d{4}-\d{2}-\d{2}$/

beforeEach(() => {
  db.consultas.length = 0
  from.mockClear()
})

describe('VIS-35 — o hook não calcula mais "hoje" em UTC', () => {
  it('o objeto devolvido não tem `ordersToday` nem `revenueToday`, e os números que ficam continuam lá', async () => {
    const { result } = renderHook(() => useAdminStats())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const { stats } = result.current
    expect(Object.keys(stats).sort()).toEqual([
      'activeProducts',
      'lowStockProducts',
      'monthRevenue',
      'newCustomers',
      'pendingOrders',
      'recentOrders',
      'salesData',
      'topProducts',
    ])
    expect('ordersToday' in stats).toBe(false)
    expect('revenueToday' in stats).toBe(false)
    expect(stats.monthRevenue).toBe(100)
    expect(stats.pendingOrders).toBe(3)
  })

  it('nenhuma consulta recorta por um DIA sem hora — a consulta de "hoje" em UTC não é feita', async () => {
    const { result } = renderHook(() => useAdminStats())
    await waitFor(() => expect(result.current.loading).toBe(false))

    // Âncora: as consultas foram de fato registradas (senão a ausência abaixo seria verdadeira sobre nada).
    expect(db.consultas.length).toBeGreaterThan(0)
    const recortesPorDia = db.consultas.flatMap(c =>
      c.chamadas.filter(([m, a]) => m === 'gte' && typeof a[1] === 'string' && SO_DIA.test(a[1])).map(() => c.tabela),
    )
    expect(recortesPorDia).toEqual([])
    // Sensor da régua: o recorte antigo (dia ISO em UTC) casaria `SO_DIA`.
    expect(SO_DIA.test(new Date().toISOString().slice(0, 10))).toBe(true)
  })

  it('a consulta que só servia aos dois cards (`id, total` de hoje) sai — as de `orders` são as quatro que ficam', async () => {
    const { result } = renderHook(() => useAdminStats())
    await waitFor(() => expect(result.current.loading).toBe(false))

    const selectsDePedidos = db.consultas
      .filter(c => c.tabela === 'orders')
      .map(c => c.chamadas.find(([m]) => m === 'select')?.[1][0])
    expect(selectsDePedidos).toEqual(['total', '*', '*', 'total, created_at'])
  })
})
