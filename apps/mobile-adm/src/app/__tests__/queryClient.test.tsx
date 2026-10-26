// Feature `73` · T10 · `MAI-22`, `MAI-24` — a regra de repetição do app.
//
// Os dois mundos errados que cada caso separa:
// - `42501` repetido: o app espera o atraso padrão (1 s) e pergunta de novo a quem já recusou — a
//   régua é UMA chamada depois de passar bem mais que o atraso;
// - falha de rede sem repetição: um soluço de rede vira bloco em falha — a régua é DUAS chamadas.
//
// Três leituras: uma query qualquer sem `retry` próprio (o PADRÃO do `QueryClient`), o resumo e o
// movimento. O movimento é o que importa: `useStoreMovement` declara `retry: 1` no próprio hook, e
// opção de query vence a do cliente — o padrão do app sozinho NÃO o alcança (medido no Lote 1). Por
// isso a Início o lê por `useMovimento`, e este arquivo prova que a regra chega até ele.
import { act, renderHook } from '@testing-library/react'
import { QueryClientProvider, useQuery } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fake } from '@/test/fakeSupabase'
import { criarQueryClient } from '@/app/queryClient'
import { useMovimento, useResumo } from '@/entities/stats'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const RECUSA = { message: 'permission denied', code: '42501' }
const REDE = { message: 'Failed to fetch' }

let client: ReturnType<typeof criarQueryClient>
const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)

/** Bem mais que o atraso da nova tentativa (1 s), em passos: o React só renderiza ao sair de um `act`. */
const passar = async () => {
  for (let i = 0; i < 30; i++) {
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500)
    })
  }
}

beforeEach(() => {
  fake.reset()
  vi.useFakeTimers()
  client = criarQueryClient()
})
afterEach(() => {
  client.clear()
  vi.useRealTimers()
})

describe('o padrão do QueryClient do app', () => {
  it('`42501` numa query sem `retry` próprio: UMA tentativa', async () => {
    const ler = vi.fn(async () => {
      throw RECUSA
    })
    const { result } = renderHook(() => useQuery({ queryKey: ['qualquer'], queryFn: ler }), { wrapper })
    await passar()
    expect(ler).toHaveBeenCalledTimes(1)
    expect(result.current.isError).toBe(true)
  })

  it('falha de rede numa query sem `retry` próprio: DUAS tentativas', async () => {
    const ler = vi.fn(async () => {
      throw REDE
    })
    const { result } = renderHook(() => useQuery({ queryKey: ['qualquer'], queryFn: ler }), { wrapper })
    await passar()
    expect(ler).toHaveBeenCalledTimes(2)
    expect(result.current.isError).toBe(true)
  })
})

describe.each([
  ['store_movement', () => useMovimento()],
  ['store_overview', () => useResumo()],
] as const)('a leitura `%s` do app', (rpc, usar) => {
  const useComoAPagina = () => {
    const q = usar()
    void q.isError
    void q.data
    return q
  }

  it('`42501`: UMA chamada da RPC, e o erro chega com o código', async () => {
    fake.falharRpc(rpc, RECUSA)
    const { result } = renderHook(useComoAPagina, { wrapper })
    await passar()
    expect(fake.chamadasDe(rpc)).toHaveLength(1)
    expect(result.current.isError).toBe(true)
    expect((result.current.error as { code?: string } | null)?.code).toBe('42501')
  })

  it('falha de rede: DUAS chamadas da RPC', async () => {
    fake.falharRpc(rpc, REDE)
    const { result } = renderHook(useComoAPagina, { wrapper })
    await passar()
    expect(fake.chamadasDe(rpc)).toHaveLength(2)
    expect(result.current.isError).toBe(true)
  })

  it('a chamada sai SEM argumento além do nome', async () => {
    fake.responderRpc(rpc, null)
    renderHook(useComoAPagina, { wrapper })
    await passar()
    expect(fake.chamadasDe(rpc)[0]).toEqual({ nome: rpc, args: [] })
  })
})
