import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { OptionValues, Product, ProductOption, ProductVariant } from '@estrelinha/supabase/types'
import { useCartStore } from '@/entities/cart/model/cartStore'

// Board "Mobile Product Detail - v3": a compra no celular acontece na barra fixa do rodapé, não na
// coluna de informação. Duas superfícies para a MESMA compra é exatamente a forma de bug que já
// custou caro nesta loja (duas telas de carrinho, duas regras de remoção divergindo) — o que se
// prova aqui é que elas dividem um estado só: escolher o chip na coluna muda o que a barra cobra.

vi.mock('sonner', () => ({ toast: { custom: vi.fn(), error: vi.fn(), success: vi.fn() } }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useGeneralSettings: () => ({ whatsapp: '', store_name: 'Uma Estrelinha' }),
  usePaymentSettings: () => ({
    max_installments: 6,
    min_installment_value: 10,
    pix_enabled: true,
    pix_discount_percent: 5,
  }),
  useShippingSettings: () => ({ free_shipping_enabled: true, free_shipping_threshold: 150 }),
}))
vi.mock('@/features/share-product/ui/ShareButtons', () => ({ default: () => null }))

import { useProductPurchase } from '@/entities/product/model/useProductPurchase'
import ProductInfo from '@/entities/product/ui/ProductInfo'
import ProductBuyBar from '../ProductBuyBar'

const option = (name: string, values: string[], position: number): ProductOption => ({
  name,
  values,
  position,
})

let seq = 0
const variant = (values: OptionValues, over: Partial<ProductVariant> = {}): ProductVariant => ({
  id: `v${++seq}`,
  product_id: 'p1',
  option_values: values,
  name: null,
  sku: null,
  price: 7.9,
  compare_price: null,
  stock: 10,
  weight_kg: null,
  image_url: null,
  is_active: true,
  position: 0,
  ...over,
})

const product = (over: Partial<Product> = {}): Product =>
  ({
    id: 'p1',
    name: 'Botton Gojo Satoru',
    slug: 'botton-gojo-satoru',
    price: 4.9,
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
    ...over,
  }) as Product

/** A montagem da `ProductPage`: um `useProductPurchase`, duas superfícies. */
const Page = ({ value }: { value: Product }) => {
  const purchase = useProductPurchase(value)
  return (
    <MemoryRouter>
      <ProductInfo product={value} purchase={purchase} />
      <ProductBuyBar product={value} purchase={purchase} />
    </MemoryRouter>
  )
}

/** O CTA da barra fixa. `getAllBy` porque a coluna tem o dela — escondida por CSS, não removida. */
const barCta = () => screen.getAllByRole('button', { name: /Adicionar ao carrinho|Indisponível/ }).at(-1)!

beforeEach(() => {
  useCartStore.setState({ items: [] })
  seq = 0
})

describe('ProductBuyBar — a compra do celular divide o estado com a coluna', () => {
  it('trocar o chip na coluna muda o preço que a barra cobra', () => {
    render(
      <Page
        value={product({
          options: [option('Tamanho', ['3,5 cm', '4,5 cm'], 0)],
          variants: [
            variant({ Tamanho: '3,5 cm' }, { price: 7.9, position: 0 }),
            variant({ Tamanho: '4,5 cm' }, { price: 9.4, position: 1 }),
          ],
        })}
      />,
    )

    fireEvent.click(screen.getByRole('radio', { name: '4,5 cm' }))
    fireEvent.click(barCta())

    const [item] = useCartStore.getState().items
    expect(item.unitPrice).toBe(9.4)
    expect(item.optionValues).toEqual({ Tamanho: '4,5 cm' })
  })

  it('a barra cobra o preço da LINHA, nunca o base_price da vitrine', () => {
    render(
      <Page
        value={product({
          price: 4.9,
          options: [option('Tamanho', ['5,5 cm'], 0)],
          variants: [variant({ Tamanho: '5,5 cm' }, { price: 9.4 })],
        })}
      />,
    )

    // Preço aparece duas vezes na tela — coluna e barra —, e as duas dizem o mesmo número.
    expect(screen.getAllByText('R$ 9,40').length).toBe(2)
    expect(screen.queryByText('R$ 4,90')).not.toBeInTheDocument()
  })

  it('combinação esgotada desabilita a barra e nada entra no carrinho (PST-08)', () => {
    render(
      <Page
        value={product({
          options: [option('Tamanho', ['4,5 cm'], 0)],
          variants: [variant({ Tamanho: '4,5 cm' }, { stock: 0 })],
        })}
      />,
    )

    const cta = barCta()
    expect(cta).toBeDisabled()
    fireEvent.click(cta)
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('a quantidade escolhida na coluna é a que a barra adiciona', () => {
    render(<Page value={product({ stock_total: 10 })} />)

    fireEvent.click(screen.getByLabelText('Aumentar quantidade'))
    fireEvent.click(screen.getByLabelText('Aumentar quantidade'))
    fireEvent.click(barCta())

    expect(useCartStore.getState().items[0].quantity).toBe(3)
  })

  it('produto com desconto mostra o preço riscado na barra', () => {
    render(<Page value={product({ price: 6.9, compare_price: 8.9 })} />)

    // Uma vez na coluna, uma na barra — as duas contra o mesmo `compare_price`.
    expect(screen.getAllByText('R$ 8,90').length).toBe(2)
  })
})
