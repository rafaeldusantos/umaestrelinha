import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// SHP-02: o mapper de produto precisa carregar `weight_kg`/`width_cm`/`height_cm`/`length_cm`.
// Sem eles a cotação "real" sairia sempre com os fallbacks 11/2/16/0.1 — frete errado com cara
// de certo.

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))

vi.mock('@nanapin/supabase/client', () => ({ supabase: { from: fromMock } }))

import { useProducts } from '../useProducts'

const dbRow = (overrides: Record<string, unknown> = {}) => ({
  id: 'prod-1',
  name: 'Botton Sakura',
  slug: 'botton-sakura',
  base_price: 12.9,
  category_id: 'cat-1',
  categories: { slug: 'anime', name: 'Anime' },
  images: [],
  stock: 10,
  weight_kg: 0.85,
  width_cm: 25,
  height_cm: 7,
  length_cm: 30,
  ...overrides,
})

const respondWith = (rows: unknown[]) => {
  fromMock.mockReturnValue({ select: () => Promise.resolve({ data: rows, error: null }) })
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

beforeEach(() => {
  fromMock.mockReset()
})

describe('useProducts — dimensões do produto (SHP-02)', () => {
  it('mapeia weight_kg, width_cm, height_cm e length_cm com os valores do banco', async () => {
    respondWith([dbRow()])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [mapped] = result.current.data!
    expect(mapped.weight_kg).toBe(0.85)
    expect(mapped.width_cm).toBe(25)
    expect(mapped.height_cm).toBe(7)
    expect(mapped.length_cm).toBe(30)
  })

  it('colunas nulas viram undefined, para o fallback por item de toQuotePayload valer', async () => {
    respondWith([dbRow({ weight_kg: null, width_cm: null, height_cm: null, length_cm: null })])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [mapped] = result.current.data!
    expect(mapped.weight_kg).toBeUndefined()
    expect(mapped.width_cm).toBeUndefined()
    expect(mapped.height_cm).toBeUndefined()
    expect(mapped.length_cm).toBeUndefined()
  })
})

// VAR-11 AC 2: `products.images` é `jsonb [{url, alt, source}]` desde a migration 20260801120200.
// O mapper passa a normalizar em vez de assumir `string[]`.
describe('useProducts — leitura de images (VAR-11)', () => {
  it('mapeia o jsonb do banco preservando url, alt e source', async () => {
    respondWith([
      dbRow({ images: [{ url: 'sailor.webp', alt: 'Botton da Lua', source: 'mockup' }] }),
    ])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [mapped] = result.current.data!
    expect(mapped.images).toEqual([{ url: 'sailor.webp', alt: 'Botton da Lua', source: 'mockup' }])
  })

  it('image_url é a url da primeira imagem — não o objeto', async () => {
    respondWith([
      dbRow({
        images: [
          { url: 'primeira.webp', alt: null, source: 'upload' },
          { url: 'segunda.webp', alt: null, source: 'upload' },
        ],
      }),
    ])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data![0].image_url).toBe('primeira.webp')
  })

  it('ainda aceita string[] — a ordem de deploy entre banco e bundle não pode importar (AC 1)', async () => {
    respondWith([dbRow({ images: ['legado.webp'] })])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [mapped] = result.current.data!
    expect(mapped.images).toEqual([{ url: 'legado.webp', alt: null, source: 'upload' }])
    expect(mapped.image_url).toBe('legado.webp')
  })

  it('produto sem imagem: lista vazia e image_url string vazia, nunca undefined (AC 3)', async () => {
    respondWith([dbRow({ images: null })])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [mapped] = result.current.data!
    expect(mapped.images).toEqual([])
    expect(mapped.image_url).toBe('')
  })
})

// PST-05: a loja passa a receber `options` e `product_variants` junto do produto — sem eles não há
// como saber qual variação o cliente escolheu.
describe('useProducts — grade do produto (PST-05)', () => {
  it('mapeia options e as variações da tabela product_variants', async () => {
    respondWith([
      dbRow({
        stock_policy: 'backorder',
        options: [{ name: 'Tamanho', values: ['3,5 cm', '4,5 cm'], position: 0 }],
        product_variants: [
          {
            id: 'v1',
            product_id: 'prod-1',
            option_values: { Tamanho: '4,5 cm' },
            price: 7.9,
            stock: 3,
            is_active: true,
            position: 1,
          },
        ],
      }),
    ])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [mapped] = result.current.data!
    expect(mapped.options).toEqual([{ name: 'Tamanho', values: ['3,5 cm', '4,5 cm'], position: 0 }])
    expect(mapped.stock_policy).toBe('backorder')
    expect(mapped.variants).toHaveLength(1)
    expect(mapped.variants[0]).toMatchObject({
      id: 'v1',
      option_values: { Tamanho: '4,5 cm' },
      price: 7.9,
      stock: 3,
      is_active: true,
      position: 1,
    })
  })

  it('variação sem is_active legível nasce PAUSADA — não entra na loja por omissão', async () => {
    respondWith([
      dbRow({
        options: [{ name: 'Tamanho', values: ['4,5 cm'], position: 0 }],
        product_variants: [{ id: 'v1', option_values: { Tamanho: '4,5 cm' }, price: 7.9 }],
      }),
    ])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data![0].variants[0].is_active).toBe(false)
  })

  it('variação sem id é descartada — viraria um item que o create-payment recusa com 422', async () => {
    respondWith([
      dbRow({ product_variants: [{ option_values: { Tamanho: '4,5 cm' }, price: 7.9 }] }),
    ])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data![0].variants).toEqual([])
  })

  it('eixo sem valores é descartado e stock_policy desconhecida cai em track', async () => {
    respondWith([
      dbRow({
        stock_policy: 'sei-la',
        options: [
          { name: 'Tamanho', values: [], position: 0 },
          { name: 'Cor', values: ['Rosa'], position: 1 },
        ],
      }),
    ])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [mapped] = result.current.data!
    expect(mapped.options.map(o => o.name)).toEqual(['Cor'])
    expect(mapped.stock_policy).toBe('track')
  })

  it('produto sem grade: options e variants vazios, nunca undefined', async () => {
    respondWith([dbRow({ options: null, product_variants: null })])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    const [mapped] = result.current.data!
    expect(mapped.options).toEqual([])
    expect(mapped.variants).toEqual([])
  })

  it('mapeia os vínculos N:N de product_categories com a position de cada um (PST-06)', async () => {
    respondWith([
      dbRow({
        product_categories: [
          { category_id: 'cat-anime', position: 0 },
          { category_id: 'cat-kpop', position: 1 },
        ],
      }),
    ])

    const { result } = renderHook(() => useProducts(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data![0].category_links).toEqual([
      { category_id: 'cat-anime', position: 0 },
      { category_id: 'cat-kpop', position: 1 },
    ])
  })
})

// PST-06 AC 4: "a página de coleção SHALL consultar `product_categories` — SHALL deixar de filtrar
// por `.eq('category_id')`". A prova é na CHAMADA: é o filtro que decide se um produto em 3
// categorias aparece nas 3 páginas.
describe('useProducts — filtro por categoria N:N (PST-06 AC 4)', () => {
  /**
   * A árvore que o banco tem de verdade: guarda-chuva "Bottons" com os universos dentro, e "Naruto"
   * dentro de "Anime". É ela que expõe o roll-up — `cat-anime` tem uma NETA.
   */
  const TREE = [
    { id: 'cat-bottons', parent_id: null, slug: 'bottons' },
    { id: 'cat-anime', parent_id: 'cat-bottons', slug: 'anime' },
    { id: 'cat-kpop', parent_id: 'cat-bottons', slug: 'kpop' },
    { id: 'cat-naruto', parent_id: 'cat-anime', slug: 'naruto' },
  ]

  /**
   * Encena as três leituras da variante com `categorySlug`: árvore → vínculos → produtos.
   *
   * `linksByCategory` mapeia categoria → produtos vinculados **a ela**, para o teste poder pôr um
   * produto só na filha e provar que ele aparece na página do pai.
   */
  const respondForCategory = (
    linksByCategory: Record<string, string[]>,
    rows: unknown[],
    tree = TREE,
  ) => {
    const inLinksSpy = vi.fn()
    const inProductsSpy = vi.fn()
    let categoriesSelects = 0
    let linkSelects = 0

    fromMock.mockImplementation((table: string) => {
      if (table === 'categories') {
        categoriesSelects += 1
        return { select: () => Promise.resolve({ data: tree, error: null }) }
      }
      if (table === 'product_categories') {
        linkSelects += 1
        return {
          select: () => ({
            in: (column: string, values: string[]) => {
              inLinksSpy(column, values)
              const ids = values.flatMap(id => linksByCategory[id] ?? [])
              return Promise.resolve({ data: ids.map(product_id => ({ product_id })) })
            },
          }),
        }
      }
      return {
        select: () => ({
          in: (column: string, values: string[]) => {
            inProductsSpy(column, values)
            return Promise.resolve({ data: rows, error: null })
          },
        }),
      }
    })
    return {
      inLinksSpy,
      inProductsSpy,
      counts: () => ({ categoriesSelects, linkSelects }),
    }
  }

  it('busca os product_id em product_categories e filtra os produtos por esses ids', async () => {
    const { inLinksSpy, inProductsSpy } = respondForCategory(
      { 'cat-anime': ['prod-1', 'prod-9'] },
      [dbRow()],
    )

    const { result } = renderHook(() => useProducts('anime'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(inLinksSpy).toHaveBeenCalledWith('category_id', expect.arrayContaining(['cat-anime']))
    expect(inProductsSpy).toHaveBeenCalledWith('id', ['prod-1', 'prod-9'])
    expect(result.current.data).toHaveLength(1)
  })

  it('o mesmo produto aparece em outra categoria — o vínculo é que decide, não products.category_id', async () => {
    // `dbRow` tem `category_id: 'cat-1'`; a página é da 'cat-anime'. Sob o filtro antigo
    // (`.eq('category_id')`) este produto não apareceria aqui.
    respondForCategory({ 'cat-anime': ['prod-1'] }, [dbRow({ category_id: 'cat-1' })])

    const { result } = renderHook(() => useProducts('anime'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data!.map(p => p.id)).toEqual(['prod-1'])
  })

  it('categoria sem nenhum vínculo devolve lista vazia', async () => {
    respondForCategory({}, [dbRow()])

    const { result } = renderHook(() => useProducts('anime'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toEqual([])
  })

  // MENU-03 — o roll-up da descendência.
  describe('roll-up da descendência (MENU-03)', () => {
    it('a página do universo inclui os produtos das filhas E das netas', async () => {
      // Nada vinculado a "Bottons" diretamente: tudo mora nas filhas e netas. Sob o filtro antigo
      // (`.eq('category_id', 'cat-bottons')`) esta página vinha VAZIA — era o bug real, em que
      // `/colecao/bottons` listava 4 produtos num catálogo de 32.
      const { inLinksSpy } = respondForCategory(
        { 'cat-anime': ['prod-anime'], 'cat-naruto': ['prod-naruto'], 'cat-kpop': ['prod-kpop'] },
        [dbRow()],
      )

      const { result } = renderHook(() => useProducts('bottons'), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      const [, branch] = inLinksSpy.mock.calls[0]
      expect(branch).toEqual(
        expect.arrayContaining(['cat-bottons', 'cat-anime', 'cat-kpop', 'cat-naruto']),
      )
    })

    it('folha continua idêntica ao comportamento anterior — só o próprio id', async () => {
      const { inLinksSpy } = respondForCategory({ 'cat-naruto': ['prod-naruto'] }, [dbRow()])

      const { result } = renderHook(() => useProducts('naruto'), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(inLinksSpy).toHaveBeenCalledWith('category_id', ['cat-naruto'])
    })

    it('produto vinculado ao pai E à filha entra UMA vez só', async () => {
      const { inProductsSpy } = respondForCategory(
        { 'cat-anime': ['prod-dupla'], 'cat-naruto': ['prod-dupla'] },
        [dbRow({ id: 'prod-dupla' })],
      )

      const { result } = renderHook(() => useProducts('anime'), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(inProductsSpy).toHaveBeenCalledWith('id', ['prod-dupla'])
    })

    it('sem N+1: UMA leitura da árvore e UMA de vínculos, qualquer que seja a descendência', async () => {
      const { counts } = respondForCategory(
        { 'cat-anime': ['prod-anime'], 'cat-naruto': ['prod-naruto'] },
        [dbRow()],
      )

      const { result } = renderHook(() => useProducts('bottons'), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      // "Bottons" tem 3 descendentes; uma implementação por-descendente faria 3 leituras de vínculo.
      expect(counts()).toEqual({ categoriesSelects: 1, linkSelects: 1 })
    })

    it('slug inexistente não filtra nada — devolve a listagem completa, como antes', async () => {
      const { inProductsSpy } = respondForCategory({}, [dbRow()])
      fromMock.mockImplementation((table: string) => {
        if (table === 'categories') return { select: () => Promise.resolve({ data: TREE, error: null }) }
        return { select: () => Promise.resolve({ data: [dbRow()], error: null }) }
      })

      const { result } = renderHook(() => useProducts('fantasma'), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(inProductsSpy).not.toHaveBeenCalled()
      expect(result.current.data).toHaveLength(1)
    })

    it('árvore com ciclo termina em vez de travar a página', async () => {
      const ciclo = [
        { id: 'a', parent_id: 'b', slug: 'a' },
        { id: 'b', parent_id: 'a', slug: 'b' },
      ]
      respondForCategory({ a: ['prod-a'], b: ['prod-b'] }, [dbRow()], ciclo)

      const { result } = renderHook(() => useProducts('a'), { wrapper })
      await waitFor(() => expect(result.current.isSuccess).toBe(true))

      expect(result.current.data).toHaveLength(1)
    })
  })
})
