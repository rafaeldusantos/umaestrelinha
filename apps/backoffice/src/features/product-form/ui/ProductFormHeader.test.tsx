import { afterEach, describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import ProductFormHeader from './ProductFormHeader'

// PFM-16 / P1.7 AC 10-11: cabeçalho com breadcrumb, nome, badge de status, badge "Alterações não
// salvas", as ações e `⌘S`/`Ctrl+S`. Desde 2026-10-30 há UM botão, "Salvar", que não decide a
// visibilidade na loja — o "Salvar e publicar" punha na loja o produto que estava desativado.

const props = () => ({
  productName: 'Botton Sailor Moon',
  isEdit: true,
  isPublished: false,
  isDirty: false,
  draftSavedAt: null as number | null,
  saving: false,
  onBack: vi.fn(),
  onDiscard: vi.fn(),
  onSave: vi.fn(),
})

afterEach(() => vi.restoreAllMocks())

describe('ProductFormHeader — identidade e status', () => {
  it('mostra breadcrumb, nome do produto, Descartar e UM Salvar — sem publicar nem rascunho', () => {
    render(<ProductFormHeader {...props()} />)

    expect(screen.getByRole('button', { name: 'Produtos' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Botton Sailor Moon' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Descartar/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /publicar/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Salvar rascunho/ })).not.toBeInTheDocument()
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

    fireEvent.click(screen.getByRole('button', { name: 'Salvar' }))
    fireEvent.click(screen.getByRole('button', { name: /Descartar/ }))
    fireEvent.click(screen.getByRole('button', { name: 'Produtos' }))

    expect(p.onSave).toHaveBeenCalledTimes(1)
    expect(p.onDiscard).toHaveBeenCalledTimes(1)
    expect(p.onBack).toHaveBeenCalledTimes(1)
  })

  it('salvando desabilita as ações — nada de save duplo', () => {
    render(<ProductFormHeader {...props()} saving />)

    expect(screen.getByRole('button', { name: 'Salvar' })).toBeDisabled()
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

    expect(p.onSave).toHaveBeenCalledTimes(1)
    expect(event.defaultPrevented).toBe(true)
  })

  it('⌘S (metaKey) funciona igual', () => {
    const p = props()
    render(<ProductFormHeader {...p} />)

    press({ metaKey: true })

    expect(p.onSave).toHaveBeenCalledTimes(1)
  })

  it('"s" sem modificador não salva — é uma letra sendo digitada', () => {
    const p = props()
    render(<ProductFormHeader {...p} />)

    press({})

    expect(p.onSave).not.toHaveBeenCalled()
  })

  it('durante o save, o atalho não dispara de novo', () => {
    const p = props()
    render(<ProductFormHeader {...p} saving />)

    press({ ctrlKey: true })

    expect(p.onSave).not.toHaveBeenCalled()
  })

  it('o listener sai no unmount — o atalho não sobrevive à tela', () => {
    const p = props()
    const { unmount } = render(<ProductFormHeader {...p} />)
    unmount()

    press({ ctrlKey: true })

    expect(p.onSave).not.toHaveBeenCalled()
  })
})

// Feature 67, D1 da prova em navegador: com o `main` do painel deixando de ser contêiner de rolagem,
// este `sticky` passou a GRUDAR de verdade — e no celular, com três linhas, ocuparia 165px do topo. E o grupo das três ações media 453px numa coluna de 342 em 390:
// o `overflow-auto` do `main` escondia isso numa rolagem horizontal do próprio `main`.
describe('ProductFormHeader — posição e largura no celular', () => {
  const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/)

  it('gruda só a partir de md (no topo); no celular rola — 165px presos de 844 seria demais', () => {
    const { container } = render(<ProductFormHeader {...props()} />)
    const header = container.querySelector('header')!
    expect(tokens(header)).toContain('md:sticky')
    expect(tokens(header)).toContain('md:top-0')
    // Token exato: `md:sticky` não é `sticky`.
    expect(tokens(header)).not.toContain('sticky')
    expect(tokens(header)).not.toContain('top-0')
  })

  it('o grupo das ações embrulha e tem teto de largura — não estoura a coluna em 390', () => {
    render(<ProductFormHeader {...props()} />)
    const grupo = screen.getByRole('button', { name: /Descartar/ }).parentElement!
    expect(tokens(grupo)).toContain('flex-wrap')
    expect(tokens(grupo)).toContain('max-w-full')
  })
})
