import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Product } from '@estrelinha/supabase/types'

// O card lê `usePaymentSettings` desde que passou a mostrar Pix e parcela na vitrine (board
// `7CF-0`). São os MESMOS valores que o caixa cobra, então o mock repete os defaults de
// `DEFAULT_PAYMENT` — um mock com número inventado aqui provaria uma tela que não existe.
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  usePaymentSettings: () => ({
    pix_enabled: true,
    pix_discount_percent: 5,
    card_enabled: true,
    max_installments: 6,
    min_installment_value: 10,
  }),
}))

import ProductCard from '../ProductCard'

/**
 * A superfície do card de produto na identidade papelaria (`PAP-08`).
 *
 * O card é o componente mais repetido da loja — aparece em quatro seções da
 * home, na categoria, na busca e nos relacionados. Uma cor errada aqui não é um
 * defeito local: é o defeito multiplicado por toda a vitrine.
 *
 * A regra que estes testes congelam é a da prancha 20b: **Carmim é todo o
 * dinheiro da tela**, e o resto do card é Grafite. Só o desconto ganha cor de
 * dinheiro; "Novo", "Últimas" e "Destaque" saem em Grafite — senão a listagem
 * vira um mostruário de etiquetas coloridas disputando atenção, que era
 * exatamente o problema da versão com selo rosa, amarelo e verde-água.
 */

vi.mock('sonner', () => ({ toast: { custom: vi.fn(), error: vi.fn(), success: vi.fn() } }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => ({ data: [] }) }))

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Botton Naruto Uzumaki',
  slug: 'botton-naruto',
  price: 8.9,
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
  stock_total: 10,
  low_stock_threshold: 5,
  is_new: false,
  is_featured: false,
  tags: [],
  ...overrides,
})

const renderCard = (p: Product) =>
  render(
    <MemoryRouter>
      <ProductCard product={p} />
    </MemoryRouter>,
  )

describe('card de produto — superfícies', () => {
  it('o palco da foto é Mata-borrão', () => {
    const { container } = renderCard(product())
    expect(container.querySelector('.bg-estrelinha-ground-deep')).not.toBeNull()
  })

  it('o disco de adicionar é Grafite e continua DISCO', () => {
    // A forma de ação virou 14px na v2, mas o disco é a assinatura da marca —
    // o produto é redondo. É a única exceção declarada da regra.
    renderCard(product())
    const add = screen.getByRole('button', { name: /adicionar ao carrinho/i })
    expect(add).toHaveClass('bg-estrelinha-ink', 'rounded-full')
    expect(add).not.toHaveClass('rounded-sm')
  })

  it('o disco de favoritar é branco', () => {
    renderCard(product())
    expect(screen.getByRole('button', { name: /favoritos/i })).toHaveClass('bg-white', 'rounded-full')
  })
})

describe('card de produto — só o desconto ganha cor de dinheiro', () => {
  it('o preço sai em Carmim', () => {
    // Prancha 20b: Carmim é "todo o dinheiro da tela".
    renderCard(product())
    expect(screen.getByText('R$ 8,90')).toHaveClass('text-estrelinha-primary')
  })

  it('o selo de desconto é Carmim', () => {
    renderCard(product({ price: 7.5, compare_price: 8.9 }))
    expect(screen.getByText('-16%')).toHaveClass('bg-estrelinha-primary')
  })

  it.each([
    ['Novo', { is_new: true }],
    ['Últimas', { stock_total: 3 }],
    ['Destaque', { is_featured: true }],
  ])('o selo "%s" é Grafite, não Carmim', (label, overrides) => {
    renderCard(product(overrides as Partial<Product>))
    const badge = screen.getByText(label)
    expect(badge).toHaveClass('bg-estrelinha-ink')
    expect(badge).not.toHaveClass('bg-estrelinha-primary')
  })

  it('o preço riscado é Carbono, não Carmim — dois vermelhos empatariam', () => {
    renderCard(product({ price: 7.5, compare_price: 8.9 }))
    expect(screen.getByText('R$ 8,90')).toHaveClass('text-estrelinha-ink-soft', 'line-through')
  })
})

describe('card de produto — tipografia', () => {
  it('o nome sai em Libre Baskerville 500 na tinta primária', () => {
    renderCard(product())
    expect(screen.getByRole('heading', { name: 'Botton Naruto Uzumaki' })).toHaveClass(
      'font-display',
      'font-medium',
      'text-estrelinha-ink',
    )
  })
})
