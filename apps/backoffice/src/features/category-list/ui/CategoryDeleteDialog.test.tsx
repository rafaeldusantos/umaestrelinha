// RFN-09 / T57 — a exclusão nomeia o estrago, e a barra não tem `Mesclar`.

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CategoryBulkBar from './CategoryBulkBar'
import CategoryDeleteDialog from './CategoryDeleteDialog'
import { buildCategoryTree, deletionImpact } from '../model/categoryTree'
import type { AdminCategory } from '@/entities/category/api/useAdminCategories'

const cat = (over: Partial<AdminCategory> & { id: string; name: string }): AdminCategory => ({
  slug: over.slug ?? over.id,
  description: null, image_url: null, banner_url: null, color_accent: null,
  active: true, sort_order: 0, parent_id: null, product_count: 0,
  ...over,
} as AdminCategory)

const rows = () => buildCategoryTree([
  cat({ id: 'anime', name: 'Anime', sort_order: 1, product_count: 6 }),
  cat({ id: 'sailor', name: 'Sailor Moon', parent_id: 'anime', sort_order: 1, product_count: 12 }),
  cat({ id: 'kpop', name: 'K-Pop', sort_order: 2, product_count: 5 }),
])

const openDialog = (ids: string[], onConfirm = vi.fn()) => {
  const impact = deletionImpact(rows(), ids)
  render(
    <CategoryDeleteDialog open impact={impact} onOpenChange={vi.fn()} onConfirm={onConfirm} />,
  )
  return { impact, onConfirm }
}

// As unidades de `deletionImpact` vivem em `model/categoryTree.test.ts`, junto do código. Aqui se
// prova só o que é do diálogo: que os números viram texto na tela.

describe('CategoryDeleteDialog — o estrago dito antes (T57 AC 1)', () => {
  it('nomeia quantos vínculos com produtos serão removidos', () => {
    openDialog(['anime', 'sailor'])

    expect(screen.getByText(/18 vínculos com produtos/)).toBeInTheDocument()
    expect(screen.getByText(/Os produtos continuam existindo/)).toBeInTheDocument()
  })

  it('avisa que subcategorias vieram junto pela seleção', () => {
    openDialog(['anime', 'sailor'])

    expect(screen.getByText(/1 subcategoria/)).toBeInTheDocument()
  })

  it('lista cada categoria com a própria contagem', () => {
    openDialog(['anime', 'sailor'])

    const lista = screen.getByLabelText('Categorias que serão excluídas')
    expect(lista).toHaveTextContent('Anime')
    expect(lista).toHaveTextContent('6 produtos')
    expect(lista).toHaveTextContent('Sailor Moon')
    expect(lista).toHaveTextContent('12 produtos')
  })

  it('exige a palavra digitada antes de liberar a exclusão', () => {
    const { onConfirm } = openDialog(['kpop'])

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    const excluir = screen.getByRole('button', { name: /Excluir 1 categoria$/ })
    expect(excluir).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Confirmação'), { target: { value: 'excluir' } })
    expect(screen.getByRole('button', { name: /Excluir 1 categoria$/ })).toBeEnabled()

    fireEvent.click(screen.getByRole('button', { name: /Excluir 1 categoria$/ }))
    expect(onConfirm).toHaveBeenCalled()
  })

  it('palavra errada mantém o botão travado', () => {
    const { onConfirm } = openDialog(['kpop'])

    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.change(screen.getByLabelText('Confirmação'), { target: { value: 'apagar' } })

    expect(screen.getByRole('button', { name: /Excluir 1 categoria$/ })).toBeDisabled()
    expect(onConfirm).not.toHaveBeenCalled()
  })
})

describe('CategoryBulkBar — as quatro ações (T57 AC 2-3)', () => {
  const setup = (over: Partial<React.ComponentProps<typeof CategoryBulkBar>> = {}) => {
    const props = {
      count: 3, cascadedCount: 1,
      onMove: vi.fn(), onShow: vi.fn(), onHide: vi.fn(), onDelete: vi.fn(), onClear: vi.fn(),
      ...over,
    }
    render(<CategoryBulkBar {...props} />)
    return props
  }

  it('`Mesclar` NÃO existe — corte de escopo do aceite do artboard', () => {
    setup()

    expect(screen.queryByRole('button', { name: /Mesclar/ })).toBeNull()
  })

  it('mostra as quatro ações e a contagem', () => {
    setup()

    expect(screen.getByText('3 selecionadas')).toBeInTheDocument()
    for (const acao of ['Mover para…', 'Mostrar', 'Ocultar', 'Excluir']) {
      expect(screen.getByRole('button', { name: new RegExp(acao) })).toBeInTheDocument()
    }
  })

  it('avisa quantas subcategorias a seleção arrastou', () => {
    setup({ cascadedCount: 2 })

    expect(screen.getByText('inclui 2 subcategorias')).toBeInTheDocument()
  })

  it('sem cascata, não inventa o aviso', () => {
    setup({ cascadedCount: 0 })

    expect(screen.queryByText(/inclui/)).toBeNull()
  })

  it('cada ação chama o próprio callback', () => {
    const { onShow, onHide, onDelete } = setup()

    fireEvent.click(screen.getByRole('button', { name: /Mostrar/ }))
    fireEvent.click(screen.getByRole('button', { name: /Ocultar/ }))
    fireEvent.click(screen.getByRole('button', { name: /Excluir/ }))

    expect(onShow).toHaveBeenCalledTimes(1)
    expect(onHide).toHaveBeenCalledTimes(1)
    expect(onDelete).toHaveBeenCalledTimes(1)
  })
})
