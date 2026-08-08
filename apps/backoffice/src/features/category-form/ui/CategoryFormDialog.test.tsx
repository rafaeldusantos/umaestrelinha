import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import CategoryFormDialog from './CategoryFormDialog'
import type { DbCategory } from '@nanapin/supabase/types'

// O diálogo enxuto: nome, slug, pai, descrição e o interruptor. Cor, ordem, imagem e banner saíram —
// todos já tinham outro dono (inspetor docado e arraste de reordenar), e o teste guarda a ausência
// porque campo removido é o tipo de coisa que volta de carona num merge.

const category = (over: Partial<DbCategory> = {}): DbCategory => ({
  id: 'kpop',
  name: 'K-Pop',
  slug: 'k-pop',
  description: null,
  image_url: null,
  banner_url: null,
  color_accent: null,
  active: true,
  sort_order: 0,
  parent_id: null,
  show_in_menu: false,
  menu_promo: null,
  ...over,
})

const renderDialog = (over: Partial<React.ComponentProps<typeof CategoryFormDialog>> = {}) => {
  const onSave = vi.fn().mockResolvedValue({ error: null, id: 'nova' })
  const onOpenChange = vi.fn()
  render(
    <CategoryFormDialog
      open
      onOpenChange={onOpenChange}
      category={null}
      onSave={onSave}
      allCategories={[category()]}
      {...over}
    />,
  )
  return { onSave, onOpenChange }
}

describe('CategoryFormDialog — o que a tela pede', () => {
  it('pede nome, slug, descrição e o interruptor', () => {
    renderDialog()

    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByLabelText('Slug')).toBeInTheDocument()
    expect(screen.getByLabelText('Descrição')).toBeInTheDocument()
    expect(screen.getByRole('switch')).toBeInTheDocument()
  })

  it('NÃO pede cor, ordem, imagem nem banner', () => {
    renderDialog()

    expect(screen.queryByText(/Cor accent/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Ordem$/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Imagem URL/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Banner URL/i)).not.toBeInTheDocument()
    // O seletor de cor não tinha rótulo associado — a prova é a ausência dos inputs nativos. A busca
    // é no `document`, não no `container` do render: o `Dialog` do Radix monta num portal.
    expect(document.querySelector('input[type="color"]')).toBeNull()
    expect(document.querySelector('input[type="number"]')).toBeNull()
  })

  it('diz onde capa e posição são ajustadas, em vez de deixar o campo sumir sem explicação', () => {
    renderDialog()
    expect(screen.getByText(/Capa e posição na lista se ajustam depois/)).toBeInTheDocument()
  })
})

describe('CategoryFormDialog — o payload', () => {
  it('grava só as cinco chaves; as colunas removidas não são mencionadas', async () => {
    const { onSave } = renderDialog()

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Girl Groups' } })
    fireEvent.submit(screen.getByLabelText('Nome').closest('form')!)

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    const payload = onSave.mock.calls[0][0]

    expect(Object.keys(payload).sort()).toEqual(
      ['active', 'description', 'name', 'parent_id', 'slug'],
    )
    // Não mencionar é diferente de mandar `null`: `null` apagaria capa e cor de quem já tem.
    expect(payload).not.toHaveProperty('sort_order')
    expect(payload).not.toHaveProperty('color_accent')
    expect(payload).not.toHaveProperty('image_url')
    expect(payload).not.toHaveProperty('banner_url')
  })

  it('o slug sai do nome quando não é digitado, sem acento e sem espaço', async () => {
    const { onSave } = renderDialog()

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ação & Aventura' } })
    fireEvent.submit(screen.getByLabelText('Nome').closest('form')!)

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][0].slug).toBe('acao-aventura')
  })

  it('descrição vazia vira null, não string vazia', async () => {
    const { onSave } = renderDialog()

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Games' } })
    fireEvent.submit(screen.getByLabelText('Nome').closest('form')!)

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][0].description).toBeNull()
  })

  it('fecha depois de salvar', async () => {
    const { onOpenChange } = renderDialog()

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Games' } })
    fireEvent.submit(screen.getByLabelText('Nome').closest('form')!)

    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false))
  })
})

// A escolha do pai não foi tocada e o `Select` do Radix não monta as opções fechado — um teste aqui
// só poderia afirmar que o gatilho existe, o que não é contrato de nada. Fica de fora de propósito.
