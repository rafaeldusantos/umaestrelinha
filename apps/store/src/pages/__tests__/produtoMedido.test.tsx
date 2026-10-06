import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Product } from '@estrelinha/supabase/types'

/**
 * Feature 61 · T17 — `view_item` (`EVT-04`), `add_to_cart` pela página (`EVT-05`) e `add_to_wishlist`
 * (`EVT-08`), pela `ProductPage` REAL com a coluna de informação de verdade.
 *
 * A régua é o evento entregue ao `track`, e o caso que mais importa é o da quantidade: o "adicionar"
 * chama `addItem` uma vez por unidade, e um evento por volta do laço contaria três adições onde a
 * cliente fez uma.
 */
const { trackSpy, useProductMock } = vi.hoisted(() => ({
  trackSpy: vi.fn(),
  useProductMock: vi.fn(),
}))

vi.mock('@/shared/lib/analytics', async importOriginal => {
  const real = await importOriginal<typeof import('@/shared/lib/analytics')>()
  return { ...real, track: (e: unknown) => trackSpy(e) }
})
vi.mock('@/entities/product/api/useProduct', () => ({ useProduct: useProductMock }))
vi.mock('@/entities/product/api/useProducts', () => ({ useProducts: () => ({ data: [] }) }))
vi.mock('@/entities/product/api/useProductFaqs', () => ({ useProductFaqs: () => ({ data: [] }) }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => ({ data: [] }) }))
vi.mock('sonner', () => ({ toast: { custom: vi.fn(), error: vi.fn(), success: vi.fn() } }))
vi.mock('@/entities/product/ui/ProductGallery', () => ({ default: () => <div>galeria</div> }))
vi.mock('@/entities/product/ui/ProductDetailsAccordion', () => ({ default: () => null }))
vi.mock('@/widgets/related-products/ui/RelatedProducts', () => ({ default: () => null }))
vi.mock('@/widgets/product-buy-bar', () => ({ ProductBuyBar: () => null }))
vi.mock('@/features/share-product/ui/ShareButtons', () => ({ default: () => null }))
vi.mock('@/features/shipping-calc/ui/ShippingCalc', () => ({ default: () => null }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useGeneralSettings: () => ({ whatsapp: '5551999999999', store_name: 'Uma Estrelinha' }),
  usePaymentSettings: () => ({
    max_installments: 6,
    min_installment_value: 10,
    pix_enabled: false,
    pix_discount_percent: 0,
  }),
  useShippingSettings: () => ({ free_shipping_enabled: false, free_shipping_threshold: 0 }),
}))

import ProductPage from '../ProductPage'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { useWishlistStore } from '@/entities/wishlist'

const PRODUTO = {
  id: 'p1',
  nuvemshop_id: 777,
  name: 'Pingente Gota',
  slug: 'pingente-gota',
  price: 209.9,
  compare_price: null,
  category_id: 'c1',
  // A coluna LEGADA, vazia como nos 691 produtos do banco — o `item_category` não sai dela, e sim
  // da categoria de exibição dos vínculos (correção da feature 61).
  category_slug: '',
  description: '',
  image_url: '',
  images: [],
  options: [],
  variants: [],
  stock_policy: 'backorder',
  category_links: [{ category_id: 'c1', position: 0, category: { slug: 'pingentes', sort_order: 0 } }],
  stock_total: 10,
  low_stock_threshold: 5,
  is_new: false,
  is_featured: false,
  tags: [],
} as unknown as Product

const eventos = (nome: string) =>
  trackSpy.mock.calls.map(c => c[0]).filter(e => e && (e as { name: string }).name === nome) as {
    params: { value: number; currency: string; items: Record<string, unknown>[] }
  }[]

const abrir = () =>
  render(
    <MemoryRouter initialEntries={['/produtos/pingente-gota']}>
      <Routes>
        <Route path="/produtos/:slug" element={<ProductPage />} />
      </Routes>
    </MemoryRouter>,
  )

beforeEach(() => {
  trackSpy.mockClear()
  useProductMock.mockReturnValue({ data: PRODUTO, isFetching: false })
  useCartStore.setState({ items: [] })
  useWishlistStore.setState({ items: [] })
})

describe('view_item (EVT-04)', () => {
  it('abrir a página ⇒ UM view_item, em BRL, com o item no formato de EVT-13', () => {
    abrir()
    const vistos = eventos('view_item')
    expect(vistos).toHaveLength(1)
    expect(vistos[0].params.currency).toBe('BRL')
    expect(vistos[0].params.value).toBe(209.9)
    expect(vistos[0].params.items).toEqual([
      {
        item_id: '777',
        item_name: 'Pingente Gota',
        item_brand: 'Uma Estrelinha',
        item_category: 'pingentes',
        price: 209.9,
        quantity: 1,
      },
    ])
  })
})

describe('add_to_cart pela página (EVT-05)', () => {
  it('quantidade 3 ⇒ UM evento com quantity 3 — e três unidades na sacola', () => {
    abrir()
    const mais = screen.getAllByRole('button', { name: 'Aumentar quantidade' })[0]
    fireEvent.click(mais)
    fireEvent.click(mais)
    fireEvent.click(screen.getAllByRole('button', { name: 'Adicionar à sacola' })[0])

    const adicionados = eventos('add_to_cart')
    expect(adicionados).toHaveLength(1)
    expect(adicionados[0].params.items[0]).toMatchObject({ item_id: '777', quantity: 3, price: 209.9 })
    expect(adicionados[0].params.value).toBe(629.7)
    expect(useCartStore.getState().items.reduce((s, i) => s + i.quantity, 0)).toBe(3)
  })

  it('restaurar a sacola (o caminho do e-mail de carrinho abandonado) NÃO gera add_to_cart', () => {
    // A recuperação passa por `cartStore.addItem` direto — o evento mora nos gestos da cliente, não
    // na store, e é isso que a torna silenciosa.
    useCartStore.getState().addItem(PRODUTO, '', '')
    useCartStore.getState().addItem(PRODUTO, '', '')
    expect(eventos('add_to_cart')).toHaveLength(0)
  })
})

describe('add_to_wishlist (EVT-08)', () => {
  it('favoritar pela página ⇒ um evento; desfavoritar ⇒ nenhum', () => {
    abrir()
    fireEvent.click(screen.getAllByRole('button', { name: 'Adicionar aos favoritos' })[0])
    expect(eventos('add_to_wishlist')).toHaveLength(1)
    expect(eventos('add_to_wishlist')[0].params.items[0]).toMatchObject({ item_id: '777' })
    expect(useWishlistStore.getState().items).toEqual(['p1'])

    fireEvent.click(screen.getAllByRole('button', { name: 'Remover dos favoritos' })[0])
    expect(eventos('add_to_wishlist')).toHaveLength(1)
    expect(useWishlistStore.getState().items).toEqual([])
  })
})
