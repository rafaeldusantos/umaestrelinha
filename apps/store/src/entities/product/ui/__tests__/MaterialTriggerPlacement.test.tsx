import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { Product } from '@estrelinha/supabase/types'

/**
 * `GAV-01` — **o fio entre a coluna de informação e o gatilho**.
 *
 * Este arquivo existe por causa da lição mais reutilizável da feature `41`: as duas pontas estavam
 * provadas — o componente e o store — e **o fio entre elas não**. Apagar `<MaterialSendTrigger />`
 * de `ProductInfo.tsx` fazia a linha sumir da loja inteira com a suíte verde, porque
 * `MaterialSendTrigger.test.tsx` renderiza o componente diretamente e `ProductPage.test.tsx`
 * **dubla `ProductInfo`**.
 *
 * E não basta asserir presença: a spec fixa a POSIÇÃO ("depois do estado de estoque"), porque a
 * escada de decisão da coluna é o que faz a dúvida do envio aparecer no momento em que ela nasce.
 * Presença sozinha passaria com a linha no topo, acima do preço.
 */

vi.mock('sonner', () => ({ toast: { custom: vi.fn(), error: vi.fn(), success: vi.fn() } }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => ({ data: [] }) }))
vi.mock('@/features/share-product/ui/ShareButtons', () => ({ default: () => null }))

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useGeneralSettings: () => ({ whatsapp: '', store_name: 'Uma Estrelinha' }),
  usePaymentSettings: () => ({
    max_installments: 6,
    min_installment_value: 10,
    pix_enabled: false,
    pix_discount_percent: 0,
  }),
  useShippingSettings: () => ({ free_shipping_enabled: false, free_shipping_threshold: 0 }),
}))

import { useProductPurchase } from '../../model/useProductPurchase'
import ProductInfo from '../ProductInfo'

const product = (over: Partial<Product> = {}): Product =>
  ({
    id: 'p1',
    name: 'Pingente Gota',
    slug: 'pingente-gota',
    price: 209.9,
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

describe('ProductInfo × gatilho de material — o fio', () => {
  it('a coluna renderiza o gatilho quando a peça exige material', () => {
    renderInfo(product({ requires_material: true } as Partial<Product>))

    expect(screen.getByTestId('material-send-trigger')).toBeInTheDocument()
  })

  it('a coluna NÃO renderiza o gatilho quando a peça não exige', () => {
    renderInfo(product({ requires_material: false } as Partial<Product>))

    expect(screen.queryByTestId('material-send-trigger')).toBeNull()
  })

  it('o gatilho vem DEPOIS do estado de estoque', () => {
    const { container } = renderInfo(product({ requires_material: true } as Partial<Product>))

    // O rótulo é o que `productFacts` produz de verdade ("Em estoque"), não o do artboard —
    // marco de ordem tem de ser texto que a tela realmente escreve.
    const texto = container.textContent ?? ''
    const estoque = texto.indexOf('Em estoque')
    const gatilho = texto.indexOf('Como enviar seu material de DNA')

    expect(estoque).toBeGreaterThanOrEqual(0)
    expect(gatilho).toBeGreaterThanOrEqual(0)
    expect(gatilho).toBeGreaterThan(estoque)
  })

  it('o gatilho vem ANTES do carrinho da coluna', () => {
    // O par do caso acima: junto, os dois prendem a linha no degrau certo da escada. Sem este, a
    // linha poderia descer para o fim da coluna, depois do CTA, e o caso de cima continuaria verde.
    const { container } = renderInfo(product({ requires_material: true } as Partial<Product>))

    const texto = container.textContent ?? ''
    const gatilho = texto.indexOf('Como enviar seu material de DNA')
    const carrinho = texto.indexOf('Adicionar ao carrinho')

    expect(carrinho).toBeGreaterThanOrEqual(0)
    expect(gatilho).toBeLessThan(carrinho)
  })
})
