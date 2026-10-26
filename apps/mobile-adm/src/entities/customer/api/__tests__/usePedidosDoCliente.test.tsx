// Feature `76` · T18 — `usePedidosDoCliente` (a janela de pedidos da ficha) sobre o dublê que registra
// a cadeia (`L-060`): igual por IGUALDADE à que `core` monta, os nomes dos itens numa leitura só.
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { customerOrdersCondition } from '@estrelinha/core/customers'
import { cursorFilter, type OrderCursor } from '@estrelinha/core/orders'

import { fake, type Elo } from '@/test/fakeSupabase'
import { ilikeDoPostgres, pedidoDaFicha } from '@/test/clientes'

import { COLUNAS_DO_PEDIDO, COLUNAS_DOS_ITENS, type PedidoDaFicha } from '../../model/linha'
import { chaveDosPedidosDoCliente, usePedidosDoCliente } from '../usePedidosDoCliente'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const LIDO_EM = '2026-10-24T14:30:00.123456+00:00'
const RECUSA = { message: 'acesso restrito ao painel', code: '42501' }
const ID = '00000000-0000-4000-c076-000000000001'
const EMAIL = 'marina@exemplo.invalid'

/** `n` pedidos, do mais novo ao mais antigo (a ordem da leitura), com µs. */
const pedidos = (n: number, desde = 0): Omit<PedidoDaFicha, 'item'>[] =>
  Array.from({ length: n }, (_, i) => {
    const k = desde + i
    const { item: _item, ...linha } = pedidoDaFicha({
      id: `00000000-0000-4000-8000-${String(k).padStart(12, '0')}`,
      order_number: String(k).padStart(4, '0'),
      created_at: `2026-10-${String(28 - (k % 27)).padStart(2, '0')}T10:00:00.${String(100000 + k).slice(-6)}+00:00`,
    })
    return linha
  })

const cadeiaEsperada = (email: string, { limite, cursor, contar }: { limite: number; cursor?: OrderCursor; contar: boolean }): Elo[] => [
  { metodo: 'select', args: contar ? [COLUNAS_DO_PEDIDO, { count: 'exact' }] : [COLUNAS_DO_PEDIDO] },
  { metodo: 'or', args: [customerOrdersCondition(ID, email)] },
  ...(cursor ? [{ metodo: 'or', args: [cursorFilter(cursor, 'desc')] }] : []),
  { metodo: 'order', args: ['created_at', { ascending: false }] },
  { metodo: 'order', args: ['id', { ascending: false }] },
  { metodo: 'limit', args: [limite] },
]

const ehPaginaSeguinte = (cadeia: Elo[]) => !cadeia[0].args[1]

let client: QueryClient
const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)
const montar = (email: string | null | undefined) =>
  renderHook(({ e }) => usePedidosDoCliente(ID, e), { wrapper, initialProps: { e: email } })

/** A resposta dos itens: o primeiro nome por pedido, a partir dos ids pedidos no `in`. */
const itensPorNumero = (cadeia: Elo[]) => {
  const ids = (cadeia.find((e) => e.metodo === 'in')!.args[1] as string[]) ?? []
  return { data: ids.map((id) => ({ order_id: id, product_name: `Peça ${id.slice(-4)}` })), error: null }
}

beforeEach(() => {
  fake.reset()
  client = new QueryClient()
  fake.responderRpc('atelie_clock', { lido_em: LIDO_EM })
})
afterEach(() => {
  client.clear()
  vi.useRealTimers()
})

describe('só liga com o cabeçalho (o e-mail vem dele)', () => {
  it.each([[null], [undefined], ['']])('e-mail %j ⇒ nenhuma leitura, nem a RPC', async (email) => {
    const { result } = montar(email)
    await act(async () => {})
    expect(result.current.fetchStatus).toBe('idle')
    expect(fake.log()).toEqual([])
  })

  it('com o e-mail, a primeira leitura sai; trocar de null para e-mail liga', async () => {
    fake.responderTabela('order_list', { data: pedidos(2), error: null, count: 2 })
    fake.responderTabela('order_items', itensPorNumero)
    const { result, rerender } = montar(null)
    await act(async () => {})
    expect(fake.cadeiasDe('order_list')).toEqual([])
    rerender({ e: EMAIL })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fake.cadeiasDe('order_list')).toHaveLength(1)
  })
})

describe('a cadeia é só a regra de core (MAC-18, L-060)', () => {
  it('a primeira leitura: vínculo de core, ordem created_at desc / id desc, limit 20, com contagem', async () => {
    fake.responderTabela('order_list', { data: pedidos(3), error: null, count: 3 })
    fake.responderTabela('order_items', itensPorNumero)
    const { result } = montar(EMAIL)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fake.cadeiasDe('order_list')).toEqual([cadeiaEsperada(EMAIL, { limite: 20, contar: true })])
  })

  it('a página seguinte: o cursor da última linha (as strings do servidor), sem contagem', async () => {
    const primeira = pedidos(20)
    fake.responderTabela('order_list', (c) => (ehPaginaSeguinte(c) ? { data: pedidos(5, 20), error: null } : { data: primeira, error: null, count: 25 }))
    fake.responderTabela('order_items', itensPorNumero)
    const { result } = montar(EMAIL)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(() => result.current.carregarMais())
    const ultima = primeira[19]
    expect(ultima.created_at).toMatch(/\.\d{6}\+00:00$/)
    expect(fake.cadeiasDe('order_list')[1]).toEqual(
      cadeiaEsperada(EMAIL, { limite: 20, contar: false, cursor: { created_at: ultima.created_at, id: ultima.id } }),
    )
    expect(result.current.data?.linhas).toHaveLength(25)
    expect(result.current.data?.fim).toBe(true)
  })

  it('a chave é por cliente', () => expect(chaveDosPedidosDoCliente(ID)).toEqual(['atelie-cliente-pedidos', ID]))
})

describe('os nomes dos itens: UMA leitura por janela, o primeiro por pedido (MAC-18)', () => {
  it('uma só leitura `in(order_id, ids)` para a janela inteira — não uma por linha', async () => {
    const linhas = pedidos(5)
    fake.responderTabela('order_list', { data: linhas, error: null, count: 5 })
    fake.responderTabela('order_items', itensPorNumero)
    const { result } = montar(EMAIL)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const leituras = fake.cadeiasDe('order_items')
    expect(leituras).toHaveLength(1)
    expect(leituras[0]).toEqual([
      { metodo: 'select', args: [COLUNAS_DOS_ITENS] },
      { metodo: 'in', args: ['order_id', linhas.map((l) => l.id)] },
      { metodo: 'order', args: ['created_at', { ascending: true }] },
      { metodo: 'order', args: ['id', { ascending: true }] },
    ])
  })

  it('o primeiro item de cada pedido vira o `item` da linha', async () => {
    const linhas = pedidos(2)
    fake.responderTabela('order_list', { data: linhas, error: null, count: 2 })
    fake.responderTabela('order_items', {
      data: [
        { order_id: linhas[0].id, product_name: 'Pingente Gota' },
        { order_id: linhas[0].id, product_name: 'Corrente' },
        { order_id: linhas[1].id, product_name: 'Anel' },
      ],
      error: null,
    })
    const { result } = montar(EMAIL)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.linhas.map((l) => l.item)).toEqual(['Pingente Gota', 'Anel'])
  })

  it('pedido sem item ⇒ `item` null', async () => {
    const linhas = pedidos(2)
    fake.responderTabela('order_list', { data: linhas, error: null, count: 2 })
    fake.responderTabela('order_items', { data: [{ order_id: linhas[1].id, product_name: 'Anel' }], error: null })
    const { result } = montar(EMAIL)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.linhas.map((l) => l.item)).toEqual([null, 'Anel'])
  })

  it('janela vazia: nenhuma leitura de itens', async () => {
    fake.responderTabela('order_list', { data: [], error: null, count: 0 })
    const { result } = montar(EMAIL)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fake.cadeiasDe('order_items')).toEqual([])
    expect(result.current.data).toEqual({ linhas: [], total: 0, lido_em: LIDO_EM, fim: true })
  })

  it('a leitura dos itens FALHANDO: as linhas saem sem o item e a janela vive', async () => {
    fake.responderTabela('order_list', { data: pedidos(3), error: null, count: 3 })
    fake.falharTabela('order_items', { message: 'boom' })
    const { result } = montar(EMAIL)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.linhas).toHaveLength(3)
    expect(result.current.data?.linhas.every((l) => l.item === null)).toBe(true)
    expect(result.current.isError).toBe(false)
  })

  it('a leitura dos itens que LANÇA ao montar também não derruba a janela', async () => {
    fake.responderTabela('order_list', { data: pedidos(3), error: null, count: 3 })
    // `order_items` sem resposta configurada: o dublê lança na hora.
    const { result } = montar(EMAIL)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.linhas.map((l) => l.item)).toEqual([null, null, null])
  })

  it('a página seguinte lê os itens SÓ dos pedidos novos', async () => {
    const primeira = pedidos(20)
    const segunda = pedidos(3, 20)
    fake.responderTabela('order_list', (c) => (ehPaginaSeguinte(c) ? { data: segunda, error: null } : { data: primeira, error: null, count: 23 }))
    fake.responderTabela('order_items', itensPorNumero)
    const { result } = montar(EMAIL)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(() => result.current.carregarMais())
    const leituras = fake.cadeiasDe('order_items')
    expect(leituras).toHaveLength(2)
    expect(leituras[1].find((e) => e.metodo === 'in')!.args[1]).toEqual(segunda.map((l) => l.id))
  })
})

describe('falhas e recusa (MAC-22, MAC-11, MAC-12)', () => {
  it('falha dos pedidos ⇒ erro da query (só este bloco: o cabeçalho é outra query)', async () => {
    vi.useFakeTimers()
    fake.falharTabela('order_list', { message: 'TypeError: Failed to fetch' })
    const { result } = montar(EMAIL)
    for (let i = 0; i < 10; i++) await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.isError).toBe(true)
    expect(fake.cadeiasDe('order_list')).toHaveLength(2)
  })

  it('a falha da página seguinte MANTÉM as linhas e marca `proximaFalhou`', async () => {
    fake.responderTabela('order_list', (c) =>
      ehPaginaSeguinte(c) ? { data: null, error: { message: 'x' } } : { data: pedidos(20), error: null, count: 40 },
    )
    fake.responderTabela('order_items', itensPorNumero)
    const { result } = montar(EMAIL)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(() => result.current.carregarMais())
    expect(result.current.proximaFalhou).toBe(true)
    expect(result.current.data?.linhas).toHaveLength(20)
    expect(result.current.isError).toBe(false)
  })

  it('a recusa vence a consulta que trouxe linhas (conta sem papel): nenhuma linha sai', async () => {
    vi.useFakeTimers()
    fake.falharRpc('atelie_clock', RECUSA)
    fake.responderTabela('order_list', { data: pedidos(5), error: null, count: 5 })
    fake.responderTabela('order_items', itensPorNumero)
    const { result } = montar(EMAIL)
    for (let i = 0; i < 10; i++) await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.data).toBeUndefined()
    expect((result.current.error as { code: string }).code).toBe('42501')
    expect(fake.chamadasDe('atelie_clock')).toHaveLength(1)
  })

  it('a recusa na página seguinte chega como erro dela, com o 42501', async () => {
    fake.responderTabela('order_list', (c) => (ehPaginaSeguinte(c) ? { data: pedidos(5, 20), error: null } : { data: pedidos(20), error: null, count: 25 }))
    fake.responderTabela('order_items', itensPorNumero)
    const { result } = montar(EMAIL)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    fake.falharRpc('atelie_clock', RECUSA)
    await act(() => result.current.carregarMais())
    expect((result.current.erroDaProxima as { code: string }).code).toBe('42501')
    expect(result.current.data?.linhas).toHaveLength(20)
  })
})

describe('o vínculo é exato (A10)', () => {
  it('a pessoa de `_` não traz o pedido de `VROSAXRJ@…`: o dublê aplica o `ilike` literal do vínculo', async () => {
    const todos = [
      { ...pedidos(1)[0], id: '00000000-0000-4000-8000-0000000000a1', customer_email: 'VROSAXRJ@exemplo.invalid', customer_id: null },
      { ...pedidos(1, 1)[0], id: '00000000-0000-4000-8000-0000000000a2', customer_email: 'vrosa_rj@exemplo.invalid', customer_id: null },
    ]
    fake.responderTabela('order_list', (cadeia) => {
      const or = String(cadeia.find((e) => e.metodo === 'or')!.args[0])
      const achados = todos.filter((p) => ilikeDoPostgres(or, 'customer_email', p.customer_email))
      return { data: achados.map(({ customer_email: _e, customer_id: _c, ...resto }) => resto), error: null, count: achados.length }
    })
    fake.responderTabela('order_items', itensPorNumero)
    const { result } = montar('VROSA_RJ@exemplo.invalid')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.linhas.map((l) => l.id)).toEqual(['00000000-0000-4000-8000-0000000000a2'])
  })
})
