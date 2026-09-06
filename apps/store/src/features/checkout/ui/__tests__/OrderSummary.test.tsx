import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import type { Product } from '@estrelinha/supabase/types'
import {
  calculateOrderTotals,
  type ProgressivePromotion,
} from '@estrelinha/core/payment/pricing'
import { useCartStore } from '@/entities/cart'
import { useCouponStore } from '@/entities/coupon'
import { useProductById } from '@/entities/product'
import { useCheckoutStore } from '../../model/checkoutStore'
import OrderSummary from '../OrderSummary'

/* eslint-disable @typescript-eslint/no-explicit-any */

// CHK-05: resumo visível nas duas variantes, com itens, frete, cupom, desconto PIX e total.
// PAY-14 (herdado da 02): desconto PIX incide sobre (subtotal − cupom), frete fora da base.
// BMP-03 / carry-forward #10: total e base do cupom espelham o recálculo da edge function.
// RSM-01 … RSM-07: fidelidade ao board `04` (respiro, itens, faixa de cupom, total, parcela) e
//                  ao board `07` (barra do mobile).

vi.mock('@/features/apply-coupon/ui/CouponInput', () => ({
  default: () => <div data-testid="coupon-input" />,
}))
vi.mock('@/entities/product/api/useProducts', () => ({ useProductById: vi.fn() }))

const paymentSettings = {
  pix_enabled: true,
  pix_discount_percent: 5,
  card_enabled: true,
  max_installments: 6,
  min_installment_value: 10,
}
const checkoutSettings = {
  order_bump_enabled: false,
  order_bump_product_id: null as string | null,
  order_bump_discount_percent: 50,
}
const shippingSettings = {
  free_shipping_enabled: true,
  free_shipping_threshold: 150,
  default_shipping_cost: 9.9,
  origin_zip: '',
  handling_days: 2,
}
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => paymentSettings,
  useCheckoutSettings: () => checkoutSettings,
  useShippingSettings: () => shippingSettings,
}))

const active: { data: (ProgressivePromotion & { name: string })[] } = { data: [] }
vi.mock('@estrelinha/core/hooks/usePromotions', () => ({
  useActivePromotions: () => ({ data: active.data, isLoading: false }),
}))

const productByIdMock = vi.mocked(useProductById)

const product = (overrides: Partial<Product> = {}): Product =>
  ({
    id: 'p1',
    name: 'Pin Gojo Satoru',
    slug: 'pin-gojo',
    price: 50,
    compare_price: null,
    category_id: '',
    category_slug: '',
    description: '',
    image_url: '',
    images: [],
    stock_total: 10,
    low_stock_threshold: 5,
    is_new: false,
    is_featured: false,
    tags: [],
    ...overrides,
  }) as Product

// `CartItem` ganhou variantId/variantLabel/optionValues/unitPrice em 07/T11. `unitPrice` é
// obrigatório: `subtotal` soma ELE, não `product.price` — com grade os dois divergem. Sem preencher
// aqui, o subtotal viraria NaN, que foi como estes testes quebraram quando o store mudou.
const setCart = (
  items: {
    product: Product; quantity: number; size?: string; finish?: string
    variantId?: string; unitPrice?: number
  }[],
) =>
  useCartStore.setState({
    items: items.map((i) => ({
      product: i.product,
      quantity: i.quantity,
      size: i.size ?? '',
      finish: i.finish ?? '',
      variantId: i.variantId ?? null,
      variantLabel: [i.size, i.finish].filter(Boolean).join(' · '),
      optionValues: {},
      unitPrice: i.unitPrice ?? i.product.price,
    })),
  })

const selectShipping = (cost: number) =>
  useCheckoutStore.getState().setShipping({
    serviceId: '1',
    serviceName: 'PAC',
    carrier: 'Correios',
    cost,
    estimateMin: '2026-08-04',
    estimateMax: '2026-08-06',
  })

beforeEach(() => {
  useCheckoutStore.getState().reset()
  useCouponStore.getState().clearCoupon()
  sessionStorage.clear()
  paymentSettings.pix_discount_percent = 5
  paymentSettings.card_enabled = true
  paymentSettings.max_installments = 6
  paymentSettings.min_installment_value = 10
  checkoutSettings.order_bump_enabled = false
  checkoutSettings.order_bump_product_id = null
  checkoutSettings.order_bump_discount_percent = 50
  shippingSettings.free_shipping_enabled = true
  shippingSettings.free_shipping_threshold = 150
  active.data = []
  productByIdMock.mockReturnValue({ data: null, isError: false } as any)
  setCart([{ product: product(), quantity: 2 }])
})

describe('OrderSummary — linha de desconto PIX (PAY-14)', () => {
  it('método pix com percent>0 exibe a linha de desconto sobre (subtotal − cupom) e reduz o total', () => {
    useCheckoutStore.getState().setPayment({ method: 'pix' })
    useCouponStore.getState().setCoupon({
      id: 'c1',
      code: 'ESTRELA20',
      type: 'fixed',
      value: 20,
      discount: 20,
      freeShipping: false,
    })
    selectShipping(10)
    render(<OrderSummary variant="sidebar" />)

    // base = 100 − 20 = 80 → 5% = R$ 4,00; total = 100 + 10 − 20 − 4 = 86
    expect(screen.getByText(/desconto pix \(5%\)/i)).toBeInTheDocument()
    expect(screen.getByText('−R$ 4,00')).toBeInTheDocument()
    expect(screen.getByText('R$ 86,00')).toBeInTheDocument()
  })

  it('percent=0 não exibe linha de desconto PIX e o total não muda', () => {
    paymentSettings.pix_discount_percent = 0
    useCheckoutStore.getState().setPayment({ method: 'pix' })
    selectShipping(10)
    render(<OrderSummary variant="sidebar" />)

    expect(screen.queryByText(/desconto pix/i)).not.toBeInTheDocument()
    expect(screen.getByTestId('summary-total')).toHaveTextContent('R$ 110,00')
  })

  it('método cartão não exibe linha de desconto PIX', () => {
    useCheckoutStore.getState().setPayment({ method: 'card' })
    selectShipping(10)
    render(<OrderSummary variant="sidebar" />)

    expect(screen.queryByText(/desconto pix/i)).not.toBeInTheDocument()
    expect(screen.getByTestId('summary-total')).toHaveTextContent('R$ 110,00')
  })
})

describe('OrderSummary — linhas do resumo (CHK-05)', () => {
  it('lista cada item com a quantidade e o valor da linha', () => {
    setCart([
      { product: product(), quantity: 2 },
      { product: product({ id: 'p2', name: 'Pin Naruto', price: 14.9 }), quantity: 1 },
    ])
    render(<OrderSummary variant="sidebar" />)

    expect(screen.getByText('Pin Gojo Satoru')).toBeInTheDocument()
    expect(screen.getByText('R$ 100,00')).toBeInTheDocument()
    expect(screen.getByText('Pin Naruto')).toBeInTheDocument()
    expect(screen.getByText('R$ 14,90')).toBeInTheDocument()
    expect(screen.getByText('2')).toBeInTheDocument()
  })

  it('exibe o frete selecionado com transportadora e serviço', () => {
    selectShipping(21.5)
    render(<OrderSummary variant="sidebar" />)

    expect(screen.getByText('Frete · Correios PAC')).toBeInTheDocument()
    expect(screen.getByText('R$ 21,50')).toBeInTheDocument()
  })

  it('sem frete selecionado exibe "a calcular" em vez de zero', () => {
    render(<OrderSummary variant="sidebar" />)

    expect(screen.getByText('a calcular')).toBeInTheDocument()
  })

  it('frete zerado por frete grátis aparece como "Grátis"', () => {
    selectShipping(0)
    render(<OrderSummary variant="sidebar" />)

    expect(screen.getByText('Grátis')).toBeInTheDocument()
  })

  // RSM-04: a linha de totais nomeia o cupom. Só "Cupom" não fecha a conferência — a cliente pode
  // ter mais de um código em mãos e precisa saber qual pegou.
  it('exibe a linha do cupom COM O CÓDIGO e o desconto aplicado', () => {
    useCouponStore.getState().setCoupon({
      id: 'c1',
      code: 'ESTRELA10',
      type: 'percent',
      value: 10,
      discount: 10,
      freeShipping: false,
    })
    render(<OrderSummary variant="sidebar" />)

    // O valor aparece duas vezes (faixa do cupom + linha de totais): a asserção é escopada
    // na linha de totais, que é a que RSM-04 rotula.
    const couponRow = screen.getByText('Cupom ESTRELA10').closest('div')!
    expect(screen.queryByText('Cupom')).not.toBeInTheDocument()
    expect(within(couponRow).getByText('−R$ 10,00')).toBeInTheDocument()
  })

  it('cupom de frete grátis zera o frete sem gerar linha de desconto', () => {
    useCouponStore.getState().setCoupon({
      id: 'c1',
      code: 'FRETEGRATIS',
      type: 'free_shipping',
      value: 0,
      discount: 0,
      freeShipping: true,
    })
    selectShipping(21.5)
    render(<OrderSummary variant="sidebar" />)

    expect(screen.queryByText('Cupom FRETEGRATIS')).not.toBeInTheDocument()
    expect(screen.getByText('Grátis')).toBeInTheDocument()
    expect(screen.getByTestId('summary-total')).toHaveTextContent('R$ 100,00')
  })
})

describe('OrderSummary — total vem de calculateOrderTotals (CHK-05, BMP-03)', () => {
  it('o total exibido é exatamente o de calculateOrderTotals para o mesmo input', () => {
    useCheckoutStore.getState().setPayment({ method: 'pix' })
    useCouponStore.getState().setCoupon({
      id: 'c1',
      code: 'ESTRELA10',
      type: 'percent',
      value: 10,
      discount: 10,
      freeShipping: false,
    })
    selectShipping(21.5)
    render(<OrderSummary variant="sidebar" />)

    const expected = calculateOrderTotals({
      items: [{ product_id: 'p1', unit_price: 50, quantity: 2 }],
      shipping: 21.5,
      couponDiscount: 10,
      pixDiscountPercent: 5,
      method: 'pix',
    })
    // 100 − 10 (cupom) − 4,50 (PIX sobre 90) + 21,50 (frete) = 107,00
    expect(expected.total).toBe(107)
    expect(screen.getByTestId('summary-total')).toHaveTextContent('R$ 107,00')
  })

  it('bump marcado entra no subtotal com o desconto de applyOrderBump', () => {
    checkoutSettings.order_bump_enabled = true
    checkoutSettings.order_bump_product_id = 'bump-1'
    productByIdMock.mockReturnValue({
      data: product({ id: 'bump-1', name: 'Porta-pins', price: 24.9 }),
      isError: false,
    } as any)
    useCheckoutStore.getState().toggleBump(true)
    selectShipping(0)
    render(<OrderSummary variant="sidebar" />)

    // 100 (carrinho) + 12,45 (24,90 com 50%) = 112,45
    expect(screen.getByTestId('summary-subtotal')).toHaveTextContent('R$ 112,45')
    expect(screen.getByTestId('summary-total')).toHaveTextContent('R$ 112,45')
  })

  it('cupom fixo com bump incide sobre o subtotal JÁ com o bump (carry-forward #10)', () => {
    checkoutSettings.order_bump_enabled = true
    checkoutSettings.order_bump_product_id = 'bump-1'
    productByIdMock.mockReturnValue({
      data: product({ id: 'bump-1', name: 'Porta-pins', price: 24.9 }),
      isError: false,
    } as any)
    useCheckoutStore.getState().toggleBump(true)
    useCouponStore.getState().setCoupon({
      id: 'c1',
      code: 'ESTRELA10',
      type: 'percent',
      value: 10,
      discount: 10,
      freeShipping: false,
    })
    selectShipping(0)
    render(<OrderSummary variant="sidebar" />)

    // subtotal com bump = 112,45 → cupom 10% = 11,25 (e não 10,00 do subtotal sem bump)
    const couponRow = screen.getByText('Cupom ESTRELA10').closest('div')!
    expect(within(couponRow).getByText('−R$ 11,25')).toBeInTheDocument()
    expect(screen.getByText('R$ 101,20')).toBeInTheDocument()
  })
})

describe('OrderSummary — desconto progressivo e a frase do descartado (PRM-15, PRM-17, PRM-18)', () => {
  /** A mesma fixture do servidor: 3 × R$ 8,90 numa faixa `unit_price` de R$ 5,00. */
  const kit = (overrides: Partial<ProgressivePromotion> = {}) => {
    active.data = [
      {
        id: 'promo-kit',
        name: 'Kit de bottons',
        discount_kind: 'unit_price',
        tiers: [{ min_qty: 3, value: 5 }],
        scope: 'all',
        eligibleProductIds: [],
        stacks_with_coupon: false,
        created_at: '2026-08-01T00:00:00.000Z',
        ...overrides,
      },
    ]
  }

  const bottons = (quantity: number) =>
    setCart([{ product: product({ id: 'p1', price: 8.9 }), quantity }])

  const coupon = (
    patch: Partial<{ code: string; type: 'percent' | 'fixed' | 'free_shipping'; value: number }>,
  ) =>
    useCouponStore.getState().setCoupon({
      id: 'c1',
      code: 'BEMVINDA',
      type: 'percent',
      value: 10,
      discount: 0,
      freeShipping: false,
      ...patch,
    } as any)

  beforeEach(() => {
    paymentSettings.pix_discount_percent = 0
    selectShipping(0)
  })

  /**
   * PRM-15: subtotal **cheio** + linha de desconto + total descontado — a mesma forma da gaveta
   * (`CartDrawer.test.tsx`: `Subtotal (3 itens)` R$ 26,70, `Desconto progressivo` −R$ 11,70,
   * `Total` R$ 24,90).
   *
   * Antes desta correção o resumo exibia `summary-subtotal` = R$ 15,00 — o subtotal JÁ líquido — ao
   * lado da linha `−R$ 11,70`. Aritmeticamente o total fechava, mas quem lê conta o desconto duas
   * vezes: 26,70 − 11,70 aparece como 15,00 e o desconto reaparece embaixo. As duas superfícies liam a
   * mesma regra e apresentavam o subtotal de formas diferentes; a redação da AC foi corrigida na
   * validação (era ela que estava contraditória).
   */
  it('com a faixa alcançada, o subtotal fica cheio, a linha mostra o desconto e o total vem descontado', () => {
    kit()
    bottons(3)
    render(<OrderSummary variant="sidebar" />)

    expect(screen.getByText('Desconto progressivo')).toBeInTheDocument()
    expect(screen.getByTestId('summary-promotion')).toHaveTextContent('−R$ 11,70')
    expect(screen.getByTestId('summary-subtotal')).toHaveTextContent('R$ 26,70')
    expect(screen.getByTestId('summary-total')).toHaveTextContent('R$ 15,00')
  })

  it('com preço de variação, a linha do item e o subtotal saem da variação, não do base_price', () => {
    kit()
    // `base_price` R$ 8,90, variação escolhida a R$ 6,50 — os dois divergem de propósito.
    setCart([{ product: product({ id: 'p1', price: 8.9 }), quantity: 3, unitPrice: 6.5 }])
    render(<OrderSummary variant="sidebar" />)

    // 3 × 6,50 = 19,50 cheio ⇒ a faixa de R$ 5,00 desconta 4,50 e o total fica em 15,00.
    expect(screen.getByTestId('summary-subtotal')).toHaveTextContent('R$ 19,50')
    expect(screen.getByTestId('summary-promotion')).toHaveTextContent('−R$ 4,50')
    expect(screen.getByTestId('summary-total')).toHaveTextContent('R$ 15,00')
    // A linha do item também: pelo base seriam R$ 26,70 e as linhas não somariam o subtotal.
    const itemRow = screen.getByText('Pin Gojo Satoru').closest('div')!
    expect(within(itemRow).getByText('R$ 19,50')).toBeInTheDocument()
  })

  it('sem faixa alcançada nenhuma linha aparece — o resumo não anuncia −R$ 0,00', () => {
    kit()
    bottons(2)
    render(<OrderSummary variant="sidebar" />)

    expect(screen.queryByText('Desconto progressivo')).not.toBeInTheDocument()
    expect(screen.getByTestId('summary-total')).toHaveTextContent('R$ 17,80')
  })

  it('cupom descartado pela promoção: a frase nomeia os dois e o cupom mostra "Não aplicado"', () => {
    kit()
    bottons(3)
    coupon({ type: 'percent', value: 10 })
    render(<OrderSummary variant="sidebar" />)

    expect(screen.getByTestId('summary-discarded')).toHaveTextContent(
      'Cupom BEMVINDA não foi aplicado — a promoção Kit de bottons desconta mais',
    )
    const band = screen.getByText('BEMVINDA aplicado').parentElement!
    expect(within(band).getByText('Não aplicado')).toBeInTheDocument()
    expect(screen.queryByText('Cupom BEMVINDA')).not.toBeInTheDocument()
    expect(screen.getByTestId('summary-total')).toHaveTextContent('R$ 15,00')
  })

  it('promoção descartada pelo cupom: a frase nomeia a campanha que perdeu', () => {
    kit()
    bottons(3)
    coupon({ type: 'fixed', value: 20 })
    render(<OrderSummary variant="sidebar" />)

    expect(screen.getByTestId('summary-discarded')).toHaveTextContent(
      'A promoção Kit de bottons não foi aplicada — o cupom BEMVINDA desconta mais',
    )
    expect(screen.queryByText('Desconto progressivo')).not.toBeInTheDocument()
    expect(screen.getByTestId('summary-total')).toHaveTextContent('R$ 6,70')
  })

  it('sem escolha a fazer não existe frase de descartado', () => {
    kit()
    bottons(3)
    render(<OrderSummary variant="sidebar" />)

    expect(screen.queryByTestId('summary-discarded')).not.toBeInTheDocument()
  })

  it('com `stacks_with_coupon` o resumo mostra as DUAS linhas (PRM-18)', () => {
    kit({ stacks_with_coupon: true })
    bottons(3)
    coupon({ type: 'percent', value: 10 })
    render(<OrderSummary variant="sidebar" />)

    expect(screen.getByTestId('summary-promotion')).toHaveTextContent('−R$ 11,70')
    const couponRow = screen.getByText('Cupom BEMVINDA').closest('div')!
    expect(within(couponRow).getByText('−R$ 1,50')).toBeInTheDocument()
    expect(screen.queryByTestId('summary-discarded')).not.toBeInTheDocument()
    expect(screen.getByTestId('summary-total')).toHaveTextContent('R$ 13,50')
  })
})

describe('OrderSummary — faixa de frete grátis', () => {
  it('abaixo do threshold mostra quanto falta', () => {
    shippingSettings.free_shipping_threshold = 150
    render(<OrderSummary variant="sidebar" />)

    expect(screen.getByText('Faltam R$ 50,00 para o frete grátis')).toBeInTheDocument()
  })

  it('no threshold mostra o estado liberado', () => {
    shippingSettings.free_shipping_threshold = 100
    render(<OrderSummary variant="sidebar" />)

    expect(screen.getByText('Frete grátis liberado')).toBeInTheDocument()
    expect(screen.queryByText(/faltam/i)).not.toBeInTheDocument()
  })

  /**
   * `FRG-06` — o interruptor governa a faixa inteira.
   *
   * Era `cartSubtotal >= free_shipping_threshold`: com a faixa em zero, sempre verdadeiro, e o
   * resumo anunciava "Frete grátis liberado" numa loja que já não prometia nada em tela nenhuma.
   */
  it('DESLIGADO: a faixa some inteira, nos dois estados que ela teria', () => {
    shippingSettings.free_shipping_enabled = false
    shippingSettings.free_shipping_threshold = 100
    render(<OrderSummary variant="sidebar" />)

    expect(screen.queryByText('Frete grátis liberado')).toBeNull()
    expect(screen.queryByText(/para o frete grátis/)).toBeNull()
    // O resumo continua de pé — o que sai é só a faixa.
    expect(screen.getByTestId('summary-total')).toBeInTheDocument()
  })

  it('DESLIGADO com subtotal acima da faixa guardada: nada de "liberado"', () => {
    shippingSettings.free_shipping_enabled = false
    shippingSettings.free_shipping_threshold = 1
    render(<OrderSummary variant="sidebar" />)

    expect(screen.queryByText('Frete grátis liberado')).toBeNull()
  })

  it('LIGADO com faixa zerada (config inválida) não anuncia liberado', () => {
    shippingSettings.free_shipping_enabled = true
    shippingSettings.free_shipping_threshold = 0
    render(<OrderSummary variant="sidebar" />)

    expect(screen.queryByText('Frete grátis liberado')).toBeNull()
    expect(screen.queryByText(/para o frete grátis/)).toBeNull()
  })

  it('DESLIGADO: a barra colapsada do mobile perde o sufixo " · frete grátis"', () => {
    shippingSettings.free_shipping_enabled = false
    shippingSettings.free_shipping_threshold = 1
    render(<OrderSummary variant="bar" />)

    expect(screen.getByRole('button', { expanded: false })).not.toHaveTextContent('frete grátis')
  })

  it('LIGADO e atingido: a barra colapsada do mobile MANTÉM o sufixo', () => {
    // O par do caso acima — sem ele, remover o sufixo de vez passaria na régua.
    shippingSettings.free_shipping_enabled = true
    shippingSettings.free_shipping_threshold = 1
    render(<OrderSummary variant="bar" />)

    expect(screen.getByRole('button', { expanded: false })).toHaveTextContent('frete grátis')
  })
})

describe('OrderSummary — variantes (CHK-05)', () => {
  it('variant=bar começa colapsada mostrando itens e total', () => {
    selectShipping(10)
    render(<OrderSummary variant="bar" />)

    expect(screen.getByRole('button', { expanded: false })).toHaveTextContent('Resumo · 2 itens')
    expect(screen.getByRole('button', { expanded: false })).toHaveTextContent('R$ 110,00')
    expect(screen.queryByText('Subtotal')).not.toBeInTheDocument()
  })

  it('variant=bar expandida mostra a mesma informação da sidebar', () => {
    selectShipping(10)
    render(<OrderSummary variant="bar" />)

    fireEvent.click(screen.getByRole('button', { expanded: false }))

    expect(screen.getByText('Pin Gojo Satoru')).toBeInTheDocument()
    expect(screen.getByText('Subtotal')).toBeInTheDocument()
    expect(screen.getByText('Frete · Correios PAC')).toBeInTheDocument()
    expect(screen.getByText('Total')).toBeInTheDocument()
  })

  it('variant=sidebar exibe o título e a contagem de itens', () => {
    render(<OrderSummary variant="sidebar" />)

    expect(screen.getByText('Seu pedido')).toBeInTheDocument()
    expect(screen.getByText('2 itens')).toBeInTheDocument()
  })
})

describe('OrderSummary — respiro e medidas do board 04 (RSM-01)', () => {
  it('todas as faixas usam 24px de respiro horizontal', () => {
    const { container } = render(<OrderSummary variant="sidebar" />)

    expect(container.querySelector('header')!.className).toContain('px-6')
    const bands = container.querySelectorAll('section > div')
    expect(bands.length).toBeGreaterThan(0)
    bands.forEach((band) => expect(band.className).toContain('px-6'))
  })

  it('as linhas de item ficam a 16px uma da outra', () => {
    render(<OrderSummary variant="sidebar" />)

    const itemsBand = screen.getByText('Pin Gojo Satoru').closest('div[class*="py-5"]')
    expect(itemsBand!.className).toContain('gap-4')
  })

  it('a miniatura é 56×56 com raio de 12px', () => {
    const { container } = render(<OrderSummary variant="sidebar" />)

    const thumb = container.querySelector('[class*="h-14"]')
    expect(thumb).not.toBeNull()
    expect(thumb!.className).toContain('w-14')
    expect(thumb!.className).toContain('rounded-[12px]')
  })
})

describe('OrderSummary — faixa do cupom aplicado (RSM-02, RSM-03)', () => {
  const applyCoupon = () =>
    useCouponStore.getState().setCoupon({
      id: 'c1',
      code: 'ESTRELA10',
      type: 'fixed',
      value: 5.96,
      discount: 5.96,
      freeShipping: false,
    })

  it('com cupom aplicado a faixa do board substitui o campo de digitar', () => {
    applyCoupon()
    render(<OrderSummary variant="sidebar" />)

    expect(screen.getByText('ESTRELA10 aplicado')).toBeInTheDocument()
    expect(screen.queryByTestId('coupon-input')).not.toBeInTheDocument()
  })

  it('a faixa tem régua em cima e embaixo, o desconto em geleia e a ação de remover', () => {
    applyCoupon()
    render(<OrderSummary variant="sidebar" />)

    const band = screen.getByText('ESTRELA10 aplicado').parentElement!
    expect(band.className).toContain('border-y')
    expect(within(band).getByText('−R$ 5,96').className).toContain('text-estrelinha-primary')
    expect(within(band).getByRole('button', { name: 'Remover cupom' })).toBeInTheDocument()
    // RSM-02 enumera cinco elementos, e o ícone de etiqueta é um deles — o board abre a faixa com
    // ele. Sem esta linha, remover o ícone não quebra teste nenhum.
    expect(band.querySelector('svg.lucide-tag')).not.toBeNull()
  })

  it('remover o cupom devolve o campo de digitar (RSM-03)', () => {
    applyCoupon()
    render(<OrderSummary variant="sidebar" />)

    fireEvent.click(screen.getByRole('button', { name: 'Remover cupom' }))

    expect(useCouponStore.getState().applied).toBeNull()
    expect(screen.getByTestId('coupon-input')).toBeInTheDocument()
    expect(screen.queryByText('ESTRELA10 aplicado')).not.toBeInTheDocument()
  })

  it('sem cupom o campo de digitar continua no lugar (RSM-03)', () => {
    render(<OrderSummary variant="sidebar" />)

    expect(screen.getByTestId('coupon-input')).toBeInTheDocument()
    expect(screen.queryByText(/aplicado/)).not.toBeInTheDocument()
  })

  it('a ação de remover tem alvo de toque de 44px', () => {
    applyCoupon()
    render(<OrderSummary variant="sidebar" />)

    // jsdom não faz layout: a asserção é sobre a classe que garante os 44px.
    expect(screen.getByRole('button', { name: 'Remover cupom' }).className).toContain('h-11')
  })
})

describe('OrderSummary — total e parcela (RSM-05, RSM-06)', () => {
  it('o total é exibido em 32px, Libre Baskerville, −0.03em (RSM-05)', () => {
    render(<OrderSummary variant="sidebar" />)

    const total = screen.getByTestId('summary-total')
    // RSM-05 nomeia os três: corpo, família e tracking. Asseverar só o corpo deixaria trocar a
    // fonte ou soltar o tracking sem nenhum teste reclamar.
    expect(total.className).toContain('text-[32px]')
    expect(total.className).toContain('leading-[34px]')
    expect(total.className).toContain('font-heading')
    expect(total.className).toContain('tracking-[-0.03em]')
  })

  it('a parcela sai do total do CARTÃO, não do total com desconto PIX (RSM-06)', () => {
    useCheckoutStore.getState().setPayment({ method: 'pix' })
    selectShipping(10)
    render(<OrderSummary variant="sidebar" />)

    // exibido: 100 + 10 − 5 (PIX) = 105 · no cartão: 110 → 6x de R$ 18,33 (e NÃO 6x de R$ 17,50)
    expect(screen.getByTestId('summary-total')).toHaveTextContent('R$ 105,00')
    const line = screen.getByText(/no cartão:/)
    expect(line).toHaveTextContent('no cartão: 6x de R$ 18,33 sem juros')
    // RSM-06 pede a linha **alinhada à direita** — é o que a encosta no total no board.
    expect(line.className).toContain('text-right')
  })

  it('parcelamento que resolve em 1x não vira linha — 1x não é informação', () => {
    paymentSettings.min_installment_value = 200
    render(<OrderSummary variant="sidebar" />)

    expect(screen.queryByText(/no cartão:/)).not.toBeInTheDocument()
  })

  it('com o cartão desabilitado nas settings a linha não aparece', () => {
    paymentSettings.card_enabled = false
    selectShipping(10)
    render(<OrderSummary variant="sidebar" />)

    expect(screen.queryByText(/no cartão:/)).not.toBeInTheDocument()
  })
})

describe('OrderSummary — barra do mobile (RSM-07)', () => {
  it('com frete grátis liberado a barra anuncia o benefício', () => {
    shippingSettings.free_shipping_threshold = 100
    render(<OrderSummary variant="bar" />)

    expect(screen.getByRole('button', { expanded: false })).toHaveTextContent(
      'Resumo · 2 itens · frete grátis',
    )
  })

  it('abaixo do threshold a barra não promete frete grátis', () => {
    shippingSettings.free_shipping_threshold = 150
    render(<OrderSummary variant="bar" />)

    const bar = screen.getByRole('button', { expanded: false })
    expect(bar).toHaveTextContent('Resumo · 2 itens')
    expect(bar).not.toHaveTextContent('frete grátis')
  })
})

describe('OrderSummary — paleta (DESIGN.md §8)', () => {
  it('nenhuma pílula geleia e nenhuma manteiga sobre branco', () => {
    const { container } = render(<OrderSummary variant="sidebar" />)

    expect(container.querySelectorAll('[class*="bg-estrelinha-primary"]')).toHaveLength(0)
    expect(container.querySelectorAll('[class*="estrelinha-accent"]')).toHaveLength(0)
  })

  it('nenhuma classe de cor fora da paleta Uma Estrelinha', () => {
    const { container } = render(<OrderSummary variant="sidebar" />)

    expect(container.innerHTML).not.toMatch(
      /bg-(yellow|blue|purple|green|red)-|text-(green|red|yellow|blue|purple)-[0-9]/,
    )
  })
})

/**
 * `PRF-02` (AC 5) — a miniatura de 56px do resumo pede rendição.
 *
 * O resumo fica na tela o checkout inteiro, com uma foto por item. Servir o original de 1024px ali
 * é baixar o catálogo do carrinho de novo, na hora em que a cliente está pagando.
 */
describe('OrderSummary — a miniatura pede o tamanho da vaga (PRF-02 AC 5)', () => {
  const STORAGE =
    'https://hgkrsfpupypxtygjgthf.supabase.co/storage/v1/object/public/product-images/pingente.webp'

  it('a miniatura de 56px busca a rendição de 160, e não o objeto original', () => {
    setCart([{ product: product({ image_url: STORAGE }), quantity: 1 }])
    const { container } = render(<OrderSummary variant="sidebar" />)

    const foto = container.querySelector('img')
    expect(foto?.getAttribute('src')).toContain('/render/image/public/')
    expect(foto?.getAttribute('src')).toContain('width=160')
    expect(foto?.getAttribute('src')).toContain('quality=75')
    expect(foto?.getAttribute('src')).not.toContain('/object/public/')
  })

  it('item sem foto continua no símbolo da marca, sem `<img>` nenhum', () => {
    setCart([{ product: product({ image_url: '' }), quantity: 1 }])
    const { container } = render(<OrderSummary variant="sidebar" />)

    expect(container.querySelectorAll('img')).toHaveLength(0)
  })
})
