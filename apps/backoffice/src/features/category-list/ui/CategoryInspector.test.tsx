// RFN-09 / T56 — o inspetor.
//
// A AC 1 tem uma prova específica: o payload de `Salvar` precisa conter `parent_id` e `banner_url`
// — as colunas que a `T52` criou e cuja ausência fazia TODO save morrer em PGRST204. Um teste que
// só checasse "onSave foi chamado" passaria com o payload velho e quebrado.

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CategoryInspector from './CategoryInspector'
import type { AdminCategory } from '@/entities/category/api/useAdminCategories'

const cat = (over: Partial<AdminCategory> & { id: string; name: string }): AdminCategory => ({
  slug: over.slug ?? over.id,
  description: null, image_url: null, banner_url: null, color_accent: null,
  active: true, sort_order: 0, parent_id: null, product_count: 0,
  ...over,
} as AdminCategory)

const catalog = () => [
  cat({ id: 'anime', name: 'Anime', product_count: 6 }),
  cat({ id: 'sailor', name: 'Sailor Moon', parent_id: 'anime' }),
  cat({ id: 'kpop', name: 'K-Pop' }),
]

const setup = (over: Partial<React.ComponentProps<typeof CategoryInspector>> = {}) => {
  const props = {
    category: catalog()[0],
    allCategories: catalog(),
    productCount: 6,
    onSave: vi.fn().mockResolvedValue(null),
    onClose: vi.fn(),
    ...over,
  }
  render(<CategoryInspector {...props} />)
  return props
}

describe('CategoryInspector — Salvar grava o que a T52 criou (T56 AC 1)', () => {
  it('o payload leva `parent_id` e `banner_url` — as colunas do PGRST204', () => {
    const { onSave } = setup()

    fireEvent.change(screen.getByLabelText('Imagem de capa'), { target: { value: 'https://cdn/capa.webp' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onSave).toHaveBeenCalledWith('anime', expect.objectContaining({
      banner_url: 'https://cdn/capa.webp',
      parent_id: null,
    }))
  })

  it('grava nome, slug, descrição e visibilidade editados', () => {
    const { onSave } = setup()

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Animê' } })
    fireEvent.change(screen.getByLabelText('URL da categoria'), { target: { value: 'anime-br' } })
    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: 'Bottons de anime' } })
    fireEvent.click(screen.getByLabelText('Mostrar na vitrine'))
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onSave).toHaveBeenCalledWith('anime', {
      name: 'Animê',
      slug: 'anime-br',
      description: 'Bottons de anime',
      banner_url: null,
      parent_id: null,
      active: false,
    })
  })

  it('campo vazio vira `null`, não string vazia — o banco distingue os dois', () => {
    const { onSave } = setup({
      category: cat({ id: 'anime', name: 'Anime', description: 'algo', banner_url: 'https://x' }),
    })

    fireEvent.change(screen.getByLabelText('Descrição'), { target: { value: '' } })
    fireEvent.change(screen.getByLabelText('Imagem de capa'), { target: { value: '' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onSave).toHaveBeenCalledWith('anime', expect.objectContaining({
      description: null,
      banner_url: null,
    }))
  })
})

describe('CategoryInspector — o seletor de pai (T56 AC 2)', () => {
  it('não oferece a própria categoria nem uma filha dela', () => {
    setup()

    const opcoes = screen.getAllByRole('option').map(o => o.textContent)

    expect(opcoes).not.toContain('Anime')
    expect(opcoes).not.toContain('Sailor Moon')
    expect(opcoes).toEqual(['Nenhuma — categoria raiz', 'K-Pop'])
  })

  it('escolher um pai grava o id dele', () => {
    const { onSave } = setup({ category: catalog()[2] })

    fireEvent.change(screen.getByLabelText('Categoria pai'), { target: { value: 'anime' } })
    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))

    expect(onSave).toHaveBeenCalledWith('kpop', expect.objectContaining({ parent_id: 'anime' }))
  })
})

describe('CategoryInspector — Cancelar (T56 AC 3)', () => {
  it('cancelar com alteração pendente não grava nada', () => {
    const { onSave, onClose } = setup()

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Outro nome' } })
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onSave).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })

  it('sem alteração, `Salvar` fica desabilitado e o rodapé diz que está tudo salvo', () => {
    setup()

    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
    expect(screen.getByText('Tudo salvo')).toBeInTheDocument()
  })

  it('com alteração, o rodapé avisa que há pendência', () => {
    setup()

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Mudou' } })

    expect(screen.getByText('Alterações não salvas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeEnabled()
  })
})

describe('CategoryInspector — trocar de categoria (T56)', () => {
  it('selecionar outra categoria recarrega o formulário em vez de manter o rascunho', () => {
    const { rerender } = render(
      <CategoryInspector
        category={catalog()[0]}
        allCategories={catalog()}
        productCount={6}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Rascunho perdido' } })

    rerender(
      <CategoryInspector
        category={catalog()[2]}
        allCategories={catalog()}
        productCount={5}
        onSave={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Nome')).toHaveValue('K-Pop')
  })
})
