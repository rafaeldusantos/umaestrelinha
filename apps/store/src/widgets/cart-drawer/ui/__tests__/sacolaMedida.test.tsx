import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Product } from '@estrelinha/supabase/types'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { useCartUiStore } from '@/entities/cart/model/cartUiStore'
import { useWishlistStore } from '@/entities/wishlist'

/**
 * Feature 61 · T17 — a sacola: `view_cart` (`EVT-07`), `remove_from_cart` (`EVT-06`), a sugestão
 * que adiciona (`EVT-05`) e o coração da linha (`EVT-08`), pela GAVETA real.
 *
 * Aqui `EVT-14` tem dente: a linha da sacola carrega o texto de gravação, e o item do evento não
 * pode levá-lo — o caso abaixo põe um nome de verdade na gravação e procura por ele no evento.
 */
const { trackSpy, catalogo } = vi.hoisted(() => ({
  trackSpy: vi.fn(),
  catalogo: { data: [] as unknown[] },
}))

vi.mock('@/shared/lib/analytics', async importOriginal => {
  const real = await importOriginal<typeof import('@/shared/lib/analytics')>()
  return { ...real, track: (e: unknown) => trackSpy(e) }
})
vi.mock('@estrelinha/core/hooks/usePromotions', () => ({
  useActivePromotions: () => ({ data: [], isLoading: false }),
}))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useShippingSettings: () => ({
    free_shipping_enabled: true,
    free_shipping_threshold: 1000,
    default_shipping_cost: 9.9,
    handling_days: 2,
  }),
}))
vi.mock('@/entities/product/api/useProducts', () => ({
  useAllProducts: () => ({ data: catalogo.data }),
}))
vi.mock('@/features/apply-coupon/ui/CouponInput', () => ({ default: () => null }))

import CartDrawer from '../CartDrawer'

const produto = (over: Partial<Product> = {}): Product =>
  ({
    id: 'p1',
    nuvemshop_id: 501,
    name: 'Pingente Estrela',
    slug: 'pingente-estrela',
    price: 120,
    compare_price: null,
    category_id: 'c1',
    category_slug: 'pingentes',
    description: '',
    image_url: '',
    images: [],
    options: [],
    variants: [],
    stock_policy: 'backorder',
    category_links: [],
    stock_total: 20,
    low_stock_threshold: 3,
    is_new: false,
    is_featured: false,
    tags: [],
    ...over,
  }) as Product

const renderGaveta = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<CartDrawer />} />
      </Routes>
    </MemoryRouter>,
  )

const eventos = (nome: string) =>
  trackSpy.mock.calls.map(c => c[0]).filter(e => e && (e as { name: string }).name === nome) as {
    params: { value: number; items: Record<string, unknown>[] }
  }[]

const abrir = () => act(() => useCartUiStore.getState().openCart())
const fechar = () => act(() => useCartUiStore.getState().closeCart())

/** Três unidades de uma linha com gravação. */
const tresComGravacao = () => {
  const p = produto()
  for (let i = 0; i < 3; i++) useCartStore.getState().addItem(p, '', '', undefined, 'Helena')
}

beforeEach(() => {
  trackSpy.mockClear()
  useCartStore.setState({ items: [] })
  useCartUiStore.setState({ open: false })
  useWishlistStore.setState({ items: [] })
  catalogo.data = []
})

describe('view_cart (EVT-07)', () => {
  it('abrir com itens ⇒ UM view_cart; mexer com ela aberta não repete', () => {
    tresComGravacao()
    renderGaveta()
    expect(eventos('view_cart')).toHaveLength(0)
    abrir()
    expect(eventos('view_cart')).toHaveLength(1)
    expect(eventos('view_cart')[0].params.items[0]).toMatchObject({ item_id: '501', quantity: 3 })
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar Pingente Estrela' }))
    expect(eventos('view_cart')).toHaveLength(1)
  })

  it('fechar e abrir de novo ⇒ outro view_cart', () => {
    tresComGravacao()
    renderGaveta()
    abrir()
    fechar()
    abrir()
    expect(eventos('view_cart')).toHaveLength(2)
  })

  it('abrir a sacola VAZIA ⇒ nenhum view_cart', () => {
    renderGaveta()
    abrir()
    expect(eventos('view_cart')).toHaveLength(0)
  })

  it('EVT-14: o texto da gravação não vai no item', () => {
    tresComGravacao()
    renderGaveta()
    abrir()
    expect(JSON.stringify(eventos('view_cart')[0])).not.toContain('Helena')
  })
})

describe('remove_from_cart (EVT-06)', () => {
  it('diminuir de 3 para 1 ⇒ remove_from_cart com quantity 2 (a retirada, não o que fica)', () => {
    tresComGravacao()
    renderGaveta()
    abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Diminuir Pingente Estrela' }))
    fireEvent.click(screen.getByRole('button', { name: 'Diminuir Pingente Estrela' }))
    const r = eventos('remove_from_cart')
    expect(r).toHaveLength(2)
    expect(r.map(e => e.params.items[0].quantity)).toEqual([1, 1])
    expect(useCartStore.getState().items[0].quantity).toBe(1)
  })

  it('a lixeira com 3 ⇒ UM evento com quantity 3, sem a gravação', () => {
    tresComGravacao()
    renderGaveta()
    abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Remover Pingente Estrela da sacola' }))
    const r = eventos('remove_from_cart')
    expect(r).toHaveLength(1)
    expect(r[0].params.items[0]).toMatchObject({ item_id: '501', quantity: 3, price: 120 })
    expect(r[0].params.value).toBe(360)
    expect(JSON.stringify(r[0])).not.toContain('Helena')
  })

  it('aumentar NÃO é remove_from_cart', () => {
    tresComGravacao()
    renderGaveta()
    abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar Pingente Estrela' }))
    expect(eventos('remove_from_cart')).toHaveLength(0)
  })
})

describe('a sugestão da sacola (EVT-05) e o coração da linha (EVT-08)', () => {
  it('adicionar pela sugestão ⇒ UM add_to_cart com quantity 1', () => {
    tresComGravacao()
    catalogo.data = [produto({ id: 'p2', nuvemshop_id: 502, name: 'Brinco Lua', slug: 'brinco-lua', price: 40 })]
    renderGaveta()
    abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Adicionar Brinco Lua à sacola' }))
    const a = eventos('add_to_cart')
    expect(a).toHaveLength(1)
    expect(a[0].params.items[0]).toMatchObject({ item_id: '502', quantity: 1, price: 40 })
  })

  it('favoritar pela linha ⇒ add_to_wishlist; desfavoritar ⇒ nada', () => {
    tresComGravacao()
    renderGaveta()
    abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Favoritar Pingente Estrela' }))
    expect(eventos('add_to_wishlist')).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'Remover Pingente Estrela dos favoritos' }))
    expect(eventos('add_to_wishlist')).toHaveLength(1)
  })
})
