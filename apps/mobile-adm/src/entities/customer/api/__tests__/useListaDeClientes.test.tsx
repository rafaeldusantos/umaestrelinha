// Feature `76` · T17 — `useListaDeClientes` sobre o dublê que REGISTRA a cadeia (`L-060`).
//
// A régua do recorte, da busca e do cursor é a IGUALDADE da cadeia registrada com a que `core` produz:
// um `.neq` a mais, uma coluna da busca a menos ou a ordem trocada reprovam. A cadeia esperada é
// montada passando um gravador pelas MESMAS funções de `core` — o que se prova é "o app não acrescenta
// nem tira nada", não o conteúdo do predicado (esse é provado em `core` e pelo probe 01 contra o
// banco). A ordem (`last_activity_at desc nulls last`, depois `id asc`) vem ESCRITA POR EXTENSO.
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  CUSTOMER_SLICES,
  applyCustomerSlice,
  buildAppCustomerSearch,
  customerCursorFilter,
  type CustomerCursor,
  type CustomerSliceId,
} from '@estrelinha/core/customers'

import { fake, type Elo, type RespostaTabela } from '@/test/fakeSupabase'
import { cliente, listaDeClientes } from '@/test/clientes'

import { COLUNAS_DA_LISTA } from '../../model/linha'
import { chaveDaListaDeClientes, tamanhoDaJanelaDeClientes, useListaDeClientes } from '../useListaDeClientes'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const LIDO_EM = '2026-10-24T14:30:00.123456+00:00'
const RECUSA = { message: 'acesso restrito ao painel', code: '42501' }

/** A cadeia que `core` produz para uma leitura — o gravador passa pelas mesmas funções. */
const cadeiaEsperada = (
  slice: CustomerSliceId,
  termo: string,
  { limite, cursor, contar }: { limite: number; cursor?: CustomerCursor; contar: boolean },
): Elo[] => {
  const elos: Elo[] = [{ metodo: 'select', args: contar ? [COLUNAS_DA_LISTA, { count: 'exact' }] : [COLUNAS_DA_LISTA] }]
  const gravador = {
    gte(c: string, v: number) {
      elos.push({ metodo: 'gte', args: [c, v] })
      return gravador
    },
  }
  applyCustomerSlice(gravador, slice)
  const busca = buildAppCustomerSearch(termo)
  if (busca) elos.push({ metodo: 'or', args: [busca] })
  if (cursor) elos.push({ metodo: 'or', args: [customerCursorFilter(cursor)] })
  elos.push(
    { metodo: 'order', args: ['last_activity_at', { ascending: false, nullsFirst: false }] },
    { metodo: 'order', args: ['id', { ascending: true }] },
    { metodo: 'limit', args: [limite] },
  )
  return elos
}

const ehPaginaSeguinte = (cadeia: Elo[]) => !cadeia[0].args[1]

let client: QueryClient
const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)

const montar = (slice: CustomerSliceId = 'todas', termo = '') =>
  renderHook(({ s, t }) => useListaDeClientes(s, t), { wrapper, initialProps: { s: slice, t: termo } })

const segurada = () => {
  let soltar: (r: RespostaTabela) => void = () => {}
  const promessa = new Promise<RespostaTabela>((r) => (soltar = r))
  return { promessa, soltar }
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

describe('a cadeia é só a regra de core (MAC-01, MAC-02, MAC-06, L-060)', () => {
  it('âncora: três recortes', () => expect(CUSTOMER_SLICES).toHaveLength(3))

  it.each(CUSTOMER_SLICES.map((s) => [s.id]))('%s: a primeira leitura é a cadeia de core, com contagem, limite 25', async (id) => {
    fake.responderTabela('customer_list', { data: listaDeClientes(3), error: null, count: 3 })
    const { result } = montar(id as CustomerSliceId)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fake.cadeiasDe('customer_list')).toEqual([cadeiaEsperada(id as CustomerSliceId, '', { limite: 25, contar: true })])
  })

  it('o recorte "recorrentes" é `orders_paid >= 2` e "em-aberto" é `orders_open >= 1`, escritos por extenso', async () => {
    fake.responderTabela('customer_list', { data: [], error: null, count: 0 })
    montar('recorrentes')
    montar('em-aberto')
    await waitFor(() => expect(fake.cadeiasDe('customer_list')).toHaveLength(2))
    const gtes = fake.cadeiasDe('customer_list').map((c) => c.filter((e) => e.metodo === 'gte').map((e) => e.args))
    expect(gtes).toContainEqual([['orders_paid', 2]])
    expect(gtes).toContainEqual([['orders_open', 1]])
  })

  it('`todas` não filtra: nenhum `gte` na cadeia', async () => {
    fake.responderTabela('customer_list', { data: [], error: null, count: 0 })
    const { result } = montar('todas')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fake.cadeiasDe('customer_list')[0].some((e) => e.metodo === 'gte')).toBe(false)
  })

  it('a ordem, por extenso: last_activity_at decrescente com nulos por último, depois id crescente', async () => {
    fake.responderTabela('customer_list', { data: [], error: null, count: 0 })
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fake.cadeiasDe('customer_list')[0].slice(-3)).toEqual([
      { metodo: 'order', args: ['last_activity_at', { ascending: false, nullsFirst: false }] },
      { metodo: 'order', args: ['id', { ascending: true }] },
      { metodo: 'limit', args: [25] },
    ])
  })

  it('com busca: o `or` da busca vem DEPOIS do recorte, e o termo vai aparado', async () => {
    fake.responderTabela('customer_list', { data: [], error: null, count: 0 })
    const { result } = montar('em-aberto', '  ana ')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fake.cadeiasDe('customer_list')[0]).toEqual(cadeiaEsperada('em-aberto', 'ana', { limite: 25, contar: true }))
    expect(fake.cadeiasDe('customer_list')[0].map((e) => e.metodo)).toEqual(['select', 'gte', 'or', 'order', 'order', 'limit'])
  })

  it('termo vazio ou só de espaços é SEM busca: nenhum `or`', async () => {
    fake.responderTabela('customer_list', { data: [], error: null, count: 0 })
    const { result } = montar('todas', '   ')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fake.cadeiasDe('customer_list')[0].some((e) => e.metodo === 'or')).toBe(false)
  })

  it('a busca é a do app: nome, e-mail e telefone — nunca cpf', async () => {
    fake.responderTabela('customer_list', { data: [], error: null, count: 0 })
    const { result } = montar('todas', '(51) 99812-4471')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    const busca = String(fake.cadeiasDe('customer_list')[0].find((e) => e.metodo === 'or')!.args[0])
    expect(busca).toContain('name.ilike.')
    expect(busca).toContain('email.ilike.')
    expect(busca).toContain('phone.ilike.')
    expect(busca).not.toContain('cpf')
  })

  it('a chave é por recorte e termo APARADO (MAC-06)', () => {
    expect(chaveDaListaDeClientes('em-aberto', '  ana ')).toEqual(['atelie-clientes', 'em-aberto', 'ana'])
    expect(chaveDaListaDeClientes('todas', '  ana ')).toEqual(chaveDaListaDeClientes('todas', 'ana'))
  })

  it('a resposta: as linhas, o total da contagem do SERVIDOR e o instante do banco', async () => {
    fake.responderTabela('customer_list', { data: listaDeClientes(3), error: null, count: 48 })
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ linhas: listaDeClientes(3), total: 48, lido_em: LIDO_EM, fim: true })
  })
})

describe('a página seguinte (MAC-05)', () => {
  it('sai pelo cursor — as strings do SERVIDOR, com µs —, sem contagem, e anexa', async () => {
    const primeira = listaDeClientes(25)
    fake.responderTabela('customer_list', (cadeia) =>
      ehPaginaSeguinte(cadeia) ? { data: listaDeClientes(25, 25), error: null } : { data: primeira, error: null, count: 60 },
    )
    const { result } = montar('recorrentes')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(() => result.current.carregarMais())
    const ultima = primeira[24]
    expect(ultima.last_activity_at).toMatch(/\.\d{6}\+00:00$/)
    expect(fake.cadeiasDe('customer_list')[1]).toEqual(
      cadeiaEsperada('recorrentes', '', {
        limite: 25,
        contar: false,
        cursor: { last_activity_at: ultima.last_activity_at, id: ultima.id },
      }),
    )
    expect(result.current.data?.linhas).toHaveLength(50)
    expect(result.current.data?.total).toBe(60)
  })

  it('o cursor da última linha com data nula é o dos nulos', async () => {
    const primeira = [...listaDeClientes(24), cliente({ id: '00000000-0000-4000-c076-0000000000aa', last_activity_at: null })]
    fake.responderTabela('customer_list', (c) => (ehPaginaSeguinte(c) ? { data: [], error: null } : { data: primeira, error: null, count: 60 }))
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(() => result.current.carregarMais())
    const or = fake.cadeiasDe('customer_list')[1].filter((e) => e.metodo === 'or').map((e) => e.args[0])
    expect(or).toEqual(['and(last_activity_at.is.null,id.gt.00000000-0000-4000-c076-0000000000aa)'])
  })

  it('o `id` repetido ao anexar é descartado e a ordem se mantém', async () => {
    const primeira = listaDeClientes(25)
    // A cliente 24 mudou de posição entre as leituras e volta na página seguinte.
    const segunda = [primeira[24], ...listaDeClientes(24, 25)]
    fake.responderTabela('customer_list', (c) => (ehPaginaSeguinte(c) ? { data: segunda, error: null } : { data: primeira, error: null, count: 60 }))
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(() => result.current.carregarMais())
    const ids = result.current.data!.linhas.map((l) => l.id)
    expect(ids).toHaveLength(49)
    expect(new Set(ids).size).toBe(49)
    expect(ids.slice(0, 25)).toEqual(primeira.map((l) => l.id))
    expect(ids[25]).toBe(listaDeClientes(1, 25)[0].id)
  })

  it('a página cheia, mas só de repetidas, anexa nada e não é o fim', async () => {
    const primeira = listaDeClientes(25)
    fake.responderTabela('customer_list', (c) => (ehPaginaSeguinte(c) ? { data: primeira, error: null } : { data: primeira, error: null, count: 60 }))
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(() => result.current.carregarMais())
    expect(result.current.data?.linhas).toHaveLength(25)
    expect(result.current.data?.fim).toBe(false)
  })

  it('a página seguinte também confirma o papel: a RPC sai de novo', async () => {
    fake.responderTabela('customer_list', (c) => (ehPaginaSeguinte(c) ? { data: listaDeClientes(2, 25), error: null } : { data: listaDeClientes(25), error: null, count: 27 }))
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(() => result.current.carregarMais())
    expect(fake.chamadasDe('atelie_clock')).toHaveLength(2)
  })

  it('a falha da página seguinte MANTÉM as linhas e marca `proximaFalhou`; "tentar de novo" anexa', async () => {
    fake.responderTabela('customer_list', (c, n) =>
      ehPaginaSeguinte(c) ? (n === 2 ? { data: null, error: { message: 'x' } } : { data: listaDeClientes(25, 25), error: null }) : { data: listaDeClientes(25), error: null, count: 60 },
    )
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(() => result.current.carregarMais())
    expect(result.current.proximaFalhou).toBe(true)
    expect(result.current.data?.linhas).toHaveLength(25)
    await act(() => result.current.carregarMais())
    expect(result.current.proximaFalhou).toBe(false)
    expect(result.current.data?.linhas).toHaveLength(50)
  })
})

describe('a releitura relê a janela inteira do topo, em múltiplos de 25', () => {
  it('âncora: o tamanho da janela', () => {
    expect([0, 1, 25, 26, 30, 50, 51].map(tamanhoDaJanelaDeClientes)).toEqual([25, 25, 25, 50, 50, 50, 75])
  })

  it('com 50 carregadas, a releitura pede limit 50 e a contagem, sem cursor', async () => {
    fake.responderTabela('customer_list', (c) =>
      ehPaginaSeguinte(c) ? { data: listaDeClientes(25, 25), error: null } : { data: listaDeClientes(Number(c.at(-1)!.args[0])), error: null, count: 60 },
    )
    const { result } = montar('em-aberto')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(() => result.current.carregarMais())
    await act(() => result.current.refetch())
    expect(fake.cadeiasDe('customer_list')[2]).toEqual(cadeiaEsperada('em-aberto', '', { limite: 50, contar: true }))
    expect(result.current.data?.linhas).toHaveLength(50)
  })
})

describe('recusa e rede (MAC-11, MAC-12, MAC-13)', () => {
  it('a recusa não repete: UMA confirmação, e o erro tem o 42501', async () => {
    vi.useFakeTimers()
    fake.falharRpc('atelie_clock', RECUSA)
    fake.responderTabela('customer_list', { data: listaDeClientes(3), error: null, count: 3 })
    const { result } = montar()
    for (let i = 0; i < 10; i++) await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.isError).toBe(true)
    expect((result.current.error as { code: string }).code).toBe('42501')
    expect(result.current.data).toBeUndefined()
    expect(fake.chamadasDe('atelie_clock')).toHaveLength(1)
  })

  it('a recusa VENCE a consulta que falhou', async () => {
    vi.useFakeTimers()
    fake.falharRpc('atelie_clock', RECUSA)
    fake.responderTabela('customer_list', { data: null, error: { message: 'Failed to fetch' } })
    const { result } = montar()
    for (let i = 0; i < 10; i++) await act(() => vi.advanceTimersByTimeAsync(1000))
    expect((result.current.error as { code: string }).code).toBe('42501')
  })

  it('a recusa VENCE a consulta que trouxe linhas da cliente (conta sem papel): nenhuma linha sai', async () => {
    vi.useFakeTimers()
    fake.falharRpc('atelie_clock', RECUSA)
    fake.responderTabela('customer_list', { data: listaDeClientes(5), error: null, count: 5 })
    const { result } = montar()
    for (let i = 0; i < 10; i++) await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.data).toBeUndefined()
    expect((result.current.error as { code: string }).code).toBe('42501')
  })

  it('falha de rede da janela repete UMA vez (o padrão do app)', async () => {
    vi.useFakeTimers()
    fake.responderTabela('customer_list', { data: null, error: { message: 'TypeError: Failed to fetch' } })
    const { result } = montar()
    for (let i = 0; i < 10; i++) await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.isError).toBe(true)
    expect(fake.cadeiasDe('customer_list')).toHaveLength(2)
  })

  it('voltar ao primeiro plano relê a janela (refetchOnWindowFocus, staleTime 0)', async () => {
    fake.responderTabela('customer_list', { data: listaDeClientes(3), error: null, count: 3 })
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    act(() => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
    })
    await waitFor(() => expect(fake.cadeiasDe('customer_list')).toHaveLength(2))
    focusManager.setFocused(undefined)
  })

  it('o dado ficou velho assim que chegou: `staleTime` é 0', async () => {
    fake.responderTabela('customer_list', { data: listaDeClientes(3), error: null, count: 3 })
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(client.getQueryCache().find({ queryKey: chaveDaListaDeClientes('todas', '') })!.isStale()).toBe(true)
  })
})

describe('recorte e termo diferentes não herdam o estado um do outro', () => {
  it('a falha da página seguinte de um recorte NÃO aparece no outro', async () => {
    fake.responderTabela('customer_list', (c) => (ehPaginaSeguinte(c) ? { data: null, error: { message: 'x' } } : { data: listaDeClientes(25), error: null, count: 60 }))
    const { result, rerender } = montar('todas')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(() => result.current.carregarMais())
    expect(result.current.proximaFalhou).toBe(true)
    rerender({ s: 'em-aberto', t: '' })
    expect(result.current.proximaFalhou).toBe(false)
  })

  it('sem placeholderData: trocar de recorte mostra "carregando", nunca a lista do anterior', async () => {
    const segundo = segurada()
    fake.responderTabela('customer_list', (_c, n) => (n === 1 ? { data: listaDeClientes(3), error: null, count: 3 } : segundo.promessa))
    const { result, rerender } = montar('todas')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    rerender({ s: 'recorrentes', t: '' })
    expect(result.current.data).toBeUndefined()
    expect(result.current.isPending).toBe(true)
    await act(async () => segundo.soltar({ data: [], error: null, count: 0 }))
  })

  it('a resposta do termo antigo que chega DEPOIS da do novo não é desenhada', async () => {
    const antigo = segurada()
    fake.responderTabela('customer_list', (c) => {
      const busca = c.find((e) => e.metodo === 'or' && String(e.args[0]).includes('ilike'))
      return String(busca?.args[0]).includes('%an%') && !String(busca?.args[0]).includes('ana b')
        ? antigo.promessa
        : { data: [cliente({ name: 'Ana Beatriz' })], error: null, count: 1 }
    })
    const { result, rerender } = montar('todas', 'an')
    await waitFor(() => expect(fake.cadeiasDe('customer_list')).toHaveLength(1))
    rerender({ s: 'todas', t: 'ana b' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(async () => antigo.soltar({ data: [cliente({ name: 'Anderson' })], error: null, count: 1 }))
    expect(result.current.data?.linhas.map((l) => l.name)).toEqual(['Ana Beatriz'])
  })

  it('"  ana " e "ana" são a MESMA entrada de cache: uma leitura só', async () => {
    fake.responderTabela('customer_list', { data: [], error: null, count: 0 })
    const a = montar('todas', '  ana ')
    await waitFor(() => expect(a.result.current.isSuccess).toBe(true))
    const b = montar('todas', 'ana')
    await waitFor(() => expect(b.result.current.isSuccess).toBe(true))
    expect(client.getQueryCache().findAll({ queryKey: ['atelie-clientes'] })).toHaveLength(1)
  })
})
