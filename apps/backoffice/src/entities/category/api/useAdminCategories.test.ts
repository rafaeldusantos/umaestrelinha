// RFN-09 / T53 — a contagem de categorias vem do servidor.
//
// O que se prova aqui é O QUE VAI PARA O SUPABASE: que a contagem sai de `category_product_counts`
// (a view sobre `product_categories`) e **não** de `products(count)`, que é o FK legado
// `products.category_id`; que a edição em massa é UM update para N ids; e que a tela sobrevive à
// contagem falhando. Sem isso, "vem do servidor" é afirmação, não fato.

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { CATEGORY_SELECT, useAdminCategories } from './useAdminCategories'

interface Recorded {
  table: string
  select?: string
  filters: { method: string; args: unknown[] }[]
  update?: unknown
  delete?: boolean
}

let calls: Recorded[] = []
let categoriesResponse: { data: unknown[] | null; error: unknown }
let countsResponse: { data: unknown[] | null; error: unknown }

const makeBuilder = (record: Recorded, resolve: () => unknown) => {
  const builder: Record<string, unknown> = {}
  for (const method of ['eq', 'in', 'order'] as const) {
    builder[method] = (...args: unknown[]) => {
      record.filters.push({ method, args })
      return builder
    }
  }
  builder.select = (arg: string) => {
    record.select = arg
    return builder
  }
  builder.maybeSingle = () => Promise.resolve({ data: { id: 'novo' }, error: null })
  builder.then = (onFulfilled: (value: unknown) => unknown) =>
    Promise.resolve(resolve()).then(onFulfilled)
  return builder
}

beforeEach(() => {
  calls = []
  categoriesResponse = {
    data: [
      { id: 'anime', name: 'Anime', slug: 'anime', parent_id: null, active: true, sort_order: 1 },
      { id: 'sailor', name: 'Sailor Moon', slug: 'sailor-moon', parent_id: 'anime', active: true, sort_order: 1 },
      { id: 'kpop', name: 'K-Pop', slug: 'k-pop', parent_id: null, active: false, sort_order: 2 },
    ],
    error: null,
  }
  countsResponse = {
    data: [
      { category_id: 'anime', product_count: 6 },
      { category_id: 'sailor', product_count: 12 },
    ],
    error: null,
  }

  fromMock.mockReset().mockImplementation((table: string) => {
    const record: Recorded = { table, filters: [] }
    calls.push(record)

    const resolve = () => {
      if (table === 'category_product_counts') return countsResponse
      if (record.update !== undefined || record.delete) return { error: null }
      return categoriesResponse
    }

    const builder = makeBuilder(record, resolve) as Record<string, unknown>
    builder.insert = (rows: unknown) => {
      record.update = rows
      return makeBuilder(record, resolve)
    }
    builder.update = (values: unknown) => {
      record.update = values
      return makeBuilder(record, resolve)
    }
    builder.delete = () => {
      record.delete = true
      return makeBuilder(record, resolve)
    }
    return builder
  })
})

const renderCategories = async () => {
  const view = renderHook(() => useAdminCategories())
  await waitFor(() => expect(view.result.current.loading).toBe(false))
  return view
}

const callsTo = (table: string) => calls.filter(c => c.table === table)

describe('useAdminCategories — a contagem vem do servidor (T53 AC 1)', () => {
  it('lê `category_product_counts` e NUNCA `products(count)`', async () => {
    await renderCategories()

    expect(callsTo('category_product_counts')).toHaveLength(1)
    expect(callsTo('category_product_counts')[0].select).toBe('category_id, product_count')

    const categorySelect = callsTo('categories')[0].select ?? ''
    expect(categorySelect).not.toContain('products(count)')
    expect(categorySelect).toBe(CATEGORY_SELECT)
  })

  it('o select nomeia as colunas — inclusive as que a `T52` criou', () => {
    for (const column of ['parent_id', 'banner_url', 'color_accent', 'updated_at']) {
      expect(CATEGORY_SELECT).toContain(column)
    }
    expect(CATEGORY_SELECT).not.toContain('*')
  })

  it('costura a contagem na categoria, e categoria sem linha na view vale zero', async () => {
    const { result } = await renderCategories()

    const byId = Object.fromEntries(result.current.categories.map(c => [c.id, c.product_count]))
    expect(byId).toEqual({ anime: 6, sailor: 12, kpop: 0 })
  })

  it('contagem que falha não derruba a lista — as categorias ficam com zero', async () => {
    countsResponse = { data: null, error: { message: 'boom' } }

    const { result } = await renderCategories()

    expect(result.current.categories).toHaveLength(3)
    expect(result.current.categories.every(c => c.product_count === 0)).toBe(true)
  })
})

describe('useAdminCategories — a árvore (T53)', () => {
  it('monta pai com as filhas e não repete a filha na raiz', async () => {
    const { result } = await renderCategories()

    expect(result.current.tree.map(r => r.id)).toEqual(['anime', 'kpop'])
    expect(result.current.tree[0].children?.map(c => c.id)).toEqual(['sailor'])
  })
})

describe('useAdminCategories — escrita em lote (T53 AC 2)', () => {
  it('`updateCategoriesBatch` faz UM update para N ids', async () => {
    const { result } = await renderCategories()
    calls.length = 0

    await act(async () => {
      await result.current.updateCategoriesBatch(['anime', 'kpop'], { active: false })
    })

    const updates = callsTo('categories').filter(c => c.update !== undefined)
    expect(updates).toHaveLength(1)
    expect(updates[0].update).toEqual({ active: false })
    expect(updates[0].filters).toContainEqual({ method: 'in', args: ['id', ['anime', 'kpop']] })
  })

  it('`deleteCategoriesBatch` faz UM delete para N ids', async () => {
    const { result } = await renderCategories()
    calls.length = 0

    await act(async () => {
      await result.current.deleteCategoriesBatch(['anime', 'kpop'])
    })

    const deletes = callsTo('categories').filter(c => c.delete)
    expect(deletes).toHaveLength(1)
    expect(deletes[0].filters).toContainEqual({ method: 'in', args: ['id', ['anime', 'kpop']] })
  })

  it('`updateSortOrders` grava só as linhas que mudaram de posição', async () => {
    const { result } = await renderCategories()
    calls.length = 0

    await act(async () => {
      await result.current.updateSortOrders([
        { id: 'anime', sort_order: 2 },
        { id: 'kpop', sort_order: 1 },
      ])
    })

    const updates = callsTo('categories').filter(c => c.update !== undefined)
    expect(updates).toHaveLength(2)
    expect(updates.map(u => u.update)).toEqual([{ sort_order: 2 }, { sort_order: 1 }])
    expect(updates[0].filters).toContainEqual({ method: 'eq', args: ['id', 'anime'] })
  })
})
