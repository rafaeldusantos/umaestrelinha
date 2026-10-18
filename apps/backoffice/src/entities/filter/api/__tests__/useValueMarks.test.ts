// Feature 66 — as marcações de um valor (`FLT-16`, `FLT-17`, `FLT-19`, T09).
//
// "Uma requisição só" se prova CONTANDO as chamadas ao client, e "o filtro certo" se prova pelo que o
// dublê registrou — ele enxerga `eq`, `in`, `order`, `range` e as opções do `upsert`.

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { useValueMarks } from '../useValueMarks'

interface Gravado {
  table: string
  select?: unknown[]
  filters: { method: string; args: unknown[] }[]
  upsert?: { rows: unknown; options: unknown }
  delete?: boolean
}

let calls: Gravado[] = []
let marcadas: string[]
let erroDeEscrita: { message: string } | null
/** Segura a leitura PAGINADA (a contagem responde na hora), para duas leituras poderem responder fora de ordem. */
let segurarPaginas = false
let pendentes: ((ids: string[]) => void)[] = []

beforeEach(() => {
  calls = []
  marcadas = ['p1', 'p2']
  erroDeEscrita = null
  segurarPaginas = false
  pendentes = []
  fromMock.mockReset().mockImplementation((table: string) => {
    const rec: Gravado = { table, filters: [] }
    calls.push(rec)
    const resolve = () => {
      if (rec.upsert || rec.delete) return { error: erroDeEscrita }
      const head = (rec.select?.[1] as { head?: boolean } | undefined)?.head
      if (head) return { count: marcadas.length, error: null }
      if (segurarPaginas)
        return new Promise(res => pendentes.push(ids => res({ data: ids.map(product_id => ({ product_id })), error: null })))
      return { data: marcadas.map(product_id => ({ product_id })), error: null }
    }
    const b: Record<string, unknown> = {}
    for (const m of ['eq', 'in', 'order', 'range'] as const) {
      b[m] = (...args: unknown[]) => {
        rec.filters.push({ method: m, args })
        return b
      }
    }
    b.select = (...args: unknown[]) => {
      rec.select = args
      return b
    }
    b.upsert = (rows: unknown, options: unknown) => {
      rec.upsert = { rows, options }
      return b
    }
    b.delete = () => {
      rec.delete = true
      return b
    }
    b.then = (ok: (v: unknown) => unknown, ko?: (e: unknown) => unknown) => Promise.resolve(resolve()).then(ok, ko)
    return b
  })
})

const montar = async () => {
  const view = renderHook(() => useValueMarks('v1'))
  await waitFor(() => expect(view.result.current.loading).toBe(false))
  return view
}

const escritas = () => calls.filter(c => c.upsert || c.delete)

describe('useValueMarks — a leitura', () => {
  it('conta e pagina as marcações DO VALOR (filtro por value_id nas duas)', async () => {
    const { result } = await montar()
    expect([...result.current.marked]).toEqual(['p1', 'p2'])
    expect(calls).toHaveLength(2)
    for (const c of calls) {
      expect(c.table).toBe('product_filter_values')
      expect(c.filters).toContainEqual({ method: 'eq', args: ['value_id', 'v1'] })
    }
    expect(calls[0].select).toEqual(['product_id', { count: 'exact', head: true }])
    expect(calls[1].filters).toContainEqual({ method: 'range', args: [0, 999] })
  })
})

describe('useValueMarks — o token de sequência', () => {
  // Verificação independente, rodada 2 (P05): apagar o token depois da leitura sobrevivia. Duas
  // leituras no ar e a mais velha respondendo por último não pode reescrever o conjunto marcado.
  it('duas leituras fora de ordem: vale a mais nova, e a velha chegando depois é descartada', async () => {
    const { result } = await montar()
    segurarPaginas = true
    let velha!: Promise<unknown>
    let nova!: Promise<unknown>
    await act(async () => {
      velha = result.current.fetchMarks('revalidar')
      nova = result.current.fetchMarks('revalidar')
      await waitFor(() => expect(pendentes).toHaveLength(2))
    })
    await act(async () => {
      pendentes[1](['p3', 'p4'])
      await nova
    })
    expect([...result.current.marked]).toEqual(['p3', 'p4'])
    await act(async () => {
      pendentes[0](['p1', 'p2'])
      await velha
    })
    expect([...result.current.marked]).toEqual(['p3', 'p4'])
    expect(result.current.error).toBeNull()
  })
})

describe('useValueMarks — marcar e remover em UMA requisição', () => {
  it('marcar N é UM upsert com N linhas e `ignoreDuplicates` (FLT-16)', async () => {
    const { result } = await montar()
    calls.length = 0
    let erro: string | null = 'x'
    await act(async () => {
      erro = await result.current.mark(['p2', 'p3', 'p4'])
    })
    expect(erro).toBeNull()
    expect(escritas()).toHaveLength(1)
    expect(escritas()[0].upsert).toEqual({
      rows: [
        { product_id: 'p2', value_id: 'v1' },
        { product_id: 'p3', value_id: 'v1' },
        { product_id: 'p4', value_id: 'v1' },
      ],
      options: { onConflict: 'product_id,value_id', ignoreDuplicates: true },
    })
  })

  it('remover de N é UM delete filtrado pelo valor E pelos N produtos (FLT-17)', async () => {
    const { result } = await montar()
    calls.length = 0
    await act(async () => {
      await result.current.unmark(['p1', 'p2'])
    })
    expect(escritas()).toHaveLength(1)
    expect(escritas()[0].filters).toEqual([
      { method: 'eq', args: ['value_id', 'v1'] },
      { method: 'in', args: ['product_id', ['p1', 'p2']] },
    ])
  })

  it('depois de gravar relê, e a contagem acompanha (FLT-20)', async () => {
    const { result } = await montar()
    marcadas = ['p1', 'p2', 'p3']
    await act(async () => {
      await result.current.mark(['p3'])
    })
    expect(result.current.marked.size).toBe(3)
  })

  it('falha: devolve a frase, NÃO relê, e nenhuma peça aparece marcada (FLT-19)', async () => {
    const { result } = await montar()
    calls.length = 0
    erroDeEscrita = { message: 'sem rede' }
    marcadas = ['p1', 'p2', 'p3']
    let erro: string | null = null
    await act(async () => {
      erro = await result.current.mark(['p3'])
    })
    expect(erro).toBe('sem rede')
    expect(calls.filter(c => !c.upsert && !c.delete)).toHaveLength(0)
    expect([...result.current.marked]).toEqual(['p1', 'p2'])
  })

  it('lista vazia não vai à rede', async () => {
    const { result } = await montar()
    calls.length = 0
    await act(async () => {
      await result.current.mark([])
      await result.current.unmark([])
    })
    expect(calls).toHaveLength(0)
  })
})
