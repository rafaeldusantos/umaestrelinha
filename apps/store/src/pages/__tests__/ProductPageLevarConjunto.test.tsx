import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { OptionValues, Product, ProductVariant } from '@estrelinha/supabase/types'
import { useCartStore } from '@/entities/cart/model/cartStore'
import { useCartUiStore } from '@/entities/cart/model/cartUiStore'

/**
 * Levar o conjunto à sacola, pela `ProductPage` REAL: a página, a coluna de informação, a barra fixa,
 * o estado do Compre Junto e a sacola de verdade (o store do carrinho não é dublado). Só a fronteira
 * de dados é dublada. Os valores são literais, contados à mão.
 */

const { useProductMock, dados, trackSpy } = vi.hoisted(() => ({
  useProductMock: vi.fn(),
  dados: { value: { status: 'off', addons: [], lists: [], products: [] } as Record<string, unknown> },
  trackSpy: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { custom: vi.fn(), error: vi.fn(), success: vi.fn() } }))
vi.mock('@/entities/product/api/useProduct', () => ({ useProduct: useProductMock }))
vi.mock('@/entities/product/api/useProducts', () => ({ useProducts: () => ({ data: [] }) }))
vi.mock('@/entities/product/api/useProductFaqs', () => ({ useProductFaqs: () => ({ data: [] }) }))
vi.mock('@/entities/product/api/useBuyTogetherData', () => ({ useBuyTogetherData: () => dados.value }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => ({ data: [] }) }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', async importOriginal => ({
  ...((await importOriginal()) as object),
  useStoreSettings: () => ({ data: undefined }),
  useSeoSettings: () => ({ title: '', description: '', og_image: '' }),
  useGeneralSettings: () => ({ whatsapp: '', store_name: 'Uma Estrelinha' }),
  usePaymentSettings: () => ({
    max_installments: 6,
    min_installment_value: 10,
    pix_enabled: true,
    pix_discount_percent: 5,
  }),
}))
vi.mock('@/entities/product/ui/ProductGallery', () => ({ default: () => <div>galeria</div> }))
vi.mock('@/features/shipping-calc/ui/ShippingCalc', () => ({ default: () => null }))
vi.mock('@/features/share-product/ui/ShareButtons', () => ({ default: () => null }))
vi.mock('@/widgets/related-products/ui/RelatedProducts', () => ({ default: () => null }))
vi.mock('@/widgets/material-drawer', () => ({ MaterialDrawer: () => null }))
vi.mock('@/shared/lib/analytics', async importOriginal => {
  const real = await importOriginal<typeof import('@/shared/lib/analytics')>()
  return { ...real, track: (e: unknown) => trackSpy(e) }
})

import ProductPage from '../ProductPage'

let seq = 0
const variante = (option_values: OptionValues, price: number, over: Partial<ProductVariant> = {}) =>
  ({
    id: `v${++seq}`, product_id: 'x', option_values, name: null, sku: null, price, compare_price: null,
    stock: 5, weight_kg: null, image_url: null, is_active: true, position: seq, ...over,
  }) as ProductVariant

const peca = (id: string, name: string, over: Partial<Product> = {}): Product =>
  ({
    id, name, slug: id, price: 20, compare_price: null, category_id: '', category_slug: '',
    description: '', image_url: '', images: [], options: [], variants: [], stock_policy: 'track',
    category_links: [], stock_total: 10, low_stock_threshold: 3, is_new: false, is_featured: false,
    tags: [], engraving_max_chars: null, ...over,
  }) as Product

const principal = (over: Partial<Product> = {}) => peca('main', 'Pulseira Afeto', { price: 100, ...over })

const pingente = () =>
  peca('ping', 'Pingente Estrela do Mar', {
    options: [{ name: 'Cor', values: ['Ouro', 'Prata'], position: 0 }],
    variants: [variante({ Cor: 'Ouro' }, 25), variante({ Cor: 'Prata' }, 35)],
  })
const gravavel = () =>
  peca('grav', 'Pingente Gravado', {
    engraving_max_chars: 8,
    options: [{ name: 'Com gravação', values: ['Sim', 'Não'], position: 0 }],
    variants: [variante({ 'Com gravação': 'Sim' }, 45), variante({ 'Com gravação': 'Não' }, 30)],
  })

const addon = (id: string, position: number, target: string, over: Record<string, unknown> = {}) => ({
  id, position, kind: 'product', targetProductId: target, listId: null, targetVariantIds: [], hiddenOnVariantIds: [],
  ...over,
})
const ofertar = (addons: unknown[], products: Product[]) => {
  dados.value = { status: 'ready', addons, lists: [], products }
}

const renderPage = (main: Product = principal(), search = '') => {
  useProductMock.mockReturnValue({ data: main, isFetching: false })
  return render(
    <MemoryRouter initialEntries={[`/produtos/main${search}`]}>
      <Routes>
        <Route path="/produtos/:slug" element={<ProductPage />} />
      </Routes>
    </MemoryRouter>,
  )
}

const linhaDo = (id: string) => document.querySelector<HTMLElement>(`[data-addon-id="${id}"]`)!
const caixa = (nome: RegExp) => screen.getByRole('checkbox', { name: nome })
const barra = () => within(screen.getByTestId('product-buy-bar'))
/** O botão de compra da coluna: o que NÃO está dentro da barra fixa. */
const botaoDaColuna = (nome: string) =>
  screen.getAllByRole('button', { name: nome }).find(b => !b.closest('[data-testid="product-buy-bar"]'))!
const texto = (el: HTMLElement | null) => (el?.textContent ?? '').replace(/\s+/g, ' ').replace(/\u00a0/g, ' ')
const items = () => useCartStore.getState().items
const eventos = (nome: string) =>
  trackSpy.mock.calls.map(c => c[0] as { name: string; params: Record<string, unknown> }).filter(e => e.name === nome)

const marcarPingente = (cor = 'Prata') => {
  fireEvent.click(caixa(/Levar junto: Pingente Estrela/))
  fireEvent.click(within(linhaDo('a1')).getByRole('radio', { name: cor }))
}

beforeEach(() => {
  seq = 0
  trackSpy.mockReset()
  useCartStore.setState({ items: [] })
  useCartUiStore.setState({ open: false })
  dados.value = { status: 'off', addons: [], lists: [], products: [] }
})
afterEach(() => {
  for (const l of Array.from(document.head.querySelectorAll('link[rel="canonical"]'))) l.remove()
})

describe('o botão único — sem marcação', () => {
  it('diz "Adicionar à sacola", leva só o principal e abre a gaveta', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    expect(botaoDaColuna('Adicionar à sacola')).toBeInTheDocument()
    expect(barra().getByRole('button', { name: 'Adicionar à sacola' })).toBeInTheDocument()

    fireEvent.click(botaoDaColuna('Adicionar à sacola'))
    expect(items().map(i => [i.product.id, i.quantity])).toEqual([['main', 1]])
    expect(items()[0].accompanies).toBeUndefined()
    expect(useCartUiStore.getState().open).toBe(true)
    const evs = eventos('add_to_cart')
    expect(evs).toHaveLength(1)
    expect((evs[0].params.items as unknown[]).length).toBe(1)
  })
})

describe.each([
  ['a coluna de informação', () => fireEvent.click(botaoDaColuna('Levar o conjunto'))],
  ['a barra fixa do celular', () => fireEvent.click(barra().getByRole('button', { name: 'Levar o conjunto' }))],
])('levar o conjunto por %s', (_nome, tocar) => {
  it('leva o principal e o adicional como linhas próprias, cada um com a sua variação, e abre a gaveta', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    marcarPingente('Prata')
    expect(botaoDaColuna('Levar o conjunto')).toBeInTheDocument()
    expect(barra().getByRole('button', { name: 'Levar o conjunto' })).toBeInTheDocument()

    tocar()

    expect(items()).toHaveLength(2)
    expect(items()[0]).toMatchObject({ quantity: 1, unitPrice: 100 })
    expect(items()[0].product.id).toBe('main')
    expect(items()[0].accompanies).toBeUndefined()
    expect(items()[1]).toMatchObject({
      quantity: 1,
      unitPrice: 35,
      variantLabel: 'Prata',
      optionValues: { Cor: 'Prata' },
      accompanies: [{ mainProductId: 'main', listId: null }],
    })
    expect(items()[1].product.id).toBe('ping')
    expect(useCartUiStore.getState().open).toBe(true)
  })

  it('add_to_cart: UM evento com os dois itens, o principal uma vez, item_list_id só no adicional', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    marcarPingente('Ouro')
    const listasAntes = eventos('view_item_list').length
    const escolhasAntes = eventos('select_item').length
    tocar()

    // O toque emite só o add_to_cart: view_item_list e select_item são emitidos pelo bloco.
    expect(eventos('view_item_list')).toHaveLength(listasAntes)
    expect(eventos('select_item')).toHaveLength(escolhasAntes)
    const evs = eventos('add_to_cart')
    expect(evs).toHaveLength(1)
    expect(evs[0].params.value).toBe(125)
    const its = evs[0].params.items as Record<string, unknown>[]
    expect(its).toHaveLength(2)
    expect(its[0]).toMatchObject({ item_id: 'main', quantity: 1, price: 100 })
    expect(its[0].item_list_id).toBeUndefined()
    expect(its[1]).toMatchObject({
      item_id: 'ping', quantity: 1, price: 25, item_variant: 'Ouro',
      item_list_id: 'compre-junto', item_list_name: 'Compre Junto',
    })
  })
})

describe('levar o conjunto — quantidade, soma e gravação', () => {
  it('a quantidade do principal vale só para ele; o adicional entra com 1', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    marcarPingente('Prata')
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar quantidade' }))
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar quantidade' }))
    fireEvent.click(botaoDaColuna('Levar o conjunto'))

    expect(items().map(i => [i.product.id, i.quantity])).toEqual([['main', 3], ['ping', 1]])
    const its = eventos('add_to_cart')[0].params.items as { item_id: string; quantity: number }[]
    expect(its.map(i => [i.item_id, i.quantity])).toEqual([['main', 3], ['ping', 1]])
    expect(eventos('add_to_cart')[0].params.value).toBe(335)
  })

  it('peça que já estava na sacola, na mesma variação, soma à linha e passa a acompanhar o principal', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    const ping = pingente()
    useCartStore.getState().addItems([
      { product: ping, variant: { variantId: ping.variants[1].id, variantLabel: 'Prata', optionValues: { Cor: 'Prata' }, unitPrice: 35 } },
    ])
    ofertar([addon('a1', 0, 'ping')], [ping])
    renderPage()
    marcarPingente('Prata')
    fireEvent.click(botaoDaColuna('Levar o conjunto'))

    expect(items()).toHaveLength(2)
    const linha = items().find(i => i.product.id === 'ping')!
    expect(linha.quantity).toBe(2)
    expect(linha.accompanies).toEqual([{ mainProductId: 'main', listId: null }])
  })

  it('a gravação do principal e a do adicional entram cada uma na sua linha', () => {
    ofertar([addon('a1', 0, 'grav')], [gravavel()])
    renderPage(
      principal({
        engraving_max_chars: 10,
        options: [{ name: 'Com gravação', values: ['Sim', 'Não'], position: 0 }],
        variants: [variante({ 'Com gravação': 'Sim' }, 100), variante({ 'Com gravação': 'Não' }, 90)],
      }),
    )
    // O principal grava (primeiro grupo de variações da coluna), o adicional também.
    fireEvent.click(screen.getAllByRole('radio', { name: 'Sim' })[0])
    fireEvent.change(screen.getAllByLabelText('O que gravar')[0], { target: { value: ' Ana ' } })
    fireEvent.click(caixa(/Pingente Gravado/))
    fireEvent.click(within(linhaDo('a1')).getByRole('radio', { name: 'Sim' }))
    fireEvent.change(within(linhaDo('a1')).getByLabelText('O que gravar'), { target: { value: 'Léo' } })
    fireEvent.click(botaoDaColuna('Levar o conjunto'))

    expect(items().map(i => [i.product.id, i.engravingText])).toEqual([['main', 'Ana'], ['grav', 'Léo']])
  })
})

describe('levar o conjunto — o que recusa', () => {
  it('faltando escolha no adicional: nada entra, o aviso diz quantas peças, e o foco vai ao adicional', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    fireEvent.click(caixa(/Levar junto: Pingente Estrela/))
    fireEvent.click(barra().getByRole('button', { name: 'Levar o conjunto' }))

    expect(items()).toHaveLength(0)
    expect(useCartUiStore.getState().open).toBe(false)
    expect(screen.getByRole('alert')).toHaveTextContent('Falta uma escolha em 1 peça. Ela está marcada acima.')
    expect(linhaDo('a1').contains(document.activeElement)).toBe(true)
    expect(eventos('add_to_cart')).toHaveLength(0)
  })

  it('o aviso some quando a escolha é feita, e aí leva', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    fireEvent.click(caixa(/Levar junto: Pingente Estrela/))
    fireEvent.click(botaoDaColuna('Levar o conjunto'))
    expect(screen.getByRole('alert')).toBeInTheDocument()
    fireEvent.click(within(linhaDo('a1')).getByRole('radio', { name: 'Ouro' }))
    expect(screen.queryByRole('alert')).toBeNull()
    fireEvent.click(botaoDaColuna('Levar o conjunto'))
    expect(items()).toHaveLength(2)
  })

  it('gravação do adicional acima do limite: nada entra e a recusa fica junto do campo', () => {
    ofertar([addon('a1', 0, 'grav')], [gravavel()])
    renderPage()
    fireEvent.click(caixa(/Pingente Gravado/))
    const linha = within(linhaDo('a1'))
    fireEvent.click(linha.getByRole('radio', { name: 'Sim' }))
    fireEvent.change(linha.getByLabelText('O que gravar'), { target: { value: 'Maria Clara' } })
    fireEvent.click(botaoDaColuna('Levar o conjunto'))

    expect(items()).toHaveLength(0)
    expect(linha.getByText('Cabem até 8 caracteres nesta peça. Tire 3 para continuar.')).toBeInTheDocument()
    expect(document.activeElement).toBe(linha.getByLabelText('O que gravar'))
    expect(screen.getByRole('alert')).toHaveTextContent('A gravação passou do limite')
  })

  it('gravação do principal acima do limite: nada entra, mesmo com adicional completo', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage(
      principal({
        engraving_max_chars: 3,
        options: [{ name: 'Com gravação', values: ['Sim', 'Não'], position: 0 }],
        variants: [variante({ 'Com gravação': 'Sim' }, 100), variante({ 'Com gravação': 'Não' }, 90)],
      }),
    )
    marcarPingente('Ouro')
    fireEvent.click(screen.getAllByRole('radio', { name: 'Sim' })[0])
    fireEvent.change(screen.getAllByLabelText('O que gravar')[0], { target: { value: 'Maria Clara' } })
    fireEvent.click(barra().getByRole('button', { name: 'Revisar a gravação' }))
    expect(items()).toHaveLength(0)

    // A recusa fica junto do campo do principal, e o toque leva a ele.
    const campo = screen.getAllByLabelText('O que gravar')[0]
    expect(campo).toHaveAttribute('aria-invalid', 'true')
    const recusa = document.getElementById(campo.getAttribute('aria-describedby')!)
    expect(recusa).toHaveTextContent('A gravação tem 11 caracteres e o limite desta peça é 3.')
    expect(document.activeElement).toBe(campo)
  })

  it('principal com combinação indisponível: o bloco fica, o botão da coluna bloqueia e nada entra', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    const boa = variante({ Cor: 'Ouro' }, 100)
    const esgotada = variante({ Cor: 'Prata' }, 100, { stock: 0 })
    renderPage(
      principal({
        options: [{ name: 'Cor', values: ['Ouro', 'Prata'], position: 0 }],
        variants: [boa, esgotada],
      }),
      `?variant=${esgotada.id}`,
    )
    marcarPingente('Ouro')
    expect(screen.getByRole('heading', { name: 'Compre junto' })).toBeInTheDocument()
    expect(screen.getByText('Essa combinação está indisponível no momento.')).toBeInTheDocument()
    const botao = screen.getByRole('button', { name: 'Indisponível' })
    expect(botao).toBeDisabled()
    fireEvent.click(botao)
    expect(items()).toHaveLength(0)
  })
})

const AVISO_DA_GRAVACAO = 'A gravação passou do limite. Ajuste o texto para continuar.'
const principalGravavel = () =>
  principal({
    engraving_max_chars: 12,
    options: [{ name: 'Com gravação', values: ['Sim', 'Não'], position: 0 }],
    variants: [variante({ 'Com gravação': 'Sim' }, 100), variante({ 'Com gravação': 'Não' }, 90)],
  })
const gravarNoPrincipal = (texto: string) => {
  fireEvent.click(screen.getAllByRole('radio', { name: 'Sim' })[0])
  fireEvent.change(screen.getAllByLabelText('O que gravar')[0], { target: { value: texto } })
}
const avisosComAFrase = () => screen.queryAllByRole('alert').filter(a => a.textContent?.includes(AVISO_DA_GRAVACAO))

describe('o aviso do conjunto com a gravação do principal acima do limite', () => {
  it('com adicional completo marcado, o aviso aparece antes de qualquer toque, e nada entra ao tocar', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage(principalGravavel())
    marcarPingente('Ouro')
    gravarNoPrincipal('Lúcia Mariana')

    expect(screen.getByRole('alert')).toHaveTextContent(AVISO_DA_GRAVACAO)
    fireEvent.click(barra().getByRole('button', { name: 'Revisar a gravação' }))
    expect(items()).toHaveLength(0)
    expect(screen.getByRole('alert')).toHaveTextContent(AVISO_DA_GRAVACAO)
  })

  it('o aviso some quando a gravação do principal volta ao limite', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage(principalGravavel())
    marcarPingente('Ouro')
    gravarNoPrincipal('Lúcia Mariana')
    expect(avisosComAFrase()).toHaveLength(1)

    fireEvent.change(screen.getAllByLabelText('O que gravar')[0], { target: { value: 'Lúcia Maria' } })
    expect(avisosComAFrase()).toHaveLength(0)
  })

  it('o aviso some quando nenhum adicional fica marcado', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage(principalGravavel())
    marcarPingente('Ouro')
    gravarNoPrincipal('Lúcia Mariana')
    expect(avisosComAFrase()).toHaveLength(1)

    fireEvent.click(caixa(/Levar junto: Pingente Estrela/))
    expect(avisosComAFrase()).toHaveLength(0)
  })

  it('sem adicional marcado, a gravação do principal acima do limite não acende o aviso', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage(principalGravavel())
    gravarNoPrincipal('Lúcia Mariana')

    expect(barra().getByRole('button', { name: 'Revisar a gravação' })).toBeInTheDocument()
    expect(avisosComAFrase()).toHaveLength(0)
    fireEvent.click(barra().getByRole('button', { name: 'Revisar a gravação' }))
    expect(avisosComAFrase()).toHaveLength(0)
  })

  it('a gravação recusada só no adicional continua sem aviso antes do toque', () => {
    ofertar([addon('a1', 0, 'grav')], [gravavel()])
    renderPage()
    fireEvent.click(caixa(/Pingente Gravado/))
    const linha = within(linhaDo('a1'))
    fireEvent.click(linha.getByRole('radio', { name: 'Sim' }))
    fireEvent.change(linha.getByLabelText('O que gravar'), { target: { value: 'Maria Clara' } })

    expect(avisosComAFrase()).toHaveLength(0)
    fireEvent.click(botaoDaColuna('Levar o conjunto'))
    expect(avisosComAFrase()).toHaveLength(1)
  })
})

describe('a barra fixa com o conjunto', () => {
  it('sem adicional marcado: o preço do principal e "no Pix"', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    const t = texto(barra().getByText('R$ 100,00').closest('div'))
    expect(t).toContain('R$ 95,00')
    expect(t).toContain('no Pix')
    expect(barra().queryByText(/Conjunto ·/)).toBeNull()
  })

  it('com adicional marcado: o total e "Conjunto · N peças", sem o preço no Pix', () => {
    ofertar([addon('a1', 0, 'ping'), addon('a2', 1, 'grav')], [pingente(), gravavel()])
    renderPage()
    marcarPingente('Prata')
    const b = texto(screen.getByTestId('product-buy-bar'))
    expect(b).toContain('R$ 135,00')
    expect(b).toContain('Conjunto · 2 peças')
    expect(b).not.toContain('no Pix')
    expect(b).not.toContain('R$ 100,00')

    fireEvent.click(caixa(/Pingente Gravado/))
    expect(texto(screen.getByTestId('product-buy-bar'))).toContain('Conjunto · 3 peças')
  })

  it('com desconto do Compre Junto: a barra, a nota da coluna e o bloco mostram o mesmo total descontado', () => {
    // À mão: o pingente Prata de 35 a 10% sai por 31,50; 100 + 31,50 = 131,50, com 3,50 a menos.
    ofertar([addon('a1', 0, 'ping', { discountPercent: 10 })], [pingente()])
    renderPage()
    marcarPingente('Prata')

    expect(texto(screen.getByText('Desconto do Compre Junto').parentElement)).toBe(
      'Desconto do Compre Junto−R$ 3,50',
    )
    expect(texto(screen.getByText('Total do conjunto').parentElement)).toContain('R$ 131,50')

    const b = texto(screen.getByTestId('product-buy-bar'))
    expect(b).toContain('R$ 131,50')
    expect(b).toContain('Conjunto · 2 peças')
    expect(b).not.toContain('R$ 135,00')
    expect(texto(screen.getByText(/A joia e/))).toBe('A joia e 1 peça marcada · R$ 131,50')
  })

  it('a nota da coluna: "A joia e N peças marcadas · total"', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    expect(screen.queryByText(/A joia e/)).toBeNull()
    marcarPingente('Prata')
    expect(texto(screen.getByText(/A joia e/))).toBe('A joia e 1 peça marcada · R$ 135,00')
  })
})
