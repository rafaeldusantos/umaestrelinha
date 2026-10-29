// Feature 86, T18 — `MNM-20` (nomeia o item e quantos saem junto) e `MNM-21` (a categoria continua).

import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import MenuRemoveConfirm from './MenuRemoveConfirm'
import { fraseDoSubmenu } from '../model/textosDoMenu'

const onConfirm = vi.fn()
const onOpenChange = vi.fn()

const montar = (kind: 'category' | 'link', filhos: number) =>
  render(
    <MenuRemoveConfirm
      open
      onOpenChange={onOpenChange}
      nome="Joias"
      kind={kind}
      filhos={filhos}
      onConfirm={onConfirm}
    />,
  )

beforeEach(() => {
  onConfirm.mockReset()
  onOpenChange.mockReset()
})

describe('MNM-20 — a confirmação nomeia o item e o submenu', () => {
  it('título com o nome, e quantos itens do submenu saem junto', () => {
    montar('category', 4)
    expect(screen.getByText('Remover “Joias” do menu?')).toBeInTheDocument()
    expect(screen.getByTestId('remocao-submenu')).toHaveTextContent('Os 4 itens do submenu saem junto.')
  })

  it('um item: singular; nenhum: a frase não aparece', () => {
    expect(fraseDoSubmenu(1)).toBe('O item do submenu sai junto.')
    expect(fraseDoSubmenu(0)).toBeNull()
    montar('category', 0)
    expect(screen.queryByTestId('remocao-submenu')).toBeNull()
  })

  it('o foco nasce em "Cancelar"', () => {
    montar('category', 2)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancelar' }))
  })

  it('só "Remover do menu" confirma; "Cancelar" não', () => {
    montar('category', 2)
    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onConfirm).not.toHaveBeenCalled()
    fireEvent.click(screen.getByTestId('confirmar-remover'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('os dois botões medem ≥ 44px (token exato)', () => {
    montar('link', 0)
    for (const b of [screen.getByRole('button', { name: 'Cancelar' }), screen.getByTestId('confirmar-remover')]) {
      expect(b.className.split(/\s+/)).toContain('min-h-11')
    }
  })
})

describe('MNM-21 — o que continua existindo', () => {
  it('categoria: "A categoria continua existindo…"', () => {
    montar('category', 1)
    expect(screen.getByTestId('remocao-continua')).toHaveTextContent(
      'A categoria continua existindo na loja, só deixa de aparecer no menu.',
    )
  })

  it('link: "A página continua existindo…"', () => {
    montar('link', 0)
    expect(screen.getByTestId('remocao-continua')).toHaveTextContent(
      'A página continua existindo na loja, só deixa de aparecer no menu.',
    )
  })
})
