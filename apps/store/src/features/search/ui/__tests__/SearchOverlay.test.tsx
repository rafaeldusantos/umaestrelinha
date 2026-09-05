import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import SearchOverlay from '../SearchOverlay'
import type { Product } from '@estrelinha/supabase/types'

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
      product('Pin Naruto Sennin', {
        image_url:
          'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/object/public/product-images/naruto.webp',
      }),
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
  fireEvent.change(screen.getByLabelText('Buscar joias'), { target: { value } })

describe('SearchOverlay (board "Mobile Search Open - v3")', () => {
  it('parte de buscas recentes e coleções em alta, sem resultado nenhum', () => {
    localStorage.setItem('estrelinha-recent-searches', JSON.stringify(['gojo satoru']))
    renderOverlay()
    expect(screen.getByText('gojo satoru')).toBeInTheDocument()
    expect(screen.getByText('Em alta agora')).toBeInTheDocument()
    // Folhas viram pílula: "Naruto" e "K-Pop" sim, "Anime" (que tem filha) não.
    // `AD-018`: "Naruto" pende de "Anime" — a canônica dela tem DOIS segmentos.
    expect(screen.getByRole('link', { name: 'Naruto' })).toHaveAttribute('href', '/anime/naruto')
    // "K-Pop" é raiz: um segmento.
    expect(screen.getByRole('link', { name: /K-Pop/ })).toHaveAttribute('href', '/k-pop')
    expect(screen.queryByRole('link', { name: /🌸/ })).not.toBeInTheDocument()
  })

  it('mostra o produto com a trilha de categoria e o preço', () => {
    renderOverlay()
    type('naruto')
    const row = screen.getByRole('link', { name: /Pin Naruto Sennin/ })
    expect(row).toHaveAttribute('href', '/produtos/pin-naruto-sennin')
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
    fireEvent.submit(screen.getByLabelText('Buscar joias').closest('form')!)
    expect(navigate).toHaveBeenCalledWith('/busca?q=naruto')
    expect(closeSearch).toHaveBeenCalled()
    expect(JSON.parse(localStorage.getItem('estrelinha-recent-searches')!)).toEqual(['naruto'])
  })

  it('não envia com menos de dois caracteres', () => {
    renderOverlay()
    type('n')
    fireEvent.submit(screen.getByLabelText('Buscar joias').closest('form')!)
    expect(navigate).not.toHaveBeenCalled()
  })

  it('sem resultado, explica o que tentar em vez de só falhar', () => {
    renderOverlay()
    type('xyzabc')
    expect(screen.getByText(/Nada encontrado para/)).toBeInTheDocument()
    expect(screen.getByText('Em alta agora')).toBeInTheDocument()
  })

  it('Cancelar fecha a busca', () => {
    renderOverlay()
    fireEvent.click(screen.getByText('Cancelar'))
    expect(closeSearch).toHaveBeenCalled()
  })
})

/**
 * `PRF-02` (AC 5) — o resultado da busca pede rendição.
 *
 * A vaga tem 48px e a lista mostra vários resultados a cada tecla. Servir o original de 1024px
 * fazia a busca baixar o catálogo em fotos enquanto a cliente ainda digitava.
 */
describe('SearchOverlay — a foto do resultado pede o tamanho da vaga (PRF-02 AC 5)', () => {
  it('a vaga de 48px busca a rendição de 160, e não o objeto original', () => {
    renderOverlay()
    type('naruto')

    const foto = screen.getByRole('link', { name: /Pin Naruto Sennin/ }).querySelector('img')
    expect(foto?.getAttribute('src')).toContain('/render/image/public/')
    expect(foto?.getAttribute('src')).toContain('width=160')
    expect(foto?.getAttribute('src')).not.toContain('/object/public/')
  })

  it('resultado sem foto continua na inicial desenhada, sem `<img>` nenhum', () => {
    renderOverlay()
    type('pikachu')

    const item = screen.getByRole('link', { name: /Pin Pokémon Pikachu/ })
    expect(item.querySelectorAll('img')).toHaveLength(0)
  })
})
