import { beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { OptionValues, Product, ProductVariant } from '@estrelinha/supabase/types'

/**
 * O total do conjunto é ANUNCIADO a quem usa leitor de tela, medido pela `ProductPage` REAL — a
 * página, o bloco, o estado e a barra fixa de verdade. Só a fronteira de dados é dublada.
 *
 * O leitor de tela só anuncia a mudança de uma região viva que JÁ ESTAVA no DOM: por isso a região
 * tem de existir antes da primeira marca, e o MESMO nó recebe cada total novo. Uma região só — a
 * barra fixa mostra o mesmo valor e não ganha uma segunda, senão o total seria lido duas vezes.
 *
 * Valores LITERAIS, calculados à mão: 100 + 35 = 135, PIX de 5% = 128,25; 100 + 25 = 125, PIX
 * 118,75; com a corrente, 100 + 25 + 30 = 155.
 */

const { useProductMock, dados, pagamento } = vi.hoisted(() => ({
  useProductMock: vi.fn(),
  dados: { value: { status: 'off', addons: [], lists: [], products: [] } as Record<string, unknown> },
  pagamento: { value: { pix_enabled: true, pix_discount_percent: 5 } },
}))

vi.mock('sonner', () => ({ toast: { custom: vi.fn(), error: vi.fn(), success: vi.fn() } }))
vi.mock('@/entities/product/api/useProduct', () => ({ useProduct: useProductMock }))
vi.mock('@/entities/product/api/useProducts', () => ({ useProducts: () => ({ data: [] }) }))
vi.mock('@/entities/product/api/useProductFaqs', () => ({ useProductFaqs: () => ({ data: [] }) }))
vi.mock('@/entities/product/api/useBuyTogetherData', () => ({ useBuyTogetherData: () => dados.value }))
vi.mock('@estrelinha/core/hooks/useBuyTogetherForm', () => ({ useBuyTogetherForm: () => 'inline' }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => ({ data: [] }) }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', async importOriginal => ({
  ...((await importOriginal()) as object),
  useSeoSettings: () => ({ title: '', description: '', og_image: '' }),
  useGeneralSettings: () => ({ whatsapp: '', store_name: 'Uma Estrelinha' }),
  usePaymentSettings: () => ({ max_installments: 6, min_installment_value: 10, ...pagamento.value }),
}))
vi.mock('@/entities/product/ui/ProductGallery', () => ({ default: () => <div>galeria</div> }))
vi.mock('@/features/shipping-calc/ui/ShippingCalc', () => ({ default: () => null }))
vi.mock('@/features/share-product/ui/ShareButtons', () => ({ default: () => null }))
vi.mock('@/widgets/related-products/ui/RelatedProducts', () => ({ default: () => null }))
vi.mock('@/widgets/material-drawer', () => ({ MaterialDrawer: () => null }))

import ProductPage from '../ProductPage'

let seq = 0
const variante = (option_values: OptionValues, price: number): ProductVariant =>
  ({
    id: `v${++seq}`,
    product_id: 'x',
    option_values,
    name: null,
    sku: null,
    price,
    compare_price: null,
    stock: 5,
    weight_kg: null,
    image_url: null,
    is_active: true,
    position: seq,
  }) as ProductVariant

const peca = (id: string, name: string, over: Partial<Product> = {}): Product =>
  ({
    id,
    name,
    slug: id,
    price: 20,
    compare_price: null,
    category_id: '',
    category_slug: '',
    description: '',
    image_url: '',
    images: [],
    options: [],
    variants: [],
    stock_policy: 'track',
    category_links: [],
    stock_total: 10,
    low_stock_threshold: 3,
    is_new: false,
    is_featured: false,
    tags: [],
    engraving_max_chars: null,
    ...over,
  }) as Product

const pingente = () =>
  peca('ping', 'Pingente Estrela do Mar', {
    options: [{ name: 'Cor', values: ['Ouro', 'Prata'], position: 0 }],
    variants: [variante({ Cor: 'Ouro' }, 25), variante({ Cor: 'Prata' }, 35)],
  })

const addon = (id: string, position: number, target: string) => ({
  id,
  position,
  kind: 'product',
  targetProductId: target,
  listId: null,
  targetVariantIds: [],
  hiddenOnVariantIds: [],
})

const ofertar = () => {
  dados.value = {
    status: 'ready',
    addons: [addon('a1', 0, 'ping'), addon('a2', 1, 'simples')],
    lists: [],
    products: [pingente(), peca('simples', 'Corrente Fina', { price: 30 })],
  }
}

const renderPage = () => {
  useProductMock.mockReturnValue({ data: peca('main', 'Pulseira Afeto', { price: 100 }), isFetching: false })
  return render(
    <MemoryRouter initialEntries={['/produtos/main']}>
      <Routes>
        <Route path="/produtos/:slug" element={<ProductPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const bloco = () =>
  screen.getByRole('heading', { name: 'Compre junto' }).closest('section') as HTMLElement
const regiao = () => within(bloco()).getByRole('status')
const linhaDo = (id: string) => document.querySelector<HTMLElement>(`[data-addon-id="${id}"]`)!
const caixa = (nome: RegExp) => screen.getByRole('checkbox', { name: nome })
const texto = (el: HTMLElement | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').trim()
/** Toda região viva da página — o que um leitor de tela anuncia sozinho. */
const regioesVivas = () =>
  Array.from(
    document.querySelectorAll<HTMLElement>('[role="status"], [role="alert"], [role="log"], [aria-live]'),
  ).filter(el => el.getAttribute('aria-live') !== 'off')

beforeEach(() => {
  seq = 0
  pagamento.value = { pix_enabled: true, pix_discount_percent: 5 }
  ofertar()
})

describe('Compre Junto — o total do conjunto é anunciado', () => {
  it('a região viva do total já está no bloco antes de qualquer marca, vazia', () => {
    renderPage()
    const r = regiao()
    expect(r).toHaveAttribute('role', 'status')
    expect(r.textContent).toBe('')
    expect(screen.queryByText('Total do conjunto')).toBeNull()
  })

  it('o total novo entra na MESMA região, com o valor do rodapé, e acompanha a variação e a outra peça', () => {
    renderPage()
    const r = regiao()

    fireEvent.click(caixa(/Levar junto: Pingente/))
    fireEvent.click(within(linhaDo('a1')).getByRole('radio', { name: 'Prata' }))
    expect(texto(r)).toMatch(/^Total do conjunto: R\$\s?135,00, R\$\s?128,25 com Pix$/)
    const rodape = screen.getByText('Total do conjunto').closest('div')!
    expect(texto(rodape)).toMatch(/R\$\s?135,00/)

    fireEvent.click(within(linhaDo('a1')).getByRole('radio', { name: 'Ouro' }))
    expect(regiao()).toBe(r)
    expect(texto(r)).toMatch(/^Total do conjunto: R\$\s?125,00, R\$\s?118,75 com Pix$/)

    fireEvent.click(caixa(/Levar junto: Corrente Fina/))
    expect(regiao()).toBe(r)
    expect(texto(r)).toMatch(/^Total do conjunto: R\$\s?155,00/)
  })

  it('desmarcar tudo esvazia a região, que continua no bloco', () => {
    renderPage()
    const r = regiao()
    fireEvent.click(caixa(/Levar junto: Corrente Fina/))
    expect(texto(r)).toMatch(/R\$\s?130,00/)
    fireEvent.click(caixa(/Levar junto: Corrente Fina/))
    expect(regiao()).toBe(r)
    expect(r.textContent).toBe('')
  })

  it('com o PIX desligado, o anúncio traz só o total', () => {
    pagamento.value = { pix_enabled: false, pix_discount_percent: 5 }
    renderPage()
    fireEvent.click(caixa(/Levar junto: Corrente Fina/))
    expect(texto(regiao())).toMatch(/^Total do conjunto: R\$\s?130,00$/)
    expect(texto(regiao())).not.toContain('Pix')
  })

  it('a barra fixa mostra o total sem uma região viva própria: o total é anunciado uma vez só', () => {
    renderPage()
    fireEvent.click(caixa(/Levar junto: Corrente Fina/))
    // A barra fixa está na página e mostra o conjunto.
    expect(screen.getByText(/Conjunto · 2 peças/)).toBeInTheDocument()
    const comTotal = regioesVivas().filter(el => /R\$\s?130,00/.test(el.textContent ?? ''))
    expect(comTotal).toHaveLength(1)
    expect(bloco().contains(comTotal[0])).toBe(true)
  })
})
