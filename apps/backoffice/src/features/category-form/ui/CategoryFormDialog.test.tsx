import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { reservedSlugRefusal } from '@estrelinha/core/routes'
import CategoryFormDialog from './CategoryFormDialog'
import type { DbCategory } from '@estrelinha/supabase/types'

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

/**
 * `URL-05` — o slug reservado recusado na CRIAÇÃO.
 *
 * Com categoria na raiz do domínio (`AD-018`), o namespace de rota e o de slug de categoria são o
 * mesmo, e o React Router ranqueia por especificidade: a rota **sempre** vence. Uma categoria
 * chamada "Sobre" nasceria no banco, apareceria no menu do admin e **nunca abriria** na loja — quem
 * responde `/sobre` é a página institucional. Não há erro em lugar nenhum: só uma categoria morta.
 *
 * Este diálogo é o caminho mais provável do defeito, porque **o slug sai do nome sozinho**: quem
 * cadastra digita "Sobre" e nunca toca no campo de slug.
 */
describe('CategoryFormDialog — slug reservado é recusado (URL-05)', () => {
  it('digitar `Sobre` no nome deriva `sobre` e a tela recusa, com a lista visível', () => {
    renderDialog()

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Sobre' } })

    // O caminho real: ninguém digitou slug nenhum, ele veio do nome.
    expect(screen.getByLabelText('Slug')).toHaveValue('sobre')

    const alerta = screen.getByRole('alert')
    expect(alerta).toHaveTextContent(reservedSlugRefusal('sobre'))
    // "com a lista visível" (AC 5): sem os outros nomes na tela, quem cadastra tenta o próximo
    // reservado no escuro.
    expect(alerta).toHaveTextContent('checkout')
    expect(alerta).toHaveTextContent('favoritos')
  })

  it('o submit não chega em `onSave` — e o diálogo não fecha', () => {
    const { onSave, onOpenChange } = renderDialog()

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Sobre' } })
    // `submit` no formulário, e não clique no botão: assim a prova é a recusa no handler, e não um
    // `disabled` — que some num atalho de teclado ou numa chamada direta.
    fireEvent.submit(screen.getByLabelText('Nome').closest('form')!)

    expect(onSave).not.toHaveBeenCalled()
    expect(onOpenChange).not.toHaveBeenCalled()
  })

  it('o slug digitado à mão também é conferido, não só o derivado do nome', () => {
    const { onSave } = renderDialog()

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Ajuda rápida' } })
    fireEvent.change(screen.getByLabelText('Slug'), { target: { value: 'checkout' } })
    fireEvent.submit(screen.getByLabelText('Nome').closest('form')!)

    expect(screen.getByRole('alert')).toHaveTextContent(reservedSlugRefusal('checkout'))
    expect(onSave).not.toHaveBeenCalled()
  })

  it('slug livre continua salvando, e nenhum aviso aparece', async () => {
    const { onSave } = renderDialog()

    fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Joias de leite' } })

    expect(screen.queryByRole('alert')).not.toBeInTheDocument()

    fireEvent.submit(screen.getByLabelText('Nome').closest('form')!)

    await waitFor(() => expect(onSave).toHaveBeenCalled())
    expect(onSave.mock.calls[0][0].slug).toBe('joias-de-leite')
  })
})

// A escolha do pai não foi tocada e o `Select` do Radix não monta as opções fechado — um teste aqui
// só poderia afirmar que o gatilho existe, o que não é contrato de nada. Fica de fora de propósito.
