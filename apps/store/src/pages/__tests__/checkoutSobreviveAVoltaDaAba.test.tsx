// Feature 72, fecho da verificação r3 da Fase 6 (lacuna 5) — o `CheckoutPage` REAL, sob o
// `AuthProvider` REAL, sobre o supabase-js REAL (`src/test/clientReal.ts`).
//
// O checkout desenha "Carregando..." no lugar da página inteira enquanto `loading` é verdadeiro
// (`CheckoutPage.tsx`), igual à conta. Desmontá-lo leva junto o Brick do cartão e o que a cliente já
// preencheu. Até aqui ele só era protegido pela régua da conta (`contaSobreviveAVoltaDaAba`), por ler
// o mesmo `loading`; esta é a régua própria. A regra: o `SIGNED_IN` que o supabase-js emite a cada
// volta da aba, para o MESMO usuário, nunca mexe em `loading` — com o papel falhando (ele é
// reperguntado) e com o papel `admin` já conferido. Relógio falso, sem rede.
//
// Só a fronteira de dados da página é dublada (o molde de `CheckoutPage.test.tsx`); o contexto de
// auth e o client são os de verdade.
import { act, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Product } from '@estrelinha/supabase/types'
import { AuthProvider } from '@estrelinha/auth'
import { useCartStore } from '@/entities/cart'
import { useCheckoutStore } from '@/features/checkout/model/checkoutStore'
import { real } from '@/test/clientReal'
import CheckoutPage from '../CheckoutPage'

vi.mock('@estrelinha/supabase/client', async () => ({ supabase: (await import('@/test/clientReal')).supabaseProxy }))

vi.mock('@/entities/order/api/useOrders', async () => ({
  ...(await vi.importActual<typeof import('@/entities/order/api/useOrders')>('@/entities/order/api/useOrders')),
  useCreateOrder: () => ({ mutateAsync: vi.fn(), isPending: false }),
}))
vi.mock('@/features/checkout/api/useCreatePayment', () => ({
  useCreatePayment: () => ({ mutateAsync: vi.fn(), isPending: false }),
  PAYMENT_UNAVAILABLE_MESSAGE: 'Não foi possível iniciar o pagamento. Tente novamente.',
}))
vi.mock('@/entities/customer', () => ({ useSaveCustomerCpf: () => ({ mutateAsync: vi.fn(), isPending: false }) }))
vi.mock('@/entities/address', () => ({
  useSaveAddress: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDefaultAddress: () => ({ data: null }),
}))
vi.mock('@/entities/product/api/useProducts', () => ({
  useProductById: () => ({ data: null, isError: false }),
  useAllProducts: () => ({ data: [] }),
}))
vi.mock('@/features/checkout/api/useCepLookup', () => ({ useCepLookup: () => ({ data: undefined }) }))
vi.mock('@/features/checkout/api/useShippingQuote', () => ({
  useShippingQuote: () => ({ data: [], isError: false, isLoading: false, isSuccess: true }),
}))
vi.mock('@/features/checkout/api/useCardInstallments', () => ({ useCardInstallments: () => ({ data: [], isError: false }) }))
vi.mock('@/features/apply-coupon/ui/CouponInput', () => ({ default: () => null }))
vi.mock('@/features/checkout/ui/CardPaymentBrick', () => ({ default: () => <div data-testid="card-brick" /> }))
vi.mock('@/features/auth', async () => {
  const actual = await vi.importActual<typeof import('@/features/auth/model/authUiStore')>('@/features/auth/model/authUiStore')
  return { useAuthUiStore: actual.useAuthUiStore, AuthOverlay: () => null }
})
vi.mock('@/features/auth/model/useAuthFlow', () => ({ useAuthFlow: () => ({ sendCode: vi.fn() }) }))
vi.mock('@/features/auth/ui/steps/AuthCodeStep', () => ({ default: () => null }))
vi.mock('@/features/checkout/api/useAccountLookup', () => ({ useAccountLookup: () => ({ check: vi.fn().mockResolvedValue(false) }) }))
vi.mock('@/features/abandoned-cart/model/useAbandonedCartTracker', () => ({
  setGuestEmail: vi.fn(),
  markCartRecovered: vi.fn().mockResolvedValue(undefined),
  clearGuestEmail: vi.fn(),
}))
vi.mock('sonner', () => ({ toast: { error: vi.fn(), success: vi.fn(), message: vi.fn() } }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => ({ pix_enabled: true, pix_discount_percent: 5, card_enabled: true, max_installments: 6, min_installment_value: 10 }),
  useCheckoutSettings: () => ({ order_bump_enabled: false, order_bump_product_id: null, order_bump_discount_percent: 50 }),
  useShippingSettings: () => ({ free_shipping_enabled: true, free_shipping_threshold: 150, default_shipping_cost: 9.9, handling_days: 2 }),
  useStoreSettings: () => ({ data: undefined, isFetched: true }),
}))
vi.mock('@estrelinha/core/hooks/usePromotions', () => ({ useActivePromotions: () => ({ data: [], isLoading: false }) }))

const ROLES = '/rest/v1/user_roles'
const andar = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

const PECA = {
  id: 'p1',
  name: 'Pingente Estrela',
  slug: 'pingente-estrela',
  price: 50,
  compare_price: null,
  category_id: '',
  category_slug: '',
  description: '',
  image_url: '',
  images: [{ url: 'estrela.png', alt: null, source: 'upload' }],
  stock_total: 10,
  low_stock_threshold: 5,
  is_new: false,
  is_featured: false,
  tags: [],
} as unknown as Product

const montar = () =>
  render(
    <AuthProvider>
      <MemoryRouter initialEntries={['/checkout']}>
        <Routes>
          <Route path="/checkout" element={<CheckoutPage />} />
        </Routes>
      </MemoryRouter>
    </AuthProvider>,
  )

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(console, 'error').mockImplementation(() => {})
  vi.spyOn(console, 'warn').mockImplementation(() => {})
  useCheckoutStore.getState().reset()
  sessionStorage.clear()
  globalThis.localStorage.clear()
  useCartStore.setState({
    items: [{ product: PECA, size: '', finish: '', quantity: 2, variantId: null, variantLabel: '', optionValues: {}, unitPrice: 50 }],
  })
})
afterEach(() => {
  real.atual?.client.auth.stopAutoRefresh()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('o checkout continua montado através da volta da aba (SIGNED_IN do mesmo usuário)', () => {
  for (const papel of ['falha', 'admin'] as const) {
    it(`papel ${papel}: nenhum "Carregando..." e a região "Contato" é o MESMO nó`, async () => {
      const r = real.criar({ sessao: 'valida', papel, cadastro: 'ok' })
      montar()
      await andar(9000)
      expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
      const contato = screen.getByRole('region', { name: 'Contato' })
      const papelAntes = r.quantos(ROLES)
      const signedIn = () => r.eventos.filter((e) => e === 'SIGNED_IN:com').length
      const antes = signedIn()

      r.estado.atrasoMs = 500 // a repergunta demora: é a janela em que o defeito desmontava a página
      r.voltarAba()
      for (let t = 0; t < 1200; t += 50) {
        await andar(50)
        expect(screen.queryByText('Carregando...')).not.toBeInTheDocument()
      }

      expect(signedIn()).toBe(antes + 1) // o evento da volta da aba saiu
      // Com o papel falhando ele é reperguntado; com `admin` conferido, não.
      expect(r.quantos(ROLES)).toBe(papel === 'falha' ? papelAntes + 1 : papelAntes)
      expect(screen.getByRole('region', { name: 'Contato' })).toBe(contato)
    })
  }

  // A régua de cima só vale se ela ENXERGA o "Carregando...": a entrada de uma identidade nova
  // (alguém entra no meio do checkout) paga `loading`, e a mesma vigia em passos de 50 ms o vê.
  it('VIZINHA — uma identidade NOVA (entrar no meio do checkout) mostra "Carregando..." na mesma vigia', async () => {
    const r = real.criar({ sessao: 'ausente', papel: 'not-admin', cadastro: 'ok' })
    montar()
    await andar(2000)
    expect(screen.getByRole('region', { name: 'Contato' })).toBeInTheDocument()
    r.estado.atrasoMs = 500
    await act(async () => {
      await r.client.auth.signInWithPassword({ email: 'marina@exemplo.invalid', password: 'senha-certa' })
    })
    let viu = false
    for (let t = 0; t < 1200; t += 50) {
      await andar(50)
      if (screen.queryByText('Carregando...')) viu = true
    }
    expect(viu).toBe(true)
    expect(screen.queryByText('Carregando...')).not.toBeInTheDocument() // e sai dele ao resolver
  })
})
