// Feature `74` · T15 — `usePedido` sobre o dublê que registra a cadeia (`MAP-29`, `MAP-30`, `MAP-36`,
// `MAP-37`, `MAP-39`, Q6, Q7, TE3). As colunas das quatro relações vêm ESCRITAS POR EXTENSO (as de
// §13 M3 do Design, conferidas no `information_schema` local e pelo probe `02-lista`): derivá-las da
// constante provaria só que ela é igual a si mesma.
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { buildHistory } from '@estrelinha/core/orders'

import { fake } from '@/test/fakeSupabase'
import { EMAIL_FALHO, ITEM_COM_GRAVACAO, NOTA, detalhe, item, statusRow } from '@/test/pedidos'

import { COLUNAS_DO_DETALHE } from '../../model/linha'
import { chaveDoPedido, usePedido } from '../usePedido'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const ID = '00000000-0000-4000-8000-000000000244'
const LIDO_EM = '2026-10-23T14:30:00.123456+00:00'
const RECUSA = { message: 'acesso restrito ao painel', code: '42501' }
const REDE = { message: 'TypeError: Failed to fetch' }
const RELACOES = ['order_items', 'order_status_history', 'order_notes', 'order_notifications'] as const

// Um QueryClient sem padrão nenhum: a regra de repetição tem de vir do PRÓPRIO hook (`retryUnlessDenied`),
// e é ela que os casos de recusa e de rede medem.
let client: QueryClient
const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)
const montar = (id = ID) => renderHook(() => usePedido(id), { wrapper })

const tudoBem = () => {
  fake.responderRpc('atelie_clock', { lido_em: LIDO_EM })
  fake.responderTabela('order_list', { data: detalhe(), error: null })
  fake.responderTabela('order_items', { data: [item(), ITEM_COM_GRAVACAO], error: null })
  fake.responderTabela('order_status_history', { data: [statusRow()], error: null })
  fake.responderTabela('order_notes', { data: [NOTA], error: null })
  fake.responderTabela('order_notifications', { data: [EMAIL_FALHO], error: null })
}

beforeEach(() => {
  fake.reset()
  client = new QueryClient()
  tudoBem()
})
afterEach(() => {
  client.clear()
  vi.useRealTimers()
})

describe('as cinco leituras (§3.4, §13 M3)', () => {
  it('o pedido sai da view order_list, por id, com maybeSingle e as colunas do detalhe', async () => {
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fake.cadeiasDe('order_list')).toEqual([
      [
        { metodo: 'select', args: [COLUNAS_DO_DETALHE] },
        { metodo: 'eq', args: ['id', ID] },
        { metodo: 'maybeSingle', args: [] },
      ],
    ])
    expect(COLUNAS_DO_DETALHE).toContain('purchase_ordinal')
    expect(COLUNAS_DO_DETALHE).not.toMatch(/nuvemshop_/)
  })

  it.each([
    ['order_items', 'id, product_name, variant_label, engraving_text, quantity, unit_price'],
    ['order_status_history', 'id, from_status, to_status, note, created_at'],
    ['order_notes', 'id, note, created_by, created_at'],
    ['order_notifications', 'id, event, channel, status, attempts, delivery_status, error, created_at, sent_at'],
  ])('%s: as colunas nomeadas e o filtro por order_id — nada mais', async (tabela, colunas) => {
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fake.cadeiasDe(tabela)).toEqual([
      [
        { metodo: 'select', args: [colunas] },
        { metodo: 'eq', args: ['order_id', ID] },
      ],
    ])
  })

  it('UMA confirmação de papel para as cinco leituras (MAP-37)', async () => {
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fake.chamadasDe('atelie_clock')).toEqual([{ nome: 'atelie_clock', args: [] }])
  })

  it('o resultado: o pedido, os itens, o histórico já fundido por buildHistory e o instante do banco', async () => {
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({
      pedido: detalhe(),
      itens: { estado: 'ok', dado: [item(), ITEM_COM_GRAVACAO] },
      historico: { estado: 'ok', dado: buildHistory([statusRow()], [EMAIL_FALHO], [NOTA]) },
      lido_em: LIDO_EM,
    })
    // Os três fios estão lá — inclusive o e-mail que falhou.
    const historico = result.current.data!.historico as { estado: 'ok'; dado: { kind: string; title: string }[] }
    expect(historico.dado.map((e) => e.kind).sort()).toEqual(['email', 'note', 'status'])
    expect(historico.dado.some((e) => e.title.startsWith('Falha ao enviar'))).toBe(true)
  })

  it('a chave é por pedido', () => {
    expect(chaveDoPedido(ID)).toEqual(['atelie-pedido', ID])
  })
})

describe('os estados (MAP-29, MAP-30, MAP-34)', () => {
  it('erro na leitura do PEDIDO ⇒ a query inteira falha', async () => {
    vi.useFakeTimers()
    fake.falharTabela('order_list', REDE)
    const { result } = montar()
    for (let i = 0; i < 10; i++) await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.isError).toBe(true)
    expect(result.current.error).toEqual(REDE)
    expect(result.current.data).toBeUndefined()
  })

  it('pedido inexistente ⇒ `pedido: null`, sem erro', async () => {
    fake.responderTabela('order_list', { data: null, error: null })
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.pedido).toBeNull()
  })

  it.each([['abc'], ['0244'], ['00000000-0000-4000-8000-00000000024'], ['']])(
    'id que não é uuid (%j) ⇒ `pedido: null` SEM rede e SEM RPC (Q7)',
    async (id) => {
      const { result } = montar(id)
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.pedido).toBeNull()
      expect(result.current.data?.lido_em).toBeNull()
      expect(fake.leiturasDeDado()).toEqual([])
      expect(fake.chamadasDe('atelie_clock')).toEqual([])
    },
  )

  it('itens em falha ⇒ só os itens em falha; o pedido e o histórico desenham', async () => {
    fake.falharTabela('order_items', REDE)
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.itens).toEqual({ estado: 'falhou' })
    expect(result.current.data?.pedido).toEqual(detalhe())
    expect(result.current.data?.historico.estado).toBe('ok')
  })

  it.each([['order_status_history'], ['order_notes'], ['order_notifications']])(
    '%s em falha ⇒ o histórico INTEIRO em falha (Q6); os itens desenham',
    async (tabela) => {
      fake.falharTabela(tabela, REDE)
      const { result } = montar()
      await waitFor(() => expect(result.current.isSuccess).toBe(true))
      expect(result.current.data?.historico).toEqual({ estado: 'falhou' })
      expect(result.current.data?.itens.estado).toBe('ok')
    },
  )

  it('uma relação cujo fetch LANÇA também vira bloco em falha, não a tela inteira', async () => {
    fake.responderTabela('order_items', () => Promise.reject(new TypeError('Failed to fetch')))
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.itens).toEqual({ estado: 'falhou' })
  })

  it('"Tentar de novo" (refetch) relê as cinco e a confirmação, e o bloco volta (TE4)', async () => {
    fake.responderTabela('order_items', (_c, n) => (n === 1 ? { data: null, error: REDE } : { data: [item()], error: null }))
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.itens.estado).toBe('falhou')
    await act(() => result.current.refetch())
    await waitFor(() => expect(result.current.data?.itens).toEqual({ estado: 'ok', dado: [item()] }))
    expect(fake.chamadasDe('atelie_clock')).toHaveLength(2)
    for (const t of RELACOES) expect(fake.cadeiasDe(t)).toHaveLength(2)
  })
})

describe('a recusa vence (MAP-36, MAP-37)', () => {
  it('RPC 42501 ⇒ a query falha com o 42501, nenhum bloco sai e ela não repete', async () => {
    vi.useFakeTimers()
    fake.falharRpc('atelie_clock', RECUSA)
    const { result } = montar()
    for (let i = 0; i < 10; i++) await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.isError).toBe(true)
    expect((result.current.error as { code: string }).code).toBe('42501')
    expect(result.current.data).toBeUndefined()
    expect(fake.chamadasDe('atelie_clock')).toHaveLength(1)
  })

  it('RPC 42501 com o pedido em erro de rede ⇒ ainda o 42501', async () => {
    vi.useFakeTimers()
    fake.falharRpc('atelie_clock', RECUSA)
    fake.falharTabela('order_list', REDE)
    const { result } = montar()
    for (let i = 0; i < 10; i++) await act(() => vi.advanceTimersByTimeAsync(1000))
    expect((result.current.error as { code: string }).code).toBe('42501')
  })
})

describe('frescor (MAP-39, TE3)', () => {
  it('voltar ao primeiro plano relê o detalhe', async () => {
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    act(() => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
    })
    await waitFor(() => expect(fake.cadeiasDe('order_list')).toHaveLength(2))
    focusManager.setFocused(undefined)
  })

  it('falha de rede do pedido repete UMA vez', async () => {
    vi.useFakeTimers()
    fake.falharTabela('order_list', REDE)
    montar()
    for (let i = 0; i < 10; i++) await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(fake.cadeiasDe('order_list')).toHaveLength(2)
  })
})
