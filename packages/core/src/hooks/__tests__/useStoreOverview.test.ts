// @vitest-environment jsdom
// Feature `73` · task 06 · `MAI-09`, `MAI-21`, `MAI-22` — a leitura do resumo do ateliê.
//
// Molde de `useStoreMovement.test.ts` (mesmo arnês, pelo mesmo motivo de cada peça). O que cada caso
// prova, e o mundo errado em que ele seria falso:
// - a RPC é chamada com UM argumento só (o nome) — uma data do aparelho deixaria `calls[0]` com 2;
// - o `{ error }` (o supabase-js não rejeita) vira estado de erro; `42501` NÃO repete (design §6) e
//   a falha de rede repete UMA vez;
// - a virada mede DURAÇÃO do servidor: com o relógio do aparelho adiantado 2 h, uma escrita por
//   `expira_em − Date.now()` chamaria 2 h antes, receberia o mesmo dia e entraria em laço.

import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider, defaultScheduler, focusManager, notifyManager } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { rpc } }))

import { ACCESS_DENIED_CODE, STORE_OVERVIEW_KEY, isAccessDenied, retryUnlessDenied, useStoreOverview } from '../useStoreOverview'
import type { StoreOverview } from '../../stats/overview.ts'

const HORA = 3_600_000
const DIA = 24 * HORA

const proximaMeiaNoite = (ms: number): number => Math.floor((ms - 3 * HORA) / DIA) * DIA + 3 * HORA + DIA

const resumo = (agora: number, extra: Partial<StoreOverview> = {}): StoreOverview => {
  const dia = new Date(agora - 3 * HORA).toISOString().slice(0, 10)
  return {
    hoje: dia,
    mes: dia.slice(0, 7),
    lido_em: new Date(agora).toISOString(),
    expira_em: new Date(proximaMeiaNoite(agora)).toISOString(),
    semana: [],
    mes_resumo: { vendas: 0, faturamento: 0 },
    clientes_novas: 0,
    joias: [],
    fila: { aguardando: 0, a_separar: 0, sem_rastreio: 0, pix_aguardando: 0, precisa_acao: 0, aguardando_desde: null },
    recentes: [],
    ...extra,
  }
}

/** Um servidor que responde no relógio DELE: `agora = Date.now() − adiantamento`. */
const servidor = (adiantamentoLocal: number) => {
  rpc.mockImplementation(async () => ({ data: resumo(Date.now() - adiantamentoLocal), error: null }))
}

const useComoOWidget = () => {
  const q = useStoreOverview()
  void q.isLoading
  void q.isError
  void q.isSuccess
  void q.data
  return q
}

let client: QueryClient
const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)

const escoar = async () => {
  for (let i = 0; i < 20; i++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0)
    })
  }
}
const avancar = async (ms: number) => {
  await act(async () => {
    await vi.advanceTimersByTimeAsync(ms)
  })
  await escoar()
}

beforeAll(() => notifyManager.setScheduler((cb) => queueMicrotask(cb)))
afterAll(() => notifyManager.setScheduler(defaultScheduler))

beforeEach(() => {
  rpc.mockReset()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
  vi.setSystemTime(new Date('2026-10-21T18:00:00.000Z'))
})

afterEach(() => {
  client.clear()
  vi.useRealTimers()
})

describe('useStoreOverview — a leitura (MAI-09)', () => {
  it('chama `store_overview` SEM segundo argumento', async () => {
    servidor(0)
    const { result } = renderHook(useComoOWidget, { wrapper })
    await escoar()
    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc.mock.calls[0]).toEqual(['store_overview'])
    expect(result.current.isSuccess).toBe(true)
    expect(result.current.data?.hoje).toBe('2026-10-21')
  })

  it("a chave é `['store-overview']`, exportada para quem invalida", async () => {
    servidor(0)
    renderHook(useComoOWidget, { wrapper })
    await escoar()
    expect(STORE_OVERVIEW_KEY).toEqual(['store-overview'])
    expect(client.getQueryData(STORE_OVERVIEW_KEY)).toMatchObject({ hoje: '2026-10-21' })
  })
})

describe('useStoreOverview — o erro (MAI-17, MAI-22, MAI-24)', () => {
  it('`42501` vira erro na PRIMEIRA resposta, sem nova tentativa — o hook vence o `retry` do client', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'acesso restrito ao painel', code: ACCESS_DENIED_CODE } })
    const { result } = renderHook(useComoOWidget, { wrapper })
    await escoar()
    await avancar(5_000)
    expect(result.current.isError).toBe(true)
    expect((result.current.error as { code?: string }).code).toBe('42501')
    expect(result.current.data).toBeUndefined()
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('falha de rede repete UMA vez e só então vira erro', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'TypeError: Failed to fetch', code: '' } })
    const { result } = renderHook(useComoOWidget, { wrapper })
    await escoar()
    expect(rpc).toHaveBeenCalledTimes(1)
    await avancar(1_100)
    expect(result.current.isError).toBe(true)
    expect(rpc).toHaveBeenCalledTimes(2)
    await avancar(10_000)
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('`retryUnlessDenied`, puro: recusa por papel nunca; outro erro só na primeira falha', () => {
    expect(retryUnlessDenied(0, { code: '42501' })).toBe(false)
    expect(retryUnlessDenied(0, { code: 'PGRST301' })).toBe(true)
    expect(retryUnlessDenied(0, new Error('rede'))).toBe(true)
    expect(retryUnlessDenied(1, new Error('rede'))).toBe(false)
    expect(retryUnlessDenied(0, null)).toBe(true)
  })

  it('`isAccessDenied`, puro: só o `42501` é recusa — rede, outro código, nulo e indefinido não', () => {
    expect(isAccessDenied({ code: '42501', message: 'acesso restrito' })).toBe(true)
    expect(isAccessDenied({ code: 'PGRST301' })).toBe(false)
    expect(isAccessDenied({ code: 42501 })).toBe(false)
    expect(isAccessDenied(new Error('Failed to fetch'))).toBe(false)
    expect(isAccessDenied(null)).toBe(false)
    expect(isAccessDenied(undefined)).toBe(false)
  })
})

describe('useStoreOverview — a virada mede DURAÇÃO do servidor (MAI-21)', () => {
  it('relógio do aparelho ADIANTADO 2 h: uma chamada só na virada do servidor, nunca um laço', async () => {
    vi.setSystemTime(new Date('2026-10-21T20:00:00.000Z'))
    servidor(2 * HORA)
    const { result } = renderHook(useComoOWidget, { wrapper })
    await escoar()
    expect(result.current.data?.hoje).toBe('2026-10-21')

    await avancar(7 * HORA)
    expect(rpc).toHaveBeenCalledTimes(1)
    await avancar(2 * HORA - 1)
    expect(rpc).toHaveBeenCalledTimes(1)
    await avancar(1)
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(result.current.data?.hoje).toBe('2026-10-22')
    await avancar(3 * HORA)
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('`expira_em` ilegível: nenhuma virada agendada', async () => {
    rpc.mockImplementation(async () => ({ data: resumo(Date.now(), { expira_em: 'não é data' }), error: null }))
    renderHook(useComoOWidget, { wrapper })
    await escoar()
    expect(rpc).toHaveBeenCalledTimes(1)
    await avancar(3 * DIA)
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('duração negativa tem piso de 1 s', async () => {
    let n = 0
    rpc.mockImplementation(async () => {
      n++
      const agora = Date.now()
      return {
        data: resumo(agora, {
          expira_em: n === 1 ? new Date(agora - 5_000).toISOString() : new Date(agora + DIA).toISOString(),
        }),
        error: null,
      }
    })
    renderHook(useComoOWidget, { wrapper })
    await escoar()
    await avancar(999)
    expect(rpc).toHaveBeenCalledTimes(1)
    await avancar(1)
    expect(rpc).toHaveBeenCalledTimes(2)
    await avancar(10_000)
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('aba OCULTA na virada (feature `83`, LAV-05): nenhuma leitura; de volta ao foco, uma', async () => {
    // O critério 5 do PRD da `83`: nenhuma leitura em segundo plano. O mesmo gate de
    // `useStoreMovement` — sem ele o timer relê com a aba oculta.
    try {
      servidor(0)
      renderHook(useComoOWidget, { wrapper })
      await escoar()
      expect(rpc).toHaveBeenCalledTimes(1)
      act(() => focusManager.setFocused(false))
      await avancar(DIA + HORA)
      expect(rpc).toHaveBeenCalledTimes(1)
      act(() => focusManager.setFocused(true))
      await escoar()
      expect(rpc).toHaveBeenCalledTimes(2)
    } finally {
      focusManager.setFocused(undefined)
    }
  })

  it('desmontar cancela o timer da virada', async () => {
    servidor(0)
    const { unmount } = renderHook(useComoOWidget, { wrapper })
    await escoar()
    unmount()
    await avancar(10 * HORA)
    expect(rpc).toHaveBeenCalledTimes(1)
  })
})
