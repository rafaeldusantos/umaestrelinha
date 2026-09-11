import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Product } from '@estrelinha/supabase/types'

/**
 * `GAV-04` / `GAV-15` / `GAV-22` — **o fio inteiro, montado pela PÁGINA DE VERDADE.**
 *
 * Este arquivo existe por causa da lição mais reutilizável da feature `41`: as duas pontas estavam
 * provadas — o componente e o store — e **o fio entre elas não**.
 *
 * **E a primeira escrita deste arquivo caiu na mesma armadilha**, achada pela verificação
 * independente: ele montava `<ProductInfo />` e `<MaterialDrawer />` lado a lado, escritos no
 * próprio teste. Apagar `<MaterialDrawer />` de `ProductPage.tsx` fazia a gaveta sumir da loja
 * inteira com os **2828 testes verdes** — e o comentário que dizia "este é o caso que reprova se a
 * gaveta sair da página" era falso. Um teste que monta a árvore que quer provar não prova árvore
 * nenhuma.
 *
 * Agora quem monta é `ProductPage`. Os dublês param nas bordas — dados, galeria, acordeão,
 * relacionados e barra fixa —, e as **duas peças sob teste ficam reais**: `ProductInfo` (que
 * renderiza a linha) e `MaterialDrawer` (que a linha abre). `ProductPage.test.tsx` não cobre isso
 * porque dubla `ProductInfo` inteiro.
 */

const { useProductMock } = vi.hoisted(() => ({ useProductMock: vi.fn() }))
vi.mock('@/entities/product/api/useProduct', () => ({ useProduct: useProductMock }))
vi.mock('@/entities/product/api/useProducts', () => ({ useProducts: () => ({ data: [] }) }))
vi.mock('@/entities/product/api/useProductFaqs', () => ({ useProductFaqs: () => ({ data: [] }) }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => ({ data: [] }) }))
vi.mock('sonner', () => ({ toast: { custom: vi.fn(), error: vi.fn(), success: vi.fn() } }))

// Dublês de BORDA. `ProductInfo` e `MaterialDrawer` NÃO entram nesta lista: são as duas peças cujo
// fio este arquivo existe para provar.
vi.mock('@/entities/product/ui/ProductGallery', () => ({ default: () => <div>galeria</div> }))
vi.mock('@/entities/product/ui/ProductDetailsAccordion', () => ({ default: () => null }))
vi.mock('@/widgets/related-products/ui/RelatedProducts', () => ({ default: () => null }))
vi.mock('@/widgets/product-buy-bar', () => ({ ProductBuyBar: () => null }))
vi.mock('@/features/share-product/ui/ShareButtons', () => ({ default: () => null }))
vi.mock('@/features/shipping-calc/ui/ShippingCalc', () => ({ default: () => null }))

vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useGeneralSettings: () => ({ whatsapp: '5551999999999', store_name: 'Uma Estrelinha' }),
  usePaymentSettings: () => ({
    max_installments: 6,
    min_installment_value: 10,
    pix_enabled: false,
    pix_discount_percent: 0,
  }),
  useShippingSettings: () => ({ free_shipping_enabled: false, free_shipping_threshold: 0 }),
}))

import { useMaterialDrawerStore } from '@/entities/material'
import ProductPage from '../ProductPage'

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
    requires_material: true,
    ...over,
  }) as Product

const renderPagina = (p: Product = product()) => {
  useProductMock.mockReturnValue({ data: p, isFetching: false })
  return render(
    <MemoryRouter initialEntries={['/produtos/pingente-gota']}>
      <Routes>
        <Route path="/produtos/:slug" element={<ProductPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

describe('página do produto × gaveta de material — o fio', () => {
  beforeEach(() => {
    useMaterialDrawerStore.setState({ open: false, anchor: null })
    useProductMock.mockReset()
  })

  it('a PÁGINA renderiza a linha do gatilho', () => {
    // Prova de que `ProductInfo` está real nesta montagem — sem isto, todos os casos abaixo
    // passariam por vacuidade se o dublê de borda alcançasse `ProductInfo` por engano.
    renderPagina()
    expect(screen.getByTestId('material-send-trigger')).toBeInTheDocument()
  })

  it('a gaveta começa fechada — abrir a página não abre nada', () => {
    renderPagina()
    expect(screen.queryByTestId('material-drawer')).toBeNull()
  })

  it('acionar a linha ABRE a gaveta montada pela PÁGINA', () => {
    // **Este é o caso que reprova se `<MaterialDrawer />` sair de `ProductPage.tsx`.** Desta vez é
    // verdade: quem monta a gaveta aqui é a página, não o teste.
    renderPagina()
    fireEvent.click(screen.getByTestId('material-send-trigger'))

    expect(screen.getByTestId('material-drawer')).toBeInTheDocument()
    expect(screen.getByText('Qual é o seu material?')).toBeInTheDocument()
  })

  it('a gaveta abre SEM material escolhido', () => {
    renderPagina()
    fireEvent.click(screen.getByTestId('material-send-trigger'))

    expect(screen.queryByTestId('material-drawer-body')).toBeNull()
  })

  it('escolher material mostra a ficha sem fechar a gaveta', () => {
    renderPagina()
    fireEvent.click(screen.getByTestId('material-send-trigger'))
    fireEvent.click(screen.getByRole('button', { name: 'Cinzas' }))

    expect(screen.getByTestId('material-drawer')).toBeInTheDocument()
    expect(screen.getByTestId('material-drawer-body')).toBeInTheDocument()
    expect(screen.getByText('Cinzas de cremação')).toBeInTheDocument()
  })

  it('fechar pelo X e reabrir PRESERVA a escolha — pela tela', () => {
    renderPagina()
    fireEvent.click(screen.getByTestId('material-send-trigger'))
    fireEvent.click(screen.getByRole('button', { name: 'Cinzas' }))
    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))

    expect(screen.queryByTestId('material-drawer')).toBeNull()

    fireEvent.click(screen.getByTestId('material-send-trigger'))
    expect(screen.getByTestId('material-drawer-body')).toBeInTheDocument()
    expect(screen.getByText('Cinzas de cremação')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cinzas' }).getAttribute('aria-pressed')).toBe('true')
  })

  it('fechar por ESCAPE também preserva a escolha', () => {
    // O par do caso acima. O X é um `SheetClose`, e Escape e o toque no véu são do
    // `DismissableLayer` — os três desembocam no MESMO `onOpenChange` → `setDrawerOpen(false)`,
    // que é o caminho único de fechamento. Este caso prova que `GAV-15` vale pelo gesto de
    // teclado, não só pelo botão, e é o que impediria alguém de reintroduzir um segundo caminho
    // que limpasse a escolha.
    renderPagina()
    fireEvent.click(screen.getByTestId('material-send-trigger'))
    fireEvent.click(screen.getByRole('button', { name: 'Cinzas' }))
    fireEvent.keyDown(document.body, { key: 'Escape' })

    expect(useMaterialDrawerStore.getState().open).toBe(false)
    expect(useMaterialDrawerStore.getState().anchor).toBe('cinzas')

    fireEvent.click(screen.getByTestId('material-send-trigger'))
    expect(screen.getByText('Cinzas de cremação')).toBeInTheDocument()
  })

  it('peça que não exige material não tem linha — e a gaveta segue inalcançável', () => {
    renderPagina(product({ requires_material: false } as Partial<Product>))

    expect(screen.queryByTestId('material-send-trigger')).toBeNull()
    expect(screen.queryByTestId('material-drawer')).toBeNull()
  })

  it('fechar devolve o foco para a linha que abriu', async () => {
    // `GAV-22`. Sem isto o foco volta para o `<body>` e quem navega por teclado perde o lugar.
    renderPagina()
    const gatilho = screen.getByTestId('material-send-trigger')
    gatilho.focus()
    fireEvent.click(gatilho)

    fireEvent.click(screen.getByRole('button', { name: 'Fechar' }))

    await vi.waitFor(() => {
      expect(document.activeElement).toBe(gatilho)
    })
  })
})
