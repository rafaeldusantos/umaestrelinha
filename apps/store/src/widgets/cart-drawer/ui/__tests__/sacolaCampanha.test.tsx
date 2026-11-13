import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Product } from '@estrelinha/supabase/types'
import type { ProgressivePromotion } from '@estrelinha/core/payment/pricing'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { useCartUiStore } from '@/entities/cart/model/cartUiStore'
import { useCouponStore } from '@/entities/coupon'

// A sacola com a campanha de desconto, pela gaveta real e pela leitura real da sacola
// (`useCartBuyTogether` + a releitura do catálogo): a peça posta ANTES do início da campanha passa a
// mostrar o preço da campanha quando a releitura chega, e a promoção progressiva não conta a peça de
// campanha. Só o supabase-js é dublado — a resposta é a do PostgREST com o embed das campanhas.

const BLACK = {
  id: 'camp-black',
  name: 'Black Friday',
  badge_text: 'Black Friday',
  band_color: '#161514',
  accent_color: '#C2A063',
  ends_at: '2026-11-30T03:00:00.000Z',
}

const linhaDoBanco = (id: string, base_price: number, campanha: number | null) => ({
  id,
  name: id === 'p-black' ? 'Pingente Estrela' : 'Corrente',
  slug: id,
  base_price,
  original_price: null,
  images: [],
  options: [],
  product_variants: [],
  stock_policy: 'track',
  stock_total: 10,
  low_stock_threshold: 1,
  product_campaigns: campanha ? [{ percent: campanha, campaigns: BLACK }] : [],
})

const catalogo = vi.hoisted(() => ({ rows: [] as unknown[] }))
vi.mock('@estrelinha/supabase/client', () => ({
  supabase: {
    from: (tabela: string) => ({
      select: () => ({
        in: () => {
          const resposta = { data: tabela === 'products' ? catalogo.rows : [], error: null }
          return Object.assign(Promise.resolve(resposta), { order: () => Promise.resolve(resposta) })
        },
      }),
    }),
  },
}))

const active: { data: ProgressivePromotion[] } = { data: [] }
vi.mock('@estrelinha/core/hooks/usePromotions', () => ({
  useActivePromotions: () => ({ data: active.data, isLoading: false }),
}))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useShippingSettings: () => ({
    free_shipping_enabled: false,
    free_shipping_threshold: 0,
    default_shipping_cost: 9.9,
    handling_days: 2,
  }),
}))
vi.mock('@/entities/product/api/useProducts', () => ({ useAllProducts: () => ({ data: [] }) }))
vi.mock('@/features/apply-coupon/ui/CouponInput', () => ({ default: () => null }))

import CartDrawer from '../CartDrawer'

const produto = (id: string, price: number): Product =>
  ({
    id,
    name: id === 'p-black' ? 'Pingente Estrela' : 'Corrente',
    slug: id,
    price,
    compare_price: null,
    category_id: 'c1',
    category_slug: 'joias',
    description: '',
    image_url: '',
    images: [],
    options: [],
    variants: [],
    stock_policy: 'track',
    category_links: [],
    stock_total: 10,
    low_stock_threshold: 1,
    is_new: false,
    is_featured: false,
    tags: [],
    campaign: null,
  }) as Product

const linha = (id: string, price: number, quantity = 1) => ({
  product: produto(id, price),
  size: '',
  finish: '',
  variantId: null,
  variantLabel: '',
  optionValues: {},
  unitPrice: price,
  quantity,
})

const montar = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>
        <CartDrawer />
      </MemoryRouter>
    </QueryClientProvider>,
  )

const semNbsp = (t: string | null | undefined) => (t ?? '').replace(/\u00a0/g, ' ')

beforeEach(() => {
  useCouponStore.getState().clearCoupon()
  useCartUiStore.setState({ open: false })
  active.data = []
})

describe('a sacola com a campanha de desconto', () => {
  it('a peça posta antes do início mostra o preço da campanha depois da releitura', async () => {
    useCartStore.setState({ items: [linha('p-black', 209.9)] as never })
    catalogo.rows = [linhaDoBanco('p-black', 209.9, 20)]
    montar()
    act(() => useCartUiStore.getState().openCart())

    const preco = await screen.findByTestId('preco-campanha')
    expect(semNbsp(preco.textContent)).toBe('R$ 209,90R$ 167,92')
    expect(screen.getByText('de R$ 209,90 por R$ 167,92', { normalizer: (t) => semNbsp(t).trim() })).toBeInTheDocument()
    const row = screen.getAllByRole('listitem')[0]
    expect(within(row).getByRole('img', { name: 'Black Friday, 20% de desconto' })).toBeInTheDocument()
    // A sacola persistida passou a dizer o preço de agora.
    expect(useCartStore.getState().items[0].unitPrice).toBe(167.92)
  })

  it('a campanha que acabou: a releitura devolve o preço de sempre e tira o selo', async () => {
    const naHora = { ...linha('p-black', 167.92), product: { ...produto('p-black', 167.92) } }
    useCartStore.setState({ items: [naHora] as never })
    catalogo.rows = [linhaDoBanco('p-black', 209.9, null)]
    montar()
    act(() => useCartUiStore.getState().openCart())

    await waitFor(() => expect(useCartStore.getState().items[0].unitPrice).toBe(209.9))
    expect(screen.queryByTestId('preco-campanha')).not.toBeInTheDocument()
    expect(screen.queryByTestId('selo-em-linha')).not.toBeInTheDocument()
  })

  it('a frase da próxima faixa da promoção ignora a peça de campanha', async () => {
    active.data = [
      {
        id: 'tres-por',
        discount_kind: 'unit_price',
        tiers: [{ min_qty: 3, value: 50 }],
        scope: 'all',
        eligibleProductIds: [],
        stacks_with_coupon: false,
        created_at: '2026-10-01T00:00:00.000Z',
        name: 'Três por',
      } as ProgressivePromotion,
    ]
    useCartStore.setState({ items: [linha('p-black', 209.9), linha('p-comum', 100, 1)] as never })
    catalogo.rows = [linhaDoBanco('p-black', 209.9, 20), linhaDoBanco('p-comum', 100, null)]
    montar()
    act(() => useCartUiStore.getState().openCart())

    await screen.findByTestId('preco-campanha')
    // Uma peça comum: faltam DUAS para a faixa de 3 — a de campanha não conta.
    expect(screen.getByText(/Falta/).textContent).toMatch(/2/)
  })
})
