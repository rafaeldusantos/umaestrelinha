// RFN-09 / T55 — a tabela em árvore.
//
// As ACs da task: o interruptor grava sem abrir o inspetor, o caret esconde e mostra as filhas, e
// clicar na linha escolhe a categoria do inspetor. O que se prova é o COMPORTAMENTO OBSERVÁVEL —
// qual callback recebeu qual argumento, e o que sumiu da tela.

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CategoryTable from './CategoryTable'
import { buildCategoryTree } from '../model/categoryTree'
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
  cat({ id: 'kpop', name: 'K-Pop', sort_order: 2, product_count: 5, active: false }),
])

const setup = (over: Partial<React.ComponentProps<typeof CategoryTable>> = {}) => {
  const props = {
    rows: rows(),
    selectedIds: [],
    activeId: null,
    collapsedIds: [],
    onToggleSelect: vi.fn(),
    onToggleAll: vi.fn(),
    onToggleCollapse: vi.fn(),
    onToggleActive: vi.fn(),
    onOpen: vi.fn(),
    onDrop: vi.fn(),
    ...over,
  }
  render(<CategoryTable {...props} />)
  return props
}

describe('CategoryTable — visibilidade inline (T55 AC 1)', () => {
  it('clicar no interruptor grava `active` e NÃO abre o inspetor', () => {
    const { onToggleActive, onOpen } = setup()

    fireEvent.click(screen.getByLabelText('Mostrar Anime na vitrine'))

    expect(onToggleActive).toHaveBeenCalledWith('anime', false)
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('o interruptor reflete o estado atual e o rótulo acompanha', () => {
    setup()

    expect(screen.getByLabelText('Mostrar Anime na vitrine')).toBeChecked()
    expect(screen.getByLabelText('Mostrar K-Pop na vitrine')).not.toBeChecked()
    expect(screen.getByText('Oculta')).toBeInTheDocument()
  })
})

describe('CategoryTable — o caret (T55 AC 2)', () => {
  it('expandida, a filha está na tela, e o caret pede para colapsar', () => {
    const { onToggleCollapse } = setup()

    expect(screen.getByTestId('categoria-sailor')).toBeInTheDocument()
    fireEvent.click(screen.getByLabelText('Colapsar Anime'))

    expect(onToggleCollapse).toHaveBeenCalledWith('anime')
  })

  it('colapsada, a filha some — e só ela; o pai fica', () => {
    setup({ collapsedIds: ['anime'] })

    expect(screen.queryByTestId('categoria-sailor')).toBeNull()
    expect(screen.getByTestId('categoria-anime')).toBeInTheDocument()
    expect(screen.getByLabelText('Expandir Anime')).toBeInTheDocument()
  })

  it('raiz sem filha não tem caret', () => {
    setup()

    expect(screen.queryByLabelText('Colapsar K-Pop')).toBeNull()
    expect(screen.getByLabelText('Colapsar Anime')).toBeInTheDocument()
  })
})

describe('CategoryTable — seleção e inspetor (T55 AC 3)', () => {
  it('clicar no nome da linha escolhe a categoria do inspetor', () => {
    const { onOpen } = setup()

    fireEvent.click(screen.getByText('Sailor Moon'))

    expect(onOpen).toHaveBeenCalledWith('sailor')
  })

  it('a caixa de seleção marca a categoria sem abrir o inspetor', () => {
    const { onToggleSelect, onOpen } = setup()

    fireEvent.click(screen.getByLabelText('Selecionar Anime'))

    expect(onToggleSelect).toHaveBeenCalledWith('anime')
    expect(onOpen).not.toHaveBeenCalled()
  })

  it('a caixa do cabeçalho fica desmarcada com seleção parcial', () => {
    setup({ selectedIds: ['anime', 'sailor'] })

    expect(screen.getByLabelText('Selecionar todas as categorias')).not.toBeChecked()
  })

  it('a caixa do cabeçalho marca quando TODAS as linhas estão selecionadas', () => {
    setup({ selectedIds: ['anime', 'sailor', 'kpop'] })

    expect(screen.getByLabelText('Selecionar todas as categorias')).toBeChecked()
  })
})

describe('CategoryTable — a contagem que a linha mostra (T55)', () => {
  it('o pai mostra o total com as filhas e diz que são "+ filhas"', () => {
    setup()

    const linhaAnime = screen.getByTestId('categoria-anime')
    expect(linhaAnime).toHaveTextContent('18') // 6 + 12
    expect(linhaAnime).toHaveTextContent('+ filhas')
    expect(linhaAnime).toHaveTextContent('1 subcategoria')
  })
})

describe('CategoryTable — modo Reordenar (T58 AC 1, desenhado aqui)', () => {
  it('fora do modo Reordenar a linha não é arrastável', () => {
    setup()

    expect(screen.getByTestId('categoria-anime')).not.toHaveAttribute('draggable', 'true')
  })

  it('no modo Reordenar a linha é arrastável e soltar informa origem e destino', () => {
    const { onDrop } = setup({ reordering: true })

    const alvo = screen.getByTestId('categoria-kpop')
    expect(alvo).toHaveAttribute('draggable', 'true')

    const dataTransfer = { getData: () => 'anime', setData: vi.fn() }
    fireEvent.drop(alvo, { dataTransfer })

    expect(onDrop).toHaveBeenCalledWith('anime', 'kpop')
  })
})
