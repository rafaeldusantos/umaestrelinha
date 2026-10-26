// Feature `76` · T18 — `useCliente` (o cabeçalho e a cidade) sobre o dublê que registra a cadeia.
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { customerOrdersCondition } from '@estrelinha/core/customers'

import { fake } from '@/test/fakeSupabase'
import { COM_SUBLINHADO, fichaDeCliente, ilikeDoPostgres } from '@/test/clientes'

import { COLUNAS_DA_CIDADE, COLUNAS_DA_FICHA } from '../../model/linha'
import { chaveDoCliente, useCliente } from '../useCliente'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const LIDO_EM = '2026-10-24T14:30:00.123456+00:00'
const RECUSA = { message: 'acesso restrito ao painel', code: '42501' }
const ID = '00000000-0000-4000-c076-000000000001'

let client: QueryClient
const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)
const montar = (id = ID) => renderHook(({ i }) => useCliente(i), { wrapper, initialProps: { i: id } })

const CIDADE = [{ address_city: 'Porto Alegre', address_state: 'RS' }]

beforeEach(() => {
  fake.reset()
  client = new QueryClient()
  fake.responderRpc('atelie_clock', { lido_em: LIDO_EM })
})
afterEach(() => {
  client.clear()
  vi.useRealTimers()
})

describe('um id que não é uuid não vai à rede (MAC-14)', () => {
  it.each(['marina@exemplo.invalid', 'Marina Duarte', '51998124471', '', 'abc', `${ID}/../x`, `${ID}'`])(
    '%j ⇒ cliente null, e o dublê não viu NADA (nem a RPC)',
    async (id) => {
      const { result } = montar(id)
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data).toEqual({ cliente: null, cidade: null, lido_em: null })
      expect(fake.log()).toEqual([])
      expect(fake.chamadasDe('atelie_clock')).toEqual([])
    },
  )
})

describe('o cabeçalho e a cidade (MAC-15, MAC-16)', () => {
  it('o cabeçalho lê customer_list com as colunas da ficha, `.eq(id).maybeSingle()`', async () => {
    fake.responderTabela('customer_list', { data: fichaDeCliente(), error: null })
    fake.responderTabela('order_list', { data: CIDADE, error: null })
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fake.cadeiasDe('customer_list')).toEqual([
      [
        { metodo: 'select', args: [COLUNAS_DA_FICHA] },
        { metodo: 'eq', args: ['id', ID] },
        { metodo: 'maybeSingle', args: [] },
      ],
    ])
  })

  it('a cidade é lida DEPOIS do cabeçalho (segunda onda), pelo vínculo de core, o pedido mais recente com cidade', async () => {
    fake.responderTabela('customer_list', { data: fichaDeCliente(), error: null })
    fake.responderTabela('order_list', { data: CIDADE, error: null })
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fake.cadeiasDe('order_list')).toEqual([
      [
        { metodo: 'select', args: [COLUNAS_DA_CIDADE] },
        { metodo: 'or', args: [customerOrdersCondition(ID, 'marina@exemplo.invalid')] },
        { metodo: 'not', args: ['address_city', 'is', null] },
        { metodo: 'order', args: ['created_at', { ascending: false }] },
        { metodo: 'limit', args: [1] },
      ],
    ])
    const ordem = fake.log().filter((l) => l.startsWith('select'))
    expect(ordem).toEqual(['select customer_list', 'select order_list'])
  })

  it('a ficha: o cabeçalho, a cidade e o instante do banco', async () => {
    fake.responderTabela('customer_list', { data: fichaDeCliente(), error: null })
    fake.responderTabela('order_list', { data: CIDADE, error: null })
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      cliente: fichaDeCliente(),
      cidade: { city: 'Porto Alegre', state: 'RS' },
      lido_em: LIDO_EM,
    })
  })

  it('nenhum pedido com cidade ⇒ cidade null, ficha de pé', async () => {
    fake.responderTabela('customer_list', { data: fichaDeCliente(), error: null })
    fake.responderTabela('order_list', { data: [], error: null })
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.cidade).toBeNull()
    expect(result.current.data?.cliente).toEqual(fichaDeCliente())
  })

  it('cidade sem estado vem com `state` null', async () => {
    fake.responderTabela('customer_list', { data: fichaDeCliente(), error: null })
    fake.responderTabela('order_list', { data: [{ address_city: 'Gramado', address_state: null }], error: null })
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.cidade).toEqual({ city: 'Gramado', state: null })
  })

  it('o e-mail com `_` entra no vínculo ESCAPADO: a cidade não puxa o pedido de VROSAXRJ (A10)', async () => {
    fake.responderTabela('customer_list', { data: fichaDeCliente({ email: COM_SUBLINHADO.email }), error: null })
    fake.responderTabela('order_list', { data: CIDADE, error: null })
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const or = String(fake.cadeiasDe('order_list')[0].find((e) => e.metodo === 'or')!.args[0])
    expect(or).toBe(`customer_id.eq.${ID},customer_email.ilike."VROSA\\\\_RJ@exemplo.invalid"`)
  })

  it('a pessoa de `_` não traz o pedido de `VROSAXRJ@…`: o dublê aplica o `ilike` literal do vínculo', async () => {
    const pedidosDoBanco = [
      { customer_id: null, customer_email: 'VROSAXRJ@exemplo.invalid', address_city: 'Santos', address_state: 'SP' },
      { customer_id: null, customer_email: 'vrosa_rj@exemplo.invalid', address_city: 'Pelotas', address_state: 'RS' },
    ]
    fake.responderTabela('customer_list', { data: fichaDeCliente({ email: 'VROSA_RJ@exemplo.invalid' }), error: null })
    fake.responderTabela('order_list', (cadeia) => {
      const or = String(cadeia.find((e) => e.metodo === 'or')!.args[0])
      return { data: pedidosDoBanco.filter((p) => ilikeDoPostgres(or, 'customer_email', p.customer_email)), error: null }
    })
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.cidade).toEqual({ city: 'Pelotas', state: 'RS' })
  })
})

describe('cabeçalho ausente, erro e recusa (MAC-14, MAC-11, MAC-12)', () => {
  it('uuid válido sem linha ⇒ cliente null, e a cidade NÃO é lida', async () => {
    fake.responderTabela('customer_list', { data: null, error: null })
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ cliente: null, cidade: null, lido_em: LIDO_EM })
    expect(fake.cadeiasDe('order_list')).toEqual([])
  })

  it('erro NO cabeçalho ⇒ a query falha (e repete uma vez)', async () => {
    vi.useFakeTimers()
    fake.falharTabela('customer_list', { message: 'TypeError: Failed to fetch' })
    const { result } = montar()
    for (let i = 0; i < 10; i++) await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.isError).toBe(true)
    expect(fake.cadeiasDe('customer_list')).toHaveLength(2)
    expect(fake.cadeiasDe('order_list')).toEqual([])
  })

  it('erro NA cidade ⇒ cidade null e a ficha NÃO cai', async () => {
    fake.responderTabela('customer_list', { data: fichaDeCliente(), error: null })
    fake.falharTabela('order_list', { message: 'boom' })
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.cliente).toEqual(fichaDeCliente())
    expect(result.current.data?.cidade).toBeNull()
  })

  it('a leitura da cidade que LANÇA ao montar também não derruba a ficha', async () => {
    fake.responderTabela('customer_list', { data: fichaDeCliente(), error: null })
    // `order_list` sem resposta configurada: o dublê lança na hora.
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.cidade).toBeNull()
  })

  it('a recusa da RPC vence o cabeçalho que trouxe linha, a cidade e o que estava em cache', async () => {
    vi.useFakeTimers()
    fake.falharRpc('atelie_clock', RECUSA)
    fake.responderTabela('customer_list', { data: fichaDeCliente(), error: null })
    fake.responderTabela('order_list', { data: CIDADE, error: null })
    const { result } = montar()
    for (let i = 0; i < 10; i++) await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.isError).toBe(true)
    expect((result.current.error as { code: string }).code).toBe('42501')
    expect(result.current.data).toBeUndefined()
    expect(fake.chamadasDe('atelie_clock')).toHaveLength(1)
  })

  it('a recusa vence o cabeçalho que FALHOU', async () => {
    vi.useFakeTimers()
    fake.falharRpc('atelie_clock', RECUSA)
    fake.falharTabela('customer_list', { message: 'Failed to fetch' })
    const { result } = montar()
    for (let i = 0; i < 10; i++) await act(() => vi.advanceTimersByTimeAsync(1000))
    expect((result.current.error as { code: string }).code).toBe('42501')
  })

  it('uma RPC que rejeita (rede) é falha de leitura, nunca recusa', async () => {
    vi.useFakeTimers()
    fake.aoChamarRpc('atelie_clock', () => Promise.reject(new TypeError('Failed to fetch')))
    fake.responderTabela('customer_list', { data: fichaDeCliente(), error: null })
    fake.responderTabela('order_list', { data: CIDADE, error: null })
    const { result } = montar()
    for (let i = 0; i < 10; i++) await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.isError).toBe(true)
    expect((result.current.error as { code?: string }).code).toBeUndefined()
  })

  it('a chave é por cliente; `staleTime` 0', async () => {
    expect(chaveDoCliente(ID)).toEqual(['atelie-cliente', ID])
    fake.responderTabela('customer_list', { data: fichaDeCliente(), error: null })
    fake.responderTabela('order_list', { data: CIDADE, error: null })
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(client.getQueryCache().find({ queryKey: chaveDoCliente(ID) })!.isStale()).toBe(true)
  })
})
