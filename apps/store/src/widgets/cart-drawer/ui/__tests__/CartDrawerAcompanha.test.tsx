import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Product } from '@estrelinha/supabase/types'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { useCartUiStore } from '@/entities/cart/model/cartUiStore'
import { useCouponStore } from '@/entities/coupon'
import { companionPhrase as fraseDoPedido } from '@estrelinha/core/buy-together'
import { companionPhrase } from '../../model/drawerFacts'

vi.mock('@estrelinha/core/hooks/usePromotions', () => ({
  useActivePromotions: () => ({ data: [], isLoading: false }),
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

const peca = (id: string, name: string): Product =>
  ({
    id, name, slug: id, price: 50, compare_price: null, category_id: 'c', category_slug: 'x',
    description: '', image_url: '', images: [], options: [], variants: [], stock_policy: 'none',
    category_links: [], stock_total: 9, low_stock_threshold: 1, is_new: false, is_featured: false, tags: [],
  }) as unknown as Product

const marca = (id: string) => ({ mainProductId: id, listId: null })

const abrir = () => {
  render(
    <MemoryRouter>
      <CartDrawer />
    </MemoryRouter>,
  )
  act(() => useCartUiStore.getState().openCart())
}
const linha = (nome: string) =>
  screen.getAllByRole('listitem').find((li) => within(li).queryByText(nome, { selector: 'a' }))!

beforeEach(() => {
  useCartStore.setState({ items: [] })
  useCartUiStore.setState({ open: false })
  useCouponStore.getState().clearCoupon()
})

describe('companionPhrase', () => {
  it('um, dois e três nomes — e nenhum', () => {
    expect(companionPhrase([])).toBeNull()
    expect(companionPhrase(['Pingente X'])).toBe('Acompanha o Pingente X')
    expect(companionPhrase(['Pingente X', 'Pingente Y'])).toBe('Acompanha o Pingente X e o Pingente Y')
    expect(companionPhrase(['A', 'B', 'C'])).toBe('Acompanha o A, o B e o C')
  })

  it('é a MESMA frase da confirmação do pedido e do painel (referência, não cópia)', () => {
    expect(companionPhrase).toBe(fraseDoPedido)
  })
})

describe('a linha da sacola do adicional do conjunto', () => {
  it('diz "Acompanha o <nome completo>" enquanto o principal está na sacola', () => {
    useCartStore.getState().addItems([
      { product: peca('main', 'Pingente Estrela com Cinzas da Mamãe') },
      { product: peca('corr', 'Corrente Prata'), accompanies: marca('main') },
    ])
    abrir()
    expect(within(linha('Corrente Prata')).getByTestId('acompanha')).toHaveTextContent(
      'Acompanha o Pingente Estrela com Cinzas da Mamãe',
    )
    expect(within(linha('Pingente Estrela com Cinzas da Mamãe')).queryByTestId('acompanha')).toBeNull()
  })

  it('acompanhando dois principais, nomeia os dois', () => {
    useCartStore.getState().addItems([
      { product: peca('x', 'Pingente X') },
      { product: peca('y', 'Pingente Y') },
      { product: peca('corr', 'Corrente Prata'), accompanies: marca('x') },
    ])
    useCartStore.getState().addItems([{ product: peca('corr', 'Corrente Prata'), accompanies: marca('y') }])
    abrir()
    expect(within(linha('Corrente Prata')).getByTestId('acompanha')).toHaveTextContent(
      'Acompanha o Pingente X e o Pingente Y',
    )
  })

  it('removido o principal, os adicionais ficam como peças comuns, sem a frase', () => {
    useCartStore.getState().addItems([
      { product: peca('main', 'Pingente X') },
      { product: peca('corr', 'Corrente Prata'), accompanies: marca('main') },
      { product: peca('caixa', 'Caixa de Presente'), accompanies: marca('main') },
    ])
    abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Remover Pingente X da sacola' }))
    expect(screen.queryByTestId('acompanha')).toBeNull()
    expect(screen.getByText('Corrente Prata')).toBeInTheDocument()
    expect(screen.getByText('Caixa de Presente')).toBeInTheDocument()
  })

  it('remover um adicional não remove as outras linhas', async () => {
    useCartStore.getState().addItems([
      { product: peca('main', 'Pingente X') },
      { product: peca('corr', 'Corrente Prata'), accompanies: marca('main') },
      { product: peca('caixa', 'Caixa de Presente'), accompanies: marca('main') },
    ])
    abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Remover Corrente Prata da sacola' }))
    expect(screen.getByText('Pingente X')).toBeInTheDocument()
    expect(screen.getByText('Caixa de Presente')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByText('Corrente Prata')).toBeNull())
  })
})

// Token exato: `w-2.5` não pode casar dentro de `w-2.5x`, nem `h-px` dentro de `min-h-px` (L-034).
const temToken = (el: Element, token: string) =>
  new RegExp(`(?:^|\\s)${token.replace(/[.[\]]/g, '\\$&')}(?![-\\w])`).test(el.getAttribute('class') ?? '')

describe('o desenho da linha "Acompanha o …" (protótipo, .acomp i)', () => {
  const montar = () => {
    useCartStore.getState().addItems([
      { product: peca('main', 'Pingente Estrela com Cinzas da Mamãe') },
      { product: peca('corr', 'Corrente Prata'), accompanies: marca('main') },
    ])
    abrir()
    return within(linha('Corrente Prata')).getByTestId('acompanha')
  }

  it('antes do texto vem um traço decorativo de 10×1px em accent, escondido do leitor de tela e sem texto', () => {
    const p = montar()
    const traco = p.firstElementChild
    expect(traco).not.toBeNull()
    // O traço é o PRIMEIRO nó da linha: nada de texto antes dele.
    expect(p.firstChild).toBe(traco)
    expect(traco!.getAttribute('aria-hidden')).toBe('true')
    expect(traco!.textContent).toBe('')
    for (const token of ['bg-estrelinha-accent', 'w-2.5', 'h-px', 'inline-block']) {
      expect(temToken(traco!, token), token).toBe(true)
    }
  })

  it('a frase sai em 12,5px ink-soft', () => {
    const p = montar()
    expect(temToken(p, 'text-[12.5px]')).toBe(true)
    expect(temToken(p, 'text-estrelinha-ink-soft')).toBe(true)
    expect(temToken(p, 'text-[12px]')).toBe(false)
  })

  it('o texto da linha é exatamente a frase — o traço não entra no textContent', () => {
    const p = montar()
    expect(p.textContent).toBe('Acompanha o Pingente Estrela com Cinzas da Mamãe')
  })
})
