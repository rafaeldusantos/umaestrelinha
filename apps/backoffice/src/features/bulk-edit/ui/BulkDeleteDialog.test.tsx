// RFN-01 e RFN-02 — a barra com as seis ações, e a exclusão que mostra o que vai apagar.

import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminListRow } from '@/entities/product/api/productQuery'

import BulkBar from './BulkBar'
import BulkDeleteDialog from './BulkDeleteDialog'
import { matchesConfirmWord, PREVIEW_LIMIT } from '../model/confirmDelete'

const row = (over: Partial<AdminListRow> = {}): AdminListRow => ({
  id: 'p1',
  name: 'Botton Sailor Moon',
  slug: 'botton-sailor-moon',
  price: 14.9,
  compare_price: null,
  images: [],
  tags: [],
  is_active: true,
  stock_total: 12,
  low_stock_threshold: 5,
  stock_policy: 'track',
  options: [],
  variants: [],
  category_ids: [],
  seo_title: null,
  seo_description: null,
  scheduled_at: null,
  created_at: '2026-07-01T00:00:00Z',
  updated_at: null,
  ...over,
})

const handlers = () => ({
  onEdit: vi.fn(), onActivate: vi.fn(), onPause: vi.fn(), onDuplicate: vi.fn(),
  onExport: vi.fn(), onDelete: vi.fn(), onSelectAll: vi.fn(), onClear: vi.fn(),
})

describe('BulkBar — as seis ações do artboard (RFN-01 AC 1)', () => {
  it('mostra as seis ações e a contagem', () => {
    render(<BulkBar count={12} total={12} {...handlers()} />)

    expect(screen.getByText('12 selecionados')).toBeInTheDocument()
    const bar = screen.getByRole('toolbar', { name: 'Ações em massa' })
    for (const label of ['Editar em massa', 'Ativar', 'Pausar', 'Duplicar', 'Exportar', 'Excluir']) {
      expect(within(bar).getByRole('button', { name: label })).toBeInTheDocument()
    }
  })

  it('cada ação chama o seu callback', () => {
    const props = handlers()
    render(<BulkBar count={2} total={2} {...props} />)

    fireEvent.click(screen.getByRole('button', { name: 'Ativar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Duplicar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Exportar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Excluir' }))

    expect(props.onActivate).toHaveBeenCalledTimes(1)
    expect(props.onPause).toHaveBeenCalledTimes(1)
    expect(props.onDuplicate).toHaveBeenCalledTimes(1)
    expect(props.onExport).toHaveBeenCalledTimes(1)
    expect(props.onDelete).toHaveBeenCalledTimes(1)
  })

  it('`Selecionar os N do filtro` só aparece quando a seleção é menor que o total', () => {
    const { rerender } = render(<BulkBar count={2} total={160} {...handlers()} />)
    expect(screen.getByRole('button', { name: 'Selecionar os 160 do filtro' })).toBeInTheDocument()

    rerender(<BulkBar count={160} total={160} {...handlers()} />)
    expect(screen.queryByRole('button', { name: /do filtro/ })).not.toBeInTheDocument()
  })

  it('durante uma operação, as ações ficam travadas', () => {
    render(<BulkBar count={2} total={2} busy {...handlers()} />)

    expect(screen.getByRole('button', { name: 'Excluir' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Duplicar' })).toBeDisabled()
  })
})

describe('matchesConfirmWord — atrito, não hostilidade (RFN-02 AC 6)', () => {
  it('aceita a palavra em qualquer caixa, com espaço nas pontas', () => {
    expect(matchesConfirmWord('EXCLUIR')).toBe(true)
    expect(matchesConfirmWord('excluir')).toBe(true)
    expect(matchesConfirmWord('  Excluir  ')).toBe(true)
  })

  it('recusa qualquer outra coisa', () => {
    expect(matchesConfirmWord('')).toBe(false)
    expect(matchesConfirmWord('excluí')).toBe(false)
    expect(matchesConfirmWord('sim')).toBe(false)
  })
})

describe('BulkDeleteDialog — conhecimento prévio (RFN-02)', () => {
  const três = [
    row({ id: 'p1', name: 'Luffy', price: 14.9 }),
    row({ id: 'p2', name: 'Levi', price: 18.4, is_active: false }),
    row({ id: 'p3', name: 'Nezuko', price: 9.9 }),
  ]

  let onConfirm: ReturnType<typeof vi.fn>
  let onOpenChange: ReturnType<typeof vi.fn>

  beforeEach(() => {
    onConfirm = vi.fn()
    onOpenChange = vi.fn()
  })

  const abrir = (rows = três) =>
    render(<BulkDeleteDialog open rows={rows} onConfirm={onConfirm} onOpenChange={onOpenChange} />)

  it('a PRIMEIRA etapa lista os produtos, com preço e status', () => {
    abrir()

    const lista = screen.getByRole('list', { name: 'Produtos que serão excluídos' })
    expect(within(lista).getByText('Luffy')).toBeInTheDocument()
    expect(within(lista).getByText('Levi')).toBeInTheDocument()
    expect(within(lista).getByText(/14,90/)).toBeInTheDocument()
    expect(within(lista).getByText('Rascunho')).toBeInTheDocument()
  })

  it('o título diz quantos serão excluídos', () => {
    abrir()

    expect(screen.getByText('Excluir 3 produtos?')).toBeInTheDocument()
  })

  it('mais de 10 selecionados mostra os 10 primeiros e `e mais X`', () => {
    abrir(Array.from({ length: 14 }, (_, i) => row({ id: `p${i}`, name: `Produto ${i}` })))

    const lista = screen.getByRole('list', { name: 'Produtos que serão excluídos' })
    expect(within(lista).getAllByRole('listitem')).toHaveLength(PREVIEW_LIMIT)
    expect(screen.getByText('e mais 4 produtos')).toBeInTheDocument()
  })

  it('a primeira etapa NÃO oferece a ação destrutiva', () => {
    abrir()

    expect(screen.queryByRole('button', { name: /^Excluir 3 produtos$/ })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Continuar' })).toBeInTheDocument()
  })

  it('a segunda etapa só habilita a exclusão com a palavra digitada', () => {
    abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))

    const acao = screen.getByRole('button', { name: 'Excluir 3 produtos' })
    expect(acao).toBeDisabled()

    fireEvent.change(screen.getByLabelText('Confirmação'), { target: { value: 'excluir' } })

    expect(screen.getByRole('button', { name: 'Excluir 3 produtos' })).toBeEnabled()
  })

  it('confirmar chama a exclusão uma vez', () => {
    abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.change(screen.getByLabelText('Confirmação'), { target: { value: 'EXCLUIR' } })
    fireEvent.click(screen.getByRole('button', { name: 'Excluir 3 produtos' }))

    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('cancelar na primeira etapa não exclui nada', () => {
    abrir()

    fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }))

    expect(onConfirm).not.toHaveBeenCalled()
    expect(onOpenChange).toHaveBeenCalledWith(false)
  })

  it('`Voltar` na segunda etapa devolve para a lista', () => {
    abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))

    expect(screen.getByRole('list', { name: 'Produtos que serão excluídos' })).toBeInTheDocument()
    expect(onConfirm).not.toHaveBeenCalled()
  })

  it('reabrir volta para a primeira etapa e limpa o que foi digitado', () => {
    const { rerender } = abrir()
    fireEvent.click(screen.getByRole('button', { name: 'Continuar' }))
    fireEvent.change(screen.getByLabelText('Confirmação'), { target: { value: 'EXCLUIR' } })

    rerender(<BulkDeleteDialog open={false} rows={três} onConfirm={onConfirm} onOpenChange={onOpenChange} />)
    rerender(<BulkDeleteDialog open rows={três} onConfirm={onConfirm} onOpenChange={onOpenChange} />)

    // O atrito deliberado não pode virar decoração: a segunda abertura recomeça da lista.
    expect(screen.getByRole('list', { name: 'Produtos que serão excluídos' })).toBeInTheDocument()
  })
})
