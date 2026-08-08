import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'

// SHP-02: a página de produto cota o frete a partir deste mapper — sem as 4 dimensões o
// payload cairia nos fallbacks 11/2/16/0.1 mesmo com o produto cadastrado.

const { fromMock } = vi.hoisted(() => ({ fromMock: vi.fn() }))

vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))

import { useProduct } from '../useProduct'

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

const respondWith = (row: unknown) => {
  fromMock.mockReturnValue({
    select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: row, error: null }) }) }),
  })
}

/**
 * Encena as três leituras de PST-07: produto por slug → `product_redirects` → produto por id.
 *
 * @param bySlug   O que a busca por slug devolve (`null` = slug morto).
 * @param redirect A linha de `product_redirects`, ou `null` quando não há redirect.
 * @param byId     O produto atual apontado pelo redirect (`null` = alvo apagado).
 */
const respondWithRedirect = (
  bySlug: unknown,
  redirect: { product_id: string } | null,
  byId: unknown,
) => {
  fromMock.mockImplementation((table: string) => {
    if (table === 'product_redirects') {
      return {
        select: () => ({
          eq: () => ({ maybeSingle: () => Promise.resolve({ data: redirect, error: null }) }),
        }),
      }
    }
    return {
      select: () => ({
        eq: (column: string) =>
          column === 'id'
            ? { maybeSingle: () => Promise.resolve({ data: byId, error: null }) }
            : {
                single: () =>
                  Promise.resolve({
                    data: bySlug,
                    error: bySlug ? null : { message: 'no rows' },
                  }),
              },
      }),
    }
  })
}

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

beforeEach(() => {
  fromMock.mockReset()
})

describe('useProduct — dimensões do produto (SHP-02)', () => {
  it('mapeia weight_kg, width_cm, height_cm e length_cm com os valores do banco', async () => {
    respondWith(dbRow())

    const { result } = renderHook(() => useProduct('botton-sakura'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data!.weight_kg).toBe(0.85)
    expect(result.current.data!.width_cm).toBe(25)
    expect(result.current.data!.height_cm).toBe(7)
    expect(result.current.data!.length_cm).toBe(30)
  })

  it('colunas nulas viram undefined, para o fallback por item de toQuotePayload valer', async () => {
    respondWith(dbRow({ weight_kg: null, width_cm: null, height_cm: null, length_cm: null }))

    const { result } = renderHook(() => useProduct('botton-sakura'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data!.weight_kg).toBeUndefined()
    expect(result.current.data!.width_cm).toBeUndefined()
    expect(result.current.data!.height_cm).toBeUndefined()
    expect(result.current.data!.length_cm).toBeUndefined()
  })
})

// VAR-11 AC 2: a página do produto é o consumidor da galeria, que agora recebe `ProductImage[]`.
describe('useProduct — leitura de images (VAR-11)', () => {
  it('mapeia o jsonb do banco preservando url, alt e source', async () => {
    respondWith(dbRow({ images: [{ url: 'sailor.webp', alt: 'Botton da Lua', source: 'mockup' }] }))

    const { result } = renderHook(() => useProduct('botton-sakura'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data!.images).toEqual([
      { url: 'sailor.webp', alt: 'Botton da Lua', source: 'mockup' },
    ])
    expect(result.current.data!.image_url).toBe('sailor.webp')
  })

  it('ainda aceita string[] — a ordem de deploy entre banco e bundle não pode importar (AC 1)', async () => {
    respondWith(dbRow({ images: ['legado.webp'] }))

    const { result } = renderHook(() => useProduct('botton-sakura'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data!.images).toEqual([
      { url: 'legado.webp', alt: null, source: 'upload' },
    ])
  })

  it('produto sem imagem: lista vazia e image_url string vazia, nunca undefined (AC 3)', async () => {
    respondWith(dbRow({ images: null }))

    const { result } = renderHook(() => useProduct('botton-sakura'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data!.images).toEqual([])
    expect(result.current.data!.image_url).toBe('')
  })
})

// PST-07: "WHEN a loja recebe `/produto/<slug-antigo>` E existe registro em `product_redirects`
// THEN SHALL redirecionar para o slug atual do produto." O hook resolve; a `ProductPage` navega.
describe('useProduct — resolução de slug antigo (PST-07)', () => {
  it('slug morto com redirect devolve o produto ATUAL, com o slug novo', async () => {
    respondWithRedirect(
      null,
      { product_id: 'prod-1' },
      dbRow({ id: 'prod-1', slug: 'botton-sakura-2026' }),
    )

    const { result } = renderHook(() => useProduct('botton-sakura-antigo'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    // É o desencontro entre o slug pedido e este que dispara o `Navigate` na página.
    expect(result.current.data!.slug).toBe('botton-sakura-2026')
    expect(result.current.data!.id).toBe('prod-1')
  })

  it('slug encontrado NÃO consulta product_redirects — o caminho normal não paga a leitura extra', async () => {
    respondWithRedirect(dbRow({ slug: 'botton-sakura' }), { product_id: 'outro' }, null)

    const { result } = renderHook(() => useProduct('botton-sakura'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data!.slug).toBe('botton-sakura')
    expect(fromMock.mock.calls.map(([table]) => table)).not.toContain('product_redirects')
  })

  it('slug inexistente e sem redirect devolve null — o 404 atual é preservado', async () => {
    respondWithRedirect(null, null, null)

    const { result } = renderHook(() => useProduct('nunca-existiu'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeNull()
  })

  it('redirect apontando para produto apagado devolve null, sem loop', async () => {
    respondWithRedirect(null, { product_id: 'apagado' }, null)

    const { result } = renderHook(() => useProduct('slug-de-produto-apagado'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(result.current.data).toBeNull()
  })

  it('a busca do redirect é por from_slug, na tabela product_redirects', async () => {
    respondWithRedirect(null, { product_id: 'prod-1' }, dbRow({ id: 'prod-1', slug: 'novo' }))

    const { result } = renderHook(() => useProduct('antigo'), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(fromMock.mock.calls.map(([table]) => table)).toContain('product_redirects')
  })
})
