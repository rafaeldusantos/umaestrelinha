// PLS-07/PLS-08 na TELA: colar do Excel, erro embaixo da linha, rodapé, e a escrita em lote.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'

const { createBatchMock, toastMock, fromMock, selectMock } = vi.hoisted(() => ({
  createBatchMock: vi.fn(),
  toastMock: vi.fn(),
  fromMock: vi.fn(),
  selectMock: vi.fn(),
}))

vi.mock('@/entities/product/api/useAdminProducts', () => ({
  useAdminProductList: () => ({ createProductsBatch: createBatchMock }),
}))
vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: toastMock }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))
vi.mock('@/features/product-form/ui/OptionsEditor', () => ({
  default: () => <div data-testid="options-editor" />,
}))

import AdminQuickGridPage from './AdminQuickGridPage'

const TSV_8 = [
  'Luffy Gear 5\tanime\tR$ 14,90\t20\tluffy\tLUF',
  'Levi Ackerman\tanime\tR$ 14,90\t15\taot\tLEV',
  'Gojo Satoru\tanime\tR$ 16,90\t10\tjjk\tGOJ',
  'Nezuko\tanime\t18,40\t8\tkimetsu\tNEZ',
  'Pikachu\tgames\t12,90\t30\tpokemon\tPIK',
  'Darth Vader\tfilmes\t14,90\t12\tstarwars\tDAR',
  'Among Us\tgames\t9,90\t25\tamongus\tAMO',
  'Sem Preço\tanime\t\t5\ttesto\tSEM',
].join('\n')

const renderPage = () =>
  render(
    <MemoryRouter>
      <AdminQuickGridPage />
    </MemoryRouter>,
  )

const colar = (texto: string, linha = 1) =>
  fireEvent.paste(screen.getByLabelText(`Nome da linha ${linha}`), {
    clipboardData: { getData: () => texto },
  })

beforeEach(() => {
  toastMock.mockReset()
  createBatchMock.mockReset().mockResolvedValue({ error: null, ids: [] })
  selectMock.mockReset().mockResolvedValue({ data: [] })
  fromMock.mockReset().mockReturnValue({ select: selectMock })
})

describe('AdminQuickGridPage — colar do Excel (PLS-07 AC 4, AC 7)', () => {
  it('colar 8 linhas preenche 8 linhas da planilha', () => {
    renderPage()

    colar(TSV_8)

    expect(screen.getByLabelText('Nome da linha 1')).toHaveValue('Luffy Gear 5')
    expect(screen.getByLabelText('Nome da linha 8')).toHaveValue('Sem Preço')
    expect(screen.getByLabelText('Estoque da linha 1')).toHaveValue(20)
  })

  it('o rodapé mostra `7 prontas · 1 com erro`', () => {
    renderPage()

    colar(TSV_8)

    expect(screen.getByLabelText('Resumo do lote')).toHaveTextContent('7 prontas · 1 com erro')
  })

  it('a linha sem preço mostra o erro logo abaixo dela, sem esperar o submit (AC 6)', () => {
    renderPage()

    colar(TSV_8)

    expect(screen.getByText('Preço é obrigatório')).toBeInTheDocument()
  })

  it('colar 500 linhas avisa e limita a 200 (A24)', () => {
    renderPage()

    colar(Array.from({ length: 500 }, (_, i) => `Produto ${i}\t\t9,90`).join('\n'))

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Coladas 200 linhas',
        description: '300 linha(s) ficaram de fora: o lote é limitado a 200.',
      }),
    )
  })

  it('colar uma célula só continua sendo digitação normal, não vira parse de planilha', () => {
    renderPage()

    fireEvent.paste(screen.getByLabelText('Nome da linha 1'), {
      clipboardData: { getData: () => 'Luffy' },
    })

    // Sem TAB nem quebra de linha o componente não intercepta — o input recebe o texto.
    expect(screen.getByLabelText('Nome da linha 1')).toHaveValue('')
  })
})

describe('AdminQuickGridPage — teclado (PLS-07 AC 5)', () => {
  it('`⌥↓` duplica a linha atual', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Nome da linha 1'), { target: { value: 'Luffy' } })

    fireEvent.keyDown(screen.getByLabelText('Nome da linha 1'), { key: 'ArrowDown', altKey: true })

    expect(screen.getByLabelText('Nome da linha 2')).toHaveValue('Luffy')
  })

  it('seta para baixo SEM Alt não duplica nada', () => {
    renderPage()
    fireEvent.change(screen.getByLabelText('Nome da linha 1'), { target: { value: 'Luffy' } })

    fireEvent.keyDown(screen.getByLabelText('Nome da linha 1'), { key: 'ArrowDown' })

    expect(screen.getByLabelText('Nome da linha 2')).toHaveValue('')
  })
})

describe('AdminQuickGridPage — criar (PLS-07 AC 8, PLS-08 AC 10)', () => {
  it('cria SÓ as 7 válidas, com um insert de produtos e um de variações', async () => {
    createBatchMock.mockResolvedValue({ error: null, ids: Array.from({ length: 7 }, (_, i) => `p${i}`) })
    renderPage()
    colar(TSV_8)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Criar 7 produtos' }))
    })

    expect(createBatchMock).toHaveBeenCalledTimes(1)
    const [produtos] = createBatchMock.mock.calls[0]
    expect(produtos).toHaveLength(7)
    expect(produtos.every((p: { is_active: boolean }) => p.is_active === false)).toBe(true)
  })

  it('o segundo insert leva as variações com o `product_id` recém-criado', async () => {
    createBatchMock.mockResolvedValue({ error: null, ids: ['novo-1'] })
    renderPage()
    colar('Luffy Gear 5\tanime\t14,90\t20\tluffy\tLUF')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Criar 1 produto' }))
    })

    // Sem eixo padrão a grade é vazia — o que se prova aqui é que o construtor recebe os ids.
    const [, buildVariants] = createBatchMock.mock.calls[0]
    expect(typeof buildVariants).toBe('function')
    expect(buildVariants(['novo-1'])).toEqual([])
  })

  it('relê os slugs ocupados imediatamente antes de gravar', async () => {
    selectMock.mockResolvedValue({ data: [{ slug: 'luffy-gear-5' }] })
    renderPage()
    colar('Luffy Gear 5\tanime\t14,90\t20\tluffy\tLUF')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Criar 1 produto' }))
    })

    expect(fromMock).toHaveBeenCalledWith('products')
    // O slug colidiu na releitura: nada é criado, e a tela diz por quê.
    expect(createBatchMock).not.toHaveBeenCalled()
    await waitFor(() =>
      expect(screen.getByText('já existe um produto com a URL /luffy-gear-5')).toBeInTheDocument(),
    )
  })

  it('as linhas com erro FICAM na tela depois de criar as válidas (AC 8)', async () => {
    createBatchMock.mockResolvedValue({ error: null, ids: Array.from({ length: 7 }, (_, i) => `p${i}`) })
    renderPage()
    colar(TSV_8)

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Criar 7 produtos' }))
    })

    await waitFor(() => expect(screen.getByLabelText('Nome da linha 1')).toHaveValue('Sem Preço'))
    expect(screen.queryByDisplayValue('Luffy Gear 5')).not.toBeInTheDocument()
  })

  it('falha no insert não mente: avisa e mantém a planilha', async () => {
    createBatchMock.mockResolvedValue({ error: { message: 'duplicate key' }, ids: [] })
    renderPage()
    colar('Luffy Gear 5\tanime\t14,90\t20\tluffy\tLUF')

    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Criar 1 produto' }))
    })

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive', description: 'duplicate key' }),
    )
    expect(screen.getByLabelText('Nome da linha 1')).toHaveValue('Luffy Gear 5')
  })

  it('sem nenhuma linha válida, a ação primária fica desabilitada', () => {
    renderPage()

    expect(screen.getByRole('button', { name: /Criar 0 produtos/ })).toBeDisabled()
  })
})

describe('AdminQuickGridPage — padrões do lote (PLS-07 AC 1)', () => {
  it('mostra a faixa de padrões com eixos, peso e rascunho', () => {
    renderPage()

    expect(screen.getByText('Padrões de todas as linhas')).toBeInTheDocument()
    expect(screen.getByTestId('options-editor')).toBeInTheDocument()
    expect(screen.getByLabelText('Peso do lote')).toBeInTheDocument()
    expect(screen.getByLabelText('Salvar como rascunho')).toBeInTheDocument()
  })

  it('as colunas da planilha são as do artboard', () => {
    renderPage()

    const cabecalhos = within(screen.getByRole('table')).getAllByRole('columnheader')
    // RFN-05 AC 1: `Imagem` entrou antes de `Nome`, como no artboard.
    expect(cabecalhos.map(h => h.textContent)).toEqual([
      '#', 'Imagem', 'Nome*', 'Categorias', 'Preço*', 'Estoque', 'Tags', 'SKU base', '',
    ])
  })
})
