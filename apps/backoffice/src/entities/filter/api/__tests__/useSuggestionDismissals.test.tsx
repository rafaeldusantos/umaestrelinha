// Feature 67 (T05) — as recusas: ler (todas ou de uma peça) e gravar N numa chamada só.

import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarDuble, ehContagem, ehEscrita, type Registro } from '@/test/dubleSupabase'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import {
  DISMISSAL_CONFLICT,
  SUGGESTION_DISMISSALS_KEY,
  gravarRecusas,
  invalidarRecusas,
  lerRecusas,
  useSuggestionDismissals,
} from '../useSuggestionDismissals'

let calls: Registro[] = []
let linhas: unknown[] = []
let total = 0
let erroDeEscrita: { message: string } | null = null

beforeEach(() => {
  linhas = [{ product_id: 'p1', value_id: 'prata', option_name: '', option_value: '' }]
  total = 1
  erroDeEscrita = null
  const d = criarDuble(r => {
    if (ehEscrita(r)) return { error: erroDeEscrita }
    return ehContagem(r) ? { count: total } : { data: linhas }
  })
  calls = d.calls
  fromMock.mockReset().mockImplementation(d.from)
})

describe('lerRecusas', () => {
  it('todas: sem filtro de peça, contando e paginando em ordem estável', async () => {
    expect(await lerRecusas()).toEqual([{ product_id: 'p1', value_id: 'prata', option_name: '', option_value: '' }])
    expect(calls.map(c => c.table)).toEqual(['filter_suggestion_dismissals', 'filter_suggestion_dismissals'])
    expect(calls.every(c => !c.filters.some(f => f.method === 'eq'))).toBe(true)
    expect(calls[1].select).toEqual(['product_id, value_id, option_name, option_value'])
    expect(calls[1].filters.at(-1)).toEqual({ method: 'range', args: [0, 999] })
  })

  it('de uma peça: as duas consultas filtram por product_id', async () => {
    await lerRecusas('p1')
    for (const c of calls) expect(c.filters).toContainEqual({ method: 'eq', args: ['product_id', 'p1'] })
  })

  it('a leitura truncada falha — senão a recusa que não chegou devolve a sugestão à fila', async () => {
    total = 2
    await expect(lerRecusas()).rejects.toThrow('leitura incompleta de sugestões recusadas: 1 de 2')
  })

  it('o alvo ausente vira o par vazio (peça toda)', async () => {
    linhas = [{ product_id: 'p1', value_id: 'v', option_name: null, option_value: undefined }]
    expect(await lerRecusas()).toEqual([{ product_id: 'p1', value_id: 'v', option_name: '', option_value: '' }])
  })
})

describe('gravarRecusas', () => {
  it('UMA chamada, a chave inteira como onConflict, e repetição é no-op (ignoreDuplicates)', async () => {
    expect(
      await gravarRecusas([
        { product_id: 'p1', value_id: 'prata', option_name: 'Cor', option_value: 'Prata 925' },
        { product_id: 'p2', value_id: 'prata', option_name: '', option_value: '' },
      ]),
    ).toBeNull()
    expect(calls).toHaveLength(1)
    expect(calls[0].table).toBe('filter_suggestion_dismissals')
    expect(calls[0].upsert).toEqual({
      rows: [
        { product_id: 'p1', value_id: 'prata', option_name: 'Cor', option_value: 'Prata 925' },
        { product_id: 'p2', value_id: 'prata', option_name: '', option_value: '' },
      ],
      options: { onConflict: 'product_id,value_id,option_name,option_value', ignoreDuplicates: true },
    })
    expect(DISMISSAL_CONFLICT).toBe('product_id,value_id,option_name,option_value')
  })

  it('a falha devolve a frase do banco', async () => {
    erroDeEscrita = { message: 'permission denied' }
    expect(await gravarRecusas([{ product_id: 'p1', value_id: 'v', option_name: '', option_value: '' }])).toBe(
      'permission denied',
    )
  })

  it('lista vazia não vai ao banco', async () => {
    expect(await gravarRecusas([])).toBeNull()
    expect(calls).toEqual([])
  })
})

describe('useSuggestionDismissals — a chave', () => {
  const embrulho = (qc: QueryClient) => ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  )

  it('todas e de uma peça são duas chaves sob o MESMO prefixo, e invalidar o prefixo alcança as duas', async () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const todas = renderHook(() => useSuggestionDismissals(), { wrapper: embrulho(qc) })
    const daPeca = renderHook(() => useSuggestionDismissals('p1'), { wrapper: embrulho(qc) })
    await waitFor(() => expect(todas.result.current.carregando).toBe(false))
    await waitFor(() => expect(daPeca.result.current.carregando).toBe(false))
    expect(qc.getQueryState([...SUGGESTION_DISMISSALS_KEY, 'todas'])?.status).toBe('success')
    expect(qc.getQueryState([...SUGGESTION_DISMISSALS_KEY, 'p1'])?.status).toBe('success')

    await invalidarRecusas(qc)
    // A releitura volta a pedir: as duas consultas foram invalidadas, nenhuma outra chave.
    await waitFor(() => expect(calls.filter(c => !ehContagem(c)).length).toBe(4))
  })

  it('peça nova (null) não lê nada', () => {
    const qc = new QueryClient()
    const { result } = renderHook(() => useSuggestionDismissals(null), { wrapper: embrulho(qc) })
    expect(result.current.carregando).toBe(false)
    expect(result.current.recusas).toEqual([])
    expect(calls).toEqual([])
  })
})
