import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { Product } from '@estrelinha/supabase/types'
import { useCartStore } from '@/entities/cart'
import { useCouponStore } from '@/entities/coupon'
import { useCheckoutStore } from '@/features/checkout/model/checkoutStore'

// O resumo do checkout REAL com uma peça de campanha e uma comum: o Subtotal é o de TABELA e o
// desconto da campanha tem a linha própria, "Desconto de campanha" — a mesma forma do pedido gravado
// (`orderSummary`, `core/orders/summary.ts`), para as duas telas mostrarem o mesmo subtotal. O total
// não muda: é apresentação. Só o supabase-js e as portas de fora são dublados.

const BLACK = {
  id: 'camp-black',
  name: 'Black Friday',
  badge_text: 'Black Friday',
  band_color: '#161514',
  accent_color: '#C2A063',
  ends_at: '2026-11-30T03:00:00.000Z',
}
const linhaDoBanco = (id: string, preco: number, campanha: number | null) => ({
  id,
  name: id,
  slug: id,
  base_price: preco,
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

const { createOrderMutateAsync } = vi.hoisted(() => ({ createOrderMutateAsync: vi.fn() }))
vi.mock('@/entities/order/api/useOrders', async () => ({
  ...(await vi.importActual<typeof import('@/entities/order/api/useOrders')>('@/entities/order/api/useOrders')),
  useCreateOrder: () => ({ mutateAsync: createOrderMutateAsync, isPending: false }),
}))
vi.mock('@/features/checkout/api/useCreatePayment', async () => ({
  ...(await vi.importActual<typeof import('@/features/checkout/api/useCreatePayment')>(
    '@/features/checkout/api/useCreatePayment',
  )),
  useCreatePayment: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/entities/customer', () => ({
  useSaveCustomerCpf: () => ({ mutateAsync: vi.fn().mockResolvedValue('39053344705'), isPending: false }),
}))
vi.mock('@/entities/address', () => ({
  // A gaveta da sacola (montada aqui) lê a cidade do CEP por este endereço; a página lê pelo
  // de `features/checkout`, dublado à parte.
  useCepLookup: () => ({ data: undefined }),
  useSaveAddress: () => ({ mutateAsync: vi.fn().mockResolvedValue({ saved: true }), isPending: false }),
  useDefaultAddress: () => ({ data: null }),
}))
vi.mock('@/entities/product/api/useProducts', () => ({
  useProductById: () => ({ data: null, isError: false }),
  useAllProducts: () => ({ data: [] }),
}))
vi.mock('@/features/checkout/api/useCepLookup', () => ({ useCepLookup: () => ({ data: undefined }) }))
vi.mock('@/features/checkout/api/useShippingQuote', () => ({
  useShippingQuote: () => ({
    data: [{ id: 1, name: 'PAC', company: 'Correios', price: '14.90', delivery_time: 6 }],
    isError: false,
    isLoading: false,
    isSuccess: true,
  }),
}))
vi.mock('@/features/checkout/api/useCardInstallments', () => ({
  useCardInstallments: () => ({ data: undefined, isError: false }),
}))
vi.mock('@/features/apply-coupon/ui/CouponInput', () => ({ default: () => null }))
vi.mock('@/features/checkout/ui/CardPaymentBrick', () => ({ default: () => null }))
vi.mock('@/features/auth', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/model/authUiStore')>(
    '@/features/auth/model/authUiStore',
  )
  return { useAuthUiStore: actual.useAuthUiStore, AuthOverlay: () => null }
})
vi.mock('@/features/auth/model/useAuthFlow', () => ({ useAuthFlow: () => ({ sendCode: vi.fn() }) }))
vi.mock('@/features/checkout/api/useAccountLookup', () => ({
  useAccountLookup: () => ({ check: vi.fn().mockResolvedValue(false) }),
}))
vi.mock('@/features/abandoned-cart/model/useAbandonedCartTracker', () => ({
  setGuestEmail: vi.fn(),
  markCartRecovered: vi.fn().mockResolvedValue(undefined),
  clearGuestEmail: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), message: vi.fn() } }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => ({
    pix_enabled: true,
    pix_discount_percent: 5,
    card_enabled: true,
    max_installments: 6,
    min_installment_value: 10,
  }),
  useCheckoutSettings: () => ({ order_bump_enabled: false, order_bump_product_id: null, order_bump_discount_percent: 0 }),
  useShippingSettings: () => ({
    free_shipping_enabled: false,
    free_shipping_threshold: 0,
    default_shipping_cost: 9.9,
    handling_days: 2,
  }),
  useStoreSettings: () => ({ data: undefined, isFetched: true }),
}))
vi.mock('@estrelinha/core/hooks/usePromotions', () => ({
  useActivePromotions: () => ({ data: [], isLoading: false }),
}))
vi.mock('@estrelinha/auth', () => ({
  useAuthContext: () => ({
    user: { id: 'u1', email: 'marina@email.com' },
    customer: { id: 'c1', name: 'Marina Yamashita', email: 'marina@email.com' },
    loading: false,
  }),
}))

import CheckoutPage from '@/pages/CheckoutPage'

const produto = (id: string, price: number, campaign: Product['campaign'] = null): Product =>
  ({
    id,
    name: id,
    slug: id,
    price,
    compare_price: null,
    category_id: '',
    category_slug: '',
    description: '',
    image_url: '',
    images: [],
    options: [],
    variants: [],
    stock_total: 10,
    low_stock_threshold: 1,
    is_new: false,
    is_featured: false,
    tags: [],
    campaign,
  }) as Product

const linhaDaSacola = (id: string, price: number, campaign: Product['campaign'] = null) => ({
  product: produto(id, price, campaign),
  size: '',
  finish: '',
  quantity: 1,
  variantId: null,
  variantLabel: '',
  optionValues: {},
  unitPrice: price,
})

// A pulseira de R$ 385,00 a 20 % na Black Friday: R$ 308,00.
const NA_CAMPANHA: Product['campaign'] = {
  ...BLACK,
  percent: 20,
  list_prices: { price: 385, compare_price: null, variants: {} },
}

const preencher = () => {
  const s = useCheckoutStore.getState()
  s.setContact({ name: 'Helena Prado', email: 'helena@email.com', whatsapp: '11987654321', consent: true })
  s.setAddress({
    cep: '04538-133',
    street: 'Av. Brigadeiro Faria Lima',
    number: '3477',
    complement: '',
    neighborhood: 'Itaim Bibi',
    city: 'São Paulo',
    state: 'SP',
    manual: false,
  })
  s.setShipping({
    serviceId: '1',
    serviceName: 'PAC',
    carrier: 'Correios',
    cost: 14.9,
    estimateMin: '2026-12-04',
    estimateMax: '2026-12-06',
  })
  s.setPayment({ method: 'pix', cpf: '390.533.447-05' })
}

const montar = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 5 * 60_000 } } })}>
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route path="/checkout" element={<CheckoutPage />} />
          <Route path="*" element={null} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )

// A coluna do resumo (≥1024px); a barra do celular abre recolhida e mostra o mesmo conteúdo.
const coluna = async () => {
  const heading = await screen.findByRole('heading', { name: 'Seu pedido' })
  return heading.closest('section') as HTMLElement
}

const semNbsp = (t: string | null | undefined) => (t ?? '').replace(/\u00a0/g, ' ')

beforeEach(() => {
  useCheckoutStore.getState().reset()
  useCouponStore.getState().clearCoupon()
  sessionStorage.clear()
  localStorage.clear()
})

describe('o resumo do checkout com a campanha de desconto', () => {
  it('Subtotal de tabela e a linha "Desconto de campanha", como no pedido; o total não muda', async () => {
    useCartStore.setState({
      items: [linhaDaSacola('pulseira-campanha', 308, NA_CAMPANHA), linhaDaSacola('pulseira-comum', 340)],
    })
    catalogo.rows = [linhaDoBanco('pulseira-campanha', 385, 20), linhaDoBanco('pulseira-comum', 340, null)]
    preencher()
    montar()

    const resumo = await coluna()
    // 385,00 + 340,00 = 725,00 de tabela; a campanha desconta 77,00 (20 % de 385,00).
    await waitFor(() =>
      expect(semNbsp(resumo.querySelector('[data-testid="summary-subtotal"]')?.textContent)).toBe('R$ 725,00'),
    )
    const linha = resumo.querySelector('[data-testid="summary-campaign"]')
    expect(semNbsp(linha?.textContent)).toBe('−R$ 77,00')
    expect(semNbsp(linha?.parentElement?.textContent)).toBe('Desconto de campanha−R$ 77,00')
    // 648,00 cobrado − PIX 5 % (32,40) + frete 14,90 = 630,50: o mesmo de antes do conserto.
    expect(semNbsp(resumo.querySelector('[data-testid="summary-total"]')?.textContent)).toBe('R$ 630,50')
  })

  it('sem peça de campanha a linha não existe e o Subtotal é o das peças', async () => {
    useCartStore.setState({ items: [linhaDaSacola('pulseira-comum', 340)] })
    catalogo.rows = [linhaDoBanco('pulseira-comum', 340, null)]
    preencher()
    montar()

    const resumo = await coluna()
    await waitFor(() =>
      expect(semNbsp(resumo.querySelector('[data-testid="summary-subtotal"]')?.textContent)).toBe('R$ 340,00'),
    )
    expect(resumo.querySelector('[data-testid="summary-campaign"]')).toBeNull()
    expect(resumo.textContent).not.toMatch(/Desconto de campanha/)
    // 340,00 − PIX 5 % (17,00) + frete 14,90 = 337,90.
    expect(semNbsp(resumo.querySelector('[data-testid="summary-total"]')?.textContent)).toBe('R$ 337,90')
  })
})
