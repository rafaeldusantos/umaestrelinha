// PLS-01…PLS-04 e PLS-09 na TELA: o rodapé com o total do servidor, a faixa de preço travada com
// explicação, `sempre disponível`, o badge de grade incompleta e a edição inline com teclado.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import type { AdminListRow } from '@/entities/product/api/productQuery'

const {
  listMock, countsMock, toastMock, updateMock, eqMock, fromMock, refetchMock, navigateMock,
  fetchAllMock, updateBatchMock, createBatchMock, deleteBatchMock, applyCategoryMock,
} = vi.hoisted(() => ({
  listMock: vi.fn(),
  countsMock: vi.fn(),
  toastMock: vi.fn(),
  updateMock: vi.fn(),
  eqMock: vi.fn(),
  fromMock: vi.fn(),
  refetchMock: vi.fn(),
  navigateMock: vi.fn(),
  fetchAllMock: vi.fn(),
  updateBatchMock: vi.fn(),
  createBatchMock: vi.fn(),
  deleteBatchMock: vi.fn(),
  applyCategoryMock: vi.fn(),
}))

vi.mock('@/entities/product/api/useAdminProducts', () => ({
  useAdminProductList: listMock,
  useProductViewCounts: countsMock,
}))
vi.mock('@/entities/category/api/useAdminCategories', () => ({
  useAdminCategories: () => ({ categories: [{ id: 'cat-anime', name: 'Anime' }] }),
}))
vi.mock('@/features/csv-import/ui/CsvImportDialog', () => ({ default: () => null }))
vi.mock('@nanapin/ui/hooks/use-toast', () => ({ toast: toastMock }))
vi.mock('@nanapin/supabase/client', () => ({ supabase: { from: fromMock } }))
vi.mock('react-router-dom', async importOriginal => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useNavigate: () => navigateMock,
}))

import AdminProductsPage from './AdminProductsPage'

let seq = 0
const variant = (over: Record<string, unknown> = {}) => ({
  id: `v${++seq}`,
  product_id: 'p1',
  option_values: { Tamanho: '4,5 cm' },
  name: null,
  sku: null,
  price: 7.9,
  compare_price: null,
  stock: 5,
  weight_kg: null,
  image_url: null,
  is_active: true,
  position: 0,
  ...over,
}) as AdminListRow['variants'][number]

const row = (over: Partial<AdminListRow> = {}): AdminListRow => ({
  id: 'p1',
  name: 'Botton Sailor Moon',
  slug: 'botton-sailor-moon',
  price: 5.9,
  compare_price: null,
  images: [{ url: 'a.webp', alt: null, source: 'upload' }],
  tags: [],
  is_active: true,
  stock_total: 12,
  low_stock_threshold: 5,
  stock_policy: 'track',
  options: [],
  variants: [],
  category_ids: ['cat-anime'],
  seo_title: 'SEO',
  seo_description: 'SEO',
  scheduled_at: null,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: '2026-07-02T00:00:00Z',
  ...over,
})

/** As linhas da tabela também têm `Duplicar` e `Excluir` (ícones de ação por produto). */
const barra = () => within(screen.getByRole('toolbar', { name: 'Ações em massa' }))

const setup = (rows: AdminListRow[] = [row()], total = rows.length) => {
  listMock.mockReturnValue({
    rows,
    total,
    loading: false,
    error: null,
    refetch: refetchMock,
    fetchAllFiltered: fetchAllMock,
    createProductsBatch: createBatchMock,
    updateProductsBatch: updateBatchMock,
    deleteProductsBatch: deleteBatchMock,
    applyCategoryWrites: applyCategoryMock,
  })
  render(
    <MemoryRouter>
      <AdminProductsPage />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  // Radix abre o menu no `pointerdown` e mede o item com APIs que o jsdom não tem.
  window.HTMLElement.prototype.scrollIntoView = vi.fn()
  window.HTMLElement.prototype.hasPointerCapture = vi.fn()
  window.HTMLElement.prototype.releasePointerCapture = vi.fn()

  seq = 0
  toastMock.mockReset()
  refetchMock.mockReset().mockResolvedValue(undefined)
  navigateMock.mockReset()
  countsMock.mockReset().mockReturnValue({ todos: 160, ativos: 120 })
  eqMock.mockReset().mockResolvedValue({ error: null })
  updateMock.mockReset().mockReturnValue({ eq: eqMock })
  fetchAllMock.mockReset().mockResolvedValue([])
  updateBatchMock.mockReset().mockResolvedValue({ changed: 0, failed: [] })
  createBatchMock.mockReset().mockResolvedValue({ error: null, ids: [] })
  deleteBatchMock.mockReset().mockResolvedValue({ deleted: 0, failed: 0 })
  applyCategoryMock.mockReset().mockResolvedValue({ error: null })
  const selectChain = {
    in: () => Promise.resolve({ data: [] }),
    then: (fn: (v: unknown) => unknown) => Promise.resolve({ data: [] }).then(fn),
  }
  fromMock.mockReset().mockReturnValue({
    update: updateMock,
    delete: () => ({ eq: eqMock }),
    select: () => selectChain,
  })
})

describe('AdminProductsPage — rodapé e visões (PLS-01 AC 2, PLS-02 AC 3)', () => {
  it('o rodapé mostra `X–Y de N` com o total do servidor, não com o tamanho da página', () => {
    setup([row(), row({ id: 'p2', name: 'Outro' })], 160)

    expect(screen.getByText('1–25 de 160')).toBeInTheDocument()
  })

  it('as sete visões do artboard aparecem, com a contagem de cada uma', () => {
    setup()

    const tabs = screen.getAllByRole('tab')
    expect(tabs.map(t => t.textContent?.replace(/\d+/g, '').trim())).toEqual([
      'Todos', 'Ativos', 'Rascunhos', 'Sem estoque', 'Sem imagem', 'Sem SEO', 'Agendados',
    ])
    expect(within(tabs[0]).getByText('160')).toBeInTheDocument()
    expect(within(tabs[1]).getByText('120')).toBeInTheDocument()
  })

  it('escolher uma visão refaz a consulta com o filtro dela', () => {
    setup()

    fireEvent.click(screen.getByRole('tab', { name: /Rascunhos/ }))

    const ultimaQuery = listMock.mock.calls[listMock.mock.calls.length - 1][0]
    expect(ultimaQuery.filters.view).toBe('rascunhos')
    expect(ultimaQuery.page).toBe(1)
  })

  it('buscar refaz a consulta com o termo e volta para a página 1', () => {
    setup()

    fireEvent.change(screen.getByPlaceholderText(/Buscar por nome, SKU ou tag/), {
      target: { value: 'sailor' },
    })

    const ultimaQuery = listMock.mock.calls[listMock.mock.calls.length - 1][0]
    expect(ultimaQuery.search).toBe('sailor')
    expect(ultimaQuery.page).toBe(1)
  })
})

describe('AdminProductsPage — coluna Preço (PLS-04 AC 9)', () => {
  it('produto com grade mostra a faixa e a contagem de preços', () => {
    setup([
      row({
        options: [{ name: 'Tamanho', values: ['3,5 cm', '4,5 cm'], position: 0 }],
        variants: [variant({ price: 14.9 }), variant({ price: 18.4 })],
      }),
    ])

    expect(screen.getByText(/14,90/)).toBeInTheDocument()
    expect(screen.getByText(/18,40/)).toBeInTheDocument()
    expect(screen.getByText('2 preços')).toBeInTheDocument()
  })

  it('a célula de preço com grade NÃO é editável, e diz por quê', () => {
    setup([
      row({
        options: [{ name: 'Tamanho', values: ['3,5 cm'], position: 0 }],
        variants: [variant({ price: 14.9 })],
      }),
    ])

    expect(screen.queryByRole('button', { name: /Editar Preço/ })).not.toBeInTheDocument()
    expect(
      screen.getByLabelText(/Preço de Botton Sailor Moon: O preço deste produto vive na grade/),
    ).toBeInTheDocument()
  })
})

describe('AdminProductsPage — coluna Estoque e badges (PLS-04 AC 10-11)', () => {
  it('`stock_policy: none` mostra `sempre disponível` e não é editável', () => {
    setup([row({ stock_policy: 'none' })])

    expect(screen.getByText('sempre disponível')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Editar Estoque/ })).not.toBeInTheDocument()
  })

  it('variação ativa com `options` vazio acende o badge `grade incompleta` (PST-10)', () => {
    setup([row({ options: [], variants: [variant()] })])

    expect(screen.getByText('grade incompleta')).toBeInTheDocument()
  })

  it('produto sem imagem acende `sem imagem`', () => {
    setup([row({ images: [] })])

    expect(screen.getByText('sem imagem')).toBeInTheDocument()
  })
})

describe('AdminProductsPage — edição inline (PLS-03 AC 7-8)', () => {
  const abrirEstoque = () => {
    fireEvent.click(screen.getByRole('button', { name: 'Editar Estoque de Botton Sailor Moon' }))
    return screen.getByLabelText('Estoque de Botton Sailor Moon')
  }

  it('`Enter` grava o novo valor', async () => {
    setup()
    const input = abrirEstoque()

    fireEvent.change(input, { target: { value: '7' } })
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' })
    })

    expect(updateMock).toHaveBeenCalledWith({ stock_total: 7 })
    expect(eqMock).toHaveBeenCalledWith('id', 'p1')
  })

  it('`Esc` cancela sem gravar nada', async () => {
    setup()
    const input = abrirEstoque()

    fireEvent.change(input, { target: { value: '99' } })
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Escape' })
    })

    expect(updateMock).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Editar Estoque de Botton Sailor Moon' })).toBeInTheDocument()
  })

  it('`Tab` grava e devolve o foco ao fluxo da tabela', async () => {
    setup()
    const input = abrirEstoque()

    fireEvent.change(input, { target: { value: '3' } })
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Tab' })
    })

    expect(updateMock).toHaveBeenCalledWith({ stock_total: 3 })
  })

  it('o toast traz `Desfazer`, e desfazer regrava o valor anterior', async () => {
    setup()
    const input = abrirEstoque()

    fireEvent.change(input, { target: { value: '7' } })
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' })
    })

    await waitFor(() => expect(toastMock).toHaveBeenCalled())
    const payload = toastMock.mock.calls[0][0]
    expect(payload.description).toBe('Estoque: 12 → 7')
    expect(payload.action.props.altText).toBe('Desfazer')

    updateMock.mockClear()
    await act(async () => {
      await payload.action.props.onClick()
    })

    // O desfazer é um segundo update com o snapshot — não existe undo transacional (A23).
    expect(updateMock).toHaveBeenCalledWith({ stock_total: 12 })
  })

  it('falha na gravação não mente: avisa e não oferece desfazer', async () => {
    eqMock.mockResolvedValue({ error: { message: 'permission denied' } })
    setup()
    const input = abrirEstoque()

    fireEvent.change(input, { target: { value: '7' } })
    await act(async () => {
      fireEvent.keyDown(input, { key: 'Enter' })
    })

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ variant: 'destructive', description: 'permission denied' }),
    )
    expect(toastMock.mock.calls[0][0].action).toBeUndefined()
  })
})

describe('AdminProductsPage — menu Novo produto (PLS-09 AC 14)', () => {
  it('oferece novo produto, grade rápida e importar CSV', async () => {
    setup()

    fireEvent.keyDown(screen.getByRole('button', { name: /Novo produto/ }), { key: 'Enter' })

    const itens = await screen.findAllByRole('menuitem')
    expect(itens.map(i => i.textContent?.trim())).toEqual([
      'Novo produto',
      'Grade rápida',
      'Importar CSV',
    ])
  })

  it('grade rápida leva para a rota da planilha', async () => {
    setup()

    fireEvent.keyDown(screen.getByRole('button', { name: /Novo produto/ }), { key: 'Enter' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Grade rápida' }))

    expect(navigateMock).toHaveBeenCalledWith('/admin/produtos/grade-rapida')
  })
})

describe('AdminProductsPage — seleção e massa (PLS-05, PLS-06)', () => {
  const doisProdutos = [row(), row({ id: 'p2', name: 'Outro', price: 10 })]

  const selecionar = (nome: string) =>
    fireEvent.click(screen.getByRole('checkbox', { name: `Selecionar ${nome}` }))

  it('selecionar linhas mostra a barra de massa com a contagem', () => {
    setup(doisProdutos, 2)

    selecionar('Botton Sailor Moon')

    expect(screen.getByText('1 selecionado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar em massa' })).toBeInTheDocument()
  })

  it('o cabeçalho seleciona a página inteira', () => {
    setup(doisProdutos, 2)

    fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar a página' }))

    expect(screen.getByText('2 selecionados')).toBeInTheDocument()
  })

  it('`Selecionar os N do filtro` busca além da página visível (AC 2)', async () => {
    const todos = Array.from({ length: 5 }, (_, i) => row({ id: `x${i}`, name: `Produto ${i}` }))
    fetchAllMock.mockResolvedValue(todos)
    setup(doisProdutos, 160)

    selecionar('Botton Sailor Moon')
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Selecionar os 160 do filtro' }))
    })

    expect(fetchAllMock).toHaveBeenCalledTimes(1)
    expect(screen.getByText('5 selecionados')).toBeInTheDocument()
  })

  it('aplica sobre os ids CAPTURADOS, mesmo se a lista mudar depois da seleção', async () => {
    setup(doisProdutos, 2)
    selecionar('Botton Sailor Moon')

    // A listagem é recarregada com outro conjunto — o alvo não pode mudar debaixo do admin.
    listMock.mockReturnValue({
      rows: [row({ id: 'p9', name: 'Chegou depois' })],
      total: 1,
      loading: false,
      error: null,
      refetch: refetchMock,
      fetchAllFiltered: fetchAllMock,
      createProductsBatch: createBatchMock,
      updateProductsBatch: updateBatchMock,
      deleteProductsBatch: deleteBatchMock,
      applyCategoryWrites: applyCategoryMock,
    })
    updateBatchMock.mockResolvedValue({ changed: 1, failed: [] })

    fireEvent.click(barra().getByRole('button', { name: 'Editar em massa' }))
    fireEvent.click(await screen.findByLabelText('Editar preço'))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Aplicar a 1 produto/ }))
    })

    expect(updateBatchMock).toHaveBeenCalledWith([
      { id: 'p1', values: { base_price: 6.49 } },
    ])
  })

  it('falha parcial reporta `X alterados · Y falharam`', async () => {
    setup(doisProdutos, 2)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar a página' }))
    updateBatchMock.mockResolvedValue({ changed: 1, failed: ['p2'] })

    fireEvent.click(barra().getByRole('button', { name: 'Editar em massa' }))
    fireEvent.click(await screen.findByLabelText('Editar preço'))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Aplicar a 2 produto/ }))
    })

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: '1 alterados · 1 falharam' }),
    )
  })

  it('o desfazer cobre só as linhas efetivamente alteradas', async () => {
    setup(doisProdutos, 2)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar a página' }))
    updateBatchMock.mockResolvedValue({ changed: 1, failed: ['p2'] })

    fireEvent.click(barra().getByRole('button', { name: 'Editar em massa' }))
    fireEvent.click(await screen.findByLabelText('Editar preço'))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Aplicar a 2 produto/ }))
    })

    const payload = toastMock.mock.calls[0][0]
    updateBatchMock.mockClear()
    await act(async () => {
      await payload.action.props.onClick()
    })

    // `p2` falhou: não entra no desfazer, senão a tela prometeria voltar o que nunca foi.
    expect(updateBatchMock).toHaveBeenCalledWith([{ id: 'p1', values: { base_price: 5.9 } }])
  })
})


describe('AdminProductsPage — as seis ações da barra (RFN-01…RFN-04)', () => {
  const dois = [row(), row({ id: 'p2', name: 'Outro', price: 10 })]
  const selecionarPagina = () =>
    fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar a página' }))

  it('`Ativar` aplica o patch de status sem abrir o painel', async () => {
    setup(dois, 2)
    selecionarPagina()
    updateBatchMock.mockResolvedValue({ changed: 2, failed: [] })

    await act(async () => {
      fireEvent.click(barra().getByRole('button', { name: 'Ativar' }))
    })

    expect(updateBatchMock).toHaveBeenCalledWith([
      { id: 'p1', values: { is_active: true } },
      { id: 'p2', values: { is_active: true } },
    ])
  })

  it('`Pausar` aplica o inverso, pelo mesmo caminho', async () => {
    setup(dois, 2)
    selecionarPagina()
    updateBatchMock.mockResolvedValue({ changed: 2, failed: [] })

    await act(async () => {
      fireEvent.click(barra().getByRole('button', { name: 'Pausar' }))
    })

    const patches = updateBatchMock.mock.calls[0][0] as { values: { is_active: boolean } }[]
    expect(patches.every(p => p.values.is_active === false)).toBe(true)
  })

  it('`Duplicar` cria cópias como rascunho num insert só', async () => {
    setup(dois, 2)
    selecionarPagina()
    createBatchMock.mockResolvedValue({ error: null, ids: ['n1', 'n2'] })

    await act(async () => {
      fireEvent.click(barra().getByRole('button', { name: 'Duplicar' }))
    })

    expect(createBatchMock).toHaveBeenCalledTimes(1)
    const copias = createBatchMock.mock.calls[0][0] as { name: string; is_active: boolean }[]
    expect(copias).toHaveLength(2)
    expect(copias[0].name).toBe('Botton Sailor Moon (cópia)')
    expect(copias.every(c => c.is_active === false)).toBe(true)
  })

  it('`Excluir` abre a confirmação e NÃO apaga nada de imediato', async () => {
    setup(dois, 2)
    selecionarPagina()

    await act(async () => {
      fireEvent.click(barra().getByRole('button', { name: 'Excluir' }))
    })

    expect(await screen.findByRole('list', { name: 'Produtos que serão excluídos' })).toBeInTheDocument()
    expect(deleteBatchMock).not.toHaveBeenCalled()
  })

  it('só depois da palavra digitada a exclusão acontece, com os ids selecionados', async () => {
    setup(dois, 2)
    selecionarPagina()
    deleteBatchMock.mockResolvedValue({ deleted: 2, failed: 0 })

    await act(async () => {
      fireEvent.click(barra().getByRole('button', { name: 'Excluir' }))
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Continuar' }))
    fireEvent.change(screen.getByLabelText('Confirmação'), { target: { value: 'EXCLUIR' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Excluir 2 produtos' }))
    })

    expect(deleteBatchMock).toHaveBeenCalledWith(['p1', 'p2'])
  })

  it('exclusão que falha relata `X excluídos · Y falharam`', async () => {
    setup(dois, 2)
    selecionarPagina()
    deleteBatchMock.mockResolvedValue({ deleted: 0, failed: 2, message: 'violates foreign key' })

    await act(async () => {
      fireEvent.click(barra().getByRole('button', { name: 'Excluir' }))
    })
    fireEvent.click(await screen.findByRole('button', { name: 'Continuar' }))
    fireEvent.change(screen.getByLabelText('Confirmação'), { target: { value: 'excluir' } })
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: 'Excluir 2 produtos' }))
    })

    expect(toastMock).toHaveBeenCalledWith(
      expect.objectContaining({ title: '0 excluídos · 2 falharam', variant: 'destructive' }),
    )
  })

  it('categoria que já estava no produto não gera escrita nenhuma', async () => {
    setup([row({ category_ids: ['cat-anime'] })], 1)
    fireEvent.click(screen.getByRole('checkbox', { name: 'Selecionar Botton Sailor Moon' }))
    updateBatchMock.mockResolvedValue({ changed: 0, failed: [] })

    fireEvent.click(barra().getByRole('button', { name: 'Editar em massa' }))
    fireEvent.click(await screen.findByLabelText('Editar categorias'))
    fireEvent.click(await screen.findByRole('button', { name: 'Anime' }))
    await act(async () => {
      fireEvent.click(screen.getByRole('button', { name: /Aplicar a 1 produto/ }))
    })

    // `category_ids` saiu do update de coluna, e o diff não teve o que escrever.
    expect(updateBatchMock).toHaveBeenCalledWith([])
    expect(applyCategoryMock).not.toHaveBeenCalled()
  })
})
