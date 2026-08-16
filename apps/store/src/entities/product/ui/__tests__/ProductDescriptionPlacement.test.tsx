import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Product } from '@estrelinha/supabase/types'

/**
 * `PDP-01` — a descrição MUDOU DE LUGAR.
 *
 * "Movida" só é verificável se os dois lados forem asseverados no mesmo lugar: ausente na coluna de
 * informação **e** presente no acordeão. Um teste de ausência sozinho passaria se a descrição
 * tivesse sido simplesmente apagada; um de presença sozinho passaria se ela estivesse nos dois
 * lugares ao mesmo tempo.
 */

vi.mock('sonner', () => ({ toast: { custom: vi.fn(), error: vi.fn(), success: vi.fn() } }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => ({ data: [] }) }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useGeneralSettings: () => ({ whatsapp: '', store_name: 'Uma Estrelinha' }),
  usePaymentSettings: () => ({
    max_installments: 6,
    min_installment_value: 10,
    pix_enabled: true,
    pix_discount_percent: 5,
  }),
  useShippingSettings: () => ({ free_shipping_threshold: 150 }),
}))
vi.mock('@/features/share-product/ui/ShareButtons', () => ({ default: () => null }))

import { useProductPurchase } from '../../model/useProductPurchase'
import ProductInfo from '../ProductInfo'
import ProductDetailsAccordion from '../ProductDetailsAccordion'

const FRASE = 'Guarda o leite materno da amamentação.'
const DESCRICAO = `<h2>Anel Afetivo</h2><p>${FRASE}</p>`

const product = (): Product =>
  ({
    id: 'p1',
    name: 'Anel Afetivo',
    slug: 'anel-afetivo',
    price: 289.9,
    compare_price: null,
    category_id: 'c1',
    category_slug: 'joias',
    description: DESCRICAO,
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
  }) as Product

const Info = ({ value }: { value: Product }) => (
  <ProductInfo product={value} purchase={useProductPurchase(value)} />
)

describe('a descrição saiu da coluna de informação (PDP-01)', () => {
  it('`ProductInfo` não mostra a descrição', () => {
    render(
      <MemoryRouter>
        <Info value={product()} />
      </MemoryRouter>,
    )

    expect(screen.queryByText(FRASE)).toBeNull()
  })

  it('`ProductInfo` não imprime o HTML cru — o defeito que a feature fecha', () => {
    const { container } = render(
      <MemoryRouter>
        <Info value={product()} />
      </MemoryRouter>,
    )

    expect(container.textContent).not.toContain('<h2>')
    expect(container.textContent).not.toContain('<p>')
  })

  it('mas o nome e o preço continuam na coluna — não foi a coluna que sumiu', () => {
    render(
      <MemoryRouter>
        <Info value={product()} />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { level: 1, name: 'Anel Afetivo' })).toBeInTheDocument()
    expect(screen.getByText('R$ 289,90')).toBeInTheDocument()
  })
})

describe('e chegou ao acordeão (PDP-02)', () => {
  it('`ProductDetailsAccordion` mostra a mesma descrição, renderizada', () => {
    render(<ProductDetailsAccordion product={product()} />)

    expect(screen.getByText(FRASE)).toBeInTheDocument()
  })
})

describe('o par, no mesmo render — é isto que prova "movida"', () => {
  it('a frase aparece exatamente uma vez na página inteira', () => {
    render(
      <MemoryRouter>
        <Info value={product()} />
        <ProductDetailsAccordion product={product()} />
      </MemoryRouter>,
    )

    // Uma só: se ainda estivesse na coluna, seriam duas.
    expect(screen.getAllByText(FRASE)).toHaveLength(1)
  })
})
