import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import PublishChecklist from './PublishChecklist'
import type { ChecklistItem } from '../model/checklist'

// PFM-14: "cada um com atalho que leva ao campo". O que se prova aqui é que o item pendente é
// acionável e o aprovado não — um checklist que só informa obriga o admin a caçar o campo em 5 abas.

const item = (over: Partial<ChecklistItem> = {}): ChecklistItem => ({
  id: 'name',
  label: 'Nome do produto',
  ok: true,
  focusField: 'name',
  tab: 'geral',
  hint: null,
  ...over,
})

describe('PublishChecklist', () => {
  it('lista todos os itens, aprovados e pendentes', () => {
    render(
      <PublishChecklist
        items={[item(), item({ id: 'image', label: 'Ao menos uma imagem', ok: false, hint: 'Envie uma imagem.' })]}
        onFocusField={vi.fn()}
      />,
    )

    expect(screen.getByText('Nome do produto')).toBeInTheDocument()
    expect(screen.getByText('Ao menos uma imagem')).toBeInTheDocument()
  })

  it('item pendente é botão e leva ao campo ao clicar', () => {
    const onFocusField = vi.fn()
    const pendente = item({ id: 'image', label: 'Ao menos uma imagem', ok: false, focusField: 'images', tab: 'midia', hint: 'Envie uma imagem.' })
    render(<PublishChecklist items={[pendente]} onFocusField={onFocusField} />)

    fireEvent.click(screen.getByRole('button', { name: /Ao menos uma imagem/ }))

    expect(onFocusField).toHaveBeenCalledWith(pendente)
  })

  it('item aprovado NÃO é acionável — não há campo para consertar', () => {
    render(<PublishChecklist items={[item()]} onFocusField={vi.fn()} />)

    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })

  it('mostra o hint do item pendente, que diz o que falta', () => {
    render(
      <PublishChecklist
        items={[item({ ok: false, hint: '2 variação(ões) ativa(s) sem preço.' })]}
        onFocusField={vi.fn()}
      />,
    )

    expect(screen.getByText('2 variação(ões) ativa(s) sem preço.')).toBeInTheDocument()
  })

  // RFN-07 AC 4: a contagem saiu da descrição e virou badge + barra, como no artboard. O que se
  // conta continua sendo o mesmo — mudou onde aparece.
  it('mostra `N de M` no badge, com a barra proporcional', () => {
    const { rerender } = render(
      <PublishChecklist items={[item({ ok: true }), item({ id: 'image', ok: false })]} onFocusField={vi.fn()} />,
    )
    expect(screen.getByTestId('checklist-badge')).toHaveTextContent('1 de 2')
    expect(screen.getByRole('progressbar', { name: 'Progresso do checklist' })).toHaveAttribute('aria-valuenow', '1')

    rerender(
      <PublishChecklist
        items={[item({ ok: false }), item({ id: 'image', ok: false })]}
        onFocusField={vi.fn()}
      />,
    )
    expect(screen.getByTestId('checklist-badge')).toHaveTextContent('0 de 2')
  })

  // Regressão de BUG-20260802-gerar-do-seo-nao-gera-nada.
  //
  // Este teste afirmava o contrário — que o item de SEO mostra `Gerar` — e por isso passava enquanto a
  // tela mentia: o rótulo prometia geração e o clique só trocava de aba, deixando título e descrição
  // vazios. `RFN-07` AC 5 pede o rótulo `Gerar`, mas `AD-011` mantém geração de texto de SEO fora de
  // escopo; a AC descreve uma ação que o projeto decidiu não ter. O rótulo passa a descrever o que o
  // clique faz.
  it('todo item pendente mostra `Ir →` — inclusive o de SEO, que não gera nada (AC 5)', () => {
    const onFocusField = vi.fn()
    render(
      <PublishChecklist
        items={[item({ id: 'name', ok: false }), item({ id: 'seo', ok: false })]}
        onFocusField={onFocusField}
      />,
    )

    expect(screen.getAllByText('Ir →')).toHaveLength(2)
    expect(screen.queryByText('Gerar')).not.toBeInTheDocument()
  })

  it('clicar no item de SEO leva ao campo, que é o que a ação faz de verdade', () => {
    const onFocusField = vi.fn()
    const seo = item({ id: 'seo', ok: false })
    render(<PublishChecklist items={[seo]} onFocusField={onFocusField} />)

    fireEvent.click(screen.getByRole('button'))

    expect(onFocusField).toHaveBeenCalledWith(seo)
  })

  it('sem pendência, o badge fecha em `N de N` e a barra vai a 100%', () => {
    render(<PublishChecklist items={[item(), item({ id: 'image' })]} onFocusField={vi.fn()} />)

    expect(screen.getByTestId('checklist-badge')).toHaveTextContent('2 de 2')
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '2')
  })
})
