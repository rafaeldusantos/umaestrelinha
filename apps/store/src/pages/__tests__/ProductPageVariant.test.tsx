import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { Product, ProductVariant } from '@estrelinha/supabase/types'

/**
 * Feature 30 · `GSH-10`, `GSH-11`, `GSH-14` — o `?variant=` que chega da Google Shopping.
 *
 * **O que está em jogo não é cosmético.** O link de toda oferta do feed é
 * `/produtos/<slug>?variant=<g:id>`. Se a página ignora o parâmetro, a cliente clica num anúncio de
 * R$ 24,90 e chega numa página mostrando R$ 19,90 — e, do lado do Google, o Merchant Center rastreia
 * a landing page, compara com o feed e reprova o item por preço incompatível. Com 3.233 ofertas, é
 * reprovação em massa no dia seguinte ao cutover.
 *
 * O arquivo é separado do `ProductPage.test.tsx` porque precisa de um dublê **diferente** de
 * `ProductInfo`: lá ele é um marcador de ordem; aqui ele é a sonda que expõe o preço resolvido.
 */

const { useProductMock } = vi.hoisted(() => ({ useProductMock: vi.fn() }))
vi.mock('@/entities/product/api/useProduct', () => ({ useProduct: useProductMock }))
vi.mock('@/entities/product/api/useProducts', () => ({ useProducts: () => ({ data: [] }) }))
vi.mock('@/entities/product/api/useProductFaqs', () => ({ useProductFaqs: () => ({ data: [] }) }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => ({ data: [] }) }))
vi.mock('@/entities/product/ui/ProductGallery', () => ({ default: () => <div>galeria</div> }))
vi.mock('@/features/shipping-calc/ui/ShippingCalc', () => ({ default: () => null }))
vi.mock('@/widgets/related-products/ui/RelatedProducts', () => ({ default: () => null }))
vi.mock('@/widgets/product-buy-bar', () => ({ ProductBuyBar: () => null }))

/** A sonda: expõe por valor o que o estado de compra resolveu. */
vi.mock('@/entities/product/ui/ProductInfo', () => ({
  default: ({ purchase }: { purchase: { price: number; variant: { id: string } | null } }) => (
    <div>
      <span>preco:{purchase.price.toFixed(2)}</span>
      <span>linha:{purchase.variant?.id ?? 'nenhuma'}</span>
    </div>
  ),
}))

import ProductPage from '../ProductPage'

const variante = (over: Partial<ProductVariant>): ProductVariant =>
  ({
    id: 'v', product_id: 'p1', option_values: {}, name: null, sku: null,
    price: 19.9, compare_price: null, stock: 5, weight_kg: null, image_url: null,
    is_active: true, position: 0, nuvemshop_id: null,
    ...over,
  }) as ProductVariant

/** A peça real: a oferta `1259936246` da conta `685367464`. */
const pulseira = (over: Partial<Product> = {}): Product =>
  ({
    id: 'p1',
    name: 'Pulseira 7 Nós Ajustável Proteção Kabbalah',
    slug: 'pulseira-7-nos-ajustavel-protecao-kabbalah',
    price: 19.9,
    compare_price: null,
    category_id: '', category_slug: '', description: '', image_url: '', images: [],
    stock_policy: 'track', category_links: [], stock_total: 10, low_stock_threshold: 5,
    is_new: false, is_featured: false, tags: [],
    options: [{ name: 'Tamanho', values: ['P', 'G'], position: 0 }],
    variants: [
      variante({ id: 'v-p', option_values: { Tamanho: 'P' }, price: 19.9, position: 0, nuvemshop_id: 1259936246 }),
      variante({ id: 'v-g', option_values: { Tamanho: 'G' }, price: 24.9, position: 1, nuvemshop_id: 1259936247 }),
    ],
    ...over,
  }) as Product

const renderAt = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/produtos/:slug" element={<ProductPage />} />
      </Routes>
    </MemoryRouter>,
  )

const preco = () => screen.getByText(/^preco:/).textContent
const linha = () => screen.getByText(/^linha:/).textContent
const canonical = () =>
  document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.getAttribute('href') ?? null

beforeEach(() => useProductMock.mockReset())
afterEach(() => {
  for (const l of Array.from(document.head.querySelectorAll('link[rel="canonical"]'))) l.remove()
})

const SLUG = '/produtos/pulseira-7-nos-ajustavel-protecao-kabbalah'

describe('ProductPage — o ?variant= abre a variação anunciada (GSH-10)', () => {
  beforeEach(() => {
    useProductMock.mockReturnValue({ data: pulseira(), isFetching: false })
  })

  it('abre na variação do anúncio, com o preço dela', () => {
    renderAt(`${SLUG}?variant=1259936247`)
    expect(linha()).toBe('linha:v-g')
    expect(preco()).toBe('preco:24.90')
  })

  it('a outra variação do mesmo produto abre no preço dela', () => {
    renderAt(`${SLUG}?variant=1259936246`)
    expect(linha()).toBe('linha:v-p')
    expect(preco()).toBe('preco:19.90')
  })

  it('casa por UUID e chega na MESMA linha que o nuvemshop_id', () => {
    renderAt(`${SLUG}?variant=v-g`)
    expect(linha()).toBe('linha:v-g')
    expect(preco()).toBe('preco:24.90')
  })
})

describe('ProductPage — parâmetro que não resolve cai na seleção padrão (GSH-11)', () => {
  beforeEach(() => {
    useProductMock.mockReturnValue({ data: pulseira(), isFetching: false })
  })

  it('id desconhecido abre no padrão, sem erro visível', () => {
    renderAt(`${SLUG}?variant=999999`)
    expect(linha()).toBe('linha:v-p')
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('id malformado abre no padrão, sem tela branca', () => {
    renderAt(`${SLUG}?variant=%%%`)
    expect(linha()).toBe('linha:v-p')
    expect(screen.getByText(/^preco:/)).toBeTruthy()
  })

  it('parâmetro vazio abre no padrão', () => {
    renderAt(`${SLUG}?variant=`)
    expect(linha()).toBe('linha:v-p')
  })

  it('sem parâmetro nenhum, nada muda em relação ao que a página sempre fez', () => {
    renderAt(SLUG)
    expect(linha()).toBe('linha:v-p')
    expect(preco()).toBe('preco:19.90')
  })

  it('variação INATIVA é tratada como desconhecida', () => {
    useProductMock.mockReturnValue({
      data: pulseira({
        variants: [
          variante({ id: 'v-p', option_values: { Tamanho: 'P' }, price: 19.9, position: 0, nuvemshop_id: 1259936246 }),
          variante({ id: 'v-g', option_values: { Tamanho: 'G' }, price: 24.9, position: 1, nuvemshop_id: 1259936247, is_active: false }),
        ],
      }),
      isFetching: false,
    })
    renderAt(`${SLUG}?variant=1259936247`)
    expect(linha()).toBe('linha:v-p')
  })
})

describe('ProductPage — produto sem grade vendável (GSH-11)', () => {
  it('ignora o parâmetro sem efeito e usa o preço do produto', () => {
    useProductMock.mockReturnValue({
      data: pulseira({ options: [], variants: [] }),
      isFetching: false,
    })
    renderAt(`${SLUG}?variant=1259936247`)
    expect(linha()).toBe('linha:nenhuma')
    expect(preco()).toBe('preco:19.90')
  })
})

describe('ProductPage — a canônica não carrega o parâmetro (GSH-14)', () => {
  beforeEach(() => {
    useProductMock.mockReturnValue({ data: pulseira(), isFetching: false })
  })

  it('com ?variant=, a canônica termina no caminho do produto e NÃO traz query', () => {
    renderAt(`${SLUG}?variant=1259936247`)
    const href = canonical()
    expect(href).not.toBeNull()
    expect(new URL(href!).pathname).toBe('/produtos/pulseira-7-nos-ajustavel-protecao-kabbalah')
    expect(new URL(href!).search).toBe('')
    expect(href).not.toContain('variant')
  })

  it('a canônica é a MESMA com e sem o parâmetro — AD-018: um formato só', () => {
    renderAt(`${SLUG}?variant=1259936247`)
    const comParametro = canonical()
    for (const l of Array.from(document.head.querySelectorAll('link[rel="canonical"]'))) l.remove()
    renderAt(SLUG)
    expect(canonical()).toBe(comParametro)
  })
})
