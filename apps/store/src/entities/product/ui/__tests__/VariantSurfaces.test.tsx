import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { OptionValues, Product, ProductOption, ProductVariant } from '@estrelinha/supabase/types'
import { useCartStore } from '@/entities/cart/model/cartStore'

// PST-05 AC 1-2 e PST-08 na SUPERFÍCIE: quantos seletores cada tela mostra, o que o card faz com 3
// eixos, e o que acontece quando a combinação está esgotada. A regra pura está em
// `lib/__tests__/variantSelection.test.ts`; aqui se prova que a tela obedece.

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
  useShippingSettings: () => ({ free_shipping_enabled: true, free_shipping_threshold: 150 }),
}))
vi.mock('@/features/share-product/ui/ShareButtons', () => ({ default: () => null }))

import { useProductPurchase } from '../../model/useProductPurchase'
import ProductCard from '../ProductCard'
import ProductInfo from '../ProductInfo'

const option = (name: string, values: string[], position: number): ProductOption => ({
  name,
  values,
  position,
})

let seq = 0
const variant = (
  option_values: OptionValues,
  overrides: Partial<ProductVariant> = {},
): ProductVariant => ({
  id: `v${++seq}`,
  product_id: 'p1',
  option_values,
  name: null,
  sku: null,
  price: 7.9,
  compare_price: null,
  stock: 10,
  weight_kg: null,
  image_url: null,
  is_active: true,
  position: 0,
  ...overrides,
})

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'p1',
  name: 'Botton Sailor Moon',
  slug: 'botton-sailor-moon',
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
  ...overrides,
})

const TWO_AXES = [option('Tamanho', ['3,5 cm', '4,5 cm'], 0), option('Acabamento', ['Fosco'], 1)]
const THREE_AXES = [...TWO_AXES, option('Cor', ['Rosa'], 2)]

const renderCard = (p: Product) =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<ProductCard product={p} />} />
        <Route path="/produtos/:slug" element={<div>rota-produto</div>} />
      </Routes>
    </MemoryRouter>,
  )

/**
 * `ProductInfo` deixou de guardar o estado de compra — quem guarda é `useProductPurchase`, na
 * página, porque a barra fixa do mobile compra a mesma coisa. Este harness é aquela montagem.
 */
const InfoHarness = ({ value }: { value: Product }) => (
  <ProductInfo product={value} purchase={useProductPurchase(value)} />
)

const renderInfo = (p: Product) =>
  render(
    <MemoryRouter>
      <InfoHarness value={p} />
    </MemoryRouter>,
  )

const openCardSelectors = () => fireEvent.click(screen.getByLabelText('Adicionar ao carrinho'))

/**
 * `formatPrice` usa `Intl` e separa "R$" do número com NBSP. `getByRole({ name })` compara o nome
 * acessível cru, sem normalizar espaço — então o CTA se acha por prefixo e o preço se confere com
 * `toHaveTextContent`, que normaliza.
 */
const cta = (prefix: RegExp) => screen.getByRole('button', { name: prefix })

/** `useIsMobile` decide pela largura da janela; jsdom nasce em 1024 (desktop). */
const setViewport = (width: number) => {
  Object.defineProperty(window, 'innerWidth', { writable: true, configurable: true, value: width })
}

beforeEach(() => {
  useCartStore.setState({ items: [] })
  setViewport(1024)
})

describe('ProductCard — eixos genéricos (PST-05 AC 2)', () => {
  it('produto de 2 eixos mostra 2 seletores, rotulados pelos eixos cadastrados', () => {
    renderCard(
      product({
        options: TWO_AXES,
        variants: [variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' })],
      }),
    )
    openCardSelectors()

    expect(screen.getByLabelText('Tamanho')).toBeInTheDocument()
    expect(screen.getByLabelText('Acabamento')).toBeInTheDocument()
  })

  it('produto de 3 eixos NÃO abre seletor no card — leva para a página do produto', () => {
    renderCard(
      product({
        options: THREE_AXES,
        variants: [variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco', Cor: 'Rosa' })],
      }),
    )
    openCardSelectors()

    expect(screen.getByText('rota-produto')).toBeInTheDocument()
    expect(screen.queryByLabelText('Tamanho')).not.toBeInTheDocument()
  })

  it('adiciona ao carrinho com o variant_id e o PREÇO DA LINHA, não o base_price', () => {
    renderCard(
      product({
        options: TWO_AXES,
        variants: [variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' }, { id: 'v-45-fosco', price: 9.4 })],
      }),
    )
    openCardSelectors()
    // O CTA do drawer mostra o preço da LINHA, não o `price` da vitrine (R$ 4,90).
    const confirm = cta(/^Adicionar ·/)
    expect(confirm).toHaveTextContent('R$ 9,40')
    fireEvent.click(confirm)

    const [item] = useCartStore.getState().items
    expect(item.variantId).toBe('v-45-fosco')
    expect(item.unitPrice).toBe(9.4)
    expect(item.variantLabel).toBe('4,5 cm · Fosco')
    expect(item.optionValues).toEqual({ Tamanho: '4,5 cm', Acabamento: 'Fosco' })
  })

  it('combinação esgotada em policy track: CTA indisponível e nada entra no carrinho (AC 16)', () => {
    renderCard(
      product({
        options: [option('Tamanho', ['4,5 cm'], 0)],
        variants: [variant({ Tamanho: '4,5 cm' }, { stock: 0 })],
      }),
    )
    openCardSelectors()

    const cta = screen.getByRole('button', { name: 'Indisponível' })
    expect(cta).toBeDisabled()
    fireEvent.click(cta)
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('PST-10: variação ativa com options vazio entra como produto simples, por base_price', () => {
    renderCard(product({ options: [], variants: [variant({}, { price: 9.4 })] }))
    openCardSelectors()

    const [item] = useCartStore.getState().items
    expect(item.variantId).toBeNull()
    expect(item.unitPrice).toBe(4.9)
  })
})

describe('Quick add — drawer no card (desktop) e sheet (mobile)', () => {
  const TWO_AXIS_PRODUCT = () =>
    product({
      options: TWO_AXES,
      variants: [
        variant({ Tamanho: '3,5 cm', Acabamento: 'Fosco' }, { price: 7.9, position: 0 }),
        variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' }, { price: 9.4, position: 1 }),
      ],
    })

  it('desktop: o "+" abre o drawer sobre a imagem, não uma página nem o carrinho', () => {
    renderCard(TWO_AXIS_PRODUCT())
    openCardSelectors()

    expect(screen.getByRole('radiogroup', { name: 'Tamanho' })).toBeInTheDocument()
    expect(screen.queryByText('rota-produto')).not.toBeInTheDocument()
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('desktop: o véu fecha o drawer sem adicionar nada', () => {
    renderCard(TWO_AXIS_PRODUCT())
    openCardSelectors()
    fireEvent.click(screen.getByLabelText('Fechar seleção de variações'))

    expect(screen.queryByRole('radiogroup', { name: 'Tamanho' })).not.toBeInTheDocument()
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('trocar de pílula troca o preço do CTA — é o preço da linha que vai ser cobrado', () => {
    renderCard(TWO_AXIS_PRODUCT())
    openCardSelectors()

    expect(cta(/^Adicionar ·/)).toHaveTextContent('R$ 7,90')
    fireEvent.click(screen.getByRole('radio', { name: '4,5 cm' }))
    expect(cta(/^Adicionar ·/)).toHaveTextContent('R$ 9,40')
  })

  it('valor sem linha disponível fica desabilitado, não escondido (PST-08)', () => {
    renderCard(
      product({
        options: [option('Tamanho', ['3,5 cm', '4,5 cm'], 0)],
        variants: [
          variant({ Tamanho: '3,5 cm' }, { stock: 10, position: 0 }),
          variant({ Tamanho: '4,5 cm' }, { stock: 0, position: 1 }),
        ],
      }),
    )
    openCardSelectors()

    expect(screen.getByRole('radio', { name: '4,5 cm' })).toBeDisabled()
    expect(screen.getByRole('radio', { name: '3,5 cm' })).toBeEnabled()
  })

  it('mobile: o "+" abre o bottom sheet, com nome e preço do produto no topo', () => {
    setViewport(390)
    renderCard(TWO_AXIS_PRODUCT())
    openCardSelectors()

    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Adicionar à sacola/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Fechar')).toBeInTheDocument()
  })

  it('mobile: o sheet adiciona a linha escolhida ao carrinho', () => {
    setViewport(390)
    renderCard(TWO_AXIS_PRODUCT())
    openCardSelectors()
    fireEvent.click(screen.getByRole('radio', { name: '4,5 cm' }))
    const confirm = cta(/^Adicionar à sacola/)
    expect(confirm).toHaveTextContent('R$ 9,40')
    fireEvent.click(confirm)

    const [item] = useCartStore.getState().items
    expect(item.unitPrice).toBe(9.4)
    expect(item.optionValues).toEqual({ Tamanho: '4,5 cm', Acabamento: 'Fosco' })
  })
})

describe('ProductInfo — página do produto (PST-05 AC 1)', () => {
  it('mostra os 3 seletores de um produto de 3 eixos, na ordem de position', () => {
    renderInfo(
      product({
        options: THREE_AXES,
        variants: [variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco', Cor: 'Rosa' })],
      }),
    )

    // Os boards de Produto trocaram os `<Select>` por chips: um `radiogroup` por eixo, com o nome
    // do eixo como rótulo acessível.
    const labels = screen.getAllByRole('radiogroup').map(el => el.getAttribute('aria-labelledby'))
    expect(labels).toEqual(['axis-Tamanho', 'axis-Acabamento', 'axis-Cor'])
  })

  it('exibe o preço da variação selecionada, não o base_price da vitrine', () => {
    renderInfo(
      product({
        price: 4.9,
        options: [option('Tamanho', ['5,5 cm'], 0)],
        variants: [variant({ Tamanho: '5,5 cm' }, { price: 9.4 })],
      }),
    )

    expect(screen.getByText('R$ 9,40')).toBeInTheDocument()
    expect(screen.queryByText('R$ 4,90')).not.toBeInTheDocument()
  })

  it('grade esgotada em policy track deixa o CTA desabilitado', () => {
    renderInfo(
      product({
        options: [option('Tamanho', ['4,5 cm'], 0)],
        variants: [variant({ Tamanho: '4,5 cm' }, { stock: 0 })],
      }),
    )

    expect(screen.getByRole('button', { name: /Indisponível/ })).toBeDisabled()
    expect(screen.getByText('Essa combinação está indisponível no momento.')).toBeInTheDocument()
  })

  it('stock_policy none nunca esgota, mesmo com saldo zero (AC 6)', () => {
    renderInfo(
      product({
        stock_policy: 'none',
        options: [option('Tamanho', ['4,5 cm'], 0)],
        variants: [variant({ Tamanho: '4,5 cm' }, { stock: 0 })],
      }),
    )

    expect(screen.getByRole('button', { name: /Adicionar ao carrinho/ })).toBeEnabled()
  })

  it('produto sem grade e sem saldo, em policy track, fica indisponível', () => {
    renderInfo(product({ stock_total: 0 }))

    expect(screen.getByRole('button', { name: /Indisponível/ })).toBeDisabled()
  })
})
