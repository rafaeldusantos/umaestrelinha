import { describe, expect, it, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import type { Product } from '@estrelinha/supabase/types'
import BuyTogetherBlock from '../buy-together/BuyTogetherBlock'
import type { BuyTogether, BuyTogetherAddon, BuyTogetherPiece } from '../../model/useBuyTogether'

/**
 * O desconto do Compre Junto desenhado pelo bloco: o "de/por" de cada peça, a frase do percentual, a
 * linha "Desconto do Compre Junto" e o total já descontado. O estado é escrito à mão (a conta é de
 * `core`, provada em `total.test.ts`); aqui se mede só o que a cliente lê.
 *
 * Os valores são literais, à mão: a corrente de 89,90 a 10% sai por 80,91; a joia de 120 mais ela dá
 * 200,91, com 8,99 a menos; e o PIX de 5% sobre 200,91 tira 10,05, ficando 190,86.
 */

vi.mock('@estrelinha/core/hooks/useBuyTogetherForm', () => ({ useBuyTogetherForm: () => 'inline' }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', async importOriginal => ({
  ...((await importOriginal()) as object),
  usePaymentSettings: () => ({
    max_installments: 6,
    min_installment_value: 10,
    pix_enabled: true,
    pix_discount_percent: 5,
  }),
}))

const produto = (id: string, name: string, price: number): Product =>
  ({
    id,
    name,
    slug: id,
    price,
    compare_price: null,
    image_url: '',
    images: [],
    options: [],
    variants: [],
    stock_policy: 'none',
    stock_total: 0,
    engraving_max_chars: null,
  }) as unknown as Product

const pecaDe = (p: Product): BuyTogetherPiece => ({
  product: p,
  grid: { options: [], variants: [], stock_policy: 'none' },
  simple: true,
})

const avulsa = (
  id: string,
  p: Product,
  discountPercent: number | null,
  over: Partial<BuyTogetherAddon> = {},
): BuyTogetherAddon => {
  const piece = pecaDe(p)
  return {
    id,
    kind: 'product',
    listId: null,
    name: p.name,
    pieces: [piece],
    marked: false,
    open: false,
    piece,
    selected: {},
    variant: null,
    price: p.price,
    fromPrice: p.price,
    photo: null,
    summaryParts: [],
    missing: null,
    engraving: '',
    engravingEnabled: false,
    engravingLimit: 0,
    engravingRefusal: null,
    ready: false,
    discountPercent,
    ...over,
  }
}

const lista = (id: string, pieces: Product[], discountPercent: number | null): BuyTogetherAddon => ({
  ...avulsa(id, pieces[0], discountPercent),
  kind: 'list',
  listId: 'L1',
  name: 'Correntes',
  pieces: pieces.map(pecaDe),
  piece: null,
  price: null,
  open: true,
  missing: 'Escolha a peça.',
})

const estado = (addons: BuyTogetherAddon[], over: Partial<BuyTogether> = {}): BuyTogether => ({
  display: 'ready',
  addons,
  markedCount: addons.filter(a => a.marked).length,
  total: null,
  discount: 0,
  canTake: true,
  firstIncompleteId: null,
  incompleteCount: 0,
  taken: [],
  toggle: vi.fn(),
  toggleOpen: vi.fn(),
  choosePiece: vi.fn(),
  selectOptions: vi.fn(),
  setEngraving: vi.fn(),
  ...over,
})

const linhaDo = (id: string) => document.querySelector<HTMLElement>(`[data-addon-id="${id}"]`)!
const texto = (el: Element | null) => (el?.textContent ?? '').replace(/\s+/g, ' ')
/** Token exato de classe. */
const temClasse = (el: Element, token: string) =>
  new RegExp(`(?:^|\\s)${token}(?![-\\w])`).test(el.getAttribute('class') ?? '')

const corrente = () => produto('cor', 'Corrente Veneziana', 89.9)
const estojo = () => produto('est', 'Estojo de Veludo', 30)

const NOTA =
  'O botão de compra leva a joia e as peças marcadas. Cada uma entra na sacola como uma linha própria, e você pode tirar qualquer uma depois.'

describe('a linha do adicional com desconto', () => {
  it('mostra o preço de hoje riscado, o preço levando junto e a frase do percentual', () => {
    render(<BuyTogetherBlock state={estado([avulsa('a1', corrente(), 10)])} />)
    const linha = linhaDo('a1')
    const riscado = within(linha).getByText(/^R\$\s89,90$/)
    expect(temClasse(riscado, 'line-through')).toBe(true)
    expect(texto(linha)).toMatch(/R\$\s80,91/)
    expect(within(linha).getByText('10% a menos levando junto')).toBeInTheDocument()
  })

  it('o leitor de tela lê "de … por …", e o par visível fica fora da leitura', () => {
    render(<BuyTogetherBlock state={estado([avulsa('a1', corrente(), 10)])} />)
    const linha = linhaDo('a1')
    const lido = within(linha).getByText(/^de R\$\s89,90 por R\$\s80,91$/)
    expect(temClasse(lido, 'sr-only')).toBe(true)
    const riscado = within(linha).getByText(/^R\$\s89,90$/)
    expect(riscado.closest('[aria-hidden="true"]')).not.toBeNull()
  })

  it('o texto do leitor de tela tem ancestral posicionado, para não empurrar a faixa', () => {
    render(<BuyTogetherBlock state={estado([avulsa('a1', corrente(), 10)])} />)
    const lido = within(linhaDo('a1')).getByText(/^de R\$\s89,90 por R\$\s80,91$/)
    expect(temClasse(lido.parentElement!, 'relative')).toBe(true)
  })

  it('o nome acessível da caixa termina com o percentual', () => {
    render(
      <BuyTogetherBlock
        state={estado([avulsa('a1', corrente(), 10, { summaryParts: ['Ouro'] })])}
      />,
    )
    expect(
      screen.getByRole('checkbox', {
        name: 'Levar junto: Corrente Veneziana, Ouro, 10% a menos levando junto',
      }),
    ).toBeInTheDocument()
  })

  it('a peça sem desconto mostra só o preço, sem riscado, sem frase e sem percentual no nome', () => {
    render(<BuyTogetherBlock state={estado([avulsa('a1', estojo(), null)])} />)
    const linha = linhaDo('a1')
    expect(texto(linha)).toMatch(/R\$\s30,00/)
    expect(linha.querySelector('.line-through')).toBeNull()
    expect(within(linha).queryByText(/a menos levando junto/)).toBeNull()
    expect(within(linha).queryByText(/^de R\$/)).toBeNull()
    expect(screen.getByRole('checkbox', { name: 'Levar junto: Estojo de Veludo' })).toBeInTheDocument()
  })
})

describe('as peças de uma lista com desconto', () => {
  it('cada cartão da escolha mostra "de/por", sem a frase do percentual', () => {
    const fina = produto('fina', 'Corrente Fina', 40)
    const grossa = produto('grossa', 'Corrente Grossa', 60)
    render(<BuyTogetherBlock state={estado([lista('a1', [fina, grossa], 10)])} />)
    const cartaoFina = screen.getByRole('radio', { name: /Corrente Fina/ })
    const cartaoGrossa = screen.getByRole('radio', { name: /Corrente Grossa/ })
    expect(within(cartaoFina).getByText(/^de R\$\s40,00 por R\$\s36,00$/)).toBeInTheDocument()
    expect(within(cartaoGrossa).getByText(/^de R\$\s60,00 por R\$\s54,00$/)).toBeInTheDocument()
    expect(temClasse(within(cartaoGrossa).getByText(/^R\$\s60,00$/), 'line-through')).toBe(true)
    expect(within(cartaoFina).queryByText(/a menos levando junto/)).toBeNull()
  })

  it('numa lista sem desconto, o cartão segue como hoje: só a foto e o nome, sem preço', () => {
    const fina = produto('fina', 'Corrente Fina', 40)
    render(<BuyTogetherBlock state={estado([lista('a1', [fina], null)])} />)
    const cartao = screen.getByRole('radio', { name: /Corrente Fina/ })
    expect(cartao.querySelector('.line-through')).toBeNull()
    expect(texto(cartao)).not.toContain('R$')
  })
})

describe('o total do conjunto com desconto', () => {
  it('com a peça com desconto marcada: a linha do desconto, o total descontado, o PIX sobre ele e a frase', () => {
    render(
      <BuyTogetherBlock
        state={estado([avulsa('a1', corrente(), 10, { marked: true, ready: true })], {
          total: 200.91,
          discount: 8.99,
        })}
      />,
    )
    const rotulo = screen.getByText('Desconto do Compre Junto')
    expect(texto(rotulo.parentElement)).toMatch(/−R\$\s8,99/)
    const totalRotulo = screen.getByText('Total do conjunto')
    // A linha do desconto vem ACIMA do total.
    expect(rotulo.compareDocumentPosition(totalRotulo) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(texto(totalRotulo.parentElement)).toMatch(/R\$\s200,91/)
    expect(texto(totalRotulo.closest('div'))).toMatch(/R\$\s190,86/)
    expect(
      screen.getByText(`${NOTA} O desconto vale enquanto a joia estiver no mesmo pedido.`),
    ).toBeInTheDocument()
  })

  it('só peça sem desconto marcada: o total sem a linha do desconto e sem a frase', () => {
    render(
      <BuyTogetherBlock
        state={estado([avulsa('a1', estojo(), null, { marked: true, ready: true })], {
          total: 150,
          discount: 0,
        })}
      />,
    )
    expect(screen.queryByText('Desconto do Compre Junto')).toBeNull()
    expect(screen.getByText(NOTA)).toBeInTheDocument()
    expect(screen.queryByText(/O desconto vale enquanto a joia/)).toBeNull()
    expect(texto(screen.getByText('Total do conjunto').parentElement)).toMatch(/R\$\s150,00/)
  })
})
