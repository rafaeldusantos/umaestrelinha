// Feature `73`, conserto r2 da verificação (P04) — a idade do mais antigo da fila do painel usa
// EXATAMENTE a regra do bloco `aguardando` de `@estrelinha/core/orders`, e nada além dela.
//
// `queue.test.ts` (core) prova pelo TEXTO que a consulta monta o filtro pela regra (presença). Um
// predicado a mais encadeado ao lado — `.neq('status', …)` — passava pela régua de texto e fazia a
// idade do painel deixar de ser a `aguardando_desde` da Início (o "defeito 01" de volta). Aqui a
// régua é de COMPORTAMENTO: o dublê registra a cadeia inteira de cada consulta, e a da idade tem de
// ser IGUAL à esperada — qualquer chamada a mais, a menos ou em outra ordem reprova.
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { needsActionOrFilter, queueBlock, toPostgrestFilter } from '@estrelinha/core/orders'

type Chamada = [metodo: string, args: unknown[]]
const consultas: { tabela: string; cadeia: Chamada[] }[] = []
const MAIS_ANTIGO = '2026-10-13T12:00:00.000Z'

vi.mock('@estrelinha/supabase/client', () => {
  /**
   * Um builder que registra TODA chamada de método, conhecida ou não (é um `Proxy`): um `.neq`
   * inventado entra na cadeia em vez de lançar, e a igualdade abaixo o vê. O `await` resolve vazio,
   * menos a consulta de `created_at`, que devolve a linha do mais antigo.
   */
  const builder = (tabela: string) => {
    const registro = { tabela, cadeia: [] as Chamada[] }
    consultas.push(registro)
    const proxy: object = new Proxy(
      {},
      {
        get(_alvo, prop) {
          if (prop === 'then') {
            const ehIdade = registro.cadeia[0]?.[0] === 'select' && registro.cadeia[0][1][0] === 'created_at'
            const resposta = { data: ehIdade ? [{ created_at: MAIS_ANTIGO }] : [], error: null, count: 0 }
            return (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) => Promise.resolve(resposta).then(resolve, reject)
          }
          return (...args: unknown[]) => {
            registro.cadeia.push([String(prop), args])
            return proxy
          }
        },
      },
    )
    return proxy
  }
  return { supabase: { from: (tabela: string) => builder(tabela) } }
})

import { ORDER_LIST_SELECT, defaultOrderQuery } from './orderQuery'
import { useAdminOrderList } from './useAdminOrderList'

beforeEach(() => {
  consultas.length = 0
})

describe('a idade do mais antigo da fila (P04 da r2 da `73`)', () => {
  it('a cadeia da consulta é EXATAMENTE a regra do bloco `aguardando`, ordenada e com uma linha', async () => {
    const query = defaultOrderQuery()
    const { result } = renderHook(() => useAdminOrderList(query))
    await waitFor(() => expect(result.current.oldestWaitingAt).toBe(MAIS_ANTIGO))

    const daIdade = consultas.filter((c) => c.cadeia[0]?.[0] === 'select' && c.cadeia[0][1][0] === 'created_at')
    // Âncora: a consulta existe, é de `orders`, e é uma só por leitura.
    expect(daIdade.length).toBeGreaterThanOrEqual(1)
    for (const c of daIdade) {
      expect(c.tabela).toBe('orders')
      expect(c.cadeia).toEqual([
        ['select', ['created_at']],
        ['or', [toPostgrestFilter(queueBlock('aguardando').rule)]],
        ['order', ['created_at', { ascending: true }]],
        ['limit', [1]],
      ])
    }
  })

  it('sensor: o dublê ENXERGA um predicado a mais (a cadeia mutada não é igual à esperada)', () => {
    const esperada: Chamada[] = [
      ['select', ['created_at']],
      ['or', [toPostgrestFilter(queueBlock('aguardando').rule)]],
      ['order', ['created_at', { ascending: true }]],
      ['limit', [1]],
    ]
    const mutada: Chamada[] = [esperada[0], esperada[1], ['neq', ['status', 'cancelled']], esperada[2], esperada[3]]
    expect(mutada).not.toEqual(esperada)
  })
})

// Feature `74` (`MAP-47`, T08): o `applyView` do painel passou a DELEGAR a `applyOrderSlice`
// (`@estrelinha/core/orders`). A cadeia que cada visão manda ao PostgREST tem de ser a de antes — o
// `or` do predicado e depois cada `in` —, escrita aqui POR EXTENSO (derivá-la de `applyOrderSlice`
// provaria que a função é igual a si mesma). Os casos acima, da `73`, só mediam a consulta da idade.
describe('a visão chega ao PostgREST pela mesma cadeia de antes (feature `74`)', () => {
  const contagemDa = (cadeia: Chamada[]): boolean =>
    cadeia[0]?.[0] === 'select' && cadeia[0][1][0] === 'id' && (cadeia[0][1][1] as { head?: boolean })?.head === true

  it('a lista em "Precisa de ação": o `or` da união, a ordem e a página — e nada a mais', async () => {
    const query = defaultOrderQuery()
    const { result } = renderHook(() => useAdminOrderList(query))
    await waitFor(() => expect(result.current.loading).toBe(false))

    const lista = consultas.filter((c) => c.tabela === 'order_list')
    expect(lista.length).toBeGreaterThanOrEqual(1)
    expect(lista[0].cadeia).toEqual([
      ['select', [ORDER_LIST_SELECT, { count: 'exact' }]],
      ['or', [needsActionOrFilter()]],
      ['order', ['created_at', { ascending: false }]],
      ['range', [0, 24]],
    ])
  })

  it('a contagem de cada aba manda o predicado da visão, na ordem de antes', async () => {
    const query = defaultOrderQuery()
    const { result } = renderHook(() => useAdminOrderList(query))
    await waitFor(() => expect(result.current.loading).toBe(false))
    // Seis contagens de aba e, depois delas, as quatro dos blocos do topo (`fetchTiles`): as seis
    // primeiras são as abas, na ordem de `ORDER_VIEWS` (o `map` as cria antes do primeiro `await`).
    await waitFor(() => expect(consultas.filter((c) => contagemDa(c.cadeia))).toHaveLength(10))

    const filtrosDasAbas = consultas
      .filter((c) => c.tabela === 'orders' && contagemDa(c.cadeia))
      .slice(0, 6)
      .map((c) => c.cadeia.slice(1))
    expect(filtrosDasAbas).toEqual([
      [['or', [needsActionOrFilter()]]],
      [],
      [['in', ['material_status', ['aguardando_material', 'material_enviado', 'material_recebido', 'em_producao']]]],
      [['in', ['status', ['paid', 'separating']]]],
      [['in', ['status', ['shipped']]]],
      [['in', ['status', ['delivered', 'cancelled']]]],
    ])
  })
})
