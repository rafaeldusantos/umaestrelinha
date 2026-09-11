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
const barCta = () => screen.getAllByRole('button', { name: /Adicionar ao carrinho|Esgotado/ }).at(-1)!

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

/**
 * A faixa de preço — o Pix chega à superfície onde a compra se DECIDE.
 *
 * A loja anunciava o desconto no card e na coluna de informação e o escondia na barra, que é a
 * **única** superfície de compra do celular (de onde vêm ~90% dos acessos). O que se prova aqui é
 * que o número é o mesmo das outras duas: quem calcula é `pixPrice`, e uma segunda conta aqui é
 * exatamente a forma do "defeito 01".
 */
describe('ProductBuyBar — a faixa de preço', () => {
  it('mostra o valor no Pix, e é o MESMO número que a coluna mostra', () => {
    // 100 com 5% → o desconto é arredondado e subtraído (forma do caixa), nunca o preço final.
    render(<Page value={product({ price: 100, options: [], variants: [] })} />)

    // Duas vezes: coluna e barra. Se a barra recalculasse por conta própria, este número seria
    // outro em 31% do catálogo — foi o que `pixPrice` nasceu para impedir.
    expect(screen.getAllByText('R$ 95,00').length).toBe(2)
    expect(screen.getAllByText('no Pix').length).toBe(1)
  })

  it('o valor no Pix acompanha a VARIAÇÃO escolhida, não o base_price', () => {
    render(
      <Page
        value={product({
          price: 4.9,
          options: [option('Tamanho', ['3,5 cm', '4,5 cm'], 0)],
          variants: [
            variant({ Tamanho: '3,5 cm' }, { price: 100, position: 0 }),
            variant({ Tamanho: '4,5 cm' }, { price: 200, position: 1 }),
          ],
        })}
      />,
    )

    fireEvent.click(screen.getByRole('radio', { name: '4,5 cm' }))
    expect(screen.getAllByText('R$ 190,00').length).toBe(2)
    expect(screen.queryByText('R$ 95,00')).not.toBeInTheDocument()
  })
})

/**
 * A forma da barra — o defeito que ela veio consertar.
 *
 * Em 390px a fileira única deixava 178px para um rótulo de ~196, e o CTA era `grow` com
 * `whitespace-nowrap` e **sem `min-w-0`**: item flex assim não encolhe abaixo do próprio
 * min-content, então a linha estourava e o favoritar saía da tela. **jsdom devolve 0 para toda
 * medida de layout**, então nada disso se mede aqui — o que estes casos travam é a forma que produz
 * a medida, e a prova de que ela chega na tela é a auditoria em 390×844.
 */
describe('ProductBuyBar — a forma que impede o estouro', () => {
  it('o CTA pode encolher: `grow` sem `min-w-0` é o defeito', () => {
    render(<Page value={product()} />)

    const cta = barCta()
    expect(cta.className).toContain('grow')
    expect(cta.className).toContain('min-w-0')
  })

  it('o favoritar não encolhe e mantém o alvo de 44px', () => {
    render(<Page value={product()} />)

    const heart = screen.getAllByLabelText(/favoritos/i).at(-1)!
    expect(heart.className).toContain('shrink-0')
    expect(heart.className).toContain('h-11')
    expect(heart.className).toContain('w-11')
  })

  it('esgotado usa superfície e texto de TOKEN, nunca `opacity-50` sobre a geleia', () => {
    // `on-primary` sobre primary a 50% fica perto de ilegível. `ink-soft` sobre `ground-deep` dá
    // 5,5:1 e continua lendo como "não dá para tocar".
    render(
      <Page
        value={product({
          options: [option('Tamanho', ['4,5 cm'], 0)],
          variants: [variant({ Tamanho: '4,5 cm' }, { stock: 0 })],
        })}
      />,
    )

    const cta = barCta()
    expect(cta.className).toContain('bg-estrelinha-ground-deep')
    expect(cta.className).toContain('text-estrelinha-ink-soft')
    expect(cta.className).not.toContain('opacity-50')
  })
})
