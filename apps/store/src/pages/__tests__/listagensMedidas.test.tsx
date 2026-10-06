import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import type { Category, Product } from '@estrelinha/supabase/types'
import { PRODUCTS_PER_PAGE } from '@/shared/lib/useInfiniteWindow'

/**
 * Feature 61 · T16 — `view_item_list` (`EVT-02`) e `select_item` (`EVT-03`), medidos pelas PÁGINAS
 * reais e pelos widgets que as compõem, com o `ProductCard` de verdade.
 *
 * A régua é o evento entregue ao `track` (dublê que registra), nunca uma chamada do hook: a página
 * esquecer de passar a lista ao card, ou de chamar o hook, tem de reprovar aqui.
 */
const { trackSpy, useCategoriesMock, useProductsMock, useAllProductsMock } = vi.hoisted(() => ({
  trackSpy: vi.fn(),
  useCategoriesMock: vi.fn(),
  useProductsMock: vi.fn(),
  useAllProductsMock: vi.fn(),
}))

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { from: () => ({ select: () => Promise.resolve({ data: [], error: null }) }) },
}))

vi.mock('@/shared/lib/analytics', async importOriginal => {
  const real = await importOriginal<typeof import('@/shared/lib/analytics')>()
  return { ...real, track: (e: unknown) => trackSpy(e) }
})

vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: useCategoriesMock }))
vi.mock('@/entities/category/api/useCategoryRedirect', () => ({
  useCategoryRedirect: () => ({ data: undefined, isFetching: false }),
}))
vi.mock('@/entities/product/api/useProducts', () => ({
  useProducts: useProductsMock,
  useAllProducts: useAllProductsMock,
}))

import CategoryPage from '../CategoryPage'
import SearchPage from '../SearchPage'
import WishlistPage from '../WishlistPage'
import RelatedProducts from '@/widgets/related-products/ui/RelatedProducts'
import HomeCollectionRow from '@/widgets/home-collections/ui/HomeCollectionRow'
import { useWishlistStore } from '@/entities/wishlist'

const CATEGORIA = {
  id: 'c-1',
  name: 'Pingentes',
  slug: 'pingentes',
  description: null,
  image_url: null,
  color_accent: null,
  icon: null,
  parent_id: null,
  sort_order: 0,
  active: true,
  menu_desktop: false,
  menu_mobile: false,
  menu_banners: null,
} as unknown as Category

const produto = (i: number): Product =>
  ({
    id: `p-${i}`,
    nuvemshop_id: 1000 + i,
    name: `Pingente ${i}`,
    slug: `pingente-${i}`,
    price: 100 + i,
    compare_price: null,
    category_id: 'c-1',
    category_slug: 'pingentes',
    description: '',
    image_url: '',
    images: [],
    options: [],
    variants: [],
    stock_policy: 'backorder',
    category_links: [],
    stock_total: 5,
    low_stock_threshold: 1,
    is_new: false,
    is_featured: false,
    tags: [],
  }) as unknown as Product

const produtos = (n: number) => Array.from({ length: n }, (_, i) => produto(i))

const comProvedores = (ui: ReactNode, path = '/') =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )

const eventos = (nome: string) =>
  trackSpy.mock.calls.map(c => c[0]).filter(e => e && (e as { name: string }).name === nome) as {
    name: string
    params: { item_list_id: string; item_list_name: string; items: { item_id: string; index: number }[] }
  }[]

beforeEach(() => {
  trackSpy.mockClear()
  useCategoriesMock.mockReturnValue({ data: [CATEGORIA], isFetching: false })
  useProductsMock.mockReturnValue({ data: [], isError: false, isLoading: false })
  useAllProductsMock.mockReturnValue({ data: [] })
  useWishlistStore.setState({ items: [] })
})

describe('CategoryPage — a listagem da coleção', () => {
  const abrir = () =>
    comProvedores(
      <Routes>
        <Route path="/:slug" element={<CategoryPage />} />
      </Routes>,
      '/pingentes',
    )

  it('um view_item_list com os cards NA TELA, com índice; rerender não repete', async () => {
    useProductsMock.mockReturnValue({ data: produtos(30), isError: false, isLoading: false })
    const { rerender } = abrir()
    await waitFor(() => expect(eventos('view_item_list')).toHaveLength(1))
    const [ev] = eventos('view_item_list')
    expect(ev.params.item_list_id).toBe('colecao-pingentes')
    expect(ev.params.item_list_name).toBe('Pingentes')
    expect(ev.params.items).toHaveLength(PRODUCTS_PER_PAGE)
    expect(ev.params.items[0]).toMatchObject({ item_id: '1000', index: 0 })
    expect(ev.params.items[23]).toMatchObject({ item_id: '1023', index: 23 })

    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <MemoryRouter initialEntries={['/pingentes']}>
          <Routes>
            <Route path="/:slug" element={<CategoryPage />} />
          </Routes>
        </MemoryRouter>
      </QueryClientProvider>,
    )
    await new Promise(r => setTimeout(r, 20))
    expect(eventos('view_item_list')).toHaveLength(1)
  })

  it('a leva seguinte da rolagem infinita emite SÓ os itens novos, com o índice na lista', async () => {
    useProductsMock.mockReturnValue({ data: produtos(30), isError: false, isLoading: false })
    abrir()
    await waitFor(() => expect(eventos('view_item_list')).toHaveLength(1))
    fireEvent.click(screen.getByRole('button', { name: /Carregar mais joias/ }))
    await waitFor(() => expect(eventos('view_item_list')).toHaveLength(2))
    const segunda = eventos('view_item_list')[1]
    expect(segunda.params.items).toHaveLength(6)
    expect(segunda.params.items[0]).toMatchObject({ item_id: '1024', index: 24 })
  })

  it('carregando não emite', async () => {
    useProductsMock.mockReturnValue({ data: undefined, isError: false, isLoading: true })
    abrir()
    await new Promise(r => setTimeout(r, 20))
    expect(eventos('view_item_list')).toHaveLength(0)
  })

  it('tocar num card ⇒ select_item com a lista e o índice do card', async () => {
    useProductsMock.mockReturnValue({ data: produtos(5), isError: false, isLoading: false })
    abrir()
    const links = await screen.findAllByRole('link', { name: /Pingente 3/ })
    fireEvent.click(links[0])
    const [sel] = eventos('select_item')
    expect(sel).toBeDefined()
    expect(sel.params.item_list_id).toBe('colecao-pingentes')
    expect(sel.params.items).toHaveLength(1)
    expect(sel.params.items[0]).toMatchObject({ item_id: '1003', index: 3 })
  })
})

describe('SearchPage — os resultados', () => {
  it('resultados de um termo ⇒ view_item_list "busca"; sem termo, nada', async () => {
    useAllProductsMock.mockReturnValue({ data: produtos(3) })
    comProvedores(
      <Routes>
        <Route path="/busca" element={<SearchPage />} />
      </Routes>,
      '/busca?q=Pingente',
    )
    await waitFor(() => expect(eventos('view_item_list')).toHaveLength(1))
    expect(eventos('view_item_list')[0].params.item_list_id).toBe('busca')
    expect(eventos('view_item_list')[0].params.items).toHaveLength(3)
  })
})

describe('WishlistPage — os favoritos', () => {
  it('os favoritos carregados ⇒ view_item_list "favoritos"', async () => {
    useAllProductsMock.mockReturnValue({ data: produtos(3) })
    useWishlistStore.setState({ items: ['p-0', 'p-2'] })
    comProvedores(<WishlistPage />)
    await waitFor(() => expect(eventos('view_item_list')).toHaveLength(1))
    const ev = eventos('view_item_list')[0]
    expect(ev.params.item_list_id).toBe('favoritos')
    expect(ev.params.items.map(i => i.item_id)).toEqual(['1000', '1002'])
  })
})

describe('RelatedProducts — "Você também vai curtir"', () => {
  it('emite a lista e o card leva a lista ao select_item', async () => {
    comProvedores(<RelatedProducts products={produtos(2)} />)
    await waitFor(() => expect(eventos('view_item_list')).toHaveLength(1))
    expect(eventos('view_item_list')[0].params.item_list_id).toBe('relacionados')
    fireEvent.click(screen.getAllByRole('link', { name: /Pingente 1/ })[0])
    expect(eventos('select_item')[0].params).toMatchObject({ item_list_id: 'relacionados' })
    expect(eventos('select_item')[0].params.items[0]).toMatchObject({ index: 1 })
  })

  it('sem produtos, nada', async () => {
    comProvedores(<RelatedProducts products={[]} />)
    await new Promise(r => setTimeout(r, 20))
    expect(eventos('view_item_list')).toHaveLength(0)
  })
})

describe('HomeCollectionRow — a fileira da Home (pelo ProductCarousel real)', () => {
  it('a fileira emite a lista da coleção, com o mesmo id da página dela', async () => {
    useProductsMock.mockReturnValue({ data: produtos(4), isLoading: false })
    comProvedores(
      <HomeCollectionRow
        tone="ground"
        collection={{
          id: 'c-1',
          name: 'Pingentes',
          slug: 'pingentes',
          href: '/pingentes',
          description: null,
          bannerUrl: null,
        } as never}
      />,
    )
    await waitFor(() => expect(eventos('view_item_list')).toHaveLength(1))
    expect(eventos('view_item_list')[0].params).toMatchObject({
      item_list_id: 'colecao-pingentes',
      item_list_name: 'Pingentes',
    })
  })

  it('carregando, a fileira não emite', async () => {
    useProductsMock.mockReturnValue({ data: undefined, isLoading: true })
    comProvedores(
      <HomeCollectionRow
        tone="ground"
        collection={{ id: 'c-1', name: 'Pingentes', slug: 'pingentes', href: '/pingentes', description: null, bannerUrl: null } as never}
      />,
    )
    await new Promise(r => setTimeout(r, 20))
    expect(eventos('view_item_list')).toHaveLength(0)
  })
})
