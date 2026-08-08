import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SearchOverlay from '../SearchOverlay'
import type { Product } from '@nanapin/supabase/types'

/* eslint-disable @typescript-eslint/no-explicit-any */

const { navigate, closeSearch, searchUi } = vi.hoisted(() => ({
  navigate: vi.fn(),
  closeSearch: vi.fn(),
  searchUi: { open: true },
}))

const product = (name: string, over: Partial<Product> = {}): Product =>
  ({
    id: name,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    price: 14.9,
    description: '',
    image_url: '',
    images: [],
    options: [],
    variants: [],
    stock_policy: 'ignore',
    category_links: [{ category_id: 'naruto', position: 0 }],
    stock_total: 0,
    tags: [],
    ...over,
  }) as Product

const categories = [
  { id: 'anime', name: 'Anime', slug: 'anime', parent_id: null, sort_order: 0, emoji: '🌸' },
  { id: 'naruto', name: 'Naruto', slug: 'naruto', parent_id: 'anime', sort_order: 1, emoji: '' },
  { id: 'kpop', name: 'K-Pop', slug: 'k-pop', parent_id: null, sort_order: 2, emoji: '🎤' },
]

vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual<any>('react-router-dom')),
  useNavigate: () => navigate,
}))
vi.mock('@/features/search/model/searchUiStore', () => ({
  useSearchUiStore: (sel: any) => sel({ ...searchUi, closeSearch, setSearchOpen: vi.fn() }),
}))
vi.mock('../../model/searchUiStore', () => ({
  useSearchUiStore: (sel: any) => sel({ ...searchUi, closeSearch, setSearchOpen: vi.fn() }),
}))
vi.mock('@/entities/product/api/useProducts', () => ({
  useAllProducts: () => ({
    data: [
      product('Pin Naruto Sennin'),
      product('Pin Pokémon Pikachu', { category_links: [] }),
      product('Pin Esgotado', { stock_policy: 'track', stock_total: 0 }),
    ],
  }),
}))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => ({ data: categories }) }))

const renderOverlay = () =>
  render(
    <MemoryRouter>
      <SearchOverlay />
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()
  searchUi.open = true
})

const type = (value: string) =>
  fireEvent.change(screen.getByLabelText('Buscar bottons'), { target: { value } })

describe('SearchOverlay (board "Mobile Search Open - v3")', () => {
  it('parte de buscas recentes e coleções em alta, sem resultado nenhum', () => {
    localStorage.setItem('nanapin-recent-searches', JSON.stringify(['gojo satoru']))
    renderOverlay()
    expect(screen.getByText('gojo satoru')).toBeInTheDocument()
    expect(screen.getByText('Em alta agora')).toBeInTheDocument()
    // Folhas viram pílula: "Naruto" e "K-Pop" sim, "Anime" (que tem filha) não.
    expect(screen.getByRole('link', { name: 'Naruto' })).toHaveAttribute('href', '/colecao/naruto')
    expect(screen.getByRole('link', { name: /K-Pop/ })).toHaveAttribute('href', '/colecao/k-pop')
    expect(screen.queryByRole('link', { name: /🌸/ })).not.toBeInTheDocument()
  })

  it('mostra o produto com a trilha de categoria e o preço', () => {
    renderOverlay()
    type('naruto')
    const row = screen.getByRole('link', { name: /Pin Naruto Sennin/ })
    expect(row).toHaveAttribute('href', '/produto/pin-naruto-sennin')
    expect(row).toHaveTextContent('Anime · Naruto')
    expect(row).toHaveTextContent('R$ 14,90')
  })

  it('acha sem acento e marca o esgotado', () => {
    renderOverlay()
    type('pokemon')
    expect(screen.getByText('Pin Pokémon Pikachu')).toBeInTheDocument()

    type('esgotado')
    expect(screen.getByText('Esgotado')).toBeInTheDocument()
  })

  it('enviar leva para a lista completa e guarda a busca', () => {
    renderOverlay()
    type('naruto')
    fireEvent.submit(screen.getByLabelText('Buscar bottons').closest('form')!)
    expect(navigate).toHaveBeenCalledWith('/busca?q=naruto')
    expect(closeSearch).toHaveBeenCalled()
    expect(JSON.parse(localStorage.getItem('nanapin-recent-searches')!)).toEqual(['naruto'])
  })

  it('não envia com menos de dois caracteres', () => {
    renderOverlay()
    type('n')
    fireEvent.submit(screen.getByLabelText('Buscar bottons').closest('form')!)
    expect(navigate).not.toHaveBeenCalled()
  })

  it('sem resultado, explica o que tentar em vez de só falhar', () => {
    renderOverlay()
    type('xyzabc')
    expect(screen.getByText(/Nenhum botton para/)).toBeInTheDocument()
    expect(screen.getByText('Em alta agora')).toBeInTheDocument()
  })

  it('Cancelar fecha a busca', () => {
    renderOverlay()
    fireEvent.click(screen.getByText('Cancelar'))
    expect(closeSearch).toHaveBeenCalled()
  })
})
