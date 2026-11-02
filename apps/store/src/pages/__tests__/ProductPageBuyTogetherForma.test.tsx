import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { OptionValues, Product, ProductVariant } from '@estrelinha/supabase/types'

/**
 * A forma do bloco Compre Junto ("Na linha", "Em folha", "Com fórmula"), medida pela `ProductPage`
 * REAL — a página, o `ProductInfo`, o estado e o bloco de verdade. Só a fronteira de dados é dublada
 * (a configuração e os produtos dos adicionais, a forma lida de `store_settings`, e as demais leituras).
 *
 * A forma só decide ONDE as escolhas se abrem: o total e o PIX são os mesmos nas três, e os valores
 * esperados são literais calculados à mão (100 + 35 = 135; 5% de PIX: 128,25).
 */

const { useProductMock, dados, trackSpy, forma } = vi.hoisted(() => ({
  forma: { value: 'inline' as string },
  useProductMock: vi.fn(),
  dados: { value: { status: 'off', addons: [], lists: [], products: [] } as Record<string, unknown> },
  trackSpy: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { custom: vi.fn(), error: vi.fn(), success: vi.fn() } }))
vi.mock('@/entities/product/api/useProduct', () => ({ useProduct: useProductMock }))
vi.mock('@/entities/product/api/useProducts', () => ({ useProducts: () => ({ data: [] }) }))
vi.mock('@/entities/product/api/useProductFaqs', () => ({ useProductFaqs: () => ({ data: [] }) }))
vi.mock('@/entities/product/api/useBuyTogetherData', () => ({ useBuyTogetherData: () => dados.value }))
vi.mock('@estrelinha/core/hooks/useBuyTogetherForm', () => ({ useBuyTogetherForm: () => forma.value }))
vi.mock('@/entities/category/api/useCategories', () => ({ useCategories: () => ({ data: [] }) }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', async importOriginal => ({
  ...((await importOriginal()) as object),
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
vi.mock('@/widgets/product-buy-bar', () => ({ ProductBuyBar: () => null }))
vi.mock('@/widgets/material-drawer', () => ({ MaterialDrawer: () => null }))
vi.mock('@/shared/lib/analytics', async importOriginal => {
  const real = await importOriginal<typeof import('@/shared/lib/analytics')>()
  return { ...real, track: (e: unknown) => trackSpy(e) }
})

import ProductPage from '../ProductPage'
import { useCartStore } from '@/entities/cart/model/cartStore'

let seq = 0
const variante = (
  option_values: OptionValues,
  price: number,
  over: Partial<ProductVariant> = {},
): ProductVariant =>
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
    ...over,
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

const principal = (over: Partial<Product> = {}) => peca('main', 'Pulseira Afeto', { price: 100, ...over })

const pingente = () => {
  const ouro = variante({ Cor: 'Ouro' }, 25)
  const prata = variante({ Cor: 'Prata' }, 35)
  const rosa = variante({ Cor: 'Rosa' }, 40, { stock: 0 })
  return peca('ping', 'Pingente Estrela do Mar', {
    options: [{ name: 'Cor', values: ['Ouro', 'Prata', 'Rosa'], position: 0 }],
    variants: [ouro, prata, rosa],
  })
}

const addon = (id: string, position: number, target: string, over: Record<string, unknown> = {}) => ({
  id,
  position,
  kind: 'product',
  targetProductId: target,
  listId: null,
  targetVariantIds: [],
  hiddenOnVariantIds: [],
  ...over,
})

const ofertar = (
  addons: unknown[],
  products: Product[],
  over: Record<string, unknown> = {},
) => {
  dados.value = { status: 'ready', addons, lists: [], products, ...over }
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
const texto = (el: HTMLElement | null) => (el?.textContent ?? '').replace(/\s+/g, ' ')
const NOME = /Levar junto: Pingente/

const matchMedia = (compacto: boolean) =>
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    configurable: true,
    value: (query: string) => ({
      matches: compacto,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => {},
    }),
  })

beforeEach(() => {
  seq = 0
  forma.value = 'inline'
  trackSpy.mockReset()
  dados.value = { status: 'off', addons: [], lists: [], products: [] }
  useCartStore.setState({ items: [] })
  matchMedia(false)
})
afterEach(() => {
  for (const l of Array.from(document.head.querySelectorAll('link[rel="canonical"]'))) l.remove()
  matchMedia(false)
})

describe('a forma "Na linha" (padrão)', () => {
  it('marcar abre as escolhas na própria linha, sem folha nem faixa', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    fireEvent.click(caixa(NOME))
    expect(within(linhaDo('a1')).getByRole('radiogroup', { name: /Cor/ })).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByTestId('formula-strip')).toBeNull()
  })

  it('um valor desconhecido lido do banco cai em "Na linha" e a página não quebra', async () => {
    const real = await vi.importActual<typeof import('@estrelinha/core/buy-together')>(
      '@estrelinha/core/buy-together',
    )
    expect(real.normalizeBuyTogetherForm('carrossel')).toBe('inline')
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    forma.value = real.normalizeBuyTogetherForm('carrossel')
    renderPage()
    fireEvent.click(caixa(NOME))
    expect(within(linhaDo('a1')).getByRole('radiogroup')).toBeInTheDocument()
    expect(screen.queryByTestId('formula-strip')).toBeNull()
  })
})

describe('a forma "Com fórmula"', () => {
  beforeEach(() => {
    forma.value = 'formula'
  })

  it('a faixa "Esta joia + peça" fica acima da lista e fora do leitor de tela', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    const faixa = screen.getByTestId('formula-strip')
    expect(faixa).toHaveAttribute('aria-hidden', 'true')
    expect(faixa).toHaveTextContent('Esta joia')
    expect(faixa).toHaveTextContent('Pingente Estrela do Mar')
    // Fora da árvore de acessibilidade: o teclado e o leitor de tela só têm a lista.
    expect(screen.getAllByRole('checkbox')).toHaveLength(1)
    expect(screen.queryAllByRole('button', { name: /Pingente Estrela do Mar/ })).toHaveLength(0)
    const lista = linhaDo('a1').closest('ul')!
    expect(faixa.compareDocumentPosition(lista) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(faixa).getByRole('button', { hidden: true })).toHaveAttribute('tabindex', '-1')
  })

  it('o nome na faixa alterna o adicional, e as escolhas abrem na linha', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    fireEvent.click(within(screen.getByTestId('formula-strip')).getByRole('button', { hidden: true }))
    expect(caixa(NOME)).toBeChecked()
    expect(within(linhaDo('a1')).getByRole('radiogroup')).toBeInTheDocument()
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('a forma "Em folha"', () => {
  beforeEach(() => {
    forma.value = 'sheet'
  })

  it('marcar abre a folha com o nome do adicional como título, e o foco vai ao título', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    fireEvent.click(caixa(NOME))
    const dialogo = screen.getByRole('dialog', { name: 'Pingente Estrela do Mar' })
    const titulo = within(dialogo).getByRole('heading', { name: 'Pingente Estrela do Mar' })
    expect(titulo).toHaveFocus()
    // O painel mora na folha, e não mais na linha.
    expect(within(dialogo).getByRole('radiogroup', { name: /Cor/ })).toBeInTheDocument()
    expect(within(linhaDo('a1')).queryByRole('radiogroup')).toBeNull()
    expect(screen.queryByTestId('formula-strip')).toBeNull()
  })

  it('"Incluir no conjunto" fica desabilitado enquanto falta escolha, e a frase diz qual', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    fireEvent.click(caixa(NOME))
    const dialogo = screen.getByRole('dialog')
    const incluir = within(dialogo).getByRole('button', { name: 'Incluir no conjunto' })
    expect(incluir).toBeDisabled()
    expect(within(dialogo).getAllByText('Escolha o Cor da Pingente.').length).toBeGreaterThan(0)
    fireEvent.click(within(dialogo).getByRole('radio', { name: 'Prata' }))
    expect(within(dialogo).getByRole('button', { name: 'Incluir no conjunto' })).toBeEnabled()
  })

  it('incluir fecha a folha, mantém a marca e o total é o de sempre (100 + 35, PIX 128,25)', async () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    fireEvent.click(caixa(NOME))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('radio', { name: 'Prata' }))
    fireEvent.click(screen.getByRole('button', { name: 'Incluir no conjunto' }))

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(caixa(/Levar junto: Pingente Estrela do Mar, Prata/)).toBeChecked()
    const rodape = screen.getByText('Total do conjunto').closest('div')!
    expect(texto(rodape)).toMatch(/R\$\s?135,00/)
    expect(texto(rodape)).toMatch(/R\$\s?128,25/)
    await waitFor(() => expect(caixa(/Levar junto/)).toHaveFocus())
  })

  it('Esc fecha, devolve o foco à caixa e, com a escolha incompleta, tira a marca', async () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    fireEvent.click(caixa(NOME))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(caixa(NOME)).not.toBeChecked()
    await waitFor(() => expect(caixa(NOME)).toHaveFocus())
    expect(screen.queryByText('Total do conjunto')).toBeNull()
  })

  it('Esc com a escolha completa fecha e mantém o adicional no conjunto', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    fireEvent.click(caixa(NOME))
    fireEvent.click(within(screen.getByRole('dialog')).getByRole('radio', { name: 'Prata' }))
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(caixa(/Levar junto/)).toBeChecked()
  })

  it('"Ver opções" abre a folha sem marcar, e o foco volta ao link ao fechar', async () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    const link = within(linhaDo('a1')).getByRole('button', { name: 'Ver opções' })
    link.focus()
    fireEvent.click(link)
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: NOME, hidden: true })).not.toBeChecked()
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(caixa(NOME)).not.toBeChecked()
    await waitFor(() =>
      expect(within(linhaDo('a1')).getByRole('button', { name: 'Ver opções' })).toHaveFocus(),
    )
  })

  it('pelo "Ver opções", escolher tudo habilita "Incluir no conjunto", que marca o adicional e fecha', async () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    fireEvent.click(within(linhaDo('a1')).getByRole('button', { name: 'Ver opções' }))
    const dialogo = screen.getByRole('dialog')
    expect(within(dialogo).getByRole('button', { name: 'Incluir no conjunto' })).toBeDisabled()
    fireEvent.click(within(dialogo).getByRole('radio', { name: 'Prata' }))
    const incluir = within(dialogo).getByRole('button', { name: 'Incluir no conjunto' })
    expect(incluir).toBeEnabled()
    fireEvent.click(incluir)

    expect(screen.queryByRole('dialog')).toBeNull()
    expect(caixa(/Levar junto: Pingente Estrela do Mar, Prata/)).toBeChecked()
    const rodape = screen.getByText('Total do conjunto').closest('div')!
    expect(texto(rodape)).toMatch(/R\$\s?135,00/)
    await waitFor(() =>
      expect(within(linhaDo('a1')).getByRole('button', { name: /opções/ })).toHaveFocus(),
    )
  })

  it('o diálogo do computador tem um fechar só, "Fechar", com 44 px e sem transição', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    fireEvent.click(caixa(NOME))
    const dialogo = screen.getByRole('dialog')
    expect(within(dialogo).queryByText('Close')).toBeNull()
    const fechar = within(dialogo).getAllByRole('button', { name: /fechar|close/i })
    expect(fechar).toHaveLength(1)
    expect(fechar[0]).toHaveAccessibleName('Fechar')
    expect(fechar[0].className).toMatch(/(?:^|\s)h-11(?![-\w])/)
    expect(fechar[0].className).toMatch(/(?:^|\s)w-11(?![-\w])/)
    expect(fechar[0].className).not.toMatch(/transition/)
    fireEvent.click(fechar[0])
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('peça sem nada a escolher marca sem abrir folha nenhuma', () => {
    ofertar([addon('a1', 0, 'ping')], [peca('ping', 'Pingente Liso', { price: 30 })])
    renderPage()
    fireEvent.click(caixa(/Levar junto: Pingente Liso/))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(caixa(/Levar junto: Pingente Liso/)).toBeChecked()
  })

  it('no celular a mesma escolha abre numa folha de baixo, com o mesmo painel e o mesmo rodapé', async () => {
    matchMedia(true)
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    fireEvent.click(caixa(NOME))
    const folha = screen.getByRole('dialog', { name: 'Pingente Estrela do Mar' })
    expect(folha.className).toMatch(/(?:^|\s)rounded-t-2xl(?![-\w])/)
    expect(within(folha).getByRole('heading', { name: 'Pingente Estrela do Mar' })).toHaveFocus()
    expect(within(folha).getByRole('button', { name: 'Fechar' })).toBeInTheDocument()
    expect(within(folha).getByRole('button', { name: 'Incluir no conjunto' })).toBeDisabled()
    fireEvent.click(within(folha).getByRole('radio', { name: 'Prata' }))
    fireEvent.click(within(folha).getByRole('button', { name: 'Incluir no conjunto' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    await waitFor(() => expect(caixa(NOME)).toHaveFocus())
  })
})

describe.each([['inline'], ['sheet'], ['formula']])('as regras de compra valem iguais na forma %s', forma_ => {

  it('a escolha completa soma 100 + 35 e o PIX do total, e a esgotada não se escolhe', () => {
    forma.value = forma_
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    fireEvent.click(caixa(NOME))
    const painel = within(forma_ === 'sheet' ? screen.getByRole('dialog') : linhaDo('a1'))
    expect(painel.getByRole('radio', { name: /Rosa/ })).toBeDisabled()
    fireEvent.click(painel.getByRole('radio', { name: 'Prata' }))
    const rodape = screen.getByText('Total do conjunto').closest('div')!
    expect(texto(rodape)).toMatch(/R\$\s?135,00/)
    expect(texto(rodape)).toMatch(/R\$\s?128,25/)
  })

  it('marcado e sem a variação escolhida, o total não conta o adicional e a falta é dita', () => {
    forma.value = forma_
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    fireEvent.click(caixa(NOME))
    expect(screen.getAllByText('Escolha o Cor da Pingente.').length).toBeGreaterThan(0)
    const rodape = screen.getByText('Total do conjunto').closest('div')!
    expect(texto(rodape)).toMatch(/R\$\s?100,00/)
  })

  it('o que vai à sacola é o mesmo: o principal e o adicional com a variação escolhida, quantidade 1', () => {
    forma.value = forma_
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    fireEvent.click(caixa(NOME))
    if (forma_ === 'sheet') {
      fireEvent.click(within(screen.getByRole('dialog')).getByRole('radio', { name: 'Prata' }))
      fireEvent.click(screen.getByRole('button', { name: 'Incluir no conjunto' }))
    } else {
      fireEvent.click(within(linhaDo('a1')).getByRole('radio', { name: 'Prata' }))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Levar o conjunto' }))
    const itens = useCartStore.getState().items
    expect(itens.map(i => [i.product.id, i.quantity, i.unitPrice])).toEqual([
      ['main', 1, 100],
      ['ping', 1, 35],
    ])
    expect(itens[1]).toMatchObject({ optionValues: { Cor: 'Prata' } })
  })

  it('o adicional sem a variação escolhida nunca vai à sacola', () => {
    forma.value = forma_
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    fireEvent.click(caixa(NOME))
    if (forma_ === 'sheet') {
      // A folha não deixa um adicional incompleto marcado: sair dela sem escolher tira a marca, e o
      // botão volta a levar só a joia.
      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })
      fireEvent.click(screen.getByRole('button', { name: 'Adicionar à sacola' }))
      expect(useCartStore.getState().items.map(i => i.product.id)).toEqual(['main'])
      return
    }
    fireEvent.click(screen.getByRole('button', { name: 'Levar o conjunto' }))
    expect(useCartStore.getState().items).toEqual([])
    expect(screen.getByText(/Falta uma escolha em 1 peça/)).toBeInTheDocument()
  })
})
