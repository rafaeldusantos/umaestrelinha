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

// O desconto do Compre Junto na gaveta e no resumo do checkout: as duas superfícies montadas de
// verdade, com a regra e `resolveOrderPricing` reais. Só a LEITURA da configuração é dublada — ela é
// uma consulta, e estas telas são montadas sem `QueryClientProvider`; a leitura tem o próprio teste.

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
const oferta = { atual: { enabled: false, productId: null as string | null, percent: 0 } }
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => ({ pix_enabled: true, pix_discount_percent: 0, card_enabled: false }),
  useCheckoutSettings: () => ({
    order_bump_enabled: oferta.atual.enabled,
    order_bump_product_id: oferta.atual.productId,
    order_bump_discount_percent: oferta.atual.percent,
  }),
  useShippingSettings: () => ({
    free_shipping_enabled: false,
    free_shipping_threshold: 0,
    default_shipping_cost: 9.9,
    handling_days: 2,
  }),
}))
vi.mock('@/entities/product/api/useProducts', () => ({
  useAllProducts: () => ({ data: [] }),
  useProductById: () => ({ data: null, isError: false }),
}))
vi.mock('@/features/apply-coupon/ui/CouponInput', () => ({ default: () => null }))
vi.mock('@/features/checkout/api/useCardInstallments', () => ({
  useCardInstallments: () => ({ data: undefined, isError: false }),
}))

import CartDrawer from '@/widgets/cart-drawer/ui/CartDrawer'
import OrderSummary from '@/features/checkout/ui/OrderSummary'

// `formatPrice` separa o símbolo com espaço não separável; `toHaveTextContent` normaliza o espaço do
// elemento e não o do texto esperado.
const brl = (v: number) => formatPrice(v).replace(/\s/g, ' ')

const JOIA = 'Pingente Estrela com Cinzas'

const peca = (id: string, name: string, price: number): Product =>
  ({
    id, name, slug: id, price, compare_price: null, category_id: 'c', category_slug: 'x',
    description: '', image_url: '', images: [], options: [], variants: [], stock_policy: 'none',
    category_links: [], stock_total: 9, low_stock_threshold: 1, is_new: false, is_featured: false, tags: [],
  }) as unknown as Product

const joia = peca('joia', JOIA, 300)
const corrente = peca('corrente', 'Corrente Prata', 79)

const configCom = (percent: number) => ({
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
        discountPercent: percent,
      },
    ],
    lists: [],
  },
  mainNames: new Map([['joia', JOIA]]),
})

const montar = () =>
  render(
    <MemoryRouter>
      <CartDrawer />
      <OrderSummary variant="sidebar" />
    </MemoryRouter>,
  )

const abrir = () => {
  const view = montar()
  act(() => useCartUiStore.getState().openCart())
  return view
}

const gaveta = () => screen.getByRole('dialog')
// A gaveta é modal: com ela aberta o resto da página fica `aria-hidden`, então o resumo é achado
// pelo papel com `hidden`.
const resumo = () => screen.getByRole('region', { name: 'Resumo do pedido', hidden: true })
const linhaDaGaveta = (nome: string) =>
  within(gaveta())
    .getAllByRole('listitem')
    .find(li => within(li).queryByText(nome, { selector: 'a' }))!

beforeEach(() => {
  leitura.atual = configCom(10)
  promocoes.atual = []
  oferta.atual = { enabled: false, productId: null, percent: 0 }
  useCartStore.setState({ items: [] })
  useCartUiStore.setState({ open: false })
  useCouponStore.getState().clearCoupon()
})

describe('o desconto do Compre Junto na gaveta e no checkout', () => {
  it('a corrente sai a 71,10 com a joia: de/por, a frase e o MESMO valor no resumo das duas', () => {
    useCartStore.getState().addItems([
      { product: joia },
      { product: corrente, accompanies: { mainProductId: 'joia', listId: null } },
    ])
    abrir()

    const linha = linhaDaGaveta('Corrente Prata')
    const preco = within(linha).getByTestId('preco-compre-junto')
    expect(preco.querySelector('s')).toHaveTextContent(brl(79))
    expect(preco).toHaveTextContent(brl(71.1))
    expect(within(linha).getByTestId('acompanha')).toHaveTextContent(`Acompanha o ${JOIA} · 10% a menos`)
    expect(within(gaveta()).getByTestId('drawer-buy-together')).toHaveTextContent(`−${brl(7.9)}`)
    expect(gaveta()).toHaveTextContent(`Total${brl(371.1)}`)

    expect(within(resumo()).getByTestId('summary-buy-together')).toHaveTextContent(`−${brl(7.9)}`)
    expect(within(resumo()).getByTestId('summary-subtotal')).toHaveTextContent(brl(379))
    expect(within(resumo()).getByTestId('summary-total')).toHaveTextContent(brl(371.1))
    expect(within(resumo()).getByTestId('summary-item-compre-junto')).toHaveTextContent(
      `Acompanha o ${JOIA} · 10% a menos`,
    )
    const precoDoResumo = within(resumo()).getByTestId('summary-item-price')
    expect(precoDoResumo.querySelector('s')).toHaveTextContent(brl(79))
    expect(precoDoResumo).toHaveTextContent(brl(71.1))
    expect(within(resumo()).getByTestId('summary-buy-together-note')).toHaveTextContent(
      'O desconto do Compre Junto vale enquanto a joia estiver no mesmo pedido.',
    )
  })

  it('com mais correntes que joias, a linha mista diz quantas saem com desconto', () => {
    useCartStore.getState().addItems([
      { product: joia },
      { product: corrente, quantity: 2, accompanies: { mainProductId: 'joia', listId: null } },
    ])
    abrir()
    expect(within(linhaDaGaveta('Corrente Prata')).getByTestId('compre-junto-misto')).toHaveTextContent(
      '1 com desconto, 1 a preço cheio',
    )
    expect(within(resumo()).getByText('1 com desconto, 1 a preço cheio')).toBeInTheDocument()
    expect(within(gaveta()).getByTestId('drawer-buy-together')).toHaveTextContent(`−${brl(7.9)}`)
    expect(within(resumo()).getByTestId('summary-buy-together')).toHaveTextContent(`−${brl(7.9)}`)
  })

  it('tirar a joia tira o desconto na hora, e a linha diz que ele volta com ela', () => {
    useCartStore.getState().addItems([
      { product: joia },
      { product: corrente, accompanies: { mainProductId: 'joia', listId: null } },
    ])
    abrir()
    expect(within(gaveta()).getByTestId('drawer-buy-together')).toBeInTheDocument()

    act(() => useCartStore.getState().removeItem('joia'))

    const linha = linhaDaGaveta('Corrente Prata')
    expect(within(linha).queryByTestId('preco-compre-junto')).toBeNull()
    expect(linha).toHaveTextContent(brl(79))
    expect(within(linha).getByTestId('compre-junto-volta')).toHaveTextContent(
      `O desconto de 10% volta com o ${JOIA} na sacola.`,
    )
    expect(within(gaveta()).queryByTestId('drawer-buy-together')).toBeNull()
    expect(within(resumo()).queryByTestId('summary-buy-together')).toBeNull()
    expect(within(resumo()).getByTestId('summary-total')).toHaveTextContent(brl(79))
  })

  it('a peça acrescentada pelo catálogo ganha o desconto se a joia estiver na sacola', () => {
    useCartStore.getState().addItem(joia)
    useCartStore.getState().addItem(corrente)
    abrir()
    const linha = linhaDaGaveta('Corrente Prata')
    expect(within(linha).getByTestId('preco-compre-junto')).toHaveTextContent(brl(71.1))
    expect(within(linha).getByTestId('acompanha')).toHaveTextContent(`Acompanha o ${JOIA} · 10% a menos`)
    // Sem a marca, a peça não diz que o desconto "volta": ela não entrou pelo bloco.
    act(() => useCartStore.getState().removeItem('joia'))
    expect(within(linhaDaGaveta('Corrente Prata')).queryByTestId('compre-junto-volta')).toBeNull()
  })

  it('com a sacola montada, uma nova leitura com outro percentual muda a sacola e o resumo', () => {
    useCartStore.getState().addItems([
      { product: joia },
      { product: corrente, accompanies: { mainProductId: 'joia', listId: null } },
    ])
    const view = abrir()
    expect(within(gaveta()).getByTestId('drawer-buy-together')).toHaveTextContent(`−${brl(7.9)}`)

    leitura.atual = configCom(20)
    view.rerender(
      <MemoryRouter>
        <CartDrawer />
        <OrderSummary variant="sidebar" />
      </MemoryRouter>,
    )

    expect(within(linhaDaGaveta('Corrente Prata')).getByTestId('preco-compre-junto')).toHaveTextContent(
      brl(63.2),
    )
    expect(within(gaveta()).getByTestId('drawer-buy-together')).toHaveTextContent(`−${brl(15.8)}`)
    expect(within(resumo()).getByTestId('summary-buy-together')).toHaveTextContent(`−${brl(15.8)}`)
  })

  it('no par recíproco, a marca da sacola decide: vale o desconto da peça levada pelo bloco', () => {
    const base = configCom(10)
    leitura.atual = {
      ...base,
      config: {
        ...base.config,
        addons: [
          ...base.config.addons,
          { ...base.config.addons[0], id: 'b1', mainProductId: 'corrente', targetProductId: 'joia', discountPercent: 20 },
        ],
      },
    }
    // A joia entrou pelo bloco da corrente: é ela que leva o desconto (20% de 300), não a corrente.
    useCartStore.getState().addItems([
      { product: corrente },
      { product: joia, accompanies: { mainProductId: 'corrente', listId: null } },
    ])
    abrir()
    expect(within(linhaDaGaveta(JOIA)).getByTestId('preco-compre-junto')).toHaveTextContent(brl(240))
    expect(within(linhaDaGaveta('Corrente Prata')).queryByTestId('preco-compre-junto')).toBeNull()
    expect(within(gaveta()).getByTestId('drawer-buy-together')).toHaveTextContent(`−${brl(60)}`)
    expect(within(resumo()).getByTestId('summary-buy-together')).toHaveTextContent(`−${brl(60)}`)
  })

  it('sem configuração com desconto, a sacola é a de sempre', () => {
    leitura.atual = { config: null, mainNames: new Map() }
    useCartStore.getState().addItems([
      { product: joia },
      { product: corrente, accompanies: { mainProductId: 'joia', listId: null } },
    ])
    abrir()
    expect(within(gaveta()).queryByTestId('drawer-buy-together')).toBeNull()
    expect(within(linhaDaGaveta('Corrente Prata')).getByTestId('acompanha')).toHaveTextContent(
      `Acompanha o ${JOIA}`,
    )
    expect(within(resumo()).queryByTestId('summary-buy-together-note')).toBeNull()
    expect(within(resumo()).getByTestId('summary-total')).toHaveTextContent(brl(379))
  })
})

// A promoção de 30% a partir de 2 unidades, só para a corrente.
const trintaPorCentoEmDuas: ProgressivePromotion = {
  id: 'promo-30',
  discount_kind: 'percent',
  tiers: [{ min_qty: 2, value: 30 }],
  scope: 'categories',
  eligibleProductIds: ['corrente'],
  stacks_with_coupon: false,
  created_at: '2026-01-01T00:00:00Z',
}

describe('a linha da peça mostra o preço COBRADO quando outro desconto vence o casado', () => {
  it('a promoção vence nas duas unidades: de 158,00 por 110,60, sem "a preço cheio", e as linhas somam o Total', () => {
    promocoes.atual = [trintaPorCentoEmDuas]
    useCartStore.getState().addItems([
      { product: joia },
      { product: corrente, quantity: 2, accompanies: { mainProductId: 'joia', listId: null } },
    ])
    abrir()

    // 79 × 0,7 = 55,30 a unidade; o casado daria 71,10 + 79,00 = 150,10.
    const linha = linhaDaGaveta('Corrente Prata')
    const preco = within(linha).getByTestId('preco-compre-junto')
    expect(preco.querySelector('s')).toHaveTextContent(brl(158))
    expect(preco).toHaveTextContent(brl(110.6))
    expect(preco).not.toHaveTextContent(brl(150.1))
    expect(within(linha).queryByTestId('compre-junto-misto')).toBeNull()
    expect(linha).not.toHaveTextContent('a preço cheio')
    expect(gaveta()).toHaveTextContent(`Total${brl(410.6)}`)

    const precoDoResumo = within(resumo()).getByTestId('summary-item-price')
    expect(precoDoResumo.querySelector('s')).toHaveTextContent(brl(158))
    expect(precoDoResumo).toHaveTextContent(brl(110.6))
    expect(within(resumo()).queryByText(/a preço cheio/)).toBeNull()
    expect(within(resumo()).getByTestId('summary-total')).toHaveTextContent(brl(410.6))
  })

  it('a promoção vence: a linha diz que acompanha, sem anunciar os 10% que não valeram', () => {
    promocoes.atual = [trintaPorCentoEmDuas]
    useCartStore.getState().addItems([
      { product: joia },
      { product: corrente, quantity: 2, accompanies: { mainProductId: 'joia', listId: null } },
    ])
    abrir()
    expect(within(linhaDaGaveta('Corrente Prata')).getByTestId('acompanha')).toHaveTextContent(
      new RegExp(`^Acompanha o ${JOIA}$`),
    )
    expect(within(resumo()).getByTestId('summary-item-compre-junto')).toHaveTextContent(
      new RegExp(`^Acompanha o ${JOIA}$`),
    )
  })

  it('a oferta do checkout vence o casado: o resumo mostra de 79,00 por 63,20 e "Acompanha"', () => {
    oferta.atual = { enabled: true, productId: 'corrente', percent: 20 }
    useCartStore.getState().addItems([
      { product: joia },
      { product: corrente, accompanies: { mainProductId: 'joia', listId: null } },
    ])
    montar()

    const precoDoResumo = within(resumo()).getByTestId('summary-item-price')
    expect(precoDoResumo.querySelector('s')).toHaveTextContent(brl(79))
    expect(precoDoResumo).toHaveTextContent(brl(63.2))
    expect(within(resumo()).getByTestId('summary-item-compre-junto')).toHaveTextContent(
      new RegExp(`^Acompanha o ${JOIA}$`),
    )
    expect(within(resumo()).getByTestId('summary-total')).toHaveTextContent(brl(363.2))
  })
})

describe('o leitor de tela ouve o "de/por" da linha numa frase só', () => {
  it('na gaveta e no resumo: "de R$ 79,00 por R$ 71,10" em sr-only, e o par visível fora da leitura', () => {
    useCartStore.getState().addItems([
      { product: joia },
      { product: corrente, accompanies: { mainProductId: 'joia', listId: null } },
    ])
    abrir()

    const naGaveta = within(linhaDaGaveta('Corrente Prata')).getByText(/^de R\$\s79,00 por R\$\s71,10$/)
    expect(naGaveta.className.split(/\s+/)).toContain('sr-only')
    expect(within(linhaDaGaveta('Corrente Prata')).getByTestId('preco-compre-junto')).toHaveAttribute(
      'aria-hidden',
      'true',
    )

    const noResumo = within(resumo()).getByText(/^de R\$\s79,00 por R\$\s71,10$/)
    expect(noResumo.className.split(/\s+/)).toContain('sr-only')
    expect(within(resumo()).getByTestId('summary-item-price')).toHaveAttribute('aria-hidden', 'true')
  })
})
