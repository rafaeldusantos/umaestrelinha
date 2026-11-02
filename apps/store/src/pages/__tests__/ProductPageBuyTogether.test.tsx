import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import type { OptionValues, Product, ProductVariant } from '@estrelinha/supabase/types'

/**
 * O bloco Compre Junto, medido pela `ProductPage` REAL — a página, o `ProductInfo`, o estado e o
 * bloco de verdade. Só a fronteira de dados é dublada: a configuração e os produtos dos adicionais
 * (`useBuyTogetherData`, testado à parte contra o client) e as demais leituras da página.
 *
 * Os valores esperados são LITERAIS, calculados à mão: 100 + 35 = 135, e 5% de PIX sobre 135 é
 * 135 − 6,75 = 128,25.
 */

const { useProductMock, dados, trackSpy, lidoPor } = vi.hoisted(() => ({
  useProductMock: vi.fn(),
  lidoPor: [] as unknown[],
  dados: { value: { status: 'off', addons: [], lists: [], products: [] } as Record<string, unknown> },
  trackSpy: vi.fn(),
}))

vi.mock('sonner', () => ({ toast: { custom: vi.fn(), error: vi.fn(), success: vi.fn() } }))
vi.mock('@/entities/product/api/useProduct', () => ({ useProduct: useProductMock }))
vi.mock('@/entities/product/api/useProducts', () => ({ useProducts: () => ({ data: [] }) }))
vi.mock('@/entities/product/api/useProductFaqs', () => ({ useProductFaqs: () => ({ data: [] }) }))
vi.mock('@/entities/product/api/useBuyTogetherData', () => ({
  useBuyTogetherData: (slug: unknown) => (lidoPor.push(slug), dados.value),
}))
// A forma do bloco é lida de `store_settings` (testada nas páginas de forma); aqui vale a padrão.
vi.mock('@estrelinha/core/hooks/useBuyTogetherForm', () => ({ useBuyTogetherForm: () => 'inline' }))
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
const tentarLevar = () => fireEvent.click(screen.getByRole('button', { name: 'Levar o conjunto' }))
/** Token exato de classe: `rounded-md` não casa `rounded-md-x`, e `h-6` não casa `min-h-6`. */
const temClasse = (el: Element, token: string) =>
  new RegExp(`(?:^|\\s)${token.replace(/[[\]().]/g, '\\$&')}(?![-\\w])`).test(el.getAttribute('class') ?? '')

beforeEach(() => {
  seq = 0
  trackSpy.mockReset()
  dados.value = { status: 'off', addons: [], lists: [], products: [] }
})
afterEach(() => {
  for (const l of Array.from(document.head.querySelectorAll('link[rel="canonical"]'))) l.remove()
})

describe('Compre Junto na página — o que aparece e como abre', () => {
  it('abre com o título e a frase, e com nada marcado: sem total e sem o rodapé', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()

    expect(screen.getByRole('heading', { name: 'Compre junto' })).toBeInTheDocument()
    expect(
      screen.getByText('Peças que eu escolhi para acompanhar esta joia. Marque as que quiser levar.'),
    ).toBeInTheDocument()
    expect(caixa(/Levar junto: Pingente Estrela do Mar/)).not.toBeChecked()
    expect(screen.queryByText('Total do conjunto')).toBeNull()
    expect(screen.queryByText(/O botão de compra leva a joia e as peças marcadas/)).toBeNull()
  })

  it('fica entre a gravação do principal e a linha de estoque', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    const bloco = screen.getByRole('heading', { name: 'Compre junto' })
    const estoque = screen.getByText('Em estoque')
    expect(bloco.compareDocumentPosition(estoque) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('sem adicional disponível o bloco inteiro some e a página continua de pé', () => {
    ofertar([addon('a1', 0, 'ausente')], [])
    renderPage()
    expect(screen.queryByRole('heading', { name: 'Compre junto' })).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: 'Pulseira Afeto' })).toBeInTheDocument()
  })

  it('leitura que falhou: sem bloco, e a página segue de pé', () => {
    dados.value = { status: 'error', addons: [], lists: [], products: [] }
    renderPage()
    expect(screen.queryByRole('heading', { name: 'Compre junto' })).toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: 'Pulseira Afeto' })).toBeInTheDocument()
  })

  it('o Compre Junto é lido pelo slug da URL, sem esperar o produto chegar', () => {
    lidoPor.length = 0
    useProductMock.mockReturnValue({ data: undefined, isFetching: true })
    render(
      <MemoryRouter initialEntries={['/produtos/main']}>
        <Routes>
          <Route path="/produtos/:slug" element={<ProductPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(lidoPor).toContain('main')
  })

  it('enquanto o Compre Junto não respondeu, a página segura a coluna, e a solta quando ele responde', () => {
    dados.value = { status: 'loading', addons: [], lists: [], products: [] }
    const { container, rerender } = renderPage()
    expect(screen.queryByRole('heading', { level: 1, name: 'Pulseira Afeto' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Adicionar à sacola' })).toBeNull()
    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()

    ofertar([addon('a1', 0, 'ping')], [pingente()])
    rerender(
      <MemoryRouter initialEntries={['/produtos/main']}>
        <Routes>
          <Route path="/produtos/:slug" element={<ProductPage />} />
        </Routes>
      </MemoryRouter>,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Pulseira Afeto' })).toBeInTheDocument()
    // O bloco já chega no tamanho real: nenhum esqueleto ocupando a coluna.
    expect(screen.getByRole('heading', { name: 'Compre junto' })).toBeInTheDocument()
    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
  })

  it.each([
    ['falha', 'error'],
    ['volta vazio', 'off'],
  ])('o Compre Junto que %s não segura a página', (_, status) => {
    dados.value = { status, addons: [], lists: [], products: [] }
    const { container } = renderPage()
    expect(screen.getByRole('heading', { level: 1, name: 'Pulseira Afeto' })).toBeInTheDocument()
    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
  })

  it('sem adicional configurado não há esqueleto nem bloco', () => {
    dados.value = { status: 'off', addons: [], lists: [], products: [] }
    const { container } = renderPage()
    expect(container.querySelector('[aria-busy="true"]')).toBeNull()
  })

  it('principal esgotado: o bloco não é desenhado', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage(principal({ stock_total: 0 }))
    expect(screen.queryByRole('heading', { name: 'Compre junto' })).toBeNull()
  })

  it('principal com grade toda esgotada: o bloco não é desenhado', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage(
      principal({
        options: [{ name: 'Cor', values: ['Ouro', 'Prata'], position: 0 }],
        variants: [variante({ Cor: 'Ouro' }, 100, { stock: 0 }), variante({ Cor: 'Prata' }, 100, { stock: 0 })],
      }),
    )
    expect(screen.queryByRole('heading', { name: 'Compre junto' })).toBeNull()
  })

  it('principal com combinação indisponível: o bloco continua visível', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    const boa = variante({ Cor: 'Ouro' }, 100)
    const esgotada = variante({ Cor: 'Prata' }, 100, { stock: 0 })
    const m = principal({
      options: [{ name: 'Cor', values: ['Ouro', 'Prata'], position: 0 }],
      variants: [boa, esgotada],
    })
    // A cliente chega por um link que aponta para a linha sem estoque.
    renderPage(m, `?variant=${esgotada.id}`)
    expect(screen.getByText('Essa combinação está indisponível no momento.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Compre junto' })).toBeInTheDocument()
  })
})

describe('Compre Junto na página — marcar, escolher e o total', () => {
  it('marcar abre as escolhas; a frase do que falta só vem depois de tentar levar o conjunto', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    fireEvent.click(caixa(/Levar junto: Pingente/))
    expect(caixa(/Levar junto: Pingente/)).toBeChecked()
    const linha = within(linhaDo('a1'))
    expect(linha.getByRole('radiogroup')).toBeInTheDocument()
    expect(linha.queryByText('Escolha o cor da pingente.')).toBeNull()
    tentarLevar()
    expect(linha.getByText('Escolha o cor da pingente.')).toBeInTheDocument()
  })

  it('o total e o PIX do conjunto acompanham a escolha: 100 + 35, PIX 128,25', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    fireEvent.click(caixa(/Levar junto: Pingente/))
    fireEvent.click(within(linhaDo('a1')).getByRole('radio', { name: 'Prata' }))

    const rodape = screen.getByText('Total do conjunto').closest('div')!
    expect(texto(rodape)).toMatch(/R\$\s?135,00/)
    expect(texto(rodape)).toMatch(/R\$\s?128,25/)
    expect(texto(rodape)).toContain('no Pix')
    expect(texto(rodape)).not.toContain('com Pix')
    expect(
      screen.getByText(
        'O botão de compra leva a joia e as peças marcadas. Cada uma entra na sacola como uma linha própria, e você pode tirar qualquer uma depois.',
      ),
    ).toBeInTheDocument()
    // O nome acessível passa a trazer a escolha, e a falta some.
    expect(caixa(/Levar junto: Pingente Estrela do Mar, Prata/)).toBeChecked()
    expect(within(linhaDo('a1')).queryByRole('status')).toBeNull()
    // O preço da linha é o da variação escolhida, nunca o "a partir de".
    expect(texto(linhaDo('a1'))).toMatch(/R\$\s?35,00/)
    expect(texto(linhaDo('a1'))).not.toContain('a partir de')
  })

  it('a quantidade do principal que a página mostra entra no total; o adicional conta uma vez', () => {
    ofertar([addon('a1', 0, 'simples')], [peca('simples', 'Corrente Fina', { price: 30 })])
    renderPage()
    fireEvent.click(caixa(/Levar junto: Corrente Fina/))
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar quantidade' }))
    fireEvent.click(screen.getByRole('button', { name: 'Aumentar quantidade' }))
    // 100 × 3 + 30 = 330; PIX 330 − 16,50 = 313,50.
    const rodape = screen.getByText('Total do conjunto').closest('div')!
    expect(texto(rodape)).toMatch(/R\$\s?330,00/)
    expect(texto(rodape)).toMatch(/R\$\s?313,50/)
  })

  it('desmarcar tira o adicional da conta e some o rodapé', () => {
    ofertar([addon('a1', 0, 'simples')], [peca('simples', 'Corrente Fina', { price: 30 })])
    renderPage()
    fireEvent.click(caixa(/Corrente Fina/))
    expect(screen.getByText('Total do conjunto')).toBeInTheDocument()
    fireEvent.click(caixa(/Corrente Fina/))
    expect(screen.queryByText('Total do conjunto')).toBeNull()
  })

  it('variação esgotada aparece desabilitada e não pode ser escolhida', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    fireEvent.click(caixa(/Levar junto: Pingente/))
    const rosa = within(linhaDo('a1')).getByRole('radio', { name: 'Rosa' })
    expect(rosa).toBeDisabled()
    fireEvent.click(rosa)
    tentarLevar()
    expect(within(linhaDo('a1')).getByText('Escolha o cor da pingente.')).toBeInTheDocument()
  })

  it('eixo com uma única opção vendável já nasce escolhido', () => {
    const p = peca('ping', 'Pingente Lua', {
      options: [{ name: 'Cor', values: ['Ouro', 'Prata'], position: 0 }],
      variants: [variante({ Cor: 'Ouro' }, 25), variante({ Cor: 'Prata' }, 35, { stock: 0 })],
    })
    ofertar([addon('a1', 0, 'ping')], [p])
    renderPage()
    expect(caixa(/Levar junto: Pingente Lua, Ouro/)).toBeInTheDocument()
    fireEvent.click(caixa(/Pingente Lua/))
    expect(within(linhaDo('a1')).queryByRole('status')).toBeNull()
    expect(screen.getByText('Total do conjunto').closest('div')!.textContent).toMatch(/R\$\s?125,00/)
  })

  it('nomes longos quebram linha dentro do bloco, sem largura fixa', () => {
    const nome = 'Pingente Coração de Cristal Lapidado com Banho de Ouro Rosé e Corrente Veneziana'
    ofertar([addon('a1', 0, 'longo')], [peca('longo', nome, { price: 30 })])
    renderPage()
    const titulo = within(linhaDo('a1')).getByText(nome)
    expect(titulo.className).toContain('break-words')
    expect(screen.getByRole('heading', { name: 'Compre junto' }).closest('section')!.querySelector('ul')!.className)
      .toContain('grid-cols-[minmax(0,1fr)]')
  })
})

describe('Compre Junto na página — listas', () => {
  const lista = {
    id: 'L1',
    name: 'Correntes',
    items: [
      { productId: 'c2', position: 1, variantIds: [] },
      { productId: 'main', position: 0, variantIds: [] },
      { productId: 'c1', position: 2, variantIds: [] },
      { productId: 'c0', position: 3, variantIds: [] },
    ],
  }
  const correntes = [
    peca('c1', 'Corrente Veneziana', { price: 50 }),
    peca('c2', 'Corrente Elo Português', { price: 60 }),
    peca('c0', 'Corrente Esgotada', { price: 70, stock_total: 0 }),
  ]
  const umaLista = () =>
    ofertar([{ ...addon('a1', 0, 'x'), kind: 'list', targetProductId: null, listId: 'L1' }], correntes, {
      lists: [lista],
    })

  it('mostra o nome da lista, as peças na ordem da dona e pula o principal e a esgotada', () => {
    umaLista()
    renderPage()
    expect(caixa(/Levar junto: Correntes/)).toBeInTheDocument()
    fireEvent.click(caixa(/Correntes/))
    const grupo = within(linhaDo('a1')).getByRole('radiogroup')
    const nomes = within(grupo).getAllByRole('radio').map(r => r.textContent)
    expect(nomes).toEqual(['Corrente Elo Português', 'Corrente Veneziana'])
    expect(screen.getByText(/Escolha a peça · 2 modelos/)).toBeInTheDocument()
  })

  it('exige escolher uma peça; a escolha vira o resumo e entra no total', () => {
    umaLista()
    renderPage()
    fireEvent.click(caixa(/Correntes/))
    tentarLevar()
    expect(within(linhaDo('a1')).getByText('Escolha a peça.')).toBeInTheDocument()
    fireEvent.click(within(linhaDo('a1')).getByRole('radio', { name: 'Corrente Veneziana' }))
    expect(caixa(/Levar junto: Correntes, Corrente Veneziana/)).toBeChecked()
    expect(screen.getByText('Total do conjunto').closest('div')!.textContent).toMatch(/R\$\s?150,00/)
  })

  it('a primeira peça é a que recebe o foco do teclado, sem vir escolhida; as setas movem a escolha', () => {
    umaLista()
    renderPage()
    fireEvent.click(caixa(/Correntes/))
    const [primeira, segunda] = within(linhaDo('a1')).getAllByRole('radio')
    expect(primeira).toHaveAttribute('tabindex', '0')
    expect(segunda).toHaveAttribute('tabindex', '-1')
    expect(primeira).toHaveAttribute('aria-checked', 'false')
    fireEvent.keyDown(primeira, { key: 'ArrowRight' })
    expect(segunda).toHaveAttribute('aria-checked', 'true')
  })
})

describe('Compre Junto na página — a variação do principal', () => {
  it('o adicional escondido naquela variação some e perde a marca; o outro mantém a escolha', () => {
    const colar = variante({ Tipo: 'Colar' }, 100)
    const chaveiro = variante({ Tipo: 'Chaveiro' }, 100)
    const m = principal({
      options: [{ name: 'Tipo', values: ['Colar', 'Chaveiro'], position: 0 }],
      variants: [colar, chaveiro],
    })
    ofertar(
      [
        addon('a1', 0, 'ping', { hiddenOnVariantIds: [chaveiro.id] }),
        addon('a2', 1, 'simples'),
      ],
      [pingente(), peca('simples', 'Corrente Fina', { price: 30 })],
    )
    renderPage(m)

    fireEvent.click(caixa(/Pingente/))
    fireEvent.click(caixa(/Corrente Fina/))
    expect(screen.getByText('Total do conjunto')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('radio', { name: 'Chaveiro' }))
    expect(screen.queryByRole('checkbox', { name: /Pingente/ })).toBeNull()
    expect(caixa(/Corrente Fina/)).toBeChecked()

    // Voltar à variação que o mostra: ele volta sem a marca de antes.
    fireEvent.click(screen.getByRole('radio', { name: 'Colar' }))
    expect(caixa(/Pingente/)).not.toBeChecked()
  })
})

describe('Compre Junto na página — gravação do adicional', () => {
  const gravavel = () =>
    peca('grav', 'Pingente Gravado', {
      engraving_max_chars: 8,
      options: [{ name: 'Com gravação', values: ['Sim', 'Não'], position: 0 }],
      variants: [variante({ 'Com gravação': 'Sim' }, 45), variante({ 'Com gravação': 'Não' }, 30)],
    })

  it('só pede o texto quando a variação escolhida grava, com o limite e o contador da peça', () => {
    ofertar([addon('a1', 0, 'grav')], [gravavel()])
    renderPage()
    fireEvent.click(caixa(/Pingente Gravado/))
    const linha = within(linhaDo('a1'))
    expect(linha.queryByLabelText('O que gravar')).toBeNull()

    fireEvent.click(linha.getByRole('radio', { name: 'Sim' }))
    const campo = linha.getByLabelText('O que gravar')
    expect(linha.getByText('0 / 8')).toBeInTheDocument()
    expect(linha.getByText('Opcional. Deixe em branco se preferir a peça sem gravação.')).toBeInTheDocument()

    fireEvent.change(campo, { target: { value: 'Maria Clara' } })
    expect(linha.getByText('Cabem até 8 caracteres nesta peça. Tire 3 para continuar.')).toBeInTheDocument()

    fireEvent.change(campo, { target: { value: '  Ana  ' } })
    expect(linha.getByText('3 / 8')).toBeInTheDocument()
    expect(linha.queryByText(/Cabem até/)).toBeNull()
  })

  it('trocar para a variação que não grava apaga o texto', () => {
    ofertar([addon('a1', 0, 'grav')], [gravavel()])
    renderPage()
    fireEvent.click(caixa(/Pingente Gravado/))
    const linha = within(linhaDo('a1'))
    fireEvent.click(linha.getByRole('radio', { name: 'Sim' }))
    fireEvent.change(linha.getByLabelText('O que gravar'), { target: { value: 'Ana' } })
    fireEvent.click(linha.getByRole('radio', { name: 'Não' }))
    fireEvent.click(linha.getByRole('radio', { name: 'Sim' }))
    expect((linha.getByLabelText('O que gravar') as HTMLInputElement).value).toBe('')
  })

  it('cada adicional tem o seu campo, com id próprio', () => {
    ofertar([addon('a1', 0, 'grav'), addon('a2', 1, 'grav2')], [gravavel(), { ...gravavel(), id: 'grav2', name: 'Anel Gravado' }])
    renderPage()
    fireEvent.click(caixa(/Pingente Gravado/))
    fireEvent.click(caixa(/Anel Gravado/))
    fireEvent.click(within(linhaDo('a1')).getByRole('radio', { name: 'Sim' }))
    fireEvent.click(within(linhaDo('a2')).getByRole('radio', { name: 'Sim' }))
    const ids = screen.getAllByLabelText('O que gravar').map(i => i.id)
    expect(new Set(ids).size).toBe(2)
  })
})

describe('Compre Junto na página — medição', () => {
  const eventos = (nome: string) =>
    trackSpy.mock.calls.map(c => c[0] as { name: string; params: Record<string, unknown> }).filter(e => e.name === nome)

  it('ver o bloco gera uma view_item_list própria, uma vez, mesmo com re-render', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    fireEvent.click(caixa(/Pingente/))
    fireEvent.click(within(linhaDo('a1')).getByRole('radio', { name: 'Ouro' }))
    const vistas = eventos('view_item_list')
    expect(vistas).toHaveLength(1)
    expect(vistas[0].params.item_list_id).toBe('compre-junto')
    expect(vistas[0].params.item_list_name).toBe('Compre Junto')
    expect((vistas[0].params.items as { item_id: string }[]).map(i => i.item_id)).toEqual(['ping'])
  })

  it('escolher o adicional gera select_item com a lista do Compre Junto, e desmarcar e remarcar não repete', () => {
    ofertar([addon('a1', 0, 'ping'), addon('a2', 1, 'simples')], [pingente(), peca('simples', 'Corrente Fina')])
    renderPage()
    expect(eventos('select_item')).toHaveLength(0)
    fireEvent.click(caixa(/Corrente Fina/))
    fireEvent.click(caixa(/Corrente Fina/))
    fireEvent.click(caixa(/Corrente Fina/))
    const sel = eventos('select_item')
    expect(sel).toHaveLength(1)
    expect(sel[0].params.item_list_id).toBe('compre-junto')
    expect((sel[0].params.items as { item_id: string; index: number }[])[0]).toMatchObject({
      item_id: 'simples',
      index: 1,
    })
    fireEvent.click(caixa(/Pingente/))
    expect(eventos('select_item')).toHaveLength(2)
  })

  it('sem bloco não há view_item_list do Compre Junto', () => {
    renderPage()
    expect(eventos('view_item_list')).toHaveLength(0)
  })
})

describe('Compre Junto na página — o desenho da forma "Na linha"', () => {
  it('a frase do que falta aparece junto da linha só depois de tentar levar, e some ao completar', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    fireEvent.click(caixa(/Levar junto: Pingente/))
    expect(within(linhaDo('a1')).queryByRole('status')).toBeNull()

    tentarLevar()
    const frase = within(linhaDo('a1')).getByRole('status')
    expect(frase).toHaveTextContent('Escolha o cor da pingente.')
    // Entre a linha e as escolhas: antes do grupo de cor.
    const grupo = within(linhaDo('a1')).getByRole('radiogroup')
    expect(frase.compareDocumentPosition(grupo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(temClasse(frase, 'text-estrelinha-alert')).toBe(true)

    fireEvent.click(within(linhaDo('a1')).getByRole('radio', { name: 'Prata' }))
    expect(within(linhaDo('a1')).queryByRole('status')).toBeNull()
    expect(within(linhaDo('a1')).queryByText('Escolha o cor da pingente.')).toBeNull()
  })

  it('o link "Ver opções" some com a linha marcada e volta ao desmarcar', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    const linha = within(linhaDo('a1'))
    expect(linha.getByRole('button', { name: 'Ver opções' })).toBeInTheDocument()
    fireEvent.click(caixa(/Levar junto: Pingente/))
    expect(linha.queryByRole('button', { name: /opções/ })).toBeNull()
    fireEvent.click(caixa(/Levar junto: Pingente/))
    expect(linha.getByRole('button', { name: /opções/ })).toBeInTheDocument()
  })

  it('o link "Ver os N modelos" da lista também some com a linha marcada', () => {
    ofertar(
      [{ ...addon('a1', 0, 'x'), kind: 'list', targetProductId: null, listId: 'L1' }],
      [peca('c1', 'Corrente Veneziana', { price: 50 }), peca('c2', 'Corrente Elo', { price: 60 })],
      {
        lists: [
          {
            id: 'L1',
            name: 'Correntes',
            items: [
              { productId: 'c1', position: 0, variantIds: [] },
              { productId: 'c2', position: 1, variantIds: [] },
            ],
          },
        ],
      },
    )
    renderPage()
    expect(within(linhaDo('a1')).getByRole('button', { name: 'Ver os 2 modelos' })).toBeInTheDocument()
    fireEvent.click(caixa(/Correntes/))
    expect(within(linhaDo('a1')).queryByRole('button', { name: /modelos|opções/ })).toBeNull()
  })

  it('o preço da linha, antes da escolha, é o da peça em foco, sem "a partir de"', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    // A peça custa 20; as variações vão de 25 a 40 — o mínimo delas não é o que a linha mostra.
    expect(texto(linhaDo('a1'))).not.toContain('a partir de')
    expect(texto(linhaDo('a1'))).toMatch(/R\$\s?20,00/)
    expect(texto(linhaDo('a1'))).not.toMatch(/R\$\s?25,00/)
  })

  it('o preço da linha fica abaixo do nome', () => {
    ofertar([addon('a1', 0, 'ping')], [pingente()])
    renderPage()
    const nome = within(linhaDo('a1')).getByText('Pingente Estrela do Mar')
    const preco = within(linhaDo('a1')).getByText(/R\$\s?20,00/)
    expect(nome.compareDocumentPosition(preco) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(nome.parentElement!.contains(preco)).toBe(true)
  })

  it('o rodapé diz "no Pix" e a região viva anuncia o mesmo', () => {
    ofertar([addon('a1', 0, 'simples')], [peca('simples', 'Corrente Fina', { price: 30 })])
    renderPage()
    fireEvent.click(caixa(/Corrente Fina/))
    const rodape = screen.getByText('Total do conjunto').closest('div')!
    expect(texto(rodape)).toMatch(/R\$\s?123,50\s?no Pix/)
    expect(texto(rodape)).not.toContain('com Pix')
    const bloco = screen.getByRole('heading', { name: 'Compre junto' }).closest('section')!
    const regiao = Array.from(bloco.querySelectorAll('[role="status"]')).find(el =>
      /Total do conjunto/.test(el.textContent ?? ''),
    )!
    expect(texto(regiao as HTMLElement)).toMatch(/^Total do conjunto: R\$\s?130,00, R\$\s?123,50 no Pix$/)
  })

  it('forma do desenho: superfície com borda e raio, linhas sem cartão, caixa própria em célula de 44px, foto 64×80, rodapé sem caixa areia', () => {
    ofertar([addon('a1', 0, 'ping'), addon('a2', 1, 'simples')], [pingente(), peca('simples', 'Corrente Fina', { price: 30 })])
    renderPage()
    const bloco = screen.getByRole('heading', { name: 'Compre junto' }).closest('section')!
    for (const t of ['bg-estrelinha-surface', 'border', 'border-estrelinha-line', 'rounded-lg']) {
      expect(temClasse(bloco, t), t).toBe(true)
    }
    expect(temClasse(bloco, 'border-t')).toBe(false)

    for (const id of ['a1', 'a2']) {
      const linha = linhaDo(id)
      expect(temClasse(linha, 'rounded-md')).toBe(false)
      expect(temClasse(linha, 'bg-white')).toBe(false)
      expect(temClasse(linha, 'border-t'), 'fio entre as linhas').toBe(true)
    }

    const marcar = caixa(/Corrente Fina/)
    for (const t of ['appearance-none', 'h-6', 'w-6', 'border-2', 'border-estrelinha-field', 'rounded-sm']) {
      expect(temClasse(marcar, t), t).toBe(true)
    }
    const celula = marcar.parentElement!
    expect(temClasse(celula, 'h-11') && temClasse(celula, 'w-11')).toBe(true)

    const foto = linhaDo('a2').querySelector('[data-addon-foto] > span')!
    expect(temClasse(foto, 'h-20') && temClasse(foto, 'w-16') && temClasse(foto, 'rounded-md')).toBe(true)

    fireEvent.click(marcar)
    const rodape = screen.getByText('Total do conjunto').closest('div')!
    expect(temClasse(rodape, 'bg-estrelinha-ground-deep')).toBe(false)
    expect(temClasse(rodape, 'border-t')).toBe(true)
  })
})
