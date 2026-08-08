import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ProductFormHeader from './ProductFormHeader'

// PFM-16 / P1.7 AC 10-11: cabeçalho com breadcrumb, nome, badge de status, badge "Alterações não
// salvas", as três ações e `⌘S`/`Ctrl+S`. AC 13: pendência bloqueia só o publicar.

const props = () => ({
  productName: 'Botton Sailor Moon',
  isEdit: true,
  isPublished: false,
  isDirty: false,
  draftSavedAt: null as number | null,
  saving: false,
  canPublish: true,
  onBack: vi.fn(),
  onDiscard: vi.fn(),
  onSaveDraft: vi.fn(),
  onPublish: vi.fn(),
})

afterEach(() => vi.restoreAllMocks())

describe('ProductFormHeader — identidade e status', () => {
  it('mostra breadcrumb, nome do produto e as três ações', () => {
    render(<ProductFormHeader {...props()} />)

    expect(screen.getByRole('button', { name: 'Produtos' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Botton Sailor Moon' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Descartar/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Salvar rascunho/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Salvar e publicar/ })).toBeInTheDocument()
  })

  it('produto sem nome ainda tem título — a tela não abre em branco', () => {
    render(<ProductFormHeader {...props()} productName="   " isEdit={false} />)
    expect(screen.getByRole('heading', { name: 'Novo produto' })).toBeInTheDocument()
  })

  it('badge de status diz Rascunho quando não está na loja e Publicado quando está', () => {
    const { rerender } = render(<ProductFormHeader {...props()} isPublished={false} />)
    expect(screen.getByText('Rascunho')).toBeInTheDocument()

    rerender(<ProductFormHeader {...props()} isPublished />)
    expect(screen.getByText('Publicado')).toBeInTheDocument()
  })

  it('badge "Alterações não salvas" aparece SÓ com isDirty (AC 10)', () => {
    const { rerender } = render(<ProductFormHeader {...props()} isDirty={false} />)
    expect(screen.queryByText('Alterações não salvas')).not.toBeInTheDocument()

    rerender(<ProductFormHeader {...props()} isDirty />)
    expect(screen.getByText('Alterações não salvas')).toBeInTheDocument()
  })

  it('mostra o indicador de rascunho automático com o tempo desde a gravação (AC 6)', () => {
    vi.spyOn(Date, 'now').mockReturnValue(10_000)
    render(<ProductFormHeader {...props()} draftSavedAt={7_000} />)

    expect(screen.getByText(/Rascunho salvo automaticamente · há 3 s/)).toBeInTheDocument()
  })

  it('sem rascunho gravado, o indicador não aparece — não anuncia o que não fez', () => {
    render(<ProductFormHeader {...props()} draftSavedAt={null} />)
    expect(screen.queryByText(/Rascunho salvo automaticamente/)).not.toBeInTheDocument()
  })
})

describe('ProductFormHeader — ações', () => {
  it('cada ação chama o seu handler', () => {
    const p = props()
    render(<ProductFormHeader {...p} />)

    fireEvent.click(screen.getByRole('button', { name: /Salvar rascunho/ }))
    fireEvent.click(screen.getByRole('button', { name: /Salvar e publicar/ }))
    fireEvent.click(screen.getByRole('button', { name: /Descartar/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Produtos' }))

    expect(p.onSaveDraft).toHaveBeenCalledTimes(1)
    expect(p.onPublish).toHaveBeenCalledTimes(1)
    expect(p.onDiscard).toHaveBeenCalledTimes(1)
    expect(p.onBack).toHaveBeenCalledTimes(1)
  })

  it('checklist pendente bloqueia publicar e MANTÉM o rascunho disponível (AC 13)', () => {
    render(<ProductFormHeader {...props()} canPublish={false} />)

    expect(screen.getByRole('button', { name: /Salvar e publicar/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Salvar rascunho/ })).toBeEnabled()
  })

  it('salvando desabilita as três ações — nada de save duplo', () => {
    render(<ProductFormHeader {...props()} saving />)

    expect(screen.getByRole('button', { name: /Salvar rascunho/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Salvar e publicar/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /Descartar/ })).toBeDisabled()
  })
})

describe('ProductFormHeader — atalho ⌘S / Ctrl+S (AC 11)', () => {
  const press = (init: KeyboardEventInit) => {
    const event = new KeyboardEvent('keydown', { key: 's', cancelable: true, ...init })
    window.dispatchEvent(event)
    return event
  }

  it('Ctrl+S aciona o save e IMPEDE o navegador de salvar a página', () => {
    const p = props()
    render(<ProductFormHeader {...p} />)

    const event = press({ ctrlKey: true })

    expect(p.onPublish).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('⌘S (metaKey) funciona igual', () => {
    const p = props()
    render(<ProductFormHeader {...p} />)

    press({ metaKey: true })

    expect(p.onPublish).toHaveBeenCalledTimes(1)
  })

  it('com pendência, o atalho grava RASCUNHO em vez de tentar publicar', () => {
    const p = props()
    render(<ProductFormHeader {...p} canPublish={false} />)

    press({ ctrlKey: true })

    expect(p.onSaveDraft).toHaveBeenCalledTimes(1)
    expect(p.onPublish).not.toHaveBeenCalled()
  })

  it('"s" sem modificador não salva — é uma letra sendo digitada', () => {
    const p = props()
    render(<ProductFormHeader {...p} />)

    press({})

    expect(p.onPublish).not.toHaveBeenCalled()
    expect(p.onSaveDraft).not.toHaveBeenCalled()
  })

  it('durante o save, o atalho não dispara de novo', () => {
    const p = props()
    render(<ProductFormHeader {...p} saving />)

    press({ ctrlKey: true })

    expect(p.onPublish).not.toHaveBeenCalled()
  })

  it('o listener sai no unmount — o atalho não sobrevive à tela', () => {
    const p = props()
    const { unmount } = render(<ProductFormHeader {...p} />)
    unmount()

    press({ ctrlKey: true })

    expect(p.onPublish).not.toHaveBeenCalled()
  })
})
