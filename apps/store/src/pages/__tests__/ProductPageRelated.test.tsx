import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Product } from '@estrelinha/supabase/types'

/**
 * `PRF-09` AC 2 — **os relacionados são limitados, e não rebaixam para "a categoria inteira"**.
 *
 * A página do produto pedia a MESMA consulta da página da categoria: com `joias-afetivas`, 505
 * produtos e 1,10 MB comprimidos para desenhar quatro cards no fim da página. O corte era no
 * cliente (`slice(0, 4)`), depois de a rede já ter pago.
 *
 * O detalhe que este arquivo prende é o **+1**: a consulta pede cinco porque a peça aberta é
 * filtrada da lista. Pedir quatro devolveria três sempre que ela estivesse entre as quatro
 * primeiras — e ninguém notaria, porque a faixa continuaria desenhando.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const { useProductMock, useProductsMock } = vi.hoisted(() => ({
  useProductMock: vi.fn(),
  useProductsMock: vi.fn(),
}))

vi.mock('@/entities/product/api/useProduct', () => ({ useProduct: useProductMock }))
vi.mock('@/entities/product/api/useProducts', () => ({ useProducts: useProductsMock }))
vi.mock('@/entities/product/api/useProductFaqs', () => ({ useProductFaqs: () => ({ data: [] }) }))
vi.mock('@/entities/category/api/useCategories', () => ({
  useCategories: () => ({ data: [{ id: 'cat-1', name: 'Colares', slug: 'colares', sort_order: 0 }] }),
}))
vi.mock('@/entities/product/ui/ProductGallery', () => ({ default: () => <div>galeria</div> }))
vi.mock('@/entities/product/ui/ProductInfo', () => ({ default: () => <div>info</div> }))
vi.mock('@/features/shipping-calc/ui/ShippingCalc', () => ({ default: () => null }))
vi.mock('@/widgets/related-products/ui/RelatedProducts', () => ({
  default: ({ products }: any) => <div data-testid="relacionados">{products.length}</div>,
}))

import ProductPage from '../ProductPage'

const produto = (id: string, slug: string): Product =>
  ({
    id,
    name: `Peça ${id}`,
    slug,
    price: 199,
    compare_price: null,
    category_id: 'cat-1',
    category_slug: 'colares',
    description: '',
    image_url: '',
    images: [],
    options: [],
    variants: [],
    stock_policy: 'track',
    category_links: [{ category_id: 'cat-1', position: 0 }],
    stock_total: 10,
    low_stock_threshold: 5,
    is_new: false,
    is_featured: false,
    tags: [],
  }) as Product

const renderPagina = () =>
  render(
    <MemoryRouter initialEntries={['/produtos/peca-aberta']}>
      <Routes>
        <Route path="/produtos/:slug" element={<ProductPage />} />
      </Routes>
    </MemoryRouter>,
  )

/** Os argumentos da consulta de relacionados — o que de fato viaja para o servidor. */
const consultaDeCategoria = () =>
  useProductsMock.mock.calls.at(-1) as [string | undefined, { limit?: number }]

const catalogo = (n: number) =>
  Array.from({ length: n }, (_, i) => produto(`p${i}`, `peca-${i}`))

beforeEach(() => {
  useProductMock.mockReset()
  useProductsMock.mockReset()
  useProductMock.mockReturnValue({ data: produto('aberta', 'peca-aberta'), isFetching: false })
  useProductsMock.mockReturnValue({ data: catalogo(5) })
})

describe('ProductPage — os relacionados são limitados (PRF-09 AC 2)', () => {
  it('a consulta de relacionados declara um teto', () => {
    renderPagina()

    expect(typeof consultaDeCategoria()[1]?.limit).toBe('number')
  })

  it('o teto é CINCO: quatro cards mais a folga da peça aberta, que é filtrada', () => {
    renderPagina()

    expect(consultaDeCategoria()[1].limit).toBe(5)
  })

  it('a consulta é a da categoria de exibição da peça, não o catálogo inteiro', () => {
    renderPagina()

    expect(consultaDeCategoria()[0]).toBe('colares')
  })

  it('a peça aberta não aparece entre os próprios relacionados', () => {
    const comAAberta = [produto('aberta', 'peca-aberta'), ...catalogo(4)]
    useProductsMock.mockReturnValue({ data: comAAberta })

    renderPagina()

    // Cinco chegaram, a aberta saiu: quatro desenham. É o +1 do teto fazendo o trabalho dele.
    expect(screen.getByTestId('relacionados')).toHaveTextContent('4')
  })

  it('quando a peça aberta NÃO está entre as cinco, o corte do cliente segura em quatro', () => {
    useProductsMock.mockReturnValue({ data: catalogo(5) })

    renderPagina()

    expect(screen.getByTestId('relacionados')).toHaveTextContent('4')
  })

  it('categoria com menos peças que o teto continua desenhando o que tem', () => {
    useProductsMock.mockReturnValue({ data: catalogo(2) })

    renderPagina()

    expect(screen.getByTestId('relacionados')).toHaveTextContent('2')
  })
})
