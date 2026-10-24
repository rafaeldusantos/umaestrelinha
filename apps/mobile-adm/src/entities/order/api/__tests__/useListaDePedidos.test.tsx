// Feature `74` · T14 — `useListaDePedidos` sobre o dublê que REGISTRA a cadeia (`L-060`, R9).
//
// A régua do recorte é a IGUALDADE da cadeia registrada com a que `core` produz: um `.neq` a mais, um
// `.in` a menos ou a ordem trocada reprovam. A cadeia esperada é montada aqui passando um gravador
// pelas MESMAS funções de `core` (`applyOrderSlice`, `buildOrderSearchCondition`, `cursorFilter`) —
// o que se prova é "o app não acrescenta nem tira nada", não o conteúdo do predicado (esse é provado
// em `core` e pelo probe `02-lista` contra o banco). A ordem `asc`/`desc` de cada recorte, ao
// contrário, vem ESCRITA POR EXTENSO nos casos: derivá-la de `sliceOrder` provaria só que ela é igual
// a si mesma.
import { act, renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query'
import { createElement, type ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  ORDER_VIEWS,
  QUEUE_BLOCKS,
  applyOrderSlice,
  buildOrderSearchCondition,
  cursorFilter,
  type OrderCursor,
  type OrderSlice,
} from '@estrelinha/core/orders'

import { fake, type Elo, type RespostaTabela } from '@/test/fakeSupabase'
import { linha } from '@/test/pedidos'

import { COLUNAS_DA_LISTA, type LinhaDaLista } from '../../model/linha'
import { chaveDaLista, useListaDePedidos } from '../useListaDePedidos'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/fakeSupabase')).fake.client }))

const LIDO_EM = '2026-10-23T14:30:00.123456+00:00'
const RECUSA = { message: 'acesso restrito ao painel', code: '42501' }

/** `n` linhas com ids e instantes distintos, em µs (a string do servidor). */
const linhas = (n: number, desde = 0): LinhaDaLista[] =>
  Array.from({ length: n }, (_, i) => {
    const k = desde + i
    return linha({
      id: `00000000-0000-4000-8000-${String(k).padStart(12, '0')}`,
      order_number: String(k).padStart(4, '0'),
      created_at: `2026-10-${String(1 + (k % 28)).padStart(2, '0')}T10:00:00.${String(100000 + k).slice(-6)}+00:00`,
    })
  })

/** A cadeia que `core` produz para uma leitura — o gravador passa pelas mesmas funções. */
const cadeiaEsperada = (
  slice: OrderSlice,
  termo: string,
  { limite, cursor, contar, dir }: { limite: number; cursor?: OrderCursor; contar: boolean; dir: 'asc' | 'desc' },
): Elo[] => {
  const elos: Elo[] = [{ metodo: 'select', args: contar ? [COLUNAS_DA_LISTA, { count: 'exact' }] : [COLUNAS_DA_LISTA] }]
  const gravador = {
    or(f: string) {
      elos.push({ metodo: 'or', args: [f] })
      return gravador
    },
    in(c: string, v: readonly string[]) {
      elos.push({ metodo: 'in', args: [c, v] })
      return gravador
    },
  }
  applyOrderSlice(gravador, slice)
  const busca = buildOrderSearchCondition(termo)
  if (busca) elos.push({ metodo: 'or', args: [busca] })
  if (cursor) elos.push({ metodo: 'or', args: [cursorFilter(cursor, dir)] })
  elos.push(
    { metodo: 'order', args: ['created_at', { ascending: dir === 'asc' }] },
    { metodo: 'order', args: ['id', { ascending: dir === 'asc' }] },
    { metodo: 'limit', args: [limite] },
  )
  return elos
}

const ehPaginaSeguinte = (cadeia: Elo[]) => !cadeia[0].args[1]

// Um QueryClient sem padrão nenhum: a regra de repetição tem de vir do PRÓPRIO hook (`retryUnlessDenied`),
// e é ela que os casos de recusa e de rede medem.
let client: QueryClient
const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client }, children)

const montar = (slice: OrderSlice = { visao: 'tudo' }, termo = '') =>
  renderHook(({ s, t }) => useListaDePedidos(s, t), { wrapper, initialProps: { s: slice, t: termo } })

/** Uma resposta que o teste solta quando quiser. */
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

describe('a cadeia é só a regra de core (MAP-01, MAP-02, L-060)', () => {
  // A ordem de cada recorte, escrita por extenso (A8/G-A8): a fila e os blocos do mais antigo.
  const ORDEM: Record<string, 'asc' | 'desc'> = {
    'precisa-acao': 'asc',
    tudo: 'desc',
    'fila-material': 'desc',
    'a-separar': 'desc',
    'em-transito': 'desc',
    concluidos: 'desc',
  }
  const RECORTES: [string, OrderSlice, 'asc' | 'desc'][] = [
    ...ORDER_VIEWS.map((v) => [`visão ${v.id}`, { visao: v.id }, ORDEM[v.id]] as [string, OrderSlice, 'asc' | 'desc']),
    ...QUEUE_BLOCKS.map((b) => [`bloco ${b.id}`, { bloco: b.id }, 'asc'] as [string, OrderSlice, 'asc' | 'desc']),
  ]

  it('âncora: seis visões e quatro blocos', () => {
    expect(RECORTES).toHaveLength(10)
  })

  it.each(RECORTES)('%s: a primeira leitura é a cadeia de core, com contagem, limite 25', async (_n, slice, dir) => {
    fake.responderTabela('order_list', { data: linhas(3), error: null, count: 3 })
    const { result } = montar(slice)
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fake.cadeiasDe('order_list')).toEqual([cadeiaEsperada(slice, '', { limite: 25, contar: true, dir })])
  })

  it('com busca: o `or` da busca vem DEPOIS do recorte, e o termo vai aparado', async () => {
    fake.responderTabela('order_list', { data: [], error: null, count: 0 })
    const { result } = montar({ visao: 'precisa-acao' }, '  #0244 ')
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(fake.cadeiasDe('order_list')[0]).toEqual(cadeiaEsperada({ visao: 'precisa-acao' }, '#0244', { limite: 25, contar: true, dir: 'asc' }))
    // A visão "Precisa de ação" é um `or` com `and(…)` aninhado: com a busca, DOIS `or` lado a lado.
    expect(fake.cadeiasDe('order_list')[0].filter((e) => e.metodo === 'or')).toHaveLength(2)
  })

  it('a chave é por recorte e termo APARADO (MAP-11: termo e recorte decidem o que se desenha)', () => {
    expect(chaveDaLista({ visao: 'tudo' }, '  ana ')).toEqual(['atelie-pedidos', { visao: 'tudo' }, 'ana'])
  })

  it('a resposta: as linhas, o total da contagem e o instante do banco', async () => {
    fake.responderTabela('order_list', { data: linhas(3), error: null, count: 41 })
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toEqual({ linhas: linhas(3), total: 41, lido_em: LIDO_EM, fim: true })
  })
})

describe('a página seguinte (MAP-13, MAP-14, MAP-15)', () => {
  it('sai pelo cursor — a string do SERVIDOR, com µs —, sem contagem (G-A9a), e anexa', async () => {
    const primeira = linhas(25)
    fake.responderTabela('order_list', (cadeia) =>
      ehPaginaSeguinte(cadeia) ? { data: linhas(25, 25), error: null } : { data: primeira, error: null, count: 60 },
    )
    const { result } = montar({ visao: 'tudo' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(() => result.current.carregarMais())
    const ultima = primeira[24]
    expect(ultima.created_at).toMatch(/\.\d{6}\+00:00$/)
    expect(fake.cadeiasDe('order_list')[1]).toEqual(
      cadeiaEsperada({ visao: 'tudo' }, '', { limite: 25, contar: false, dir: 'desc', cursor: { created_at: ultima.created_at, id: ultima.id } }),
    )
    expect(result.current.data?.linhas).toHaveLength(50)
    expect(result.current.data?.linhas.slice(25)).toEqual(linhas(25, 25))
    expect(result.current.data?.total).toBe(60)
    expect(result.current.data?.fim).toBe(false)
  })

  it('a página seguinte também confirma o papel (MAP-36): a RPC sai de novo', async () => {
    fake.responderTabela('order_list', (c) => (ehPaginaSeguinte(c) ? { data: linhas(2, 25), error: null } : { data: linhas(25), error: null, count: 27 }))
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(() => result.current.carregarMais())
    expect(fake.chamadasDe('atelie_clock')).toHaveLength(2)
  })

  it('a página curta é o fim (MAP-15): depois dela, carregar mais não sai', async () => {
    fake.responderTabela('order_list', (c) => (ehPaginaSeguinte(c) ? { data: linhas(7, 25), error: null } : { data: linhas(25), error: null, count: 32 }))
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(() => result.current.carregarMais())
    expect(result.current.data?.fim).toBe(true)
    await act(() => result.current.carregarMais())
    expect(fake.cadeiasDe('order_list')).toHaveLength(2)
  })

  it('a primeira janela curta já é o fim: nenhuma página seguinte', async () => {
    fake.responderTabela('order_list', { data: linhas(10), error: null, count: 10 })
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data?.fim).toBe(true)
    await act(() => result.current.carregarMais())
    expect(fake.cadeiasDe('order_list')).toHaveLength(1)
  })

  it('a falha da página seguinte MANTÉM as linhas e marca `proximaFalhou` (MAP-35)', async () => {
    const erro = { message: 'TypeError: Failed to fetch' }
    fake.responderTabela('order_list', (c) => (ehPaginaSeguinte(c) ? { data: null, error: erro } : { data: linhas(25), error: null, count: 60 }))
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(() => result.current.carregarMais())
    expect(result.current.proximaFalhou).toBe(true)
    expect(result.current.erroDaProxima).toBe(erro)
    expect(result.current.data?.linhas).toEqual(linhas(25))
    expect(result.current.isError).toBe(false)
  })

  it('a recusa na página seguinte chega como erro dela, com o 42501 (vai à vigia, MAP-36)', async () => {
    fake.responderTabela('order_list', (c) => (ehPaginaSeguinte(c) ? { data: linhas(25, 25), error: null } : { data: linhas(25), error: null, count: 60 }))
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    fake.falharRpc('atelie_clock', RECUSA)
    await act(() => result.current.carregarMais())
    expect((result.current.erroDaProxima as { code: string }).code).toBe('42501')
    expect(result.current.data?.linhas).toHaveLength(25)
  })

  // D2 da rodada 4: a recusa da próxima faz a vigia reconferir e a página DESMONTA. A recusa tem de
  // sobreviver à remontagem enquanto o cache guarda a mesma leitura da janela — e só a recusa: a
  // falha de REDE da próxima não, porque a remontagem nova rearma a sentinela (MAP-35).
  it('a RECUSA da próxima sobrevive à remontagem com a mesma janela no cache; a confirmação nova a apaga', async () => {
    fake.responderTabela('order_list', (c) => (ehPaginaSeguinte(c) ? { data: linhas(25, 25), error: null } : { data: linhas(25), error: null, count: 60 }))
    const primeira = montar()
    await waitFor(() => expect(primeira.result.current.isSuccess).toBe(true))
    fake.falharRpc('atelie_clock', RECUSA)
    await act(() => primeira.result.current.carregarMais())
    primeira.unmount()
    let soltar: (v: unknown) => void = () => {}
    fake.aoChamarRpc('atelie_clock', () => new Promise((r) => (soltar = r)))
    const segunda = montar()
    await waitFor(() => expect(segunda.result.current.isFetching).toBe(true))
    expect((segunda.result.current.erroDaProxima as { code: string }).code).toBe('42501')
    expect(segunda.result.current.proximaFalhou).toBe(true)
    await act(async () => soltar({ data: { lido_em: LIDO_EM }, error: null }))
    await waitFor(() => expect(segunda.result.current.isFetching).toBe(false))
    expect(segunda.result.current.isSuccess).toBe(true)
    expect(segunda.result.current.erroDaProxima).toBeNull()
  })

  it('a falha de REDE da próxima NÃO sobrevive à remontagem', async () => {
    fake.responderTabela('order_list', (c) =>
      ehPaginaSeguinte(c) ? { data: null, error: { message: 'Failed to fetch' } } : { data: linhas(25), error: null, count: 60 },
    )
    const primeira = montar()
    await waitFor(() => expect(primeira.result.current.isSuccess).toBe(true))
    await act(() => primeira.result.current.carregarMais())
    expect(primeira.result.current.proximaFalhou).toBe(true)
    primeira.unmount()
    fake.aoChamarRpc('atelie_clock', () => new Promise(() => {}))
    const segunda = montar()
    await waitFor(() => expect(segunda.result.current.isFetching).toBe(true))
    expect(segunda.result.current.erroDaProxima).toBeNull()
    expect(segunda.result.current.proximaFalhou).toBe(false)
  })

  it('"Tentar de novo" da próxima: a segunda tentativa anexa e limpa a falha', async () => {
    fake.responderTabela('order_list', (c, n) =>
      ehPaginaSeguinte(c) ? (n === 2 ? { data: null, error: { message: 'x' } } : { data: linhas(25, 25), error: null }) : { data: linhas(25), error: null, count: 60 },
    )
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(() => result.current.carregarMais())
    expect(result.current.proximaFalhou).toBe(true)
    await act(() => result.current.carregarMais())
    expect(result.current.proximaFalhou).toBe(false)
    expect(result.current.data?.linhas).toHaveLength(50)
  })
})

describe('a releitura relê a janela inteira do topo (G-A11)', () => {
  it('com 50 carregadas, a releitura pede limit 50 e a contagem, sem cursor', async () => {
    fake.responderTabela('order_list', (c) =>
      ehPaginaSeguinte(c) ? { data: linhas(25, 25), error: null } : { data: linhas(Number(c.at(-1)!.args[0])), error: null, count: 60 },
    )
    const { result } = montar({ visao: 'tudo' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(() => result.current.carregarMais())
    await act(() => result.current.refetch())
    expect(fake.cadeiasDe('order_list')[2]).toEqual(cadeiaEsperada({ visao: 'tudo' }, '', { limite: 50, contar: true, dir: 'desc' }))
    expect(result.current.data?.linhas).toHaveLength(50)
  })

  it('com 30 carregadas (25 + 5), a janela arredonda para 50', async () => {
    fake.responderTabela('order_list', (c) => (ehPaginaSeguinte(c) ? { data: linhas(5, 25), error: null } : { data: linhas(25), error: null, count: 30 }))
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(() => result.current.carregarMais())
    await act(() => result.current.refetch())
    expect(fake.cadeiasDe('order_list')[2].at(-1)).toEqual({ metodo: 'limit', args: [50] })
  })

  // G2 da verificação (rodada 2): MAP-15 no caminho da RELEITURA. Com uma janela de 50, o recorte que
  // encolheu volta com 30 — mais que uma página, menos que o limite pedido. É o fim: a sentinela não
  // pode pedir mais (sairia um pedido a mais e o esqueleto do fim piscaria). Só aqui `limite` e
  // `ORDER_PAGE_SIZE` divergem; na primeira leitura os dois são 25.
  it('a janela de 50 relida que volta com 30 é o fim (MAP-15): carregar mais não vai à rede', async () => {
    let encolheu = false
    fake.responderTabela('order_list', (c) =>
      ehPaginaSeguinte(c)
        ? { data: linhas(25, 25), error: null }
        : encolheu
          ? { data: linhas(30), error: null, count: 30 }
          : { data: linhas(25), error: null, count: 60 },
    )
    const { result } = montar({ visao: 'tudo' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(() => result.current.carregarMais())
    expect(result.current.data?.linhas).toHaveLength(50)
    expect(result.current.data?.fim).toBe(false)
    encolheu = true
    await act(() => result.current.refetch())
    expect(fake.cadeiasDe('order_list')[2].at(-1)).toEqual({ metodo: 'limit', args: [50] })
    // O `refetch` resolve antes de o render com a janela nova chegar a `result.current`.
    await waitFor(() => expect(result.current.data?.linhas).toHaveLength(30))
    expect(result.current.data?.fim).toBe(true)
    const leituras = fake.cadeiasDe('order_list').length
    await act(() => result.current.carregarMais())
    expect(fake.cadeiasDe('order_list')).toHaveLength(leituras)
    expect(result.current.carregandoMais).toBe(false)
  })
})

describe('E3 — a página que chega depois de uma releitura é descartada (MAP-40)', () => {
  it('releitura EM VOO quando a página chega: a página não é anexada', async () => {
    const pagina = segurada()
    const releitura = segurada()
    fake.responderTabela('order_list', (c, n) => {
      if (ehPaginaSeguinte(c)) return pagina.promessa
      return n === 1 ? { data: linhas(25), error: null, count: 60 } : releitura.promessa
    })
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    let anexo: Promise<void> = Promise.resolve()
    act(() => {
      anexo = result.current.carregarMais()
    })
    await waitFor(() => expect(fake.cadeiasDe('order_list')).toHaveLength(2))
    act(() => {
      void result.current.refetch()
    })
    await waitFor(() => expect(fake.cadeiasDe('order_list')).toHaveLength(3))
    await act(async () => {
      pagina.soltar({ data: linhas(25, 25), error: null })
      await anexo
    })
    expect(result.current.data?.linhas).toHaveLength(25)
    await act(async () => releitura.soltar({ data: linhas(25), error: null, count: 61 }))
    await waitFor(() => expect(result.current.data?.total).toBe(61))
    expect(result.current.data?.linhas).toHaveLength(25)
  })

  it('releitura TERMINADA antes de a página chegar: a página também é descartada', async () => {
    const pagina = segurada()
    fake.responderTabela('order_list', (c, n) => {
      if (ehPaginaSeguinte(c)) return pagina.promessa
      return { data: linhas(25), error: null, count: n === 1 ? 60 : 61 }
    })
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    let anexo: Promise<void> = Promise.resolve()
    act(() => {
      anexo = result.current.carregarMais()
    })
    await waitFor(() => expect(fake.cadeiasDe('order_list')).toHaveLength(2))
    await act(() => result.current.refetch())
    await waitFor(() => expect(result.current.data?.total).toBe(61))
    expect(fake.cadeiasDe('order_list')).toHaveLength(3)
    await act(async () => {
      pagina.soltar({ data: linhas(25, 25), error: null })
      await anexo
    })
    expect(result.current.data?.linhas).toHaveLength(25)
  })

  // G5 da verificação (rodada 3): o mesmo descarte, no ramo da FALHA. A página que falha depois de uma
  // releitura começar é tão velha quanto a que chega com dado: a janela relida já é a verdade, e marcar
  // `proximaFalhou` poria "Tentar de novo" no fim e desligaria a sentinela (MAP-13). O par é o caso
  // "a falha da página seguinte MANTÉM as linhas" acima, que sem releitura nenhuma marca a falha — os
  // dois juntos provam que quem decide é a geração, não o erro.
  it('releitura EM VOO quando a página FALHA: a falha é descartada, nada de "Tentar de novo"', async () => {
    const pagina = segurada()
    const releitura = segurada()
    fake.responderTabela('order_list', (c, n) => {
      if (ehPaginaSeguinte(c)) return pagina.promessa
      return n === 1 ? { data: linhas(25), error: null, count: 60 } : releitura.promessa
    })
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    let anexo: Promise<void> = Promise.resolve()
    act(() => {
      anexo = result.current.carregarMais()
    })
    await waitFor(() => expect(fake.cadeiasDe('order_list')).toHaveLength(2))
    act(() => {
      void result.current.refetch()
    })
    await waitFor(() => expect(fake.cadeiasDe('order_list')).toHaveLength(3))
    await act(async () => {
      pagina.soltar({ data: null, error: { message: 'TypeError: Failed to fetch' } })
      await anexo
    })
    expect(result.current.proximaFalhou).toBe(false)
    expect(result.current.erroDaProxima).toBeNull()
    await act(async () => releitura.soltar({ data: linhas(25), error: null, count: 61 }))
    await waitFor(() => expect(result.current.data?.total).toBe(61))
    expect(result.current.proximaFalhou).toBe(false)
    expect(result.current.data?.linhas).toHaveLength(25)
  })

  it('releitura TERMINADA antes de a página FALHAR: a falha também é descartada', async () => {
    const pagina = segurada()
    fake.responderTabela('order_list', (c, n) => {
      if (ehPaginaSeguinte(c)) return pagina.promessa
      return { data: linhas(25), error: null, count: n === 1 ? 60 : 61 }
    })
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    let anexo: Promise<void> = Promise.resolve()
    act(() => {
      anexo = result.current.carregarMais()
    })
    await waitFor(() => expect(fake.cadeiasDe('order_list')).toHaveLength(2))
    await act(() => result.current.refetch())
    await waitFor(() => expect(result.current.data?.total).toBe(61))
    await act(async () => {
      pagina.soltar({ data: null, error: { message: 'TypeError: Failed to fetch' } })
      await anexo
    })
    expect(result.current.proximaFalhou).toBe(false)
    expect(result.current.erroDaProxima).toBeNull()
    expect(result.current.data?.linhas).toHaveLength(25)
  })

  it('carregar mais NÃO sai com a janela em releitura', async () => {
    const releitura = segurada()
    fake.responderTabela('order_list', (_c, n) => (n === 1 ? { data: linhas(25), error: null, count: 60 } : releitura.promessa))
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    act(() => {
      void result.current.refetch()
    })
    await waitFor(() => expect(result.current.isFetching).toBe(true))
    await act(() => result.current.carregarMais())
    expect(fake.cadeiasDe('order_list')).toHaveLength(2)
    expect(fake.cadeiasDe('order_list').every((c) => !ehPaginaSeguinte(c))).toBe(true)
    await act(async () => releitura.soltar({ data: linhas(25), error: null, count: 60 }))
  })

  it('carregar mais não sai em dobro: o segundo toque com a página no ar não pede outra', async () => {
    const pagina = segurada()
    fake.responderTabela('order_list', (c) => (ehPaginaSeguinte(c) ? pagina.promessa : { data: linhas(25), error: null, count: 60 }))
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    let primeiro: Promise<void> = Promise.resolve()
    act(() => {
      primeiro = result.current.carregarMais()
    })
    await waitFor(() => expect(result.current.carregandoMais).toBe(true))
    await act(() => result.current.carregarMais())
    expect(fake.cadeiasDe('order_list')).toHaveLength(2)
    await act(async () => {
      pagina.soltar({ data: linhas(25, 25), error: null })
      await primeiro
    })
    expect(result.current.data?.linhas).toHaveLength(50)
  })
})

describe('termo e recorte antigos são descartados (MAP-11, MAP-40)', () => {
  it('a resposta do termo antigo que chega DEPOIS da do novo não é desenhada', async () => {
    const antigo = segurada()
    fake.responderTabela('order_list', (c) => {
      const busca = c.find((e) => e.metodo === 'or' && String(e.args[0]).includes('ilike'))
      return String(busca?.args[0]).includes('%an%') ? antigo.promessa : { data: [linha({ customer_name: 'Ana Beatriz' })], error: null, count: 1 }
    })
    const { result, rerender } = montar({ visao: 'tudo' }, 'an')
    await waitFor(() => expect(fake.cadeiasDe('order_list')).toHaveLength(1))
    rerender({ s: { visao: 'tudo' }, t: 'ana b' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(async () => antigo.soltar({ data: [linha({ customer_name: 'Anderson' })], error: null, count: 1 }))
    expect(result.current.data?.linhas.map((l) => l.customer_name)).toEqual(['Ana Beatriz'])
  })

  it('sem placeholderData: trocar de recorte mostra "carregando", nunca a lista do anterior', async () => {
    const segundo = segurada()
    fake.responderTabela('order_list', (_c, n) => (n === 1 ? { data: linhas(3), error: null, count: 3 } : segundo.promessa))
    const { result, rerender } = montar({ visao: 'tudo' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    rerender({ s: { bloco: 'aguardando' }, t: '' })
    expect(result.current.data).toBeUndefined()
    expect(result.current.isPending).toBe(true)
    await act(async () => segundo.soltar({ data: [], error: null, count: 0 }))
  })

  it('a falha da página seguinte de um recorte NÃO aparece no outro', async () => {
    fake.responderTabela('order_list', (c) => (ehPaginaSeguinte(c) ? { data: null, error: { message: 'x' } } : { data: linhas(25), error: null, count: 60 }))
    const { result, rerender } = montar({ visao: 'tudo' })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    await act(() => result.current.carregarMais())
    expect(result.current.proximaFalhou).toBe(true)
    rerender({ s: { visao: 'concluidos' }, t: '' })
    expect(result.current.proximaFalhou).toBe(false)
  })
})

describe('frescor e recusa (MAP-36, MAP-39)', () => {
  it('voltar ao primeiro plano relê a janela (refetchOnWindowFocus, staleTime 0)', async () => {
    fake.responderTabela('order_list', { data: linhas(3), error: null, count: 3 })
    const { result } = montar()
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    act(() => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
    })
    await waitFor(() => expect(fake.cadeiasDe('order_list')).toHaveLength(2))
    focusManager.setFocused(undefined)
  })

  it('a recusa não repete: UMA confirmação, e o erro tem o 42501', async () => {
    vi.useFakeTimers()
    fake.falharRpc('atelie_clock', RECUSA)
    fake.responderTabela('order_list', { data: linhas(3), error: null, count: 3 })
    const { result } = montar()
    for (let i = 0; i < 10; i++) await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.isError).toBe(true)
    expect((result.current.error as { code: string }).code).toBe('42501')
    expect(result.current.data).toBeUndefined()
    expect(fake.chamadasDe('atelie_clock')).toHaveLength(1)
  })

  it('falha de rede da janela repete UMA vez (o padrão do app)', async () => {
    vi.useFakeTimers()
    fake.responderTabela('order_list', { data: null, error: { message: 'TypeError: Failed to fetch' } })
    const { result } = montar()
    for (let i = 0; i < 10; i++) await act(() => vi.advanceTimersByTimeAsync(1000))
    expect(result.current.isError).toBe(true)
    expect(fake.cadeiasDe('order_list')).toHaveLength(2)
  })
})
