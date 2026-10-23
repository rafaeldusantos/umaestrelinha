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
import { queueBlock, toPostgrestFilter } from '@estrelinha/core/orders'

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

import { defaultOrderQuery } from './orderQuery'
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
