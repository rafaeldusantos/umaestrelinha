import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import VariantsTable from './VariantsTable'
import type { ProductOption, ProductVariant } from '@estrelinha/supabase/types'

// PFM-08 AC 6, 9, 10, 14 na SUPERFÍCIE: a barra em massa só age nas selecionadas, Preencher coluna
// respeita o modo, e Regerar mostra o diff ANTES de aplicar — cancelar não muda nada.
// A aritmética está provada em `model/gridActions.test.ts`; aqui se prova que a tela obedece.

const options: ProductOption[] = [
  { name: 'Tamanho', values: ['3,5 cm', '4,5 cm'], position: 0 },
  { name: 'Acabamento', values: ['Fosco', 'Brilhante'], position: 1 },
]

const variant = (id: string, over: Partial<ProductVariant> = {}): ProductVariant => ({
  id,
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

const grid = (): ProductVariant[] => [
  variant('v-35-fos', { option_values: { Tamanho: '3,5 cm', Acabamento: 'Fosco' }, price: 4.9 }),
  variant('v-45-fos', { option_values: { Tamanho: '4,5 cm', Acabamento: 'Fosco' }, price: null }),
]

const renderTable = (over: Partial<React.ComponentProps<typeof VariantsTable>> = {}) => {
  const onChange = vi.fn()
  render(
    <VariantsTable
      variants={grid()}
      options={options}
      stockPolicy="track"
      onChange={onChange}
      onRequestDelete={vi.fn(async () => ({ orders: 0, verified: true }))}
      selectedIds={[]}
      onSelectionChange={vi.fn()}
      slug="botton-sailor-moon"
      productId="p1"
      {...over}
    />,
  )
  return { onChange }
}

describe('barra em massa — aparece só com seleção (AC 9)', () => {
  it('sem seleção, a barra não existe', () => {
    renderTable()
    expect(screen.queryByTestId('bulk-bar')).not.toBeInTheDocument()
  })

  it('com seleção, a barra aparece com a contagem', () => {
    renderTable({ selectedIds: ['v-35-fos'] })
    expect(screen.getByTestId('bulk-bar').textContent).toContain('1 selecionada')
  })

  it('Definir preço aplica SÓ na selecionada', () => {
    const { onChange } = renderTable({ selectedIds: ['v-45-fos'] })

    const input = screen.getByLabelText('Preço em massa')
    fireEvent.change(input, { target: { value: '9,90' } })
    fireEvent.blur(input)
    fireEvent.click(screen.getByRole('button', { name: 'Definir preço' }))

    const next = onChange.mock.calls.at(-1)![0] as ProductVariant[]
    expect(next.find(v => v.id === 'v-45-fos')!.price).toBe(9.9)
    expect(next.find(v => v.id === 'v-35-fos')!.price).toBe(4.9)
  })

  it('Definir estoque fica desabilitado sem valor — não aplica 0 por engano', () => {
    renderTable({ selectedIds: ['v-45-fos'] })
    expect(screen.getByRole('button', { name: 'Definir estoque' })).toBeDisabled()
  })

  it('Gerar SKU aplica o padrão só na selecionada', () => {
    const { onChange } = renderTable({ selectedIds: ['v-35-fos'] })

    fireEvent.click(screen.getByRole('button', { name: 'Gerar SKU' }))

    const next = onChange.mock.calls.at(-1)![0] as ProductVariant[]
    expect(next.find(v => v.id === 'v-35-fos')!.sku).toBe('SLR-35-FOS')
    expect(next.find(v => v.id === 'v-45-fos')!.sku).toBeNull()
  })

  it('Pausar em massa pausa só as selecionadas', () => {
    const { onChange } = renderTable({ selectedIds: ['v-35-fos'] })

    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }))

    const next = onChange.mock.calls.at(-1)![0] as ProductVariant[]
    expect(next.find(v => v.id === 'v-35-fos')!.is_active).toBe(false)
    expect(next.find(v => v.id === 'v-45-fos')!.is_active).toBe(true)
  })
})

describe('Excluir em massa passa pela checagem de AC 9a', () => {
  it('linha vendida NÃO é excluída e é nomeada; a outra sai', async () => {
    const onChange = vi.fn()
    render(
      <VariantsTable
        variants={grid()}
        options={options}
        stockPolicy="track"
        onChange={onChange}
        onRequestDelete={vi.fn(async v => ({
          orders: v.id === 'v-35-fos' ? 2 : 0,
          verified: true,
        }))}
        selectedIds={['v-35-fos', 'v-45-fos']}
        onSelectionChange={vi.fn()}
        slug="botton-sailor-moon"
        productId="p1"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(screen.getByRole('alert').textContent).toContain('3,5 cm · Fosco')
    const next = onChange.mock.calls.at(-1)![0] as ProductVariant[]
    expect(next.map(v => v.id)).toEqual(['v-35-fos'])
  })

  it('checagem que falha também protege a linha', async () => {
    const onChange = vi.fn()
    render(
      <VariantsTable
        variants={[variant('v-a')]}
        options={options}
        stockPolicy="track"
        onChange={onChange}
        onRequestDelete={vi.fn(async () => ({ orders: 0, verified: false }))}
        selectedIds={['v-a']}
        onSelectionChange={vi.fn()}
        slug="s"
        productId="p1"
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))

    await waitFor(() => expect(screen.getByRole('alert')).toBeInTheDocument())
    expect(onChange).not.toHaveBeenCalled()
  })
})

describe('Preencher coluna (AC 10)', () => {
  it('modo `só às vazias` não atropela o preço já digitado', () => {
    const { onChange } = renderTable()

    const value = screen.getByLabelText('Valor')
    fireEvent.change(value, { target: { value: '7,50' } })
    fireEvent.blur(value)
    fireEvent.click(screen.getByRole('button', { name: 'Preencher' }))

    const next = onChange.mock.calls.at(-1)![0] as ProductVariant[]
    expect(next.find(v => v.id === 'v-35-fos')!.price).toBe(4.9)
    expect(next.find(v => v.id === 'v-45-fos')!.price).toBe(7.5)
  })

  it('a coluna e o modo são escolhidos na barra, e o padrão é o menos destrutivo', () => {
    renderTable()
    expect(screen.getByLabelText('Coluna')).toHaveTextContent('Preço')
    expect(screen.getByLabelText('Modo')).toHaveTextContent('Só às vazias')
  })
})

describe('Regerar do cruzamento (AC 6)', () => {
  it('mostra `N a criar · M a remover` ANTES de aplicar', async () => {
    renderTable()

    fireEvent.click(screen.getByRole('button', { name: 'Regerar do cruzamento' }))

    await waitFor(() => expect(screen.getByTestId('regenerate-summary')).toBeInTheDocument())
    // A grade tem 2 das 4 combinações; nenhuma órfã.
    expect(screen.getByTestId('regenerate-summary').textContent).toBe('2 a criar · 0 a remover')
  })

  it('cancelar NÃO muda nada', async () => {
    const { onChange } = renderTable()
    fireEvent.click(screen.getByRole('button', { name: 'Regerar do cruzamento' }))
    await waitFor(() => expect(screen.getByTestId('regenerate-summary')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onChange).not.toHaveBeenCalled()
  })

  it('aplicar cria as faltantes pausadas e preserva o preço das existentes', async () => {
    const { onChange } = renderTable()
    fireEvent.click(screen.getByRole('button', { name: 'Regerar do cruzamento' }))
    await waitFor(() => expect(screen.getByTestId('regenerate-summary')).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Aplicar' }))

    const next = onChange.mock.calls.at(-1)![0] as ProductVariant[]
    expect(next).toHaveLength(4)
    expect(next.find(v => v.id === 'v-35-fos')!.price).toBe(4.9)
    const criadas = next.filter(v => v.id.startsWith('tmp-'))
    expect(criadas).toHaveLength(2)
    criadas.forEach(v => {
      expect(v.is_active).toBe(false)
      expect(v.price).toBeNull()
    })
  })

  it('nomeia as linhas que vão sair, para a remoção não ser surpresa', async () => {
    renderTable({
      variants: [variant('v-orfa', { option_values: { Tamanho: '9,9 cm', Acabamento: 'Fosco' } })],
    })

    fireEvent.click(screen.getByRole('button', { name: 'Regerar do cruzamento' }))

    await waitFor(() => expect(screen.getByTestId('regenerate-summary')).toBeInTheDocument())
    expect(screen.getByTestId('regenerate-summary').textContent).toBe('4 a criar · 1 a remover')
    // O rótulo também aparece na LINHA da tabela, então a busca é dentro do diálogo — é lá que a
    // lista "estas linhas saem" precisa nomear a variação.
    expect(within(screen.getByRole('dialog')).getByText('9,9 cm · Fosco')).toBeInTheDocument()
  })

  it('grade já completa: Aplicar fica desabilitado', async () => {
    renderTable({
      variants: [
        variant('a', { option_values: { Tamanho: '3,5 cm', Acabamento: 'Fosco' } }),
        variant('b', { option_values: { Tamanho: '3,5 cm', Acabamento: 'Brilhante' } }),
        variant('c', { option_values: { Tamanho: '4,5 cm', Acabamento: 'Fosco' } }),
        variant('d', { option_values: { Tamanho: '4,5 cm', Acabamento: 'Brilhante' } }),
      ],
    })

    fireEvent.click(screen.getByRole('button', { name: 'Regerar do cruzamento' }))

    await waitFor(() => expect(screen.getByTestId('regenerate-summary')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: 'Aplicar' })).toBeDisabled()
  })

  it('a barra existe mesmo com a grade vazia — é como se cria a primeira grade', () => {
    renderTable({ variants: [] })
    expect(screen.getByRole('button', { name: 'Regerar do cruzamento' })).toBeInTheDocument()
  })
})
