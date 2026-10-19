// Feature 67 (T05) — as marcações por opção: gravar N, remover o valor de N, e ler as de um valor.

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { criarDuble, ehContagem, ehEscrita, type Registro } from '@/test/dubleSupabase'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import {
  OPTION_MARK_CONFLICT,
  apagarMarcacoesPorOpcaoDoValor,
  gravarMarcacoesPorOpcao,
  useOptionMarks,
} from '../useOptionMarks'

let calls: Registro[] = []
let linhas: unknown[] = []
let erroDeEscrita: { message: string } | null = null

beforeEach(() => {
  erroDeEscrita = null
  linhas = [
    { product_id: 'p1', option_name: 'Cor', option_value: 'Prata 925', value_id: 'prata' },
    { product_id: 'p1', option_name: 'Elo', option_value: 'Prata 925', value_id: 'prata' },
    { product_id: 'p2', option_name: 'Cor', option_value: 'Prata', value_id: 'prata' },
  ]
  const d = criarDuble(r => {
    if (ehEscrita(r)) return { error: erroDeEscrita }
    return ehContagem(r) ? { count: linhas.length } : { data: linhas }
  })
  calls = d.calls
  fromMock.mockReset().mockImplementation(d.from)
})

describe('gravarMarcacoesPorOpcao', () => {
  it('UMA chamada, a quádrupla como onConflict, ignoreDuplicates', async () => {
    const rows = [{ product_id: 'p1', option_name: 'Cor', option_value: 'Prata 925', value_id: 'prata' }]
    expect(await gravarMarcacoesPorOpcao(rows)).toBeNull()
    expect(calls).toHaveLength(1)
    expect(calls[0].table).toBe('product_option_filter_values')
    expect(calls[0].upsert).toEqual({
      rows,
      options: { onConflict: 'product_id,option_name,option_value,value_id', ignoreDuplicates: true },
    })
    expect(OPTION_MARK_CONFLICT).toBe('product_id,option_name,option_value,value_id')
  })

  it('a falha devolve a frase', async () => {
    erroDeEscrita = { message: 'boom' }
    expect(
      await gravarMarcacoesPorOpcao([{ product_id: 'p', option_name: 'a', option_value: 'b', value_id: 'v' }]),
    ).toBe('boom')
  })
})

describe('apagarMarcacoesPorOpcaoDoValor', () => {
  it('UM delete, recortado pelo valor E pelas peças', async () => {
    expect(await apagarMarcacoesPorOpcaoDoValor('prata', ['p1', 'p2'])).toBeNull()
    expect(calls).toHaveLength(1)
    expect(calls[0]).toMatchObject({ table: 'product_option_filter_values', delete: true })
    expect(calls[0].filters).toEqual([
      { method: 'eq', args: ['value_id', 'prata'] },
      { method: 'in', args: ['product_id', ['p1', 'p2']] },
    ])
  })

  it('nenhuma peça: nada vai ao banco (um delete só por valor apagaria todas)', async () => {
    expect(await apagarMarcacoesPorOpcaoDoValor('prata', [])).toBeNull()
    expect(calls).toEqual([])
  })
})

describe('useOptionMarks', () => {
  it('lê as do valor e agrupa por peça', async () => {
    const { result } = renderHook(() => useOptionMarks('prata'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    for (const c of calls) expect(c.filters).toContainEqual({ method: 'eq', args: ['value_id', 'prata'] })
    expect(result.current.porPeca.get('p1')?.map(m => m.option_name)).toEqual(['Cor', 'Elo'])
    expect(result.current.porPeca.get('p2')).toHaveLength(1)
  })

  it('unmark apaga e RELÊ; a falha não relê', async () => {
    const { result } = renderHook(() => useOptionMarks('prata'))
    await waitFor(() => expect(result.current.loading).toBe(false))
    const antes = calls.length
    linhas = []
    await act(async () => {
      expect(await result.current.unmark(['p1'])).toBeNull()
    })
    expect(calls.slice(antes).map(c => (c.delete ? 'delete' : 'leitura'))).toEqual(['delete', 'leitura'])
    expect(result.current.porPeca.size).toBe(0)

    erroDeEscrita = { message: 'sem rede' }
    const depois = calls.length
    await act(async () => {
      expect(await result.current.unmark(['p2'])).toBe('sem rede')
    })
    expect(calls.length).toBe(depois + 1)
  })
})
