import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Product } from '@estrelinha/supabase/types'
import type { BuyTogetherDiscountConfig } from '@estrelinha/core/buy-together'
import type { ProgressivePromotion } from '@estrelinha/core/payment/pricing'
import { formatPrice } from '@estrelinha/core/formatters'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { useCartUiStore } from '@/entities/cart/model/cartUiStore'
import { useCouponStore } from '@/entities/coupon'

// O selo "<código> aplicado −R$ X" e a linha "Cupom <código>" do rodapé da gaveta dizem o MESMO
// valor, e os dois acompanham a sacola. O `CouponInput` é o real: o que se prova é a fiação entre o
// valor que `resolveOrderPricing` devolve e o selo. Só a leitura da configuração do Compre Junto é
// dublada (é uma consulta, e a gaveta é montada sem `QueryClientProvider`).

const leitura: { atual: { config: BuyTogetherDiscountConfig | null; mainNames: Map<string, string> } } = {
  atual: { config: null, mainNames: new Map() },
}
vi.mock('@/entities/cart/api/useCartBuyTogether', () => ({
  useCartBuyTogether: () => leitura.atual,
}))
const promocoes: { atual: ProgressivePromotion[] } = { atual: [] }
vi.mock('@estrelinha/core/hooks/usePromotions', () => ({
  useActivePromotions: () => ({ data: promocoes.atual, isLoading: false }),
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

import CartDrawer from '../CartDrawer'

const brl = (v: number) => formatPrice(v).replace(/\s/g, ' ')
const normal = (s: string | null | undefined) => (s ?? '').replace(/\s/g, ' ')

const peca = (id: string, name: string, price: number): Product =>
  ({
    id, name, slug: id, price, compare_price: null, category_id: 'c', category_slug: 'x',
    description: '', image_url: '', images: [], options: [], variants: [], stock_policy: 'none',
    category_links: [], stock_total: 9, low_stock_threshold: 1, is_new: false, is_featured: false, tags: [],
  }) as unknown as Product

const joia = peca('joia', 'Pingente Estrela', 300)
const corrente = peca('corrente', 'Corrente Prata', 79)

const comDesconto = {
  config: {
    addons: [
      {
        id: 'a1',
        mainProductId: 'joia',
        position: 0,
        kind: 'product' as const,
        targetProductId: 'corrente',
        listId: null,
        targetVariantIds: [],
        hiddenOnVariantIds: [],
        discountPercent: 10,
      },
    ],
    lists: [],
  },
  mainNames: new Map([['joia', 'Pingente Estrela']]),
}

/** O cupom como o `validateCoupon` o devolveu: com o desconto calculado na hora, sobre o cheio. */
const aplicar = (discount: number) =>
  useCouponStore.getState().setCoupon({
    id: 'c1',
    code: 'QA15',
    type: 'percent',
    value: 15,
    discount,
    freeShipping: false,
  })

const abrir = () => {
  render(
    <MemoryRouter>
      <CartDrawer />
    </MemoryRouter>,
  )
  act(() => useCartUiStore.getState().openCart())
}

const gaveta = () => screen.getByRole('dialog')
const selo = () => normal(within(gaveta()).getByText('QA15 aplicado').nextElementSibling?.textContent)
const linha = () => normal(within(gaveta()).getByText('Cupom QA15').nextElementSibling?.textContent)

beforeEach(() => {
  leitura.atual = comDesconto
  promocoes.atual = []
  useCartStore.setState({ items: [] })
  useCartUiStore.setState({ open: false })
  useCouponStore.getState().clearCoupon()
})

describe('o selo do cupom na gaveta', () => {
  it('com desconto do Compre Junto, o selo diz o valor da linha: 15% do subtotal já com o casado', () => {
    useCartStore.getState().addItems([
      { product: joia },
      { product: corrente, accompanies: { mainProductId: 'joia', listId: null } },
    ])
    // 15% × 379 = 56,85: o valor da hora da aplicação, sem o casado.
    aplicar(56.85)
    abrir()

    // 379 − 7,90 = 371,10; 15% = 55,665 → 55,67.
    expect(linha()).toBe(`−${brl(55.67)}`)
    expect(selo()).toBe(linha())
  })

  it('quando a sacola muda, o selo acompanha a linha', () => {
    useCartStore.getState().addItems([
      { product: joia },
      { product: corrente, accompanies: { mainProductId: 'joia', listId: null } },
    ])
    aplicar(56.85)
    abrir()

    act(() => useCartStore.getState().removeItem('corrente'))

    expect(linha()).toBe(`−${brl(45)}`)
    expect(selo()).toBe(linha())
  })

  it('cupom que perdeu para a promoção: o selo diz "Não aplicado", e não o valor da aplicação', () => {
    leitura.atual = { config: null, mainNames: new Map() }
    promocoes.atual = [
      {
        id: 'promo-kit',
        discount_kind: 'unit_price',
        tiers: [{ min_qty: 3, value: 5 }],
        scope: 'all',
        eligibleProductIds: [],
        stacks_with_coupon: false,
        created_at: '2026-08-01T00:00:00.000Z',
      },
    ]
    useCartStore.getState().addItems([{ product: peca('pin', 'Pin', 8.9), quantity: 3 }])
    aplicar(4.01)
    abrir()

    expect(within(gaveta()).queryByText('Cupom QA15')).toBeNull()
    expect(selo()).toBe('Não aplicado')
  })
})
