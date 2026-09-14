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

type Leitura = { data: unknown[] | null; error: unknown }

let calls: Recorded[] = []
let categoriesResponse: Leitura
let countsResponse: Leitura

/**
 * **Leituras de `categories` controlaveis** — e sem elas nada de `VIV-*` e verificavel.
 *
 * As ACs desta fase vivem na JANELA em que a releitura esta no ar: e la que o esqueleto voltaria
 * (`VIV-02`), la que a lista seria esvaziada por uma falha (`VIV-07`) e la que duas respostas podem
 * chegar fora de ordem (`VIV-08`). Com o duble respondendo na hora, essa janela dura zero e toda
 * assercao sobre ela e verdadeira nos dois mundos.
 */
let segurarLeituras = false
let pendentes: ((r: Leitura) => void)[] = []

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
  segurarLeituras = false
  pendentes = []
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
      if (!segurarLeituras) return categoriesResponse
      return new Promise<Leitura>(res => pendentes.push(res))
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

/** Todo valor de `loading` que o hook ja devolveu — a segunda rede sobre "o esqueleto voltou?". */
let loadings: boolean[] = []

const renderCategories = async () => {
  loadings = []
  const view = renderHook(() => {
    const atual = useAdminCategories()
    loadings.push(atual.loading)
    return atual
  })
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

/**
 * Feature 50 — **a releitura para de apagar a tela** (`VIV-02`, `VIV-07`, `VIV-08`, `VIV-11`).
 *
 * O desenho é o **mesmo** de `useAdminHomeSections`, e isso é a regra e não coincidência: dois
 * desenhos diferentes para o mesmo problema seriam o "defeito 01" duas pastas adiante.
 *
 * ⚠️ Este hook é lido por TRÊS telas (Categorias, Produtos, Menu). O que muda é o caminho da
 * **escrita**; `loading` continua significando exatamente o mesmo para quem não pediu (`R-04`).
 */

/** Dispara a ação, espera a releitura pendurar, e devolve o que a tela mostrava naquele instante. */
const enquantoRele = async (
  result: { current: ReturnType<typeof useAdminCategories> },
  acao: () => Promise<unknown>,
) => {
  segurarLeituras = true
  loadings = []
  const medido: { loading: boolean | null; ids: string[] } = { loading: null, ids: [] }
  let promessa!: Promise<unknown>

  await act(async () => {
    promessa = acao()
    await waitFor(() => expect(pendentes).toHaveLength(1))
    medido.loading = result.current.loading
    medido.ids = result.current.categories.map(c => c.id)
  })

  return {
    medido,
    responder: async (resposta: Leitura) => {
      await act(async () => {
        pendentes.shift()!(resposta)
        await promessa
      })
    },
  }
}

describe('useAdminCategories — a primeira carga NÃO muda (VIV-11)', () => {
  it('`inicial` LIGA o esqueleto, e o `fetch` sem argumento é `inicial`', async () => {
    segurarLeituras = true
    const view = renderHook(() => useAdminCategories())

    await waitFor(() => expect(pendentes).toHaveLength(1))
    expect(view.result.current.loading).toBe(true)

    await act(async () => {
      pendentes.shift()!(categoriesResponse)
    })
    await waitFor(() => expect(view.result.current.loading).toBe(false))
    expect(view.result.current.categories).toHaveLength(3)
  })

  it('falha na leitura INICIAL esvazia a lista — o comportamento de hoje, e ele fica', async () => {
    categoriesResponse = { data: null, error: { message: 'permission denied' } }
    const { result } = await renderCategories()
    expect(result.current.error).toBe('permission denied')
    expect(result.current.categories).toEqual([])
  })
})

describe('useAdminCategories — toda escrita relê em `revalidar` (VIV-02, L-010)', () => {
  /**
   * **Um caso por porta.** São sete portas de escrita, e cada uma tem a sua chamada de releitura;
   * provar uma e confiar nas outras seis é o que deixa uma para trás sem nada acusar (`L-010`).
   */
  const portas: [string, (h: ReturnType<typeof useAdminCategories>) => Promise<unknown>][] = [
    ['createCategory', h => h.createCategory({ name: 'Nova', slug: 'nova' })],
    ['updateCategory', h => h.updateCategory('anime', { name: 'Anime!' })],
    ['deleteCategory', h => h.deleteCategory('kpop')],
    ['updateCategoriesBatch', h => h.updateCategoriesBatch(['anime'], { active: false })],
    ['deleteCategoriesBatch', h => h.deleteCategoriesBatch(['anime'])],
    ['moveCategories', h => h.moveCategories([{ id: 'sailor', parent_id: null, sort_order: 1 }])],
    ['updateSortOrders', h => h.updateSortOrders([{ id: 'anime', sort_order: 2 }])],
  ]

  for (const [nome, acao] of portas) {
    it(nome + ' relê SEM ligar o esqueleto, e sem largar as linhas', async () => {
      const { result } = await renderCategories()
      const { medido, responder } = await enquantoRele(result, () => acao(result.current))

      // A janela exata em que o esqueleto voltaria: a gravação passou, a releitura está no ar.
      expect(medido.loading).toBe(false)
      expect(medido.ids).toEqual(['anime', 'sailor', 'kpop'])
      expect(loadings).not.toContain(true)

      await responder(categoriesResponse)
      expect(result.current.loading).toBe(false)
    })
  }
})

describe('useAdminCategories — releitura que falha não apaga a tela (VIV-07)', () => {
  it('grava o `error` e MANTÉM as linhas que já estavam lá', async () => {
    const { result } = await renderCategories()
    const { responder } = await enquantoRele(result, () =>
      result.current.updateCategory('anime', { menu_desktop: true }),
    )

    await responder({ data: null, error: { message: 'network' } })

    expect(result.current.error).toBe('network')
    // O que separa os dois mundos: a faixa de erro aparece SOBRE a lista, não no lugar dela.
    expect(result.current.categories.map(c => c.id)).toEqual(['anime', 'sailor', 'kpop'])
  })
})

describe('useAdminCategories — duas releituras em voo (VIV-08, A-11)', () => {
  it('a resposta da PRIMEIRA leitura, chegando por último, é descartada', async () => {
    const { result } = await renderCategories()

    const velha: Leitura = {
      data: [{ id: 'velha', name: 'Velha', slug: 'velha', parent_id: null, active: true, sort_order: 1 }],
      error: null,
    }
    const nova: Leitura = {
      data: [{ id: 'nova', name: 'Nova', slug: 'nova', parent_id: null, active: true, sort_order: 1 }],
      error: null,
    }

    segurarLeituras = true
    await act(async () => {
      const a = result.current.updateCategory('anime', { menu_desktop: true })
      await waitFor(() => expect(pendentes).toHaveLength(1))
      const b = result.current.updateCategory('anime', { menu_desktop: false })
      await waitFor(() => expect(pendentes).toHaveLength(2))

      // A SEGUNDA responde primeiro…
      pendentes[1]!(nova)
      // …e a PRIMEIRA, lenta, chega por último. Sem o token, é ela quem ficaria na tela.
      pendentes[0]!(velha)
      await Promise.all([a, b])
    })

    expect(result.current.categories.map(c => c.id)).toEqual(['nova'])
  })
})
