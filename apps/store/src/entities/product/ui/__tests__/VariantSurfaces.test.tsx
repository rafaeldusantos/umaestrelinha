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

/**
 * Todo controle do card, pelo nome acessível — e é esta lista que a régua abaixo compara.
 *
 * Procurar o botão pelo rótulo antigo não serviria: o favorito também começa com "Adicionar", e um
 * "+" que voltasse com outro rótulo passaria batido. Enumerar é o que faz um controle NOVO de
 * qualquer nome derrubar o caso.
 */
const controlesDoCard = () => screen.getAllByRole('button').map(b => b.getAttribute('aria-label'))

beforeEach(() => {
  useCartStore.setState({ items: [] })
})

describe('ProductCard — o card NÃO compra (decisão do usuário, 2026-09-13)', () => {
  /*
    A régua do "+", INVERTIDA.

    Até aqui o card abria a escolha de variação sobre a foto — drawer no computador, bottom sheet no
    celular — e adicionava ao carrinho sem sair da vitrine. O botão saiu, e as duas superfícies
    foram junto. **Apagar os casos que o defendiam deixaria a volta dele passar em silêncio**, que é
    o modo de falha de sempre: controle a mais não quebra nada, só volta a vender do lugar errado.

    Por isso o que se afirma agora é a AUSÊNCIA, nos três casos que antes se comportavam diferente:
    grade vendável de 2 eixos (abria o drawer), 3 eixos (navegava) e produto simples (adicionava
    direto). Quem compra é a página — o `describe` de `ProductInfo`, abaixo, e a barra fixa do
    celular, em `widgets/product-buy-bar`.
  */
  const DOIS_EIXOS = () =>
    product({
      options: TWO_AXES,
      variants: [
        variant({ Tamanho: '3,5 cm', Acabamento: 'Fosco' }, { price: 7.9, position: 0 }),
        variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco' }, { price: 9.4, position: 1 }),
      ],
    })

  const TRES_EIXOS = () =>
    product({
      options: THREE_AXES,
      variants: [variant({ Tamanho: '4,5 cm', Acabamento: 'Fosco', Cor: 'Rosa' })],
    })

  /** Duas cores com foto — o único arranjo em que a fileira de `COR-10` aparece. */
  const COM_COR = () =>
    product({
      options: [option('Cor', ['Prata', 'Ouro'], 0)],
      variants: [
        variant({ Cor: 'Prata' }, { position: 0, image_url: 'prata.webp' }),
        variant({ Cor: 'Ouro' }, { position: 1, image_url: 'ouro.webp' }),
      ],
    })

  it('o único controle do card é o favorito — com grade, com 3 eixos e sem grade nenhuma', () => {
    for (const p of [DOIS_EIXOS(), TRES_EIXOS(), product()]) {
      const { unmount } = renderCard(p)

      expect(controlesDoCard()).toEqual(['Adicionar aos favoritos'])
      unmount()
    }
  })

  it('o card é um link para a página do produto, e o caminho de compra é esse', () => {
    renderCard(DOIS_EIXOS())

    expect(screen.getByRole('link')).toHaveAttribute('href', '/produtos/botton-sailor-moon')
  })

  it('acionar todo controle do card não abre seletor, diálogo nem carrinho', () => {
    // Vale para o favorito e para cada miniatura de cor: nenhuma delas decide compra.
    renderCard(COM_COR())
    for (const botao of screen.getAllByRole('button')) fireEvent.click(botao)

    expect(screen.queryByRole('radiogroup')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('button', { name: /sacola/i })).toBeNull()
    expect(useCartStore.getState().items).toHaveLength(0)
  })

  it('escolher uma cor continua trocando a foto — a fileira de `COR-11` não saiu junto', () => {
    // A ausência só vale se a presença for medida ao lado: um card que perdesse a fileira também
    // passaria nos três casos acima.
    renderCard(COM_COR())
    fireEvent.click(screen.getByRole('button', { name: 'Ver na cor Ouro' }))

    expect(screen.getByAltText('Botton Sailor Moon')).toHaveAttribute('src', 'ouro.webp')
    expect(useCartStore.getState().items).toHaveLength(0)
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
