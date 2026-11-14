import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query'
import type { Product } from '@estrelinha/supabase/types'
import { useCartStore } from '@/entities/cart'
import { useCouponStore } from '@/entities/coupon'
import { useCheckoutStore } from '@/features/checkout/model/checkoutStore'
import { OrderDiscountChangedError } from '@/entities/order/api/useOrders'

// O checkout REAL com a campanha de desconto, sobre a leitura real da sacola (`useCartBuyTogether` +
// a releitura do catálogo): só o supabase-js e as portas de fora (criar pedido, cotação, settings,
// sessão) são dublados. Prova as duas coisas que só a página junta:
//  - ao voltar o foco à aba, o checkout relê o catálogo e o resumo passa a mostrar o preço de agora;
//  - o 422 do `create-order` (a campanha acabou entre a sacola e o pedido) relê a sacola e mostra o
//    total NOVO, recalculado por esta tela — nada é gravado.

const BLACK = {
  id: 'camp-black',
  name: 'Black Friday',
  badge_text: 'Black Friday',
  band_color: '#161514',
  accent_color: '#C2A063',
  ends_at: '2026-11-30T03:00:00.000Z',
}
const linhaDoBanco = (campanha: number | null) => ({
  id: 'p-black',
  name: 'Pingente Estrela',
  slug: 'pingente-estrela',
  base_price: 209.9,
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

const produto = (price: number, campaign: Product['campaign'] = null): Product =>
  ({
    id: 'p-black',
    name: 'Pingente Estrela',
    slug: 'pingente-estrela',
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

const NA_CAMPANHA: Product['campaign'] = {
  ...BLACK,
  percent: 20,
  list_prices: { price: 209.9, compare_price: null, variants: {} },
}

const naSacola = (price: number, campaign: Product['campaign']) =>
  useCartStore.setState({
    items: [
      {
        product: produto(price, campaign),
        size: '',
        finish: '',
        quantity: 1,
        variantId: null,
        variantLabel: '',
        optionValues: {},
        unitPrice: price,
      },
    ],
  })

const preencher = () => {
  const s = useCheckoutStore.getState()
  s.setContact({ name: 'Marina Yamashita', email: 'marina@email.com', whatsapp: '11987654321', consent: true })
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

const semNbsp = (t: string | null | undefined) => (t ?? '').replace(/\u00a0/g, ' ')
const cta = () => screen.getByRole('button', { name: /pagar/i })

beforeEach(() => {
  useCheckoutStore.getState().reset()
  useCouponStore.getState().clearCoupon()
  sessionStorage.clear()
  localStorage.clear()
  createOrderMutateAsync.mockReset()
})

describe('o checkout com a campanha de desconto', () => {
  it('relê o catálogo ao voltar o foco à aba: a campanha que começou aparece no resumo e no total', async () => {
    // A peça entrou na sacola antes do início da campanha; a leitura ao abrir ainda não tem campanha.
    naSacola(209.9, null)
    catalogo.rows = [linhaDoBanco(null)]
    preencher()
    montar()
    await waitFor(() => expect(semNbsp(cta().textContent)).toMatch(/R\$ 214,30/))
    expect(screen.queryByTestId('summary-item-campaign')).not.toBeInTheDocument()

    // A campanha começou. Ao voltar à aba, a releitura traz o preço dela.
    catalogo.rows = [linhaDoBanco(20)]
    act(() => {
      focusManager.setFocused(false)
      focusManager.setFocused(true)
    })
    const preco = await screen.findAllByTestId('summary-item-campaign')
    expect(semNbsp(preco[0].textContent)).toBe('R$ 209,90R$ 167,92')
    // 167,92 − PIX (8,40) + frete 14,90 = 174,42.
    await waitFor(() => expect(semNbsp(cta().textContent)).toMatch(/R\$ 174,42/))
    focusManager.setFocused(undefined)
  })

  it('o 422 do create-order (a campanha acabou) relê a sacola e mostra o total novo, sem gravar nada', async () => {
    naSacola(167.92, NA_CAMPANHA)
    catalogo.rows = [linhaDoBanco(20)]
    preencher()
    montar()
    await waitFor(() => expect(semNbsp(cta().textContent)).toMatch(/R\$ 174,42/))

    // A campanha acaba entre a sacola e o pedido: o servidor recusa e a próxima leitura vem sem ela.
    catalogo.rows = [linhaDoBanco(null)]
    createOrderMutateAsync.mockRejectedValueOnce(
      new OrderDiscountChangedError('Um desconto deste pedido mudou. Nada foi cobrado.', 174.42),
    )
    fireEvent.click(cta())

    const alerta = await screen.findByRole('alert', { name: 'O valor do seu pedido mudou' })
    expect(semNbsp(within(alerta).getByText('Antes').nextElementSibling?.textContent)).toBe('R$ 174,42')
    // 209,90 − PIX (10,50) + frete 14,90 = 214,30 — o total que esta tela recalculou, não o do servidor.
    await waitFor(() =>
      expect(semNbsp(within(alerta).getByText('Agora').nextElementSibling?.textContent)).toBe('R$ 214,30'),
    )
    expect(useCheckoutStore.getState().orderId).toBeNull()
    expect(useCartStore.getState().items[0].unitPrice).toBe(209.9)
  })
})
