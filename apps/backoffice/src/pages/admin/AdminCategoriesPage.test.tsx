// RFN-09 / T58 — a página montada.
//
// As ACs: fora do modo Reordenar não há alça; soltar entre irmãs grava `sort_order` e soltar em
// outro pai NÃO grava; a tela monta tabela + inspetor. O dublê do hook é o que permite provar o que
// foi para o banco sem subir Supabase.

import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminCategory } from '@/entities/category/api/useAdminCategories'

const cat = (over: Partial<AdminCategory> & { id: string; name: string }): AdminCategory => ({
  slug: over.slug ?? over.id,
  description: null, image_url: null, banner_url: null, color_accent: null,
  active: true, sort_order: 0, parent_id: null, product_count: 0,
  ...over,
} as AdminCategory)

const CATALOGO = [
  cat({ id: 'anime', name: 'Anime', sort_order: 1, product_count: 6 }),
  cat({ id: 'sailor', name: 'Sailor Moon', parent_id: 'anime', sort_order: 1, product_count: 12 }),
  cat({ id: 'chainsaw', name: 'Chainsaw Man', parent_id: 'anime', sort_order: 2, product_count: 9 }),
  cat({ id: 'kpop', name: 'K-Pop', sort_order: 2, product_count: 5, active: false }),
]

const hook = vi.hoisted(() => ({
  updateCategory: vi.fn().mockResolvedValue(null),
  updateCategoriesBatch: vi.fn().mockResolvedValue(null),
  deleteCategoriesBatch: vi.fn().mockResolvedValue(null),
  moveCategories: vi.fn().mockResolvedValue(null),
  updateSortOrders: vi.fn().mockResolvedValue(null),
  createCategory: vi.fn().mockResolvedValue({ error: null, id: 'novo' }),
}))

vi.mock('@/entities/category/api/useAdminCategories', () => ({
  useAdminCategories: () => ({
    categories: CATALOGO,
    tree: [],
    loading: false,
    fetchCategories: vi.fn(),
    ...hook,
  }),
}))

vi.mock('@estrelinha/ui/hooks/use-toast', () => ({ toast: vi.fn() }))

import AdminCategoriesPage from './AdminCategoriesPage'
import { toast } from '@estrelinha/ui/hooks/use-toast'

beforeEach(() => {
  for (const fn of Object.values(hook)) fn.mockClear()
  vi.mocked(toast).mockClear()
})

const drop = (targetTestId: string, draggedId: string) => {
  fireEvent.drop(screen.getByTestId(targetTestId), {
    dataTransfer: { getData: () => draggedId, setData: vi.fn() },
  })
}

describe('AdminCategoriesPage — modo Reordenar (T58 AC 1-2)', () => {
  it('fora do modo Reordenar a linha não é arrastável', () => {
    render(<AdminCategoriesPage />)

    expect(screen.getByTestId('categoria-anime')).not.toHaveAttribute('draggable', 'true')
    expect(screen.getByRole('button', { name: /Reordenar/ })).toHaveAttribute('aria-pressed', 'false')
  })

  it('ligar o modo torna as linhas arrastáveis', () => {
    render(<AdminCategoriesPage />)

    fireEvent.click(screen.getByRole('button', { name: /Reordenar/ }))

    expect(screen.getByTestId('categoria-anime')).toHaveAttribute('draggable', 'true')
  })

  it('soltar entre IRMÃS grava só as linhas que mudaram de posição', async () => {
    render(<AdminCategoriesPage />)
    fireEvent.click(screen.getByRole('button', { name: /Reordenar/ }))

    drop('categoria-sailor', 'chainsaw')

    await waitFor(() => expect(hook.updateSortOrders).toHaveBeenCalledWith([
      { id: 'chainsaw', sort_order: 1 },
      { id: 'sailor', sort_order: 2 },
    ]))
  })

  it('soltar em OUTRO pai não grava nada e explica onde se muda de pai', async () => {
    render(<AdminCategoriesPage />)
    fireEvent.click(screen.getByRole('button', { name: /Reordenar/ }))

    drop('categoria-kpop', 'sailor')

    await waitFor(() => expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Só dá para reordenar entre irmãs' }),
    ))
    expect(hook.updateSortOrders).not.toHaveBeenCalled()
  })
})

describe('AdminCategoriesPage — tabela e inspetor (T58 AC 3)', () => {
  it('monta a árvore e só abre o inspetor depois de escolher a linha', () => {
    render(<AdminCategoriesPage />)

    expect(screen.getByTestId('categoria-anime')).toBeInTheDocument()
    expect(screen.queryByLabelText('Editar Anime')).toBeNull()

    fireEvent.click(screen.getByText('Anime'))

    expect(screen.getByLabelText('Editar Anime')).toBeInTheDocument()
  })

  it('o inspetor salva pelo hook, com o payload do formulário', async () => {
    render(<AdminCategoriesPage />)
    fireEvent.click(screen.getByText('K-Pop'))

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'K-Pop BR' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    await waitFor(() => expect(hook.updateCategory).toHaveBeenCalledWith(
      'kpop',
      expect.objectContaining({ name: 'K-Pop BR', parent_id: null }),
    ))
  })

  it('o interruptor da linha grava `active` sem abrir o inspetor', async () => {
    render(<AdminCategoriesPage />)

    fireEvent.click(screen.getByLabelText('Mostrar Anime na vitrine'))

    await waitFor(() => expect(hook.updateCategory).toHaveBeenCalledWith('anime', { active: false }))
    expect(screen.queryByLabelText('Editar Anime')).toBeNull()
  })
})

describe('AdminCategoriesPage — seleção e massa (T58)', () => {
  it('marcar o pai arrasta as filhas para o conjunto do update', async () => {
    render(<AdminCategoriesPage />)

    fireEvent.click(screen.getByLabelText('Selecionar Anime'))
    expect(screen.getByText('3 selecionadas')).toBeInTheDocument()
    expect(screen.getByText('inclui 2 subcategorias')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Ocultar/ }))

    await waitFor(() => expect(hook.updateCategoriesBatch).toHaveBeenCalledWith(
      expect.arrayContaining(['anime', 'sailor', 'chainsaw']),
      { active: false },
    ))
  })

  it('sem seleção não existe barra de massa', () => {
    render(<AdminCategoriesPage />)

    expect(screen.queryByRole('toolbar', { name: 'Ações em massa de categorias' })).toBeNull()
  })
})

describe('AdminCategoriesPage — `Mover para…` escolhe o destino na própria tela', () => {
  const abrirMover = (categoria: string) => {
    render(<AdminCategoriesPage />)
    fireEvent.click(screen.getByLabelText(`Selecionar ${categoria}`))
    fireEvent.click(screen.getByRole('button', { name: /Mover para/ }))
  }

  it('abre o seletor de destino em vez de mandar o admin procurar no inspetor', () => {
    abrirMover('K-Pop')

    expect(screen.getByLabelText('Mover para')).toBeInTheDocument()
    expect(toast).not.toHaveBeenCalled()
  })

  it('escolher o destino grava `parent_id` e a posição depois das irmãs de lá', async () => {
    abrirMover('K-Pop')

    fireEvent.change(screen.getByLabelText('Mover para'), { target: { value: 'anime' } })
    fireEvent.click(screen.getByRole('button', { name: /^Mover 1 categoria/ }))

    // Anime já tem Sailor(1) e Chainsaw(2) — K-Pop entra na 3, não em cima delas.
    await waitFor(() => expect(hook.moveCategories).toHaveBeenCalledWith([
      { id: 'kpop', parent_id: 'anime', sort_order: 3 },
    ]))
  })

  it('mover o pai NÃO reescreve as filhas — elas são carregadas junto', async () => {
    abrirMover('Anime')

    fireEvent.change(screen.getByLabelText('Mover para'), { target: { value: 'kpop' } })
    fireEvent.click(screen.getByRole('button', { name: /^Mover 1 categoria/ }))

    await waitFor(() => expect(hook.moveCategories).toHaveBeenCalledWith([
      { id: 'anime', parent_id: 'kpop', sort_order: 1 },
    ]))
  })

  it('escolher o pai que já era não grava nada e diz isso', async () => {
    abrirMover('Sailor Moon')

    fireEvent.change(screen.getByLabelText('Mover para'), { target: { value: 'anime' } })
    fireEvent.click(screen.getByRole('button', { name: /^Mover 1 categoria/ }))

    await waitFor(() => expect(toast).toHaveBeenCalledWith(
      expect.objectContaining({ title: 'Nada mudou de lugar' }),
    ))
    expect(hook.moveCategories).not.toHaveBeenCalled()
  })
})

describe('AdminCategoriesPage — busca e visões (T58)', () => {
  it('a busca mantém o pai visível quando só a filha casa', () => {
    render(<AdminCategoriesPage />)

    fireEvent.change(screen.getByLabelText('Buscar categoria ou slug'), { target: { value: 'chainsaw' } })

    expect(screen.getByTestId('categoria-chainsaw')).toBeInTheDocument()
    expect(screen.getByTestId('categoria-anime')).toBeInTheDocument()
    expect(screen.queryByTestId('categoria-kpop')).toBeNull()
  })

  it('a visão `Ocultas` traz só quem está fora da vitrine', () => {
    render(<AdminCategoriesPage />)

    fireEvent.click(screen.getByRole('button', { name: 'Ocultas' }))

    expect(screen.getByTestId('categoria-kpop')).toBeInTheDocument()
    expect(screen.queryByTestId('categoria-anime')).toBeNull()
  })
})
