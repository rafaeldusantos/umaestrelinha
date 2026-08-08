// PLS-01 e PLS-08 — a listagem pergunta ao servidor.
//
// O que se prova aqui é o QUE VAI PARA O SUPABASE: que existe `range`, que o `count` é exato, que o
// `select` da listagem não é `*`, que a busca cobre nome, tag e SKU de variação, e que o lote é um
// insert com um refetch. Sem isso, "está no servidor" é afirmação, não fato.

import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { LIST_SELECT, toListRow, useAdminProductList } from './useAdminProducts'
import {
  activeFilterCount,
  defaultQuery,
  emptyFilters,
  escapeSearchTerm,
  pageRange,
  rangeLabel,
  SORT_COLUMN,
  type ProductQuery,
} from './productQuery'

/** O que o dublê registrou de cada chamada encadeada — é a asserção real da task. */
interface Recorded {
  table: string
  select?: [string, unknown]
  filters: { method: string; args: unknown[] }[]
  order?: unknown[]
  range?: unknown[]
  insert?: unknown
  update?: unknown
}

let calls: Recorded[] = []
/** Resposta da consulta principal de `products`. */
let productsResponse: { data: unknown[]; error: unknown; count: number | null }
let variantsResponse: { data: unknown[] }
let categoryLinksResponse: { data: unknown[] }
let insertResponse: { data: unknown[]; error: unknown }

const CHAINABLE = ['eq', 'neq', 'in', 'or', 'not', 'gte', 'lte', 'contains', 'ilike'] as const

const makeBuilder = (record: Recorded, resolve: () => unknown) => {
  const builder: Record<string, unknown> = {}
  for (const method of CHAINABLE) {
    builder[method] = (...args: unknown[]) => {
      record.filters.push({ method, args })
      return builder
    }
  }
  builder.order = (...args: unknown[]) => {
    record.order = args
    return builder
  }
  builder.range = (...args: unknown[]) => {
    record.range = args
    return Promise.resolve(resolve())
  }
  builder.select = (...args: unknown[]) => {
    record.select = args as [string, unknown]
    return builder
  }
  // Sem `.range()` (consultas auxiliares), o próprio builder é aguardável.
  builder.then = (onFulfilled: (value: unknown) => unknown) => Promise.resolve(resolve()).then(onFulfilled)
  return builder
}

beforeEach(() => {
  calls = []
  productsResponse = { data: [], error: null, count: 0 }
  variantsResponse = { data: [] }
  categoryLinksResponse = { data: [] }
  insertResponse = { data: [], error: null }

  fromMock.mockReset().mockImplementation((table: string) => {
    const record: Recorded = { table, filters: [] }
    calls.push(record)

    const resolve = () => {
      if (table === 'product_variants') return variantsResponse
      if (table === 'product_categories') return categoryLinksResponse
      if (record.insert !== undefined) return insertResponse
      if (record.update !== undefined) return { error: null }
      return productsResponse
    }

    const builder = makeBuilder(record, resolve) as Record<string, unknown>
    builder.insert = (rows: unknown) => {
      record.insert = rows
      return makeBuilder(record, resolve)
    }
    builder.update = (values: unknown) => {
      record.update = values
      return makeBuilder(record, resolve)
    }
    return builder
  })
})

const productsCall = () => calls.filter(c => c.table === 'products')
const lastProductsCall = () => productsCall()[productsCall().length - 1]
const filterArgs = (record: Recorded, method: string) =>
  record.filters.filter(f => f.method === method).map(f => f.args)

const renderList = async (over: Partial<ProductQuery> = {}) => {
  const query: ProductQuery = { ...defaultQuery(), ...over }
  const view = renderHook(() => useAdminProductList(query))
  await waitFor(() => expect(view.result.current.loading).toBe(false))
  return view
}

describe('productQuery — as puras da listagem', () => {
  it('`pageRange` traduz página 1-indexed para o range 0-indexed do PostgREST', () => {
    expect(pageRange(1, 25)).toEqual([0, 24])
    expect(pageRange(2, 25)).toEqual([25, 49])
    expect(pageRange(4, 10)).toEqual([30, 39])
  })

  it('`rangeLabel` mostra `X–Y de N` com o total do servidor', () => {
    expect(rangeLabel(1, 25, 160)).toBe('1–25 de 160')
    expect(rangeLabel(7, 25, 160)).toBe('151–160 de 160')
    expect(rangeLabel(1, 25, 0)).toBe('0 de 0')
  })

  it('`escapeSearchTerm` neutraliza vírgula e parêntese — eles fecham o `or=()` do PostgREST', () => {
    expect(escapeSearchTerm('Naruto, o filme')).toBe('Naruto  o filme')
    expect(escapeSearchTerm('  (Levi)  ')).toBe('Levi')
  })

  it('`activeFilterCount` conta os filtros, não a visão', () => {
    expect(activeFilterCount(emptyFilters())).toBe(0)
    expect(activeFilterCount({ ...emptyFilters(), view: 'ativos' })).toBe(0)
    expect(activeFilterCount({ ...emptyFilters(), categoryIds: ['c1'], priceMin: 5 })).toBe(2)
  })

  it('cada chave de ordenação aponta para a coluna certa do banco', () => {
    expect(SORT_COLUMN).toEqual({
      name: 'name',
      price: 'base_price',
      stock: 'stock_total',
      created: 'created_at',
    })
  })
})

describe('useAdminProductList — a consulta (PLS-01 AC 1-2)', () => {
  it('pede `count` exato e usa `range` — nunca `select("*")` sem paginar', async () => {
    await renderList()

    const call = lastProductsCall()
    expect(call.select?.[0]).toBe(LIST_SELECT)
    expect(call.select?.[1]).toEqual({ count: 'exact' })
    expect(call.range).toEqual([0, 24])
    // A regressão que esta task existe para matar: trazer o catálogo inteiro.
    expect(call.select?.[0]).not.toContain('*')
  })

  it('devolve o `count` do servidor como total, não o tamanho da página', async () => {
    productsResponse = { data: [dbRow()], error: null, count: 160 }

    const { result } = await renderList()

    expect(result.current.rows).toHaveLength(1)
    expect(result.current.total).toBe(160)
  })

  it('a página 3 pede o range correspondente', async () => {
    await renderList({ page: 3, pageSize: 10 })

    expect(lastProductsCall().range).toEqual([20, 29])
  })

  it('ordena pela coluna do banco, na direção pedida', async () => {
    await renderList({ sort: { key: 'price', dir: 'asc' } })

    expect(lastProductsCall().order).toEqual(['base_price', { ascending: true }])
  })

  it('erro de consulta zera a lista e nomeia a falha, sem quebrar a tela', async () => {
    productsResponse = { data: [], error: { message: 'permission denied' }, count: null }

    const { result } = await renderList()

    expect(result.current.rows).toEqual([])
    expect(result.current.total).toBe(0)
    expect(result.current.error).toBe('permission denied')
  })
})

describe('useAdminProductList — visões (PLS-02 AC 3)', () => {
  it('`ativos` e `rascunhos` filtram por `is_active`', async () => {
    await renderList({ filters: { ...emptyFilters(), view: 'ativos' } })
    expect(filterArgs(lastProductsCall(), 'eq')).toContainEqual(['is_active', true])

    calls = []
    await renderList({ filters: { ...emptyFilters(), view: 'rascunhos' } })
    expect(filterArgs(lastProductsCall(), 'eq')).toContainEqual(['is_active', false])
  })

  it('`sem-imagem` filtra o jsonb vazio, não NULL', async () => {
    await renderList({ filters: { ...emptyFilters(), view: 'sem-imagem' } })

    expect(filterArgs(lastProductsCall(), 'eq')).toContainEqual(['images', '[]'])
  })

  it('`sem-estoque` só vale para quem controla estoque', async () => {
    await renderList({ filters: { ...emptyFilters(), view: 'sem-estoque' } })

    const eqs = filterArgs(lastProductsCall(), 'eq')
    expect(eqs).toContainEqual(['stock_policy', 'track'])
    expect(eqs).toContainEqual(['stock_total', 0])
  })

  it('`sem-seo` cobre nulo E string vazia nos dois campos', async () => {
    await renderList({ filters: { ...emptyFilters(), view: 'sem-seo' } })

    expect(filterArgs(lastProductsCall(), 'or')).toContainEqual([
      'seo_title.is.null,seo_title.eq.,seo_description.is.null,seo_description.eq.',
    ])
  })

  it('`agendados` pede data de agendamento preenchida', async () => {
    await renderList({ filters: { ...emptyFilters(), view: 'agendados' } })

    expect(filterArgs(lastProductsCall(), 'not')).toContainEqual(['scheduled_at', 'is', null])
  })
})

describe('useAdminProductList — busca e filtros (PLS-02 AC 5-6)', () => {
  it('a busca cobre nome, tag e SKU de variação numa condição só', async () => {
    variantsResponse = { data: [{ product_id: 'p-sku-1' }, { product_id: 'p-sku-1' }] }

    await renderList({ search: 'sailor' })

    const [condition] = filterArgs(lastProductsCall(), 'or')[0] as [string]
    expect(condition).toContain('name.ilike.%sailor%')
    expect(condition).toContain('tags.cs.{"sailor"}')
    // Ids deduplicados: duas variações do mesmo produto não repetem o produto no `in`.
    expect(condition).toContain('id.in.(p-sku-1)')
  })

  it('sem SKU casando, a busca ainda cobre nome e tag', async () => {
    variantsResponse = { data: [] }

    await renderList({ search: 'sailor' })

    const [condition] = filterArgs(lastProductsCall(), 'or')[0] as [string]
    expect(condition).toBe('name.ilike.%sailor%,tags.cs.{"sailor"}')
  })

  it('sem busca, não há consulta extra de SKU — uma requisição de página', async () => {
    await renderList()

    expect(calls.filter(c => c.table === 'product_variants')).toHaveLength(0)
    expect(productsCall()).toHaveLength(1)
  })

  it('filtro de categoria resolve o N:N no servidor e restringe por id', async () => {
    categoryLinksResponse = { data: [{ product_id: 'p1' }, { product_id: 'p2' }] }

    await renderList({ filters: { ...emptyFilters(), categoryIds: ['cat-anime'] } })

    expect(filterArgs(lastProductsCall(), 'in')).toContainEqual(['id', ['p1', 'p2']])
  })

  it('categoria sem nenhum produto devolve lista vazia sem consultar o catálogo', async () => {
    categoryLinksResponse = { data: [] }

    const { result } = await renderList({ filters: { ...emptyFilters(), categoryIds: ['cat-vazia'] } })

    expect(result.current.rows).toEqual([])
    expect(result.current.total).toBe(0)
    expect(productsCall()).toHaveLength(0)
  })

  it('faixa de preço e tags viram filtro de coluna', async () => {
    await renderList({
      filters: { ...emptyFilters(), tags: ['anime'], priceMin: 5, priceMax: 20 },
    })

    const call = lastProductsCall()
    expect(filterArgs(call, 'contains')).toContainEqual(['tags', ['anime']])
    expect(filterArgs(call, 'gte')).toContainEqual(['base_price', 5])
    expect(filterArgs(call, 'lte')).toContainEqual(['base_price', 20])
  })
})

describe('useAdminProductList — lote (PLS-08)', () => {
  it('`createProductsBatch` de 20 linhas faz UM insert e UM refetch', async () => {
    const { result } = await renderList()
    const antes = productsCall().length
    const rows = Array.from({ length: 20 }, (_, i) => ({ name: `Produto ${i}` }))
    insertResponse = { data: rows.map((_, i) => ({ id: `p${i}` })), error: null }

    await act(async () => {
      await result.current.createProductsBatch(rows)
    })

    const inserts = calls.filter(c => c.insert !== undefined)
    expect(inserts).toHaveLength(1)
    expect(inserts[0].insert).toHaveLength(20)
    // Uma consulta de insert + exatamente uma de releitura.
    expect(productsCall().length).toBe(antes + 2)
  })

  it('`createProductsBatch` devolve os ids criados e não relê quando o insert falha', async () => {
    const { result } = await renderList()
    const antes = productsCall().length
    insertResponse = { data: [], error: { message: 'duplicate key' } }

    let outcome: { error: unknown; ids: string[] } | undefined
    await act(async () => {
      outcome = await result.current.createProductsBatch([{ name: 'x' }])
    })

    expect(outcome?.error).toEqual({ message: 'duplicate key' })
    expect(outcome?.ids).toEqual([])
    expect(productsCall().length).toBe(antes + 1)
  })

  it('`updateProductsBatch` faz um update por linha e UM refetch só', async () => {
    const { result } = await renderList()
    const antes = productsCall().length

    let outcome: { changed: number; failed: string[] } | undefined
    await act(async () => {
      outcome = await result.current.updateProductsBatch([
        { id: 'p1', values: { base_price: 9.9 } },
        { id: 'p2', values: { base_price: 12.9 } },
        { id: 'p3', values: { stock_total: 0 } },
      ])
    })

    expect(calls.filter(c => c.update !== undefined)).toHaveLength(3)
    expect(outcome).toEqual({ changed: 3, failed: [] })
    expect(productsCall().length).toBe(antes + 3 + 1)
  })
})

describe('toListRow — a linha que a tela recebe', () => {
  it('normaliza imagens, eixos, grade e categorias do formato do banco', () => {
    const row = toListRow(dbRow())

    expect(row.price).toBe(5.9)
    expect(row.images).toEqual([{ url: 'sailor.webp', alt: 'Lua', source: 'upload' }])
    expect(row.variants).toHaveLength(1)
    expect(row.variants[0].sku).toBe('SLR-45-FOS')
    expect(row.category_ids).toEqual(['cat-anime'])
    expect(row.options[0].name).toBe('Tamanho')
  })

  it('linha sem grade, sem categoria e com images legado não quebra', () => {
    const row = toListRow({ id: 'p2', name: 'Simples', images: ['antiga.webp'] })

    expect(row.variants).toEqual([])
    expect(row.category_ids).toEqual([])
    expect(row.images).toEqual([{ url: 'antiga.webp', alt: null, source: 'upload' }])
    expect(row.stock_policy).toBe('track')
  })
})

function dbRow(over: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    name: 'Botton Sailor Moon',
    slug: 'botton-sailor-moon',
    base_price: 5.9,
    original_price: null,
    images: [{ url: 'sailor.webp', alt: 'Lua', source: 'upload' }],
    tags: ['anime'],
    is_active: true,
    stock_total: 12,
    low_stock_threshold: 5,
    stock_policy: 'track',
    options: [{ name: 'Tamanho', values: ['4,5 cm'], position: 0 }],
    seo_title: null,
    seo_description: null,
    scheduled_at: null,
    created_at: '2026-07-01T00:00:00Z',
    updated_at: '2026-07-02T00:00:00Z',
    product_variants: [
      {
        id: 'v1',
        product_id: 'p1',
        sku: 'SLR-45-FOS',
        price: 7.9,
        stock: 4,
        is_active: true,
        position: 0,
        option_values: { Tamanho: '4,5 cm' },
      },
    ],
    product_categories: [{ category_id: 'cat-anime', position: 0 }],
    ...over,
  }
}
