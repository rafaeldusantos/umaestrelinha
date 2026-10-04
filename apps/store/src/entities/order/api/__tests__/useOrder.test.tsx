import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

/**
 * `CSC-05`/`CSC-06` — quem lê o pedido, e com qual credencial.
 *
 * `useOrder` é o dono único de "como leio um pedido": a confirmação e a conta fazem a mesma
 * pergunta com credenciais diferentes, e o ramo mora aqui, não em cada tela.
 *
 * O caso que este arquivo existe para travar é o **inverso**: quem tem sessão tem de continuar
 * lendo pelo PostgREST, exatamente como antes. Uma implementação que mandasse todo mundo pela
 * edge function passaria nos casos da convidada e quebraria `/conta` — onde não há token nenhum.
 */

const { invoke, maybeSingle, eq, select, from, rpc } = vi.hoisted(() => {
  const maybeSingle = vi.fn()
  const eq = vi.fn(() => ({ maybeSingle }))
  const select = vi.fn(() => ({ eq }))
  const from = vi.fn(() => ({ select }))
  return { invoke: vi.fn(), maybeSingle, eq, select, from, rpc: vi.fn() }
})

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { from, functions: { invoke }, rpc },
}))

import { useOrder } from '../useOrder'
import { forgetAccess, rememberAccess } from '../../model/orderAccess'

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

const PEDIDO = { id: 'ord-1', customer_name: 'Marina Yamashita', order_items: [] }

/**
 * Feature 59 (`LIN-01`): o caminho com sessão funde o histórico da RPC ao pedido. As linhas da RPC
 * chegam como `{ status, created_at }` e saem como `{ status, at }` — o formato do `get-order`.
 */
const LINHAS_DA_RPC = [
  { status: 'separating', created_at: '2026-10-02T13:00:00Z' },
  { status: 'shipped', created_at: '2026-10-03T15:00:00Z' },
]
const EVENTOS = [
  { status: 'separating', at: '2026-10-02T13:00:00Z' },
  { status: 'shipped', at: '2026-10-03T15:00:00Z' },
]
/** O pedido como o hook o devolve pelo PostgREST: a linha de `orders` + o histórico da RPC. */
const LIDO = { ...PEDIDO, status_events: EVENTOS }

const ler = async (id = 'ord-1') => {
  const { result } = renderHook(() => useOrder(id), { wrapper })
  await waitFor(() => expect(result.current.isLoading).toBe(false))
  return result.current
}

beforeEach(() => {
  globalThis.localStorage.clear()
  invoke.mockReset()
  from.mockClear()
  maybeSingle.mockReset().mockResolvedValue({ data: PEDIDO, error: null })
  rpc.mockReset().mockResolvedValue({ data: LINHAS_DA_RPC, error: null })
})

describe('useOrder — com sessão, o caminho é o de sempre', () => {
  it('sem token guardado, lê pelo PostgREST e NÃO chama a function', async () => {
    // O caso inverso, e o mais importante deste arquivo: `/conta` não tem token nenhum.
    const { data } = await ler()

    expect(data).toEqual(LIDO)
    expect(from).toHaveBeenCalledWith('orders')
    expect(invoke).not.toHaveBeenCalled()
  })

  it('erro do PostgREST continua rejeitando — rede e "não existe" dizem coisas diferentes', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: { message: 'timeout' } })

    const { isError } = await ler()
    expect(isError).toBe(true)
  })

  it('pedido inexistente resolve com `null`, não com erro', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null })

    const { data, isError } = await ler()
    expect(data).toBeNull()
    expect(isError).toBe(false)
  })
})

describe('useOrder — a convidada lê com o token (CSC-06)', () => {
  it('com token guardado, lê pela function e NÃO toca o PostgREST', async () => {
    rememberAccess('ord-1', 'tok-abc')
    invoke.mockResolvedValue({ data: { order: { ...PEDIDO, status_events: EVENTOS } }, error: null })

    const { data } = await ler()

    expect(data).toEqual(LIDO)
    expect(invoke).toHaveBeenCalledWith('checkout?action=get-order', {
      body: { order_id: 'ord-1', access_token: 'tok-abc' },
    })
    expect(from).not.toHaveBeenCalled()
  })

  it('o token de OUTRO pedido não é usado neste', async () => {
    rememberAccess('ord-2', 'tok-de-outro')

    await ler('ord-1')

    expect(invoke).not.toHaveBeenCalled()
    expect(from).toHaveBeenCalledWith('orders')
  })
})

describe('useOrder — token recusado dá lugar ao caminho normal', () => {
  it('403 esquece o token e tenta o PostgREST', async () => {
    // É isto que permite a quem entrou por código DEPOIS da compra ver o próprio pedido: sem
    // esquecer, ela bateria num acesso morto para sempre.
    rememberAccess('ord-1', 'tok-expirado')
    invoke.mockResolvedValue({ data: null, error: new Error('403') })

    const { data } = await ler()

    expect(data).toEqual(LIDO)
    expect(from).toHaveBeenCalledWith('orders')
  })

  it('o token recusado é APAGADO do storage, não só ignorado', async () => {
    rememberAccess('ord-1', 'tok-expirado')
    invoke.mockResolvedValue({ data: null, error: new Error('403') })

    await ler()

    // A asserção que separa "ignorou desta vez" de "esqueceu": só a segunda evita uma requisição
    // condenada a cada recarregamento da página.
    expect(globalThis.localStorage.getItem('estrelinha-order-access')).not.toContain('tok-expirado')
  })

  it('a function lançando não derruba o hook — cai no caminho normal', async () => {
    rememberAccess('ord-1', 'tok-abc')
    invoke.mockRejectedValue(new Error('Failed to fetch'))

    const { data, isError } = await ler()

    expect(isError).toBe(false)
    expect(data).toEqual(LIDO)
  })

  it('corpo sem `order` conta como recusa', async () => {
    rememberAccess('ord-1', 'tok-abc')
    invoke.mockResolvedValue({ data: {}, error: null })

    const { data } = await ler()

    expect(data).toEqual(LIDO)
    expect(from).toHaveBeenCalledWith('orders')
  })

  it('esquecer um acesso que já não existe não quebra a leitura seguinte', async () => {
    forgetAccess('ord-1')

    const { data } = await ler()
    expect(data).toEqual(LIDO)
  })
})

describe('useOrder — o histórico do pedido (feature 59, LIN-01 / LIN-04)', () => {
  it('com sessão, pede os eventos à RPC do PRÓPRIO pedido, pelo id da rota', async () => {
    await ler('ord-1')

    expect(rpc).toHaveBeenCalledTimes(1)
    expect(rpc).toHaveBeenCalledWith('customer_order_events', { p_order_id: 'ord-1' })
  })

  it('as linhas da RPC saem como `{ status, at }`, na ordem em que vieram', async () => {
    const { data } = await ler()

    expect(data?.status_events).toEqual(EVENTOS)
  })

  it('RPC com erro: o pedido chega inteiro, só sem eventos — nunca uma rejeição', async () => {
    rpc.mockResolvedValue({ data: null, error: { message: 'permission denied' } })

    const { data, isError } = await ler()

    expect(isError).toBe(false)
    expect(data).toEqual({ ...PEDIDO, status_events: [] })
  })

  it('RPC lançando (rede) também vira lista vazia, e o pedido continua na tela', async () => {
    rpc.mockRejectedValue(new Error('Failed to fetch'))

    const { data, isError } = await ler()

    expect(isError).toBe(false)
    expect(data).toEqual({ ...PEDIDO, status_events: [] })
  })

  it('pedido inexistente não pergunta histórico nenhum', async () => {
    maybeSingle.mockResolvedValue({ data: null, error: null })

    const { data } = await ler()

    expect(data).toBeNull()
    expect(rpc).not.toHaveBeenCalled()
  })

  it('a convidada lê os eventos da própria resposta do `get-order`, sem chamar a RPC', async () => {
    rememberAccess('ord-1', 'tok-abc')
    invoke.mockResolvedValue({ data: { order: { ...PEDIDO, status_events: EVENTOS } }, error: null })

    const { data } = await ler()

    expect(data?.status_events).toEqual(EVENTOS)
    expect(rpc).not.toHaveBeenCalled()
  })

  it('resposta da convidada sem `status_events` vira lista vazia, nunca `undefined`', async () => {
    rememberAccess('ord-1', 'tok-abc')
    invoke.mockResolvedValue({ data: { order: PEDIDO }, error: null })

    const { data } = await ler()

    expect(data?.status_events).toEqual([])
  })
})
