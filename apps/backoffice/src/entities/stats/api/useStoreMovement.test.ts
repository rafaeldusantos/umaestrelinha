// Feature 71 · task 22 · `VIS-04`, `VIS-10 (a, b, c)`, `VIS-33` (forma) — a leitura do bloco.
//
// O que cada caso prova, e o mundo errado em que ele seria falso:
// - `VIS-04`: a RPC é chamada com UM argumento só (o nome). Passar `{}`, `{ p_agora }` ou uma data
//   do navegador deixaria `mock.calls[0]` com comprimento 2.
// - o supabase-js não REJEITA: devolve `{ error }`. Sem `if (error) throw`, a consulta "dá certo"
//   com `data: null` e o estado de erro nunca existe.
// - `VIS-10 (c)`: o prazo da virada é DURAÇÃO do servidor (`expira_em − lido_em`), contada a partir
//   da chegada da resposta. O servidor dublado calcula `lido_em`/`expira_em` a partir do relógio
//   falso MENOS um deslocamento — é o relógio da dona adiantado. Uma escrita por `expira_em −
//   Date.now()` dispara 2 h antes, recebe do servidor o MESMO dia, agenda `0` e entra em laço.
// - `VIS-10 (b)`: foco da janela relê (React Query, `refetchOnWindowFocus` + `staleTime: 0`).

import { act, renderHook } from '@testing-library/react'
import { QueryClient, QueryClientProvider, defaultScheduler, focusManager, notifyManager } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

const { rpc } = vi.hoisted(() => ({ rpc: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { rpc } }))

import { STORE_MOVEMENT_KEY, useStoreMovement } from './useStoreMovement'
import type { MovementPeriod, MovementPeriodKey, StoreMovement } from '../model/storeMovement'

const HORA = 3_600_000
const DIA = 24 * HORA

/** A próxima 00:00 de Brasília (03:00 UTC) estritamente depois de `ms`. */
const proximaMeiaNoite = (ms: number): number => {
  const base = Math.floor((ms - 3 * HORA) / DIA) * DIA + 3 * HORA
  return base + DIA
}

const periodo = (visitas: number): MovementPeriod => ({ visitas, vendas: 0, faturamento: 0, ticket: null })

/**
 * Um servidor que responde no relógio DELE: `agoraServidor = Date.now() − adiantamento`. O dia
 * vem do instante do servidor, nunca do relógio local — é o que o banco faz.
 */
const servidor = (adiantamentoLocal: number) => {
  rpc.mockImplementation(async () => {
    const agora = Date.now() - adiantamentoLocal
    const dia = new Date(agora - 3 * HORA).toISOString().slice(0, 10)
    const movimento: StoreMovement = {
      hoje: dia,
      ontem: dia,
      inicio_semana: dia,
      expira_em: new Date(proximaMeiaNoite(agora)).toISOString(),
      lido_em: new Date(agora).toISOString(),
      production_host: 'umaestrelinha.com.br',
      contagem_desde: null,
      contagem_desde_dia: null,
      ultima_visita: null,
      ultima_visita_dia: null,
      teto_dia: null,
      periodos: { hoje: periodo(1), ontem: periodo(0), semana: periodo(1) },
    }
    return { data: movimento, error: null }
  })
}

/**
 * O hook montado como o CONSUMIDOR real o lê. O React Query v5 só notifica as propriedades lidas
 * durante o render (`notifyOnChangeProps` rastreado), e o widget lê `isLoading`, `isError` e `data`
 * a cada render. Um `renderHook` que só olhasse `isError` depois do fato nunca re-renderizaria com o
 * erro — medido: o caso reprovava com o erro já no cache.
 */
const useComoOWidget = () => {
  const q = useStoreMovement()
  void q.isLoading
  void q.isError
  void q.isSuccess
  void q.data
  return q
}

let client: QueryClient
const wrapper = ({ children }: { children: ReactNode }) =>
  createElement(QueryClientProvider, { client }, children)

/**
 * Deixa as promessas e os timers de agendamento do React Query andarem, sem avançar o relógio.
 *
 * Em VÁRIOS `act` curtos, e não um longo: o React só renderiza ao sair de um `act`, e o React Query
 * encadeia promessa → `setTimeout(0)` → render → efeito. Com cinco rodadas a primeira falha ainda não
 * tinha agendado a nova tentativa quando o relógio andava — medido.
 */
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

/**
 * O React Query notifica os observadores por um `setTimeout(0)`. Agendado de DENTRO de um callback
 * de timer falso (o timer da virada é exatamente isso), esse `setTimeout(0)` não dispara no
 * `advanceTimersByTimeAsync` — medido: a RPC era chamada, o cache recebia o dia novo, e o hook nunca
 * renderizava. Em microtarefa a mesma sequência renderiza. É configuração do arnês, não do produto
 * (o `notifyManager` existe para isso), e o agendador original volta no fim do arquivo.
 */
beforeAll(() => {
  notifyManager.setScheduler((cb) => queueMicrotask(cb))
})

afterAll(() => {
  notifyManager.setScheduler(defaultScheduler)
})

beforeEach(() => {
  rpc.mockReset()
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
})

afterEach(() => {
  client.clear()
  vi.useRealTimers()
  focusManager.setFocused(undefined)
})

describe('useStoreMovement — a leitura (VIS-04, VIS-33)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
    vi.setSystemTime(new Date('2026-10-21T18:00:00.000Z'))
  })

  it('chama a RPC `store_movement` SEM segundo argumento — nem data, nem `p_agora`', async () => {
    servidor(0)
    const { result } = renderHook(useComoOWidget, { wrapper })
    await escoar()

    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc.mock.calls[0]).toEqual(['store_movement'])
    expect(rpc.mock.calls[0]).toHaveLength(1)
    expect(result.current.isSuccess).toBe(true)
    expect(result.current.data?.hoje).toBe('2026-10-21')
  })

  it('a chave do cache é `[\'store-movement\']`, uma só, exportada para quem invalida', async () => {
    servidor(0)
    renderHook(useComoOWidget, { wrapper })
    await escoar()

    expect(STORE_MOVEMENT_KEY).toEqual(['store-movement'])
    expect(client.getQueryData(STORE_MOVEMENT_KEY)).toMatchObject({ hoje: '2026-10-21' })
  })

  it('o `{ error }` do supabase-js (que NÃO rejeita) vira estado de erro, depois de UMA nova tentativa', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'boom', code: '42501' } })
    const { result } = renderHook(useComoOWidget, { wrapper })
    await escoar()
    // `retry: 1` é do hook, e vence o `retry: false` do client de teste: a segunda tentativa sai
    // depois do atraso padrão (1 s).
    await avancar(1_100)

    expect(result.current.isError).toBe(true)
    expect(result.current.data).toBeUndefined()
    expect(rpc).toHaveBeenCalledTimes(2)
  })
})

describe('useStoreMovement — a virada do dia mede DURAÇÃO do servidor (VIS-10 c)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] })
  })

  it('relógios iguais: nenhuma chamada antes de `expira_em`, uma no instante, e o dia novo chega', async () => {
    vi.setSystemTime(new Date('2026-10-21T18:00:00.000Z'))
    servidor(0)
    const { result } = renderHook(useComoOWidget, { wrapper })
    await escoar()
    expect(rpc).toHaveBeenCalledTimes(1)

    // 18:00Z → 03:00Z do dia seguinte = 9 h.
    await avancar(9 * HORA - 1)
    expect(rpc).toHaveBeenCalledTimes(1)

    await avancar(1)
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(result.current.data?.hoje).toBe('2026-10-22')

    // E não vira laço: uma hora depois, nenhuma chamada nova.
    await avancar(HORA)
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('relógio da dona ADIANTADO 2 h: exatamente UMA chamada na virada do servidor, nunca um laço', async () => {
    // Local 20:00Z, servidor 18:00Z.
    vi.setSystemTime(new Date('2026-10-21T20:00:00.000Z'))
    servidor(2 * HORA)
    const { result } = renderHook(useComoOWidget, { wrapper })
    await escoar()
    expect(result.current.data?.hoje).toBe('2026-10-21')

    // Pelo relógio local a meia-noite de Brasília chega em 7 h. Uma escrita por `expira_em −
    // Date.now()` chamaria aqui — e o servidor ainda diria 21/10.
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

  it('`expira_em` ilegível: NÃO agenda virada nenhuma', async () => {
    vi.setSystemTime(new Date('2026-10-21T18:00:00.000Z'))
    rpc.mockImplementation(async () => ({
      data: {
        hoje: '2026-10-21', ontem: '2026-10-20', inicio_semana: '2026-10-19',
        expira_em: 'não é data',
        lido_em: new Date(Date.now()).toISOString(),
        production_host: '', contagem_desde: null, contagem_desde_dia: null,
        ultima_visita: null, ultima_visita_dia: null, teto_dia: null,
        periodos: { hoje: periodo(0), ontem: periodo(0), semana: periodo(0) },
      } satisfies StoreMovement,
      error: null,
    }))
    const { result } = renderHook(useComoOWidget, { wrapper })
    await escoar()
    expect(result.current.isSuccess).toBe(true)
    expect(result.current.data?.expira_em).toBe('não é data')
    // Exatamente UMA chamada, contada já aqui: sem a guarda, `setTimeout(NaN)` dispara na hora, e no
    // navegador isso vira laço. No relógio falso o `Date.now()` não anda, o `dataUpdatedAt` se repete
    // e o laço para numa chamada extra — que a contagem tirada DEPOIS dela escondia (mutante M09).
    expect(rpc).toHaveBeenCalledTimes(1)

    await avancar(3 * DIA)
    expect(rpc).toHaveBeenCalledTimes(1)
  })

  it('duração menor que 1 s (ou negativa) tem piso de 1 s — nunca um disparo imediato em laço', async () => {
    vi.setSystemTime(new Date('2026-10-21T18:00:00.000Z'))
    let chamadas = 0
    rpc.mockImplementation(async () => {
      chamadas++
      const agora = Date.now()
      return {
        data: {
          hoje: '2026-10-21', ontem: '2026-10-20', inicio_semana: '2026-10-19',
          // Primeira resposta: `expira_em` ANTES de `lido_em`. Depois, um dia normal.
          expira_em: chamadas === 1 ? new Date(agora - 5_000).toISOString() : new Date(agora + DIA).toISOString(),
          lido_em: new Date(agora).toISOString(),
          production_host: '', contagem_desde: null, contagem_desde_dia: null,
          ultima_visita: null, ultima_visita_dia: null, teto_dia: null,
          periodos: { hoje: periodo(0), ontem: periodo(0), semana: periodo(0) },
        } satisfies StoreMovement,
        error: null,
      }
    })
    renderHook(useComoOWidget, { wrapper })
    await escoar()
    expect(rpc).toHaveBeenCalledTimes(1)

    await avancar(999)
    expect(rpc).toHaveBeenCalledTimes(1)
    await avancar(1)
    expect(rpc).toHaveBeenCalledTimes(2)
    await avancar(10_000)
    expect(rpc).toHaveBeenCalledTimes(2)
  })

  it('desmontar cancela o timer da virada', async () => {
    vi.setSystemTime(new Date('2026-10-21T18:00:00.000Z'))
    servidor(0)
    const { unmount } = renderHook(useComoOWidget, { wrapper })
    await escoar()
    unmount()
    await avancar(10 * HORA)
    expect(rpc).toHaveBeenCalledTimes(1)
  })
})

describe('useStoreMovement — foco da janela (VIS-10 b)', () => {
  it('a janela volta a ter foco ⇒ nova leitura', async () => {
    servidor(0)
    const { result } = renderHook(useComoOWidget, { wrapper })
    await vi.waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(rpc).toHaveBeenCalledTimes(1)

    act(() => focusManager.setFocused(false))
    act(() => focusManager.setFocused(true))

    await vi.waitFor(() => expect(rpc).toHaveBeenCalledTimes(2))
  })
})

describe('StoreMovement — o tipo bate com a saída REAL da RPC (AD-012)', () => {
  // Copiadas da saída de `public.store_movement()` no banco local (2026-10-22, como admin, em
  // `begin … rollback`). O `Record` abaixo é o que torna a comparação de verdade: com uma chave a
  // mais ou a menos no TIPO, o `tsc` recusa este objeto; com a lista da RPC mudando, o teste recusa.
  const CHAVES_DA_RPC = [
    'contagem_desde', 'contagem_desde_dia', 'expira_em', 'hoje', 'inicio_semana', 'lido_em',
    'ontem', 'periodos', 'production_host', 'teto_dia', 'ultima_visita', 'ultima_visita_dia',
  ]
  const PERIODOS_DA_RPC = ['hoje', 'ontem', 'semana']
  const MEDIDAS_DA_RPC = ['faturamento', 'ticket', 'vendas', 'visitas']

  const DO_TIPO: Record<keyof StoreMovement, true> = {
    hoje: true, ontem: true, inicio_semana: true, expira_em: true, lido_em: true,
    production_host: true, contagem_desde: true, contagem_desde_dia: true, ultima_visita: true,
    ultima_visita_dia: true, teto_dia: true, periodos: true,
  }
  const PERIODOS_DO_TIPO: Record<MovementPeriodKey, true> = { hoje: true, ontem: true, semana: true }
  const MEDIDAS_DO_TIPO: Record<keyof MovementPeriod, true> = {
    visitas: true, vendas: true, faturamento: true, ticket: true,
  }

  it('as chaves de topo, de período e de medida são exatamente as da RPC', () => {
    expect(Object.keys(DO_TIPO).sort()).toEqual(CHAVES_DA_RPC)
    expect(Object.keys(PERIODOS_DO_TIPO).sort()).toEqual(PERIODOS_DA_RPC)
    expect(Object.keys(MEDIDAS_DO_TIPO).sort()).toEqual(MEDIDAS_DA_RPC)
  })
})
