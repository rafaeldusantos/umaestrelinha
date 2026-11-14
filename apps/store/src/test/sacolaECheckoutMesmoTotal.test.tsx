import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import type { Product } from '@estrelinha/supabase/types'
import type { ProgressivePromotion } from '@estrelinha/core/payment/pricing'
import { supabase } from '@estrelinha/supabase/client'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { useCartUiStore } from '@/entities/cart/model/cartUiStore'
import { useCouponStore } from '@/entities/coupon'
import { useCheckoutStore } from '@/features/checkout/model/checkoutStore'

// A mesma sacola, o mesmo CEP e a mesma opção dão o MESMO Total na gaveta e no checkout.
//
// As duas telas são montadas de verdade, uma depois da outra, como a cliente as percorre: a gaveta
// calcula o frete e marca a opção no rascunho do checkout; o bloco Entrega e o resumo do checkout
// abrem sobre esse rascunho. As stores são as reais (`useCartStore`, `useCheckoutStore`,
// `useCouponStore`), e a regra do frete grátis, a lista de opções e o total também. Só o que vem de
// fora é dublado: a cotação (no client, `functions.invoke`), a busca do CEP (no `fetch`) e a
// configuração da loja.

vi.mock('@estrelinha/supabase/client', () => ({
  supabase: { functions: { invoke: vi.fn() } },
}))
vi.mock('@/entities/cart/api/useCartBuyTogether', () => ({
  useCartBuyTogether: () => ({ config: null, mainNames: new Map() }),
}))
const promocoes = vi.hoisted(() => ({ atual: [] as unknown[] }))
vi.mock('@estrelinha/core/hooks/usePromotions', () => ({
  useActivePromotions: () => ({ data: promocoes.atual, isLoading: false }),
}))
vi.mock('@/entities/product/api/useProducts', () => ({
  useAllProducts: () => ({ data: [] }),
  useProductById: () => ({ data: null, isError: false }),
}))
vi.mock('@/entities/address/api/useDefaultAddress', () => ({
  useDefaultAddress: () => ({ data: null }),
}))
vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => ({ user: null, customer: null, loading: false }) }))
vi.mock('@/features/apply-coupon/ui/CouponInput', () => ({ default: () => null }))
vi.mock('@/features/checkout/api/useCardInstallments', () => ({
  useCardInstallments: () => ({ data: undefined, isError: false }),
}))

const settings = vi.hoisted(() => ({
  shipping: {} as Record<string, unknown>,
  material: {} as Record<string, unknown>,
}))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useShippingSettings: () => settings.shipping,
  usePaymentSettings: () => ({
    pix_enabled: true,
    pix_discount_percent: 5,
    card_enabled: false,
    max_installments: 1,
    min_installment_value: 10,
  }),
  useCheckoutSettings: () => ({
    order_bump_enabled: false,
    order_bump_product_id: null,
    order_bump_discount_percent: 0,
  }),
  useStoreSettings: () => ({
    data: { shipping: settings.shipping, material: settings.material },
    isFetched: true,
  }),
}))

import CartDrawer from '@/widgets/cart-drawer/ui/CartDrawer'
import DeliveryBlock from '@/features/checkout/ui/DeliveryBlock'
import OrderSummary from '@/features/checkout/ui/OrderSummary'

const invoke = vi.mocked(supabase.functions.invoke)

const SP = '01310-100'
const RS = '90010-000'
const BA = '40020-000'

const PAC = { id: 1, name: 'PAC', company: 'Correios', price: '21.50', delivery_range: { min: 4, max: 6 } }
const SEDEX = { id: 2, name: 'SEDEX', company: 'Correios', price: '35.00', delivery_range: { min: 1, max: 2 } }

const pingente = {
  id: 'p1',
  name: 'Pingente Estrela',
  slug: 'pingente-estrela',
  price: 100,
  compare_price: null,
  category_id: '',
  category_slug: '',
  description: '',
  image_url: '',
  images: [],
  options: [],
  variants: [],
  stock_policy: 'track',
  stock_total: 20,
  low_stock_threshold: 3,
  is_new: false,
  is_featured: false,
  tags: [],
} as unknown as Product

/** Duas unidades a R$ 100,00: acima da faixa de R$ 150,00. */
const sacolaAcimaDaFaixa = () =>
  useCartStore.setState({
    items: [
      {
        product: pingente,
        size: '',
        finish: '',
        variantId: null,
        variantLabel: '',
        optionValues: {},
        unitPrice: 100,
        quantity: 2,
      },
    ],
  })

const semNbsp = (t: string | null | undefined) => (t ?? '').replace(/\u00a0/g, ' ')

// O mesmo cliente nas duas telas, como na loja: o checkout lê a cotação que a gaveta já pediu.
let client: QueryClient

/** A gaveta com o CEP calculado e a opção marcada: o que ela mostra, e o Total. */
async function naGaveta(cep: string) {
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/']}>
        <CartDrawer />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  act(() => useCartUiStore.getState().openCart())
  fireEvent.change(screen.getByRole('textbox', { name: 'CEP para calcular o frete e o prazo' }), {
    target: { value: cep },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Calcular' }))

  const gaveta = screen.getByRole('dialog')
  await within(gaveta).findAllByRole('radio')
  await waitFor(() => expect(useCheckoutStore.getState().shipping?.serviceId).toBe('1'))
  const pac = within(gaveta)
    .getAllByRole('radio')
    .find((r) => r.textContent?.includes('PAC · Correios'))!
  const total = semNbsp(
    within(gaveta).getByText('Total', { selector: 'dt' }).nextElementSibling?.textContent,
  )
  const leitura = {
    texto: semNbsp(gaveta.textContent),
    pacMarcado: pac.getAttribute('aria-checked'),
    pacGratis: pac.textContent?.includes('Grátis') ?? false,
    pacRiscado: Array.from(pac.querySelectorAll('.line-through')).map((n) => semNbsp(n.textContent)),
    barra: within(gaveta).queryByRole('progressbar'),
    total,
  }
  act(() => useCartUiStore.getState().closeCart())
  cleanup()
  return leitura
}

/** O checkout aberto sobre o rascunho que a gaveta deixou: o bloco Entrega e o resumo. */
async function noCheckout() {
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/checkout']}>
        <DeliveryBlock open complete={false} onEdit={() => {}} onContinue={() => {}} canContinue={false} />
        <OrderSummary variant="sidebar" />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  await screen.findAllByRole('radio')
  const pac = screen
    .getAllByRole('radio')
    .find((r) => r.textContent?.includes('PAC · Correios'))!
  const resumo = screen.getByRole('region', { name: 'Resumo do pedido' })
  return {
    resumo: semNbsp(resumo.textContent),
    pacMarcado: pac.getAttribute('aria-checked'),
    pacGratis: pac.textContent?.includes('Grátis') ?? false,
    pacRiscado: Array.from(pac.querySelectorAll('.line-through')).map((n) => semNbsp(n.textContent)),
    total: semNbsp(within(resumo).getByTestId('summary-total').textContent),
  }
}

beforeEach(() => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 5 * 60 * 1000 } } })
  invoke.mockReset()
  invoke.mockResolvedValue({ data: [PAC, SEDEX], error: null } as never)
  promocoes.atual = []
  useCheckoutStore.getState().reset()
  useCouponStore.getState().clearCoupon()
  useCartUiStore.setState({ open: false })
  sessionStorage.clear()
  localStorage.clear()
  sacolaAcimaDaFaixa()
  settings.shipping = {
    free_shipping_enabled: true,
    free_shipping_threshold: 150,
    free_shipping_regions: ['sul', 'sudeste'],
    default_shipping_cost: 9.9,
    handling_days: 2,
    pickup_enabled: true,
  }
  settings.material = {
    recipient: 'Adri',
    street: 'Rua dos Andradas',
    number: '100',
    complement: '',
    neighborhood: 'Centro Histórico',
    city: 'Porto Alegre',
    state: 'RS',
    zip: '90020-000',
    notes: '',
  }
  vi.stubGlobal(
    'fetch',
    vi.fn(async () => ({
      ok: true,
      json: async () => ({ logradouro: 'Rua de Teste', bairro: 'Centro', localidade: 'Cidade', uf: 'SP' }),
    })),
  )
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('a gaveta e o checkout dão o mesmo Total', () => {
  it.each([
    ['SP', SP],
    ['RS', RS],
  ])(
    'CEP de %s acima da faixa, frete grátis para Sul e Sudeste: "liberado", a mais barata "Grátis" riscada e o Total sem frete nas duas',
    async (_, cep) => {
      const gaveta = await naGaveta(cep)
      expect(gaveta.texto).toContain('Frete grátis liberado')
      expect(gaveta.pacMarcado).toBe('true')
      expect(gaveta.pacGratis).toBe(true)
      expect(gaveta.pacRiscado).toEqual(['R$ 21,50'])
      expect(gaveta.total).toBe('R$ 200,00')

      const checkout = await noCheckout()
      expect(checkout.resumo).toContain('Frete grátis liberado')
      expect(checkout.pacMarcado).toBe('true')
      expect(checkout.pacGratis).toBe(true)
      expect(checkout.pacRiscado).toEqual(['R$ 21,50'])
      expect(checkout.total).toBe('R$ 200,00')
      expect(checkout.total).toBe(gaveta.total)
    },
  )

  it('CEP da BA acima da faixa: "só para Sul e Sudeste", sem barra, e o frete cotado no Total das duas', async () => {
    const gaveta = await naGaveta(BA)
    expect(gaveta.texto).toContain('Frete grátis só para Sul e Sudeste')
    expect(gaveta.texto).not.toContain('Frete grátis liberado')
    expect(gaveta.barra).toBeNull()
    expect(gaveta.pacMarcado).toBe('true')
    expect(gaveta.pacGratis).toBe(false)
    // 2 × 100,00 + 21,50 do PAC.
    expect(gaveta.total).toBe('R$ 221,50')

    const checkout = await noCheckout()
    expect(checkout.resumo).toContain('Frete grátis só para Sul e Sudeste')
    expect(checkout.resumo).not.toContain('Frete grátis liberado')
    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(checkout.pacMarcado).toBe('true')
    expect(checkout.pacGratis).toBe(false)
    expect(checkout.total).toBe('R$ 221,50')
    expect(checkout.total).toBe(gaveta.total)
  })

  it('com cupom e promoção, a mesma opção dá o mesmo Total, com o frete somado', async () => {
    // 10 % a partir de 2 unidades, acumulando com o cupom.
    const dezPorCentoEmDuas: ProgressivePromotion = {
      id: 'promo-10',
      discount_kind: 'percent',
      tiers: [{ min_qty: 2, value: 10 }],
      scope: 'categories',
      eligibleProductIds: ['p1'],
      stacks_with_coupon: true,
      created_at: '2026-01-01T00:00:00Z',
    }
    promocoes.atual = [dezPorCentoEmDuas]
    useCouponStore.getState().setCoupon({
      id: 'c1',
      code: 'SAUDADE',
      type: 'fixed',
      value: 20,
      discount: 20,
      freeShipping: false,
    })

    const gaveta = await naGaveta(BA)
    expect(gaveta.pacMarcado).toBe('true')
    // 200,00 − 20,00 da promoção − 20,00 do cupom + 21,50 do PAC.
    expect(gaveta.total).toBe('R$ 181,50')

    const checkout = await noCheckout()
    expect(checkout.pacMarcado).toBe('true')
    expect(checkout.resumo).toContain('Cupom SAUDADE')
    expect(checkout.total).toBe('R$ 181,50')
    expect(checkout.total).toBe(gaveta.total)
  })
})
