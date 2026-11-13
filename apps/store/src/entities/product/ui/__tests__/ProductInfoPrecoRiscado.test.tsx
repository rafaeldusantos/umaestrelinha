import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { OptionValues, Product, ProductVariant } from '@estrelinha/supabase/types'

/**
 * O preço riscado da página do produto é lido "De R$ X" pelo leitor de tela, nos dois ramos do bloco
 * de preço: a peça de campanha e o "de/por" cadastrado. Riscado é só visual — sem o "De " escondido,
 * quem ouve a página recebe dois preços seguidos e nada diz qual é o antigo. É a mesma leitura do
 * cartão da vitrine (`ProductCard`).
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
  useShippingSettings: () => ({ free_shipping_enabled: true, free_shipping_threshold: 150 }),
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

const plano = (el: Element | null) => (el?.textContent ?? '').replace(/\u00a0/g, ' ')

const riscado = (container: HTMLElement) => {
  const el = container.querySelector('.line-through')
  expect(el).not.toBeNull()
  return el as HTMLElement
}

describe('ProductInfo — o preço riscado é lido "De R$ X"', () => {
  it('no "de/por" cadastrado, o riscado começa com "De R$" só para o leitor de tela', () => {
    const { container } = renderInfo(product({ price: 346.5, compare_price: 385 }))
    const el = riscado(container)

    expect(plano(el)).toBe('De R$ 385,00')
    expect(el.querySelector('.sr-only')?.textContent).toBe('De ')
  })

  it('na peça de campanha, o riscado começa com "De R$" só para o leitor de tela', () => {
    const { container } = renderInfo(
      product({
        price: 346.5,
        compare_price: 385,
        campaign: {
          id: 'k1',
          name: 'Dia das Mães',
          badge_text: 'DIA DAS MÃES',
          band_color: '#283A4A',
          accent_color: '#F7F3EC',
          ends_at: '2099-01-01T00:00:00Z',
          percent: 10,
          list_prices: { price: 385, compare_price: null, variants: {} },
        },
      }),
    )
    const el = riscado(container)

    expect(plano(el)).toBe('De R$ 385,00')
    expect(el.querySelector('.sr-only')?.textContent).toBe('De ')
  })
})
