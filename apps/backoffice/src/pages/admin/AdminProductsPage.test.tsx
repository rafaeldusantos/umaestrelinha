// PLS-01…PLS-04 e PLS-09 na TELA: o rodapé com o total do servidor, a faixa de preço travada com
// explicação, `sempre disponível`, o badge de grade incompleta e a edição inline com teclado.

import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import type { AdminListRow } from '@/entities/product/api/productQuery'

const {
  listMock, countsMock, toastMock, updateMock, eqMock, fromMock, refetchMock, navigateMock, lojaOrigem,
  fetchAllMock, updateBatchMock, createBatchMock, deleteBatchMock, applyCategoryMock, categorias, fornecedores,
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
  categorias: { atual: [{ id: 'cat-anime', name: 'Anime' }] },
  fornecedores: { atual: [] as { id: string; name: string }[] },
  lojaOrigem: { atual: 'https://loja.exemplo' as string | null },
}))

vi.mock('@/entities/product/api/useAdminProducts', () => ({
  useAdminProductList: listMock,
  useProductViewCounts: countsMock,
}))
vi.mock('@/entities/category/api/useAdminCategories', () => ({
  useAdminCategories: () => ({ categories: categorias.atual }),
}))
// Feature 80: a leitura dos fornecedores é React Query, e este arquivo não monta provedor — a
// listagem é provada com a leitura dublada, como a de categorias logo acima.
vi.mock('@/entities/supplier', async importOriginal => ({
  ...(await importOriginal<typeof import('@/entities/supplier')>()),
  useSuppliers: () => ({ suppliers: fornecedores.atual, loading: false, error: null }),
}))
// `VITE_STORE_URL` é lido no carregamento do módulo: com a env, o teste mediria o `.env` da máquina.
vi.mock('@/shared/lib/storeOrigin', () => ({ storeOrigin: () => lojaOrigem.atual }))
vi.mock('@/features/csv-import/ui/CsvImportDialog', () => ({ default: () => null }))
vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: toastMock }))
vi.mock('@estrelinha/supabase/client', () => ({ supabase: { from: fromMock } }))
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
  categorias.atual = [{ id: 'cat-anime', name: 'Anime' }]
  fornecedores.atual = []
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

describe('a coluna Categorias', () => {
  const muitas = [
    { id: 'c1', name: 'Cinzas' },
    { id: 'c2', name: 'Pingentes' },
    { id: 'c3', name: 'Colares' },
    { id: 'c4', name: 'Leite materno' },
  ]

  it('mostra só as duas primeiras, termina em reticências e abre todas ao tocar', async () => {
    categorias.atual = muitas
    setup([row({ category_ids: ['c1', 'c2', 'c3', 'c4'] })])

    const gatilho = screen.getByRole('button', { name: 'Ver as 4 categorias de Botton Sailor Moon' })
    expect(gatilho).toHaveTextContent('Cinzas, Pingentes…')
    expect(gatilho).not.toHaveTextContent('Colares')
    expect(screen.queryByText('Leite materno')).toBeNull()

    fireEvent.click(gatilho)
    const balao = await screen.findByRole('dialog')
    expect(within(balao).getAllByRole('listitem').map(li => li.textContent))
      .toEqual(['Cinzas', 'Pingentes', 'Colares', 'Leite materno'])
  })

  it('com até duas categorias não há botão nem reticências', () => {
    categorias.atual = muitas
    setup([row({ category_ids: ['c1', 'c2'] })])

    expect(screen.getByText('Cinzas, Pingentes')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /categorias de/ })).toBeNull()
  })

  it('sem categoria mostra o travessão', () => {
    setup([row({ category_ids: [] })])
    expect(screen.queryByRole('button', { name: /categorias de/ })).toBeNull()
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })
})

describe('feature 80 — o fornecedor na listagem', () => {
  it('FOR-17 — a coluna mostra o nome e o atalho para a peça em nova aba', () => {
    setup([row({ supplier: { name: 'Ateliê Prata', url: 'https://www.exemplo.com/item/9' } })])

    expect(screen.getByRole('columnheader', { name: 'Fornecedor' })).toBeInTheDocument()
    expect(screen.getByText('Ateliê Prata')).toBeInTheDocument()
    const a = screen.getByRole('link', { name: 'Abrir a peça em Ateliê Prata (exemplo.com/item/9), em nova aba' })
    expect(a).toHaveAttribute('href', 'https://www.exemplo.com/item/9')
    expect(a).toHaveAttribute('target', '_blank')
    expect(a).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('FOR-17 — sem link, só o nome; sem fornecedor, o travessão', () => {
    setup([
      row({ id: 'a', name: 'Com nome', supplier: { name: 'Resinas do Sul', url: '' } }),
      row({ id: 'b', name: 'Sem nada', supplier: null }),
    ])
    expect(screen.getByText('Resinas do Sul')).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Abrir a peça/ })).toBeNull()
    const linhaSem = screen.getByText('Sem nada').closest('tr')!
    expect(within(linhaSem).getAllByText('—').length).toBeGreaterThan(0)
  })

  it('FOR-17 — a coluna é configurável: desmarcar "Fornecedor" em Colunas a esconde', async () => {
    setup([row({ supplier: { name: 'Ateliê Prata', url: '' } })])
    expect(screen.getByRole('columnheader', { name: 'Fornecedor' })).toBeInTheDocument()

    // O idioma do arquivo para abrir menu do Radix: Enter no gatilho.
    fireEvent.keyDown(screen.getByRole('button', { name: /Colunas/ }), { key: 'Enter' })
    fireEvent.click(await screen.findByRole('menuitem', { name: /Fornecedor/ }))
    // Fechar o menu ANTES de medir: aberto, o Radix deixa o resto da tela `aria-hidden`, e "o
    // cabeçalho sumiu" seria verdade com a coluna ainda lá.
    fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('menu')).toBeNull())

    expect(screen.queryByRole('columnheader', { name: 'Fornecedor' })).toBeNull()
    expect(screen.queryByText('Ateliê Prata')).toBeNull()
    expect(screen.getByRole('columnheader', { name: 'Categorias' })).toBeInTheDocument()
  })

  it('FOR-18 — escolher o fornecedor no filtro pede a lista filtrada, e o chip mostra o nome', async () => {
    fornecedores.atual = [{ id: 'atelie', name: 'Ateliê Prata' }]
    setup()

    fireEvent.click(screen.getByRole('combobox', { name: 'Fornecedor' }))
    fireEvent.click(await screen.findByRole('option', { name: 'Ateliê Prata' }))

    await waitFor(() =>
      expect(listMock).toHaveBeenLastCalledWith(
        expect.objectContaining({ filters: expect.objectContaining({ supplierIds: ['atelie'] }) }),
      ),
    )
    expect(screen.getByRole('button', { name: 'Remover filtro Fornecedor: Ateliê Prata' })).toBeInTheDocument()
  })
})

describe('AdminProductsPage — abrir fora da aba e ativar pela linha', () => {
  const dois = [row(), row({ id: 'p2', name: 'Botton Guardado', is_active: false })]
  const linhaDe = (nome: string) => screen.getByRole('link', { name: nome }).closest('tr') as HTMLElement

  // O menu do botão direito se posiciona no ponteiro por `DOMRect.fromRect`; o jsdom não tem
  // `DOMRect` nenhum.
  beforeEach(() => {
    const g = globalThis as unknown as { DOMRect?: { fromRect?: unknown } }
    if (!g.DOMRect?.fromRect) {
      vi.stubGlobal('DOMRect', {
        fromRect: ({ x = 0, y = 0, width = 0, height = 0 } = {}) => ({
          x, y, width, height, top: y, left: x, right: x + width, bottom: y + height, toJSON: () => ({}),
        }),
      })
    }
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    lojaOrigem.atual = 'https://loja.exemplo'
  })

  it('o nome é link de verdade para o cadastro (Ctrl/⌘-clique abre noutra aba)', () => {
    setup(dois, 2)
    const link = screen.getByRole('link', { name: 'Botton Sailor Moon' })
    expect(link.getAttribute('href')).toBe('/admin/produtos/p1/editar')
  })

  it('a linha leva o nome inteiro na dica, e a célula do nome tem largura fixa', () => {
    const longo = 'Pingente Coração com Cinzas e Mecha de Cabelo em Prata 925 Banhado'
    setup([row({ name: longo })], 1)
    const link = screen.getByRole('link', { name: longo })
    expect(link.closest('tr')?.getAttribute('title')).toBe(longo)
    expect(link.className.split(/\s+/)).toContain('truncate')
    expect((link.parentElement?.parentElement?.className ?? '').split(/\s+/)).toContain('w-[200px]')
  })

  it('a coluna Ações é um só botão "⋯", sem ícones soltos', () => {
    setup(dois, 2)
    expect(screen.getByRole('button', { name: 'Ações de Botton Sailor Moon' })).toBeInTheDocument()
    expect(screen.queryByTitle('Editar')).toBeNull()
    expect(screen.queryByTitle('Duplicar')).toBeNull()
  })

  it('o "⋯" e o botão direito oferecem a MESMA lista', async () => {
    setup(dois, 2)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Ações de Botton Sailor Moon' }), { key: 'Enter' })
    await screen.findByRole('menuitem', { name: 'Editar' })
    const doPontinho = screen.getAllByRole('menuitem').map(i => i.textContent?.trim())
    fireEvent.keyDown(document.activeElement ?? document.body, { key: 'Escape' })

    fireEvent.contextMenu(linhaDe('Botton Sailor Moon'))
    await screen.findByRole('menuitem', { name: 'Editar' })
    const doBotaoDireito = screen.getAllByRole('menuitem').map(i => i.textContent?.trim())

    expect(doPontinho).toEqual([
      'Editar', 'Editar em nova aba', 'Editar em nova janela', 'Ver na loja', 'Desativar', 'Duplicar', 'Excluir',
    ])
    expect(doBotaoDireito).toEqual(doPontinho)
  })

  it('"Ver na loja" abre a página da peça na loja, em nova aba', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    setup(dois, 2)
    fireEvent.keyDown(screen.getByRole('button', { name: 'Ações de Botton Sailor Moon' }), { key: 'Enter' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Ver na loja' }))
    expect(openSpy).toHaveBeenCalledWith(
      'https://loja.exemplo/produtos/botton-sailor-moon', '_blank', 'noopener,noreferrer',
    )
    openSpy.mockRestore()
  })

  it('peça desativada: "Ver na loja" fica indisponível (a loja daria 404)', async () => {
    setup(dois, 2)
    fireEvent.contextMenu(linhaDe('Botton Guardado'))
    const item = await screen.findByRole('menuitem', { name: 'Ver na loja (desativado)' })
    expect(item.getAttribute('aria-disabled')).toBe('true')
  })

  it('sem VITE_STORE_URL a opção da loja não aparece', async () => {
    lojaOrigem.atual = null
    setup(dois, 2)
    fireEvent.contextMenu(linhaDe('Botton Sailor Moon'))
    await screen.findByRole('menuitem', { name: 'Editar' })
    expect(screen.queryByRole('menuitem', { name: /Ver na loja/ })).toBeNull()
  })

  it('"Editar em nova aba" e "Editar em nova janela" abrem o cadastro fora desta aba', async () => {
    const openSpy = vi.spyOn(window, 'open').mockReturnValue(null)
    setup(dois, 2)

    fireEvent.contextMenu(linhaDe('Botton Sailor Moon'))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Editar em nova aba' }))
    expect(openSpy).toHaveBeenLastCalledWith(
      `${window.location.origin}/admin/produtos/p1/editar`, '_blank', 'noopener,noreferrer',
    )

    fireEvent.contextMenu(linhaDe('Botton Sailor Moon'))
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Editar em nova janela' }))
    const [url, alvo, recursos] = openSpy.mock.lastCall as [string, string, string]
    expect([url, alvo]).toEqual([`${window.location.origin}/admin/produtos/p1/editar`, '_blank'])
    // Sem medida o navegador abre aba, e as duas opções fariam a mesma coisa.
    expect(recursos).toMatch(/width=\d+/)
    openSpy.mockRestore()
  })

  it('Ativar/Desativar pela linha usa o mesmo patch da barra, só naquela linha', async () => {
    setup(dois, 2)
    updateBatchMock.mockResolvedValue({ changed: 1, failed: [] })

    fireEvent.keyDown(screen.getByRole('button', { name: 'Ações de Botton Sailor Moon' }), { key: 'Enter' })
    await act(async () => {
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Desativar' }))
    })
    expect(updateBatchMock).toHaveBeenLastCalledWith([{ id: 'p1', values: { is_active: false } }])

    fireEvent.contextMenu(linhaDe('Botton Guardado'))
    await act(async () => {
      fireEvent.click(await screen.findByRole('menuitem', { name: 'Ativar' }))
    })
    expect(updateBatchMock).toHaveBeenLastCalledWith([{ id: 'p2', values: { is_active: true } }])
  })
})

// O recorte da lista mora na URL. Antes ele vivia num `useState`: o F5, ou abrir um produto e
// voltar, devolvia a lista à primeira página de "Todos", e a Adri refazia o filtro a cada peça.
describe('AdminProductsPage — o filtro e a página sobrevivem ao F5 e à ida ao produto', () => {
  const Onde = () => {
    const loc = useLocation()
    return <output data-testid="onde">{loc.pathname + loc.search}</output>
  }
  // O cadastro aberto, dublado: mostra o endereço de volta que a lista entregou.
  const Cadastro = () => {
    const state = useLocation().state as { voltarPara?: string } | null
    return <output data-testid="volta">{state?.voltarPara ?? '(nenhum)'}</output>
  }
  const renderEm = (url: string, rows: AdminListRow[] = [row()], total = 160) => {
    listMock.mockReturnValue({
      rows, total, loading: false, error: null, refetch: refetchMock, fetchAllFiltered: fetchAllMock,
      createProductsBatch: createBatchMock, updateProductsBatch: updateBatchMock,
      deleteProductsBatch: deleteBatchMock, applyCategoryWrites: applyCategoryMock,
    })
    render(
      <MemoryRouter initialEntries={[url]}>
        <Routes>
          <Route path="/admin/produtos" element={<><AdminProductsPage /><Onde /></>} />
          <Route path="/admin/produtos/:id/editar" element={<Cadastro />} />
        </Routes>
      </MemoryRouter>,
    )
  }
  const ultimaConsulta = () => listMock.mock.calls[listMock.mock.calls.length - 1][0]
  const onde = () => screen.getByTestId('onde').textContent

  it('abrir a lista com o recorte na URL consulta esse recorte — é o F5', () => {
    renderEm('/admin/produtos?visao=rascunhos&categoria=cat-anime&tag=prata&preco-min=10&busca=sailor&pagina=3&por-pagina=50&ordem=price-asc')

    expect(ultimaConsulta()).toMatchObject({
      page: 3,
      pageSize: 50,
      search: 'sailor',
      sort: { key: 'price', dir: 'asc' },
      filters: { view: 'rascunhos', categoryIds: ['cat-anime'], tags: ['prata'], priceMin: 10 },
    })
    expect(screen.getByPlaceholderText(/Buscar por nome, SKU ou tag/)).toHaveValue('sailor')
    expect(screen.getByRole('tab', { name: /Rascunhos/ })).toHaveAttribute('aria-selected', 'true')
  })

  it('a lista sem parâmetro é a de sempre, e o endereço continua limpo', () => {
    renderEm('/admin/produtos')

    expect(ultimaConsulta()).toMatchObject({ page: 1, pageSize: 25, search: '', filters: { view: 'todos' } })
    expect(onde()).toBe('/admin/produtos')
  })

  it('mudar de página escreve a página na URL', () => {
    renderEm('/admin/produtos?visao=ativos')

    fireEvent.click(screen.getAllByRole('button', { name: 'Próxima página' })[0])

    expect(onde()).toBe('/admin/produtos?visao=ativos&pagina=2')
    expect(ultimaConsulta().page).toBe(2)
  })

  it('escolher uma visão escreve a visão e volta à primeira página', () => {
    renderEm('/admin/produtos?pagina=4')

    fireEvent.click(screen.getByRole('tab', { name: /Rascunhos/ }))

    expect(onde()).toBe('/admin/produtos?visao=rascunhos')
  })

  it('a busca digitada vai para a URL', () => {
    renderEm('/admin/produtos?visao=ativos')

    fireEvent.change(screen.getByPlaceholderText(/Buscar por nome, SKU ou tag/), { target: { value: 'anel coração' } })

    expect(onde()).toBe('/admin/produtos?visao=ativos&busca=anel+cora%C3%A7%C3%A3o')
  })

  it('o nome do produto leva ao cadastro com o endereço da lista NESTE recorte', () => {
    const url = '/admin/produtos?visao=ativos&categoria=cat-anime&pagina=3'
    renderEm(url)

    fireEvent.click(screen.getAllByRole('link', { name: 'Botton Sailor Moon' })[0])

    expect(screen.getByTestId('volta')).toHaveTextContent(url)
  })

  it('"Editar" do menu da linha também entrega o endereço de volta', async () => {
    const url = '/admin/produtos?visao=ativos&pagina=2'
    renderEm(url)

    fireEvent.keyDown(screen.getAllByRole('button', { name: 'Ações de Botton Sailor Moon' })[0], { key: 'Enter' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Editar' }))

    expect(navigateMock).toHaveBeenCalledWith('/admin/produtos/p1/editar', { state: { voltarPara: url } })
  })

  it('"Novo produto" também entrega o endereço de volta', async () => {
    const url = '/admin/produtos?visao=rascunhos'
    renderEm(url)

    fireEvent.keyDown(screen.getByRole('button', { name: /Novo produto/ }), { key: 'Enter' })
    fireEvent.click(await screen.findByRole('menuitem', { name: 'Novo produto' }))

    expect(navigateMock).toHaveBeenCalledWith('/admin/produtos/novo', { state: { voltarPara: url } })
  })
})
