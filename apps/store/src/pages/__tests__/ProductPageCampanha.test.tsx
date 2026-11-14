import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

// A página do produto REAL (com a `ProductInfo` e a barra de compra de verdade) para a peça de
// campanha. Os hooks de dados são dublados; a peça vem do MAPEADOR, como a leitura a entrega.

const { useProductMock } = vi.hoisted(() => ({ useProductMock: vi.fn() }))
vi.mock('@/entities/product/api/useProduct', () => ({ useProduct: useProductMock }))
vi.mock('@/entities/product/api/useProducts', () => ({ useProducts: () => ({ data: [] }) }))
vi.mock('@/entities/product/api/useProductFaqs', () => ({ useProductFaqs: () => ({ data: [] }) }))
vi.mock('@/entities/product/api/useBuyTogetherData', () => ({
  useBuyTogetherData: () => ({ status: 'off', addons: [], lists: [], products: [] }),
}))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => ({ data: [] }) }))
vi.mock('@/entities/product/ui/ProductGallery', () => ({
  default: ({ badges }: { badges?: React.ReactNode }) => <div data-testid="galeria">{badges}</div>,
}))
vi.mock('@estrelinha/core/hooks/useStoreSettings', async importOriginal => ({
  ...((await importOriginal()) as object),
  useSeoSettings: () => ({ title: '', description: '', og_image: '' }),
  useGeneralSettings: () => ({ whatsapp: '', store_name: 'Uma Estrelinha' }),
  useShippingSettings: () => ({ free_shipping_enabled: false, free_shipping_threshold: 0 }),
  usePaymentSettings: () => ({
    max_installments: 6,
    min_installment_value: 10,
    pix_enabled: true,
    pix_discount_percent: 5,
  }),
}))
vi.mock('@/features/shipping-calc/ui/ShippingCalc', () => ({ default: () => null }))
vi.mock('@/features/share-product/ui/ShareButtons', () => ({ default: () => null }))
vi.mock('@/widgets/related-products/ui/RelatedProducts', () => ({ default: () => null }))
vi.mock('sonner', () => ({ toast: { custom: vi.fn(), error: vi.fn(), success: vi.fn() } }))

import ProductPage from '../ProductPage'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { mapDbToProduct } from '@/entities/product/lib/mapProduct'

const BLACK_FRIDAY = {
  id: 'camp-bf',
  name: 'Black Friday',
  badge_text: 'Black Friday',
  band_color: '#161514',
  accent_color: '#C2A063',
  ends_at: '2026-12-01T03:00:00Z',
}

const peca = (campanhas: unknown[], extra: Record<string, unknown> = {}) =>
  mapDbToProduct({
    id: 'p1',
    name: 'Pingente com cinzas',
    slug: 'pingente-com-cinzas',
    base_price: 209.9,
    original_price: null,
    images: [{ url: 'capa.webp' }],
    stock_policy: 'track',
    stock_total: 10,
    low_stock_threshold: 5,
    is_new: true,
    product_campaigns: campanhas,
    ...extra,
  })

const renderPage = () =>
  render(
    <MemoryRouter initialEntries={['/produtos/pingente-com-cinzas']}>
      <Routes>
        <Route path="/produtos/:slug" element={<ProductPage />} />
      </Routes>
    </MemoryRouter>,
  )

const plano = (el: Element | null) => (el?.textContent ?? '').replace(/\u00a0/g, ' ')
const coluna = () => screen.getByRole('heading', { level: 1 }).parentElement as HTMLElement

beforeEach(() => useProductMock.mockReset())

describe('a página da peça de campanha, durante a vigência', () => {
  beforeEach(() => {
    useProductMock.mockReturnValue({ data: peca([{ percent: 20, campaigns: BLACK_FRIDAY }]), isFetching: false })
  })

  it('o selo em linha fica ACIMA do nome', () => {
    renderPage()
    const selo = within(coluna()).getByRole('img', { name: 'Black Friday, 20% de desconto' })
    const nome = screen.getByRole('heading', { level: 1, name: 'Pingente com cinzas' })
    expect(selo).toHaveClass('h-[26px]', 'rounded-[6px]')
    expect(selo.compareDocumentPosition(nome) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('o preço com desconto e, DEPOIS dele, "De R$ 209,90 · 6x de R$ 27,99 sem juros" na mesma linha', () => {
    renderPage()
    const preco = within(coluna()).getByText((_, el) => el?.tagName === 'SPAN' && plano(el) === 'R$ 167,92')
    const linha = screen.getByTestId('cheio-e-parcelas')
    // 6x de R$ 27,99 sai do preço com desconto (R$ 167,92 / 6), não do cheio.
    expect(plano(linha)).toBe('De R$ 209,90 · 6x de R$ 27,99 sem juros')
    const riscado = linha.querySelector('.line-through')!
    expect(plano(riscado)).toBe('De R$ 209,90')
    // O "De " existe só para o leitor de tela.
    expect(riscado.querySelector('.sr-only')?.textContent).toBe('De ')
    expect(preco.compareDocumentPosition(linha) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    // Uma linha de parcelas só: a avulsa de hoje não se repete abaixo.
    expect(within(coluna()).queryByText((_, el) => el?.tagName === 'P' && plano(el).startsWith('ou 6x'))).toBeNull()
  })

  it('o PIX sai do preço com desconto', () => {
    renderPage()
    // 5% de R$ 167,92 = R$ 8,396 ⇒ R$ 8,40 de desconto ⇒ R$ 159,52.
    expect(within(coluna()).getByText((_, el) => el?.tagName === 'SPAN' && plano(el) === 'R$ 159,52')).toBeInTheDocument()
  })

  it('a galeria não mostra os selos do canto (desconto e Novo) na peça de campanha', () => {
    renderPage()
    expect(screen.getByTestId('galeria').textContent).toBe('')
  })
})

describe('a mesma página fora da vigência', () => {
  it('sem campanha: preço de sempre, sem selo em linha, PIX e parcelas sobre ele', () => {
    useProductMock.mockReturnValue({ data: peca([]), isFetching: false })
    renderPage()
    expect(screen.queryByTestId('selo-em-linha')).toBeNull()
    expect(within(coluna()).getByText((_, el) => el?.tagName === 'SPAN' && plano(el) === 'R$ 209,90')).toBeInTheDocument()
    // 5% de R$ 209,90 = R$ 10,495 ⇒ R$ 10,50 ⇒ R$ 199,40.
    expect(within(coluna()).getByText((_, el) => el?.tagName === 'SPAN' && plano(el) === 'R$ 199,40')).toBeInTheDocument()
    expect(screen.getByTestId('galeria').textContent).toBe('Novo')
    expect(screen.queryByTestId('cheio-e-parcelas')).toBeNull()
    expect(within(coluna()).getByText((_, el) => el?.tagName === 'P' && plano(el) === 'ou 6x de R$ 34,98 sem juros')).toBeInTheDocument()
  })
  it('o selo "-X%" da galeria usa o papel de desconto (`sale` / `on-sale`); o "Novo" ao lado, não', () => {
    // O mesmo papel do selo do cartão: no Padrão ardósia e branco, no Black Friday ouro e escuro.
    useProductMock.mockReturnValue({ data: peca([], { original_price: 249.9 }), isFetching: false })
    renderPage()
    const galeria = screen.getByTestId('galeria')
    const desconto = within(galeria).getByText(/^-\d+%$/)
    expect(desconto).toHaveClass('bg-estrelinha-sale', 'text-estrelinha-on-sale')
    expect(desconto).not.toHaveClass('bg-estrelinha-primary')
    expect(desconto).not.toHaveClass('text-white')
    const novo = within(galeria).getByText('Novo')
    expect(novo).toHaveClass('bg-estrelinha-ink')
    expect(novo).not.toHaveClass('bg-estrelinha-sale')
    expect(novo).not.toHaveClass('text-estrelinha-on-sale')
  })
})

/**
 * O toque do celular na barra fixa: a sequência que um dedo produz (touch, pointer, mouse e por fim
 * o click), disparada no botão da barra da página real. A peça entra na sacola, com campanha e sem.
 */
const tocar = (alvo: Element) => {
  fireEvent.touchStart(alvo)
  fireEvent.pointerDown(alvo, { pointerType: 'touch' })
  fireEvent.touchEnd(alvo)
  fireEvent.pointerUp(alvo, { pointerType: 'touch' })
  fireEvent.mouseDown(alvo)
  fireEvent.mouseUp(alvo)
  fireEvent.click(alvo)
}

const botaoDaBarra = () =>
  within(screen.getByTestId('product-buy-bar')).getByRole('button', { name: 'Adicionar à sacola' })

describe('o toque em "Adicionar à sacola" na barra fixa do celular', () => {
  beforeEach(() => useCartStore.setState({ items: [] }))

  it('a peça de campanha entra na sacola com o preço da campanha', () => {
    useProductMock.mockReturnValue({ data: peca([{ percent: 20, campaigns: BLACK_FRIDAY }]), isFetching: false })
    renderPage()
    tocar(botaoDaBarra())
    const itens = useCartStore.getState().items
    expect(itens).toHaveLength(1)
    expect(itens[0].product.id).toBe('p1')
    expect(itens[0].unitPrice).toBe(167.92)
  })

  it('a peça comum entra na sacola com o preço de sempre', () => {
    useProductMock.mockReturnValue({ data: peca([]), isFetching: false })
    renderPage()
    tocar(botaoDaBarra())
    const itens = useCartStore.getState().items
    expect(itens).toHaveLength(1)
    expect(itens[0].unitPrice).toBe(209.9)
  })
})
