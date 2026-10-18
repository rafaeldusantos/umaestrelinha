// Feature 66 — "escondido nesta categoria" é PRESENÇA de linha (`FLT-35`..`FLT-37`, T11).

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { useCategoryHiddenGroups } from '../useCategoryHiddenGroups'

interface Gravado {
  table: string
  filters: unknown[][]
  upsert?: { rows: unknown; options: unknown }
  delete?: boolean
}
let calls: Gravado[] = []
let linhas: { group_id: string }[]
/** Segura cada leitura, guardando de QUAL categoria ela é, para responder fora de ordem. */
let segurar = false
let pendentes: { categoria: unknown; responder: (l: { group_id: string }[]) => void }[] = []

beforeEach(() => {
  calls = []
  linhas = [{ group_id: 'g1' }]
  segurar = false
  pendentes = []
  fromMock.mockReset().mockImplementation((table: string) => {
    const rec: Gravado = { table, filters: [] }
    calls.push(rec)
    const b: Record<string, unknown> = {}
    b.eq = (...a: unknown[]) => (rec.filters.push(['eq', ...a]), b)
    b.select = () => b
    b.upsert = (rows: unknown, options: unknown) => ((rec.upsert = { rows, options }), b)
    b.delete = () => ((rec.delete = true), b)
    b.then = (ok: (v: unknown) => unknown) => {
      if (rec.upsert || rec.delete) return Promise.resolve({ error: null }).then(ok)
      if (!segurar) return Promise.resolve({ data: linhas, error: null }).then(ok)
      return new Promise(res =>
        pendentes.push({ categoria: rec.filters[0]?.[2], responder: l => res({ data: l, error: null }) }),
      ).then(ok)
    }
    return b
  })
})

const montar = async () => {
  const v = renderHook(() => useCategoryHiddenGroups('cat1'))
  await waitFor(() => expect(v.result.current.loading).toBe(false))
  return v
}

describe('useCategoryHiddenGroups', () => {
  it('lê as linhas DA categoria', async () => {
    const { result } = await montar()
    expect(calls[0].table).toBe('category_hidden_filter_groups')
    expect(calls[0].filters).toEqual([['eq', 'category_id', 'cat1']])
    expect([...result.current.hidden]).toEqual(['g1'])
  })

  it('grupo sem linha é visível — o grupo novo nasce ligado (FLT-37)', async () => {
    const { result } = await montar()
    expect(result.current.hidden.has('g-novo')).toBe(false)
  })

  it('desligar grava a linha (upsert idempotente)', async () => {
    const { result } = await montar()
    calls.length = 0
    await act(async () => {
      await result.current.setGroupVisible('g2', false)
    })
    expect(calls[0].upsert).toEqual({
      rows: { category_id: 'cat1', group_id: 'g2' },
      options: { onConflict: 'category_id,group_id', ignoreDuplicates: true },
    })
  })

  it('religar APAGA a linha, filtrada pela categoria E pelo grupo', async () => {
    const { result } = await montar()
    calls.length = 0
    await act(async () => {
      await result.current.setGroupVisible('g1', true)
    })
    expect(calls[0].delete).toBe(true)
    expect(calls[0].filters).toEqual([
      ['eq', 'category_id', 'cat1'],
      ['eq', 'group_id', 'g1'],
    ])
  })

  // Verificação independente, rodada 2 (P06): `CategoryFilterGroups` é montado sem `key` em
  // `AdminCategoriesPage`, então trocar de categoria REAPROVEITA a instância. Se a resposta da
  // categoria anterior chega depois da nova, os interruptores da nova mostrariam o "escondido" da
  // velha (FLT-35/36) — sem o token, apagá-lo sobrevivia.
  it('trocar de categoria: a resposta da ANTERIOR chegando por último é descartada', async () => {
    segurar = true
    const v = renderHook(({ id }) => useCategoryHiddenGroups(id), { initialProps: { id: 'catA' } })
    await waitFor(() => expect(pendentes).toHaveLength(1))
    v.rerender({ id: 'catB' })
    await waitFor(() => expect(pendentes).toHaveLength(2))
    expect(pendentes.map(p => p.categoria)).toEqual(['catA', 'catB'])
    await act(async () => {
      pendentes[1].responder([{ group_id: 'gB' }])
    })
    await waitFor(() => expect(v.result.current.loading).toBe(false))
    expect([...v.result.current.hidden]).toEqual(['gB'])
    await act(async () => {
      pendentes[0].responder([{ group_id: 'gA' }])
    })
    expect([...v.result.current.hidden]).toEqual(['gB'])
  })
})
