import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { FilterCatalog } from '@estrelinha/core/filters'
import type { Product, ProductVariant } from '@estrelinha/supabase/types'

/**
 * Feature 67 · VFL-14 — de ponta a ponta: o filtro escolhe a variação, o card linka para ela, e a
 * página do produto abre NELA.
 *
 * Nenhuma das três peças é montada à mão: a variação sai de `filterMatches` (a regra da listagem), o
 * link sai do `ProductCard` real, e a seleção sai da `ProductPage` real, que resolve o `?variant=`
 * com `findVariantByPublicId`. O clique é no link do card — se o card escrevesse um id que a página
 * não reconhece, ela abriria na primeira linha, e é isso que a sonda de `ProductInfo` acusaria.
 *
 * Os dublês são os de `ProductPageVariant.test.tsx` (a página sem rede), mais as configurações de
 * pagamento que o card lê.
 */

const { useProductMock } = vi.hoisted(() => ({ useProductMock: vi.fn() }))
vi.mock('@/entities/product/api/useProduct', () => ({ useProduct: useProductMock }))
vi.mock('@/entities/product/api/useProducts', () => ({ useProducts: () => ({ data: [] }) }))
vi.mock('@/entities/product/api/useProductFaqs', () => ({ useProductFaqs: () => ({ data: [] }) }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => ({ data: [] }) }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', async importOriginal => ({
  ...((await importOriginal()) as object),
  useSeoSettings: () => ({ title: '', description: '', og_image: '' }),
  usePaymentSettings: () => ({
    pix_enabled: true,
    pix_discount_percent: 5,
    card_enabled: true,
    max_installments: 6,
    min_installment_value: 10,
  }),
}))
vi.mock('sonner', () => ({ toast: { custom: vi.fn(), error: vi.fn(), success: vi.fn() } }))
vi.mock('@/entities/product/ui/ProductGallery', () => ({ default: () => <div>galeria</div> }))
vi.mock('@/features/shipping-calc/ui/ShippingCalc', () => ({ default: () => null }))
vi.mock('@/widgets/related-products/ui/RelatedProducts', () => ({ default: () => null }))
vi.mock('@/widgets/product-buy-bar', () => ({ ProductBuyBar: () => null }))
vi.mock('@/entities/product/ui/ProductInfo', () => ({
  default: ({ purchase }: { purchase: { price: number; variant: { id: string } | null } }) => (
    <div>
      <span>preco:{purchase.price.toFixed(2)}</span>
      <span>linha:{purchase.variant?.id ?? 'nenhuma'}</span>
    </div>
  ),
}))

import ProductCard from '@/entities/product/ui/ProductCard'
import { defaultFilters, filterMatches } from '@/features/category-filters'
import ProductPage from '../ProductPage'

const CATALOGO: FilterCatalog = {
  groups: [{ id: 'g-acab', name: 'Acabamento', slug: 'acabamento', is_active: true, sort_order: 0 }],
  values: [
    { id: 'v-prata', group_id: 'g-acab', name: 'Prata 925', slug: 'prata-925', sort_order: 0 },
    { id: 'v-ouro', group_id: 'g-acab', name: 'Folheado a ouro', slug: 'ouro', sort_order: 1 },
  ],
}

const linha = (over: Partial<ProductVariant>): ProductVariant =>
  ({
    id: 'v', product_id: 'p1', option_values: {}, name: null, sku: null, price: 50, compare_price: null,
    stock: 4, weight_kg: null, image_url: null, is_active: true, position: 0, nuvemshop_id: null,
    ...over,
  }) as ProductVariant

/** O ouro vem PRIMEIRO: é a linha em que a página abriria se ignorasse o `?variant=`. */
const peca = (prataId: { nuvemshop_id: number | null; id: string }): Product =>
  ({
    id: 'p1',
    name: 'Colar coração',
    slug: 'colar-coracao',
    price: 50,
    compare_price: null,
    category_id: '', category_slug: '', description: '', image_url: '', images: [],
    stock_policy: 'track', category_links: [], stock_total: 10, low_stock_threshold: 5,
    is_new: false, is_featured: false, tags: [],
    options: [{ name: 'Cor', values: ['Folheado a Ouro', 'Prata 925'], position: 0 }],
    variants: [
      linha({ id: 'v-ouro', option_values: { Cor: 'Folheado a Ouro' }, price: 60, position: 0, nuvemshop_id: 1259936300 }),
      linha({ ...prataId, option_values: { Cor: 'Prata 925' }, price: 95, position: 1 }),
    ],
    filter_value_ids: [],
    option_marks: [{ option_name: 'Cor', option_value: 'Prata 925', value_id: 'v-prata' }],
  }) as Product

const abrirPeloCard = (p: Product) => {
  useProductMock.mockReturnValue({ data: p, isFetching: false })
  const [par] = filterMatches([p], { ...defaultFilters([0, 200]), selection: { acabamento: ['prata-925'] } }, CATALOGO)
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<ProductCard product={par.product} matchedVariant={par.variant} />} />
        <Route path="/produtos/:slug" element={<ProductPage />} />
      </Routes>
    </MemoryRouter>,
  )
  const link = screen.getByRole('link')
  const destino = link.getAttribute('href')
  fireEvent.click(link)
  return { par, destino }
}

beforeEach(() => useProductMock.mockReset())

describe('o card filtrado abre a página na variação que casou (VFL-14)', () => {
  it('pelo `nuvemshop_id`: o filtro escolhe a prata, o card linka, a página abre nela', () => {
    const { par, destino } = abrirPeloCard(peca({ id: 'v-prata', nuvemshop_id: 1259936301 }))
    expect(par.variant?.id).toBe('v-prata')
    expect(destino).toBe('/produtos/colar-coracao?variant=1259936301')
    expect(screen.getByText(/^linha:/).textContent).toBe('linha:v-prata')
    expect(screen.getByText(/^preco:/).textContent).toBe('preco:95.00')
  })

  it('pelo UUID, quando a linha não veio da Nuvemshop', () => {
    const uuid = '7d2e9f10-3c4b-4a5d-8e6f-0a1b2c3d4e5f'
    const { destino } = abrirPeloCard(peca({ id: uuid, nuvemshop_id: null }))
    expect(destino).toBe(`/produtos/colar-coracao?variant=${uuid}`)
    expect(screen.getByText(/^linha:/).textContent).toBe(`linha:${uuid}`)
  })
})
