import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import type { Product } from '@estrelinha/supabase/types'
import { useCartStore } from '@/entities/cart'
import { useProductById } from '@/entities/product'
import { useCheckoutStore } from '../../model/checkoutStore'
import OrderBump from '../OrderBump'

/* eslint-disable @typescript-eslint/no-explicit-any */

// BMP-02: exibe só com order_bump_enabled + produto existente + stock_total > 0 + fora do carrinho.
// BMP-03: preço exibido vem de `applyOrderBump` (a mesma função do servidor).
// BMP-05: marcar/desmarcar não acumula desconto nem duplica o item.

vi.mock('@/entities/product/api/useProducts', () => ({ useProductById: vi.fn() }))

const checkoutSettings = {
  order_bump_enabled: true,
  order_bump_product_id: 'bump-1',
  order_bump_discount_percent: 50,
}
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useCheckoutSettings: () => checkoutSettings,
}))

const productByIdMock = vi.mocked(useProductById)

const product = (overrides: Partial<Product> = {}): Product =>
  ({
    id: 'bump-1',
    name: 'Porta-pins de feltro Nanita',
    slug: 'porta-pins',
    price: 24.9,
    compare_price: null,
    category_id: '',
    category_slug: '',
    description: '',
    image_url: '',
    images: [],
    stock_total: 5,
    low_stock_threshold: 5,
    is_new: false,
    is_featured: false,
    tags: [],
    ...overrides,
  }) as Product

const resolves = (data: Product | null) =>
  productByIdMock.mockReturnValue({ data, isError: false } as any)

const putInCart = (id: string) =>
  useCartStore.setState({
    items: [{
      product: product({ id }), size: '', finish: '', quantity: 1,
      variantId: null, variantLabel: '', optionValues: {}, unitPrice: 19.9,
    }],
  })

beforeEach(() => {
  useCheckoutStore.getState().reset()
  useCartStore.setState({ items: [] })
  sessionStorage.clear()
  checkoutSettings.order_bump_enabled = true
  checkoutSettings.order_bump_product_id = 'bump-1'
  checkoutSettings.order_bump_discount_percent = 50
  resolves(product())
})

describe('OrderBump — condições de exibição (BMP-02)', () => {
  it('renderiza a oferta com as quatro condições satisfeitas', () => {
    render(<OrderBump />)

    expect(screen.getByText('Porta-pins de feltro Nanita')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  it('order_bump_enabled = false não renderiza nada', () => {
    checkoutSettings.order_bump_enabled = false
    const { container } = render(<OrderBump />)

    expect(container).toBeEmptyDOMElement()
  })

  it('produto inexistente não renderiza nada', () => {
    resolves(null)
    const { container } = render(<OrderBump />)

    expect(container).toBeEmptyDOMElement()
  })

  it('stock_total = 0 não renderiza nada', () => {
    resolves(product({ stock_total: 0 }))
    const { container } = render(<OrderBump />)

    expect(container).toBeEmptyDOMElement()
  })

  it('produto já no carrinho não renderiza nada', () => {
    putInCart('bump-1')
    const { container } = render(<OrderBump />)

    expect(container).toBeEmptyDOMElement()
  })

  it('order_bump_product_id nulo não renderiza nada', () => {
    checkoutSettings.order_bump_product_id = null
    resolves(null)
    const { container } = render(<OrderBump />)

    expect(container).toBeEmptyDOMElement()
  })
})

describe('OrderBump — preço (BMP-03)', () => {
  it('exibe o preço com desconto de applyOrderBump e o preço cheio riscado', () => {
    render(<OrderBump />)

    // 24,90 com 50% = 12,45 (round2 de applyOrderBump)
    expect(screen.getByText('R$ 12,45')).toBeInTheDocument()
    expect(screen.getByText('R$ 24,90')).toHaveClass('line-through')
  })

  it('percentual diferente muda o preço exibido pela mesma função', () => {
    checkoutSettings.order_bump_discount_percent = 30
    render(<OrderBump />)

    // 24,90 com 30% = 17,43
    expect(screen.getByText('R$ 17,43')).toBeInTheDocument()
  })
})

describe('OrderBump — marcação (BMP-05)', () => {
  it('marcar grava bumpChecked no rascunho', () => {
    render(<OrderBump />)

    fireEvent.click(screen.getByRole('checkbox'))

    expect(useCheckoutStore.getState().bumpChecked).toBe(true)
    expect(screen.getByRole('checkbox')).toHaveAttribute('aria-checked', 'true')
  })

  it('marcar e desmarcar 3× termina marcado uma única vez e o preço não acumula desconto', () => {
    render(<OrderBump />)
    const checkbox = screen.getByRole('checkbox')

    for (let i = 0; i < 3; i++) {
      fireEvent.click(checkbox)
      fireEvent.click(checkbox)
    }
    fireEvent.click(checkbox)

    expect(useCheckoutStore.getState().bumpChecked).toBe(true)
    expect(screen.getByText('R$ 12,45')).toBeInTheDocument()
  })

  it('oferta que deixa de ser elegível é desmarcada (não vai ao pedido escondida)', () => {
    const { rerender } = render(<OrderBump />)
    fireEvent.click(screen.getByRole('checkbox'))
    expect(useCheckoutStore.getState().bumpChecked).toBe(true)

    resolves(product({ stock_total: 0 }))
    rerender(<OrderBump />)

    expect(useCheckoutStore.getState().bumpChecked).toBe(false)
  })
})

describe('OrderBump — paleta (DESIGN.md §8)', () => {
  it('superfície tinta, badge em manteiga sobre tinta e preço em glacê', () => {
    const { container } = render(<OrderBump />)

    expect(container.querySelector('[class*="bg-estrelinha-ink"]')).not.toBeNull()
    expect(screen.getByText('Só aqui')).toHaveClass('bg-estrelinha-accent')
    expect(screen.getByText('R$ 12,45')).toHaveClass('text-estrelinha-accent')
  })

  it('nenhum bg-estrelinha-primary e nenhuma cor fora da paleta', () => {
    const { container } = render(<OrderBump />)

    expect(container.querySelectorAll('[class*="bg-estrelinha-primary"]')).toHaveLength(0)
    expect(container.innerHTML).not.toMatch(
      /bg-(yellow|blue|purple|green|red)-|text-(green|red|yellow|blue|purple)-[0-9]/,
    )
  })
})
