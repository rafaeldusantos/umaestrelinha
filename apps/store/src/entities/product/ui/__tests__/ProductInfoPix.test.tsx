import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { OptionValues, Product, ProductVariant } from '@estrelinha/supabase/types'

/**
 * `PDP-11`..`PDP-13` — o preço com Pix na página do produto.
 *
 * A aritmética está em `packages/core/src/payment/__tests__/pix.test.ts`, e a igualdade com o total
 * cobrado, em `displayedEqualsCharged.test.ts`. Aqui a régua é a tela: aparece? onde? some quando
 * deve? segue a variação escolhida?
 */

vi.mock('sonner', () => ({ toast: { custom: vi.fn(), error: vi.fn(), success: vi.fn() } }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => ({ data: [] }) }))
vi.mock('@/features/share-product/ui/ShareButtons', () => ({ default: () => null }))

const { settings } = vi.hoisted(() => ({
  settings: {
    max_installments: 6,
    min_installment_value: 10,
    pix_enabled: true,
    pix_discount_percent: 5,
  },
}))

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useGeneralSettings: () => ({ whatsapp: '', store_name: 'Uma Estrelinha' }),
  usePaymentSettings: () => settings,
  useShippingSettings: () => ({ free_shipping_threshold: 150 }),
}))

import { useProductPurchase } from '../../model/useProductPurchase'
import ProductInfo from '../ProductInfo'

let seq = 0
const variant = (option_values: OptionValues, price: number): ProductVariant =>
  ({
    id: `v${++seq}`,
    product_id: 'p1',
    option_values,
    name: null,
    sku: null,
    price,
    compare_price: null,
    stock: 10,
    weight_kg: null,
    image_url: null,
    is_active: true,
    position: seq,
  }) as ProductVariant

const product = (over: Partial<Product> = {}): Product =>
  ({
    id: 'p1',
    name: 'Anel Afetivo',
    slug: 'anel-afetivo',
    price: 7.9,
    compare_price: null,
    category_id: 'c1',
    category_slug: 'joias',
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
    ...over,
  }) as Product

const Info = ({ value }: { value: Product }) => (
  <ProductInfo product={value} purchase={useProductPurchase(value)} />
)

const renderInfo = (p: Product) =>
  render(
    <MemoryRouter>
      <Info value={p} />
    </MemoryRouter>,
  )

const reset = () => {
  settings.pix_enabled = true
  settings.pix_discount_percent = 5
}

describe('ProductInfo — a linha do Pix (PDP-11)', () => {
  it('mostra o preço com Pix', () => {
    reset()
    renderInfo(product())

    // R$ 7,90 a 5%: desconto 0,395 → 0,40 → 7,50. É o que o caixa cobra.
    expect(screen.getByText('R$ 7,50')).toBeInTheDocument()
    expect(screen.getByText('com Pix')).toBeInTheDocument()
  })

  it('NÃO mostra o valor da fórmula antiga, que o caixa não cobrava', () => {
    reset()
    renderInfo(product())

    // `round2(7,90 × 0,95)` = 7,51 — o número que o card exibia antes da feature 27.
    expect(screen.queryByText('R$ 7,51')).toBeNull()
  })

  it('a linha fica ENTRE o preço cheio e as parcelas', () => {
    reset()
    const { container } = renderInfo(product({ price: 289.9 }))
    const texto = container.textContent ?? ''

    expect(texto.indexOf('R$ 289,90')).toBeLessThan(texto.indexOf('com Pix'))
    expect(texto.indexOf('com Pix')).toBeLessThan(texto.indexOf('sem juros'))
  })

  it('o ícone do Pix acompanha a linha e é decorativo', () => {
    reset()
    const { container } = renderInfo(product())
    const svg = container.querySelector('svg[viewBox="0 0 16 16"]')

    // O texto já diz "com Pix"; o ícone repetiria a informação para o leitor de tela.
    expect(svg).not.toBeNull()
    expect(svg?.getAttribute('aria-hidden')).toBe('true')
  })
})

describe('ProductInfo — quando o Pix não aparece (PDP-12)', () => {
  it('com `pix_enabled` falso, nada de Pix', () => {
    reset()
    settings.pix_enabled = false
    renderInfo(product())

    expect(screen.queryByText('com Pix')).toBeNull()
  })

  it('com percentual zerado, nada de Pix', () => {
    reset()
    settings.pix_discount_percent = 0
    renderInfo(product())

    expect(screen.queryByText('com Pix')).toBeNull()
  })

  it('com percentual negativo, nada de Pix', () => {
    reset()
    settings.pix_discount_percent = -5
    renderInfo(product())

    expect(screen.queryByText('com Pix')).toBeNull()
  })
})

describe('ProductInfo — o Pix segue a variação escolhida (PDP-13)', () => {
  it('parte do preço da variação inicial, não do `product.price`', () => {
    reset()
    const p = product({
      price: 7.9,
      options: [{ name: 'Tamanho', values: ['P', 'G'], position: 0 }],
      variants: [variant({ Tamanho: 'P' }, 100), variant({ Tamanho: 'G' }, 200)],
    })
    renderInfo(p)

    // A variação inicial é a primeira: R$ 100 → R$ 95,00. O `product.price` de 7,90 daria 7,50.
    expect(screen.getByText('R$ 95,00')).toBeInTheDocument()
    expect(screen.queryByText('R$ 7,50')).toBeNull()
  })

  it('trocar de variação muda o preço com Pix', () => {
    reset()
    const p = product({
      price: 7.9,
      options: [{ name: 'Tamanho', values: ['P', 'G'], position: 0 }],
      variants: [variant({ Tamanho: 'P' }, 100), variant({ Tamanho: 'G' }, 200)],
    })
    renderInfo(p)

    fireEvent.click(screen.getByRole('radio', { name: 'G' }))

    // R$ 200 → R$ 190,00.
    expect(screen.getByText('R$ 190,00')).toBeInTheDocument()
    expect(screen.queryByText('R$ 95,00')).toBeNull()
  })
})
