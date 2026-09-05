import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Product, ProductVariant } from '@estrelinha/supabase/types'
import type { ProgressivePromotion } from '@estrelinha/core/payment/pricing'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { useCartUiStore } from '@/entities/cart/model/cartUiStore'
import { useCouponStore } from '@/entities/coupon'

// A gaveta é a ÚNICA superfície de carrinho da loja. O que se prova aqui é o contrato dela com o
// resto da loja: quem abre, o que a lista mostra, e que o CTA sai para o checkout fechando a gaveta.
// As regras puras (frete grátis, escassez, sugestões) estão em `model/__tests__/drawerFacts`.

// PRM-15: a linha de desconto progressivo. O dublê entrega as promoções vigentes; o valor exibido
// tem de ser o que `useCartPromotion` calcula, nunca uma conta da tela.
const active: { data: ProgressivePromotion[] } = { data: [] }
vi.mock('@estrelinha/core/hooks/usePromotions', () => ({
  useActivePromotions: () => ({ data: active.data, isLoading: false }),
}))

/**
 * Feature 37: o frete grátis virou interruptor (`free_shipping_enabled`), e a gaveta o lê por
 * `useFreeShipping` — que consome estas mesmas settings. Mockar aqui exercita a regra de verdade,
 * não um dublê dela.
 */
const shipping = vi.hoisted(() => ({
  value: {
    free_shipping_enabled: true,
    free_shipping_threshold: 150,
    default_shipping_cost: 9.9,
    origin_zip: '',
    handling_days: 2,
  },
}))

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useShippingSettings: () => shipping.value,
}))
/** Catálogo das sugestões da faixa "Complete o frete grátis". Vazio por padrão, como antes. */
const catalogo = vi.hoisted(() => ({ data: [] as unknown[] }))
vi.mock('@/entities/product/api/useProducts', () => ({
  useAllProducts: () => ({ data: catalogo.data }),
}))
vi.mock('@/features/apply-coupon/ui/CouponInput', () => ({ default: () => null }))

import CartDrawer from '../CartDrawer'

const variant = (overrides: Partial<ProductVariant> = {}): ProductVariant => ({
  id: 'v-45-fosco',
  product_id: 'p1',
  option_values: { Tamanho: '4,5 cm', Acabamento: 'Fosco' },
  name: null,
  sku: null,
  price: 14.9,
  compare_price: null,
  stock: 10,
  weight_kg: null,
  image_url: null,
  is_active: true,
  position: 0,
  ...overrides,
})

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Pin Gojo Satoru',
  slug: 'pin-gojo-satoru',
  price: 14.9,
  compare_price: null,
  category_id: 'c1',
  category_slug: 'anime',
  description: '',
  image_url: '',
  images: [],
  options: [],
  variants: [],
  stock_policy: 'track',
  category_links: [],
  stock_total: 20,
  low_stock_threshold: 3,
  is_new: false,
  is_featured: false,
  tags: [],
  ...overrides,
})

const renderDrawer = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<CartDrawer />} />
        <Route path="/checkout" element={<div>rota-checkout</div>} />
      </Routes>
    </MemoryRouter>,
  )

// `act` porque quem abre a gaveta é um store fora do React — é exatamente assim que o header, a nav
// mobile e o checkout a abrem.
const open = () => act(() => useCartUiStore.getState().openCart())

/** A linha do produto — o mesmo valor aparece no resumo, então a asserção precisa de escopo. */
const firstRow = () => within(screen.getAllByRole('listitem')[0])

/**
 * O valor ao lado de um rótulo do resumo (`dt` → `dd`).
 *
 * O espaço de `formatPrice` é NBSP (vem do `Intl.NumberFormat` pt-BR) — comparar com um espaço comum
 * falha com as duas strings parecendo idênticas no diff.
 */
const summaryValue = (label: string | RegExp) =>
  screen.getByText(label).nextElementSibling?.textContent?.replace(/\u00a0/g, ' ')

beforeEach(() => {
  useCartStore.setState({ items: [] })
  useCartUiStore.setState({ open: false })
  useCouponStore.getState().clearCoupon()
  active.data = []
  catalogo.data = []
  shipping.value = {
    free_shipping_enabled: true,
    free_shipping_threshold: 150,
    default_shipping_cost: 9.9,
    origin_zip: '',
    handling_days: 2,
  }
})

describe('CartDrawer — quem abre', () => {
  it('nasce fechada e não renderiza nada do painel', () => {
    renderDrawer()
    expect(screen.queryByText('Seu Carrinho')).not.toBeInTheDocument()
  })

  it('abre por qualquer chamador do `cartUiStore`, sem gatilho próprio', () => {
    renderDrawer()
    open()
    expect(screen.getByText('Seu Carrinho')).toBeInTheDocument()
  })
})

describe('CartDrawer — o coração da linha diz o ESTADO (IDN-04)', () => {
  // Ele saía sempre em ouro, favoritado ou não. Ao lado de uma lixeira `ink`,
  // isso lia como "este item já está nos favoritos" — cor sem estado atrás.
  const addItem = () => {
    act(() => useCartStore.getState().addItem(product()))
    open()
  }

  it('desligado, vai de `ink-soft` e sem preenchimento', () => {
    renderDrawer()
    addItem()

    const botao = firstRow().getByRole('button', { name: /Favoritar/ })
    expect(botao.className).toContain('text-estrelinha-ink-soft')
    expect(botao.className).not.toContain('text-estrelinha-accent-strong')
    expect(botao.querySelector('svg')).toHaveAttribute('fill', 'none')
  })

  it('ligado, vai de `accent-strong` E preenchido — a diferença não é só de cor', () => {
    renderDrawer()
    addItem()

    fireEvent.click(firstRow().getByRole('button', { name: /Favoritar/ }))

    const botao = firstRow().getByRole('button', { name: /Remover .* dos favoritos/ })
    expect(botao.className).toContain('text-estrelinha-accent-strong')
    expect(botao.querySelector('svg')).toHaveAttribute('fill', 'currentColor')
  })
})

describe('CartDrawer — sacola vazia', () => {
  it('mostra o convite e nenhum CTA de finalizar', () => {
    renderDrawer()
    open()
    expect(screen.getByText('Sua sacola está vazia')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Finalizar Pedido/i })).not.toBeInTheDocument()
  })
})

describe('CartDrawer — a lista', () => {
  beforeEach(() => {
    useCartStore.getState().addItem(product(), '', '', {
      variantId: 'v-45-fosco',
      variantLabel: '4,5 cm · Fosco',
      optionValues: { Tamanho: '4,5 cm', Acabamento: 'Fosco' },
      unitPrice: 14.9,
    })
    useCartStore.getState().addItem(product({ variants: [variant()] }), '', '', {
      variantId: 'v-45-fosco',
      variantLabel: '4,5 cm · Fosco',
      optionValues: { Tamanho: '4,5 cm', Acabamento: 'Fosco' },
      unitPrice: 14.9,
    })
  })

  it('o preço da linha é unitário × quantidade, não o preço unitário', () => {
    renderDrawer()
    open()
    expect(firstRow().getByText('R$ 29,80')).toBeInTheDocument()
    expect(firstRow().queryByText('R$ 14,90')).not.toBeInTheDocument()
  })

  it('cada eixo da variação vira um chip', () => {
    renderDrawer()
    open()
    expect(screen.getByText('4,5 cm')).toBeInTheDocument()
    expect(screen.getByText('Fosco')).toBeInTheDocument()
  })

  it('remover uma linha COM variação esvazia a sacola — a chave leva o `variantId`', () => {
    renderDrawer()
    open()
    fireEvent.click(screen.getByLabelText('Remover Pin Gojo Satoru do carrinho'))
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('diminuir de 1 remove a linha de grade em vez de deixá-la em zero', () => {
    useCartStore.getState().updateQuantity('p1', '', '', 1, 'v-45-fosco')
    renderDrawer()
    open()
    fireEvent.click(screen.getByLabelText('Remover Pin Gojo Satoru'))
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('aumentar sobe a quantidade daquela variação', () => {
    renderDrawer()
    open()
    fireEvent.click(screen.getByLabelText('Aumentar Pin Gojo Satoru'))
    expect(useCartStore.getState().items[0].quantity).toBe(3)
  })
})

describe('CartDrawer — resumo e CTA', () => {
  beforeEach(() => {
    useCartStore.getState().addItem(product({ price: 30 }))
  })

  it('soma subtotal + frete estimado no total', () => {
    renderDrawer()
    open()
    expect(summaryValue('Subtotal (1 item)')).toBe('R$ 30,00')
    expect(summaryValue('Frete estimado')).toBe('R$ 9,90')
    expect(summaryValue('Total')).toBe('R$ 39,90')
  })

  it('acima da faixa, o frete vira "Grátis" e sai do total', () => {
    useCartStore.setState({ items: [] })
    useCartStore.getState().addItem(product({ price: 200 }))
    renderDrawer()
    open()
    expect(summaryValue('Frete estimado')).toBe('Grátis')
    expect(summaryValue('Total')).toBe('R$ 200,00')
  })

  it('o CTA fecha a gaveta e leva ao checkout', () => {
    renderDrawer()
    open()
    fireEvent.click(screen.getByRole('button', { name: /Finalizar Pedido/i }))
    expect(screen.getByText('rota-checkout')).toBeInTheDocument()
    expect(useCartUiStore.getState().open).toBe(false)
  })
})

describe('CartDrawer — desconto progressivo (PRM-15)', () => {
  const kit = (overrides: Partial<ProgressivePromotion> = {}): ProgressivePromotion => ({
    id: 'promo-kit',
    discount_kind: 'unit_price',
    tiers: [{ min_qty: 3, value: 5 }],
    scope: 'all',
    eligibleProductIds: [],
    stacks_with_coupon: false,
    created_at: '2026-08-01T00:00:00.000Z',
    ...overrides,
  })

  /** Os mesmos números do teste do servidor: 3 × R$ 8,90 numa faixa de R$ 5,00. */
  const fillCart = (quantity: number) => {
    for (let i = 0; i < quantity; i++) useCartStore.getState().addItem(product({ price: 8.9 }))
  }

  it('com a faixa alcançada, a linha aparece com o valor exato do hook e o total já desconta', () => {
    active.data = [kit()]
    fillCart(3)
    renderDrawer()
    open()

    expect(summaryValue('Desconto progressivo')).toBe('−R$ 11,70')
    expect(summaryValue('Subtotal (3 itens)')).toBe('R$ 26,70')
    // 15,00 (3 × 5,00) + 9,90 de frete estimado
    expect(summaryValue('Total')).toBe('R$ 24,90')
  })

  it('sem faixa alcançada nenhuma linha aparece — a gaveta não anuncia −R$ 0,00', () => {
    active.data = [kit()]
    fillCart(2)
    renderDrawer()
    open()

    expect(screen.queryByText('Desconto progressivo')).not.toBeInTheDocument()
    expect(summaryValue('Total')).toBe('R$ 27,70')
  })

  it('sem promoção vigente nenhuma linha aparece', () => {
    fillCart(3)
    renderDrawer()
    open()

    expect(screen.queryByText('Desconto progressivo')).not.toBeInTheDocument()
    expect(summaryValue('Total')).toBe('R$ 36,60')
  })

  it('diminuir a quantidade abaixo da faixa remove a linha no mesmo render', () => {
    active.data = [kit()]
    fillCart(3)
    renderDrawer()
    open()
    expect(screen.getByText('Desconto progressivo')).toBeInTheDocument()

    fireEvent.click(screen.getByLabelText('Diminuir Pin Gojo Satoru'))

    expect(screen.queryByText('Desconto progressivo')).not.toBeInTheDocument()
    expect(summaryValue('Total')).toBe('R$ 27,70')
  })

  /**
   * PRM-23 — o convite da próxima faixa.
   *
   * O que se prova aqui é que `k` e o preço saem da MESMA função pura do desconto: os números do
   * caso `percent` (R$ 7,12 = round2(8,90 × 0,8)) não sobrevivem a uma conta reescrita na tela, e o
   * convite tem de sumir na última faixa.
   */
  describe('convite para a próxima faixa (PRM-23)', () => {
    /** O texto do convite, com o NBSP de `formatPrice` normalizado. */
    const invitation = () =>
      screen.queryByText(/para cada peça sair a/)?.textContent?.replace(/\u00a0/g, ' ')

    it('faltando 1 unidade, o convite sai no singular com o preço da faixa', () => {
      active.data = [kit()]
      fillCart(2)
      renderDrawer()
      open()

      expect(invitation()).toBe('Falta 1 para cada peça sair a R$ 5,00')
    })

    it('faltando mais de 1, o convite sai no plural e aponta a faixa ACIMA da atual', () => {
      active.data = [
        kit({
          tiers: [
            { min_qty: 3, value: 5 },
            { min_qty: 5, value: 4.6 },
          ],
        }),
      ]
      fillCart(3)
      renderDrawer()
      open()

      expect(invitation()).toBe('Faltam 2 para cada peça sair a R$ 4,60')
    })

    it('na última faixa o convite desaparece — não há o que convidar', () => {
      active.data = [kit()]
      fillCart(3)
      renderDrawer()
      open()

      expect(invitation()).toBeUndefined()
    })

    it('sem promoção vigente não há convite', () => {
      fillCart(2)
      renderDrawer()
      open()

      expect(invitation()).toBeUndefined()
    })

    it('em faixa percentual o preço é o da função pura, não uma conta da tela', () => {
      active.data = [kit({ discount_kind: 'percent', tiers: [{ min_qty: 3, value: 20 }] })]
      fillCart(2)
      renderDrawer()
      open()

      // round2(8,90 × 0,80) = 7,12 — o mesmo `tierUnitPrice` que o servidor usa.
      expect(invitation()).toBe('Falta 1 para cada peça sair a R$ 7,12')
    })

    it('subir a quantidade até a faixa troca o convite pela linha de desconto no mesmo render', () => {
      active.data = [kit()]
      fillCart(2)
      renderDrawer()
      open()
      expect(invitation()).toBe('Falta 1 para cada peça sair a R$ 5,00')

      fireEvent.click(screen.getByLabelText('Aumentar Pin Gojo Satoru'))

      expect(invitation()).toBeUndefined()
      expect(summaryValue('Desconto progressivo')).toBe('−R$ 11,70')
    })

    it('sacola vazia não convida nada', () => {
      active.data = [kit()]
      renderDrawer()
      open()

      expect(invitation()).toBeUndefined()
    })
  })

  it('cupom perdendo da promoção não vira linha — os dois não somam (AD-015)', () => {
    active.data = [kit()]
    fillCart(3)
    useCouponStore.getState().setCoupon({
      id: 'c1',
      code: 'BEMVINDA',
      type: 'percent',
      value: 10,
      discount: 2.67,
      freeShipping: false,
    })
    renderDrawer()
    open()

    expect(summaryValue('Desconto progressivo')).toBe('−R$ 11,70')
    expect(screen.queryByText('Cupom BEMVINDA')).not.toBeInTheDocument()
    expect(summaryValue('Total')).toBe('R$ 24,90')
  })
})

/**
 * `FRG-05` — a gaveta respeita o interruptor do frete gratis.
 *
 * Antes da feature 37 a faixa lia `freeShippingProgress(subtotal, threshold)`, que com a faixa em
 * zero devolvia `reached: true`: a gaveta anunciava "Frete gratis liberado" numa loja que nao
 * oferecia nada. Agora ela le `useFreeShipping`, e desligado significa desligado.
 */
describe('CartDrawer - o interruptor do frete gratis (FRG-05)', () => {
  const encher = () => act(() => useCartStore.getState().addItem(product({ price: 8.9 })))

  const sugestao = () =>
    product({ id: 'p2', slug: 'outra-joia', name: 'Outra joia', price: 4.9 })

  it('LIGADO: a faixa de progresso aparece, com a barra e o quanto falta', () => {
    encher()
    renderDrawer()
    open()

    expect(screen.getByRole('progressbar', { name: 'Progresso para o frete grátis' })).toBeInTheDocument()
    expect(screen.getByText(/Faltam .* para frete grátis!/)).toBeInTheDocument()
  })

  it('DESLIGADO: a faixa some inteira - barra, texto e o par subtotal/faixa', () => {
    shipping.value = { ...shipping.value, free_shipping_enabled: false }
    encher()
    renderDrawer()
    open()

    expect(screen.queryByRole('progressbar')).toBeNull()
    expect(screen.queryByText(/para frete grátis/)).toBeNull()
    expect(screen.queryByText(/Frete grátis liberado/)).toBeNull()
    // O numero guardado (150) nao vaza para a tela.
    expect(screen.queryByText(/150/)).toBeNull()
  })

  it('DESLIGADO com subtotal acima da faixa guardada: nada de "Frete grátis liberado"', () => {
    // O caso que custava dinheiro. Subtotal 8,90 x 20 = 178, acima dos 150 guardados.
    shipping.value = { ...shipping.value, free_shipping_enabled: false }
    for (let i = 0; i < 20; i++) encher()
    renderDrawer()
    open()

    expect(screen.queryByText(/Frete grátis liberado/)).toBeNull()
    expect(screen.queryByRole('progressbar')).toBeNull()
  })

  it('LIGADO e faltando frete: a faixa "Complete o frete grátis" aparece', () => {
    catalogo.data = [sugestao()]
    encher()
    renderDrawer()
    open()

    expect(screen.getByText('Complete o frete grátis')).toBeInTheDocument()
  })

  it('DESLIGADO: a faixa "Complete o frete grátis" some junto (decisao do usuario, Q3)', () => {
    shipping.value = { ...shipping.value, free_shipping_enabled: false }
    catalogo.data = [sugestao()]
    encher()
    renderDrawer()
    open()

    expect(screen.queryByText('Complete o frete grátis')).toBeNull()
  })

  it('interruptor LIGADO com faixa zerada nao vira "frete gratis para todos"', () => {
    // Configuracao invalida (FRG-12 impede de gravar). A leitura antiga devolvia `reached: true`.
    shipping.value = { ...shipping.value, free_shipping_enabled: true, free_shipping_threshold: 0 }
    encher()
    renderDrawer()
    open()

    expect(screen.queryByText(/Frete grátis liberado/)).toBeNull()
    expect(screen.queryByRole('progressbar')).toBeNull()
  })
})
