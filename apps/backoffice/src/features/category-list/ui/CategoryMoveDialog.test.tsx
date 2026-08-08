// O `Mover para…` tem onde escolher o destino.
//
// O defeito que este arquivo tranca: a ação existia, a barra oferecia o botão, e a única resposta
// era um aviso mandando "escolher a categoria pai no inspetor" — lugar que edita UMA categoria e
// nunca soube nada sobre a seleção. O que se prova aqui é que a escolha acontece no diálogo, e que
// ela sai daqui como o id que vai para o `parent_id`.

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import CategoryMoveDialog from './CategoryMoveDialog'
import { buildCategoryTree, moveDestinations, moveSelection } from '../model/categoryTree'
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
  cat({ id: 'games', name: 'Games', sort_order: 3, product_count: 0 }),
])

const setup = (selectedIds: string[], onConfirm = vi.fn()) => {
  const all = rows()
  const { moving, carried } = moveSelection(all, selectedIds)
  render(
    <CategoryMoveDialog
      open
      onOpenChange={vi.fn()}
      moving={moving}
      carried={carried}
      destinations={moveDestinations(all, moving.map(row => row.category.id))}
      onConfirm={onConfirm}
    />,
  )
  return { onConfirm }
}

const seletor = () => screen.getByLabelText('Mover para') as HTMLSelectElement
const botaoMover = () => screen.getByRole('button', { name: /^Mover \d+ categoria/ })

describe('CategoryMoveDialog — o destino se escolhe aqui', () => {
  it('oferece um seletor de destino, e não um aviso mandando procurar noutro lugar', () => {
    setup(['kpop'])

    expect(seletor()).toBeInTheDocument()
    expect(screen.queryByText(/no inspetor/)).toBeNull()
  })

  it('lista as outras categorias e a opção de virar raiz', () => {
    setup(['kpop'])

    const opcoes = [...seletor().options].map(o => o.textContent?.trim())
    expect(opcoes).toContain('Anime')
    expect(opcoes).toContain('↳ Sailor Moon')
    expect(opcoes).toContain('Games')
    expect(opcoes).toContain('Nenhuma — deixar como categoria raiz')
  })

  it('não oferece a própria categoria selecionada nem o que está dentro dela', () => {
    setup(['anime', 'sailor'])

    const valores = [...seletor().options].map(o => o.value)
    expect(valores).not.toContain('anime')
    expect(valores).not.toContain('sailor')
    expect(valores).toContain('kpop')
  })

  it('mover fica travado até haver destino escolhido', () => {
    const { onConfirm } = setup(['kpop'])

    expect(botaoMover()).toBeDisabled()

    fireEvent.change(seletor(), { target: { value: 'anime' } })

    expect(botaoMover()).toBeEnabled()
    fireEvent.click(botaoMover())
    expect(onConfirm).toHaveBeenCalledWith('anime')
  })

  it('a raiz confirma com `null` — é o que vai para o `parent_id`', () => {
    const { onConfirm } = setup(['sailor'])

    fireEvent.change(seletor(), { target: { value: '__raiz__' } })
    fireEvent.click(botaoMover())

    expect(onConfirm).toHaveBeenCalledWith(null)
  })

  it('avisa que a subcategoria vai junto sem mudar de pai', () => {
    setup(['anime', 'sailor'])

    // Pelo texto do aviso, e não por `/1 subcategoria/` solto: a linha da prévia mostra a mesma
    // contagem, e a busca acharia as duas.
    const aviso = screen.getByText(/a hierarquia de baixo não muda/)
    expect(aviso).toHaveTextContent('1 subcategoria')
  })

  it('lista o que vai se mover, e conta a subcategoria carregada só uma vez', () => {
    setup(['anime', 'sailor'])

    const lista = screen.getByLabelText('Categorias que serão movidas')
    expect(lista).toHaveTextContent('Anime')
    expect(lista).not.toHaveTextContent('Sailor Moon')
    expect(botaoMover()).toHaveTextContent('Mover 1 categoria')
  })
})
