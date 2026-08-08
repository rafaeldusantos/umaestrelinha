import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import VariantsTable from './VariantsTable'
import type { ProductOption, ProductVariant } from '@nanapin/supabase/types'

// PFM-08 (P1.3 AC 7-13) e PFM-15: colunas do artboard, agrupamento pelo 1º eixo com subtotal, linha
// ativa sem preço em erro, rodapé com faixa ignorando pausadas, pausar sem apagar, e exclusão
// recusada para variação já vendida (AC 9a — a FK de `order_items` é `NO ACTION`).

const options: ProductOption[] = [
  { name: 'Tamanho', values: ['3,5 cm', '4,5 cm', '5,5 cm'], position: 0 },
  { name: 'Acabamento', values: ['Fosco', 'Brilhante'], position: 1 },
]

let seq = 0
const variant = (over: Partial<ProductVariant> = {}): ProductVariant => ({
  id: `v${++seq}`,
  product_id: 'p1',
  option_values: { Tamanho: '4,5 cm', Acabamento: 'Fosco' },
  name: null,
  sku: null,
  price: 5.9,
  compare_price: null,
  stock: 10,
  weight_kg: null,
  image_url: null,
  is_active: true,
  position: 0,
  ...over,
})

/** A grade completa do desenho: 3 tamanhos × 2 acabamentos = 6 linhas, em 3 grupos. */
const fullGrid = (): ProductVariant[] =>
  ['3,5 cm', '4,5 cm', '5,5 cm'].flatMap((tamanho, t) =>
    ['Fosco', 'Brilhante'].map((acabamento, a) =>
      variant({
        id: `v-${t}-${a}`,
        option_values: { Tamanho: tamanho, Acabamento: acabamento },
        price: 5.9 + t,
        stock: 5,
      }),
    ),
  )

const noOrders = vi.fn(async () => ({ orders: 0 }))

/**
 * O separador que `Intl.NumberFormat('pt-BR')` poe entre `R$` e o numero e ESPACO
 * NAO-QUEBRAVEL (U+00A0), nao espaco comum.
 *
 * Ele entra aqui por CODIGO de caractere, nao como literal: o `no-irregular-whitespace` do eslint
 * recusa o literal — com razao, espaco invisivel diferente no meio do codigo e fonte de bug
 * silencioso — e um formatador no caminho reescrevia o escape de volta para o caractere.
 */
const NBSP = String.fromCharCode(160)

/** Normaliza o separador para a expectativa ficar legivel. O valor segue comparado por igualdade. */
const text = (testId: string) =>
  screen.getByTestId(testId).textContent!.split(NBSP).join(' ')

const renderTable = (over: Partial<React.ComponentProps<typeof VariantsTable>> = {}) => {
  const onChange = vi.fn()
  const props = {
    variants: fullGrid(),
    options,
    stockPolicy: 'track' as const,
    onChange,
    onRequestDelete: noOrders,
    ...over,
  }
  render(<VariantsTable {...props} />)
  return { onChange, props }
}

describe('VariantsTable — agrupamento pelo 1º eixo (AC 8)', () => {
  it('6 variações de 2 eixos aparecem em 3 grupos, com contagem e soma de estoque', () => {
    renderTable()

    expect(screen.getByText(/Tamanho: 3,5 cm · 2 variações · 10 un\./)).toBeInTheDocument()
    expect(screen.getByText(/Tamanho: 4,5 cm · 2 variações · 10 un\./)).toBeInTheDocument()
    expect(screen.getByText(/Tamanho: 5,5 cm · 2 variações · 10 un\./)).toBeInTheDocument()
  })

  it('o grupo é o 1º eixo por POSITION, não o primeiro do array', () => {
    renderTable({
      options: [
        { name: 'Acabamento', values: ['Fosco'], position: 1 },
        { name: 'Tamanho', values: ['4,5 cm'], position: 0 },
      ],
      variants: [variant()],
    })

    expect(screen.getByText(/Tamanho: 4,5 cm/)).toBeInTheDocument()
  })

  it('produto sem eixo cadastrado não agrupa — nenhum cabeçalho de grupo', () => {
    renderTable({ options: [], variants: [variant()] })
    expect(screen.queryByText(/variações · /)).not.toBeInTheDocument()
  })

  it('o rótulo de cada linha vem de variantLabel, na ordem dos eixos', () => {
    renderTable({ variants: [variant()] })
    expect(screen.getByText('4,5 cm · Fosco')).toBeInTheDocument()
  })
})

describe('VariantsTable — colunas do artboard (AC 7)', () => {
  it('tem as 10 colunas: seleção, imagem, variação, SKU, preço, preço "de", estoque, peso, ativa, ⋯', () => {
    renderTable({ variants: [variant()] })

    const headers = screen.getAllByRole('columnheader')
    expect(headers).toHaveLength(10)
    expect(headers.map(h => h.textContent)).toEqual([
      '',
      '',
      'Variação',
      'SKU',
      'Preço',
      'Preço "de"',
      'Estoque',
      'Peso',
      'Ativa',
      '',
    ])
  })

  it('editar o preço de uma linha muda SÓ aquela linha', () => {
    const { onChange } = renderTable({
      variants: [
        variant({ id: 'v-a', price: 5.9 }),
        variant({ id: 'v-b', price: 7.9, option_values: { Tamanho: '5,5 cm', Acabamento: 'Fosco' } }),
      ],
    })

    const input = screen.getByLabelText('Preço de 4,5 cm · Fosco')
    fireEvent.change(input, { target: { value: '9,40' } })
    fireEvent.blur(input)

    const next = onChange.mock.calls.at(-1)![0] as ProductVariant[]
    expect(next[0].price).toBe(9.4)
    expect(next[1].price).toBe(7.9)
  })

  it('o peso é digitado em GRAMAS e guardado em kg', () => {
    const { onChange } = renderTable({ variants: [variant({ weight_kg: null })] })

    const input = screen.getByLabelText('Peso de 4,5 cm · Fosco')
    fireEvent.change(input, { target: { value: '18' } })
    fireEvent.blur(input)

    expect((onChange.mock.calls.at(-1)![0] as ProductVariant[])[0].weight_kg).toBe(0.018)
  })

  it('SKU vazio volta como null, não como string vazia — o UNIQUE do banco trata null como ausente', () => {
    const { onChange } = renderTable({ variants: [variant({ sku: 'SLR-45' })] })

    fireEvent.change(screen.getByLabelText('SKU de 4,5 cm · Fosco'), { target: { value: '' } })

    expect((onChange.mock.calls.at(-1)![0] as ProductVariant[])[0].sku).toBeNull()
  })
})

describe('VariantsTable — linha ativa sem preço (AC 11)', () => {
  it('marca a linha em erro e mostra a mensagem inline do desenho', () => {
    renderTable({ variants: [variant({ id: 'v-sem-preco', price: null })] })

    expect(screen.getByTestId('variant-row-v-sem-preco')).toHaveAttribute('data-invalid', 'sem-preco')
    expect(screen.getByText('sem preço a variação não entra na loja')).toBeInTheDocument()
  })

  it('linha PAUSADA sem preço NÃO é erro — pausar é como o admin tira da loja', () => {
    renderTable({ variants: [variant({ id: 'v-pausada', price: null, is_active: false })] })

    expect(screen.getByTestId('variant-row-v-pausada')).not.toHaveAttribute('data-invalid')
    expect(screen.queryByText('sem preço a variação não entra na loja')).not.toBeInTheDocument()
  })

  it('linha ativa COM preço não é erro', () => {
    renderTable({ variants: [variant({ id: 'v-ok', price: 5.9 })] })
    expect(screen.getByTestId('variant-row-v-ok')).not.toHaveAttribute('data-invalid')
  })
})

describe('VariantsTable — rodapé com a faixa (AC 13)', () => {
  it('mostra contagem, faixa e soma de unidades', () => {
    renderTable({
      variants: [
        variant({ price: 5.9, stock: 4 }),
        variant({ price: 9.4, stock: 6, option_values: { Tamanho: '5,5 cm', Acabamento: 'Fosco' } }),
      ],
    })

    expect(text('variants-footer')).toBe(
      '2 variações · faixa R$ 5,90 – R$ 9,40 · 10 un. somadas',
    )
  })

  it('a faixa IGNORA as pausadas — a vitrine não pratica o preço de linha fora do ar', () => {
    renderTable({
      variants: [
        variant({ price: 5.9, is_active: true, stock: 1 }),
        variant({ price: 99.9, is_active: false, stock: 0, option_values: { Tamanho: '5,5 cm' } }),
      ],
    })

    expect(text('variants-footer')).toContain('faixa R$ 5,90')
    expect(text('variants-footer')).not.toContain('99,90')
  })

  it('a faixa ignora linha sem preço', () => {
    renderTable({
      variants: [
        variant({ price: 5.9 }),
        variant({ price: null, option_values: { Tamanho: '5,5 cm' } }),
      ],
    })

    expect(text('variants-footer')).toContain('faixa R$ 5,90')
  })

  it('sem nenhuma linha vendável, o rodapé não anuncia faixa nenhuma', () => {
    renderTable({ variants: [variant({ price: null, is_active: false })] })

    expect(text('variants-footer')).not.toContain('faixa')
  })

  it('preço único não vira faixa "X – X"', () => {
    renderTable({ variants: [variant({ price: 5.9, stock: 3 })] })

    expect(text('variants-footer')).toBe(
      '1 variação · faixa R$ 5,90 · 3 un. somadas',
    )
  })
})

describe('VariantsTable — pausar e política de estoque (AC 12, PFM-09 AC 8)', () => {
  it('pausar troca is_active e NÃO apaga a linha', () => {
    const { onChange } = renderTable({ variants: [variant({ id: 'v-a' }), variant({ id: 'v-b' })] })

    fireEvent.click(screen.getAllByLabelText(/^Ativa: /)[0])

    const next = onChange.mock.calls.at(-1)![0] as ProductVariant[]
    expect(next).toHaveLength(2)
    expect(next[0].is_active).toBe(false)
  })

  it('stock_policy `none` desabilita a coluna Estoque', () => {
    renderTable({ stockPolicy: 'none', variants: [variant()] })

    expect(screen.getByLabelText('Estoque de 4,5 cm · Fosco')).toBeDisabled()
  })

  it('com `none`, o rodapé não soma unidades — não há saldo para somar', () => {
    renderTable({ stockPolicy: 'none', variants: [variant({ price: 5.9 })] })

    expect(text('variants-footer')).not.toContain('un. somadas')
  })

  it('`track` e `backorder` mantêm a coluna Estoque editável', () => {
    const { onChange } = renderTable({ stockPolicy: 'backorder', variants: [variant()] })

    fireEvent.change(screen.getByLabelText('Estoque de 4,5 cm · Fosco'), { target: { value: '-3' } })

    expect((onChange.mock.calls.at(-1)![0] as ProductVariant[])[0].stock).toBe(-3)
  })
})

describe('VariantsTable — exclusão de variação vendida (AC 9a)', () => {
  it('sem pedido, exclui a linha', async () => {
    const { onChange } = renderTable({
      variants: [variant({ id: 'v-a' }), variant({ id: 'v-b', option_values: { Tamanho: '5,5 cm' } })],
    })

    fireEvent.click(screen.getAllByLabelText(/^Excluir /)[0])

    await waitFor(() => expect(onChange).toHaveBeenCalled())
    expect((onChange.mock.calls.at(-1)![0] as ProductVariant[]).map(v => v.id)).toEqual(['v-b'])
  })

  it('com pedido, RECUSA, nomeia a contagem e oferece Pausar', async () => {
    const { onChange } = renderTable({
      variants: [variant({ id: 'v-vendida' })],
      onRequestDelete: vi.fn(async () => ({ orders: 3 })),
    })

    fireEvent.click(screen.getByLabelText('Excluir 4,5 cm · Fosco'))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('alert').textContent).toContain('3 pedido(s)')
    expect(screen.getByRole('button', { name: 'Pausar variação' })).toBeInTheDocument()
    // O que NÃO aconteceu é o ponto: a linha não foi removida.
    expect(onChange).not.toHaveBeenCalled()
  })

  it('o Pausar da recusa pausa a linha em vez de excluir', async () => {
    const { onChange } = renderTable({
      variants: [variant({ id: 'v-vendida' })],
      onRequestDelete: vi.fn(async () => ({ orders: 1 })),
    })
    fireEvent.click(screen.getByLabelText('Excluir 4,5 cm · Fosco'))
    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Pausar variação' }))

    const next = onChange.mock.calls.at(-1)![0] as ProductVariant[]
    expect(next).toHaveLength(1)
    expect(next[0].is_active).toBe(false)
  })
})

describe('VariantsTable — seleção de linhas (base das ações em massa da T29)', () => {
  it('marcar a caixa reporta o id selecionado', () => {
    const onSelectionChange = vi.fn()
    renderTable({ variants: [variant({ id: 'v-a' })], selectedIds: [], onSelectionChange })

    fireEvent.click(screen.getByLabelText('Selecionar 4,5 cm · Fosco'))

    expect(onSelectionChange).toHaveBeenCalledWith(['v-a'])
  })

  it('desmarcar remove só aquele id', () => {
    const onSelectionChange = vi.fn()
    renderTable({
      variants: [variant({ id: 'v-a' })],
      selectedIds: ['v-a', 'v-b'],
      onSelectionChange,
    })

    fireEvent.click(screen.getByLabelText('Selecionar 4,5 cm · Fosco'))

    expect(onSelectionChange).toHaveBeenCalledWith(['v-b'])
  })
})

describe('VariantsTable — grade vazia', () => {
  it('explica o caminho em vez de mostrar tabela vazia', () => {
    renderTable({ variants: [] })

    // A T29 acrescentou um BOTÃO com o mesmo texto na barra da grade; a asserção passa a ser sobre
    // o parágrafo de estado vazio, não sobre "existe esse texto em algum lugar".
    expect(screen.getByText(/Nenhuma variação\./)).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
