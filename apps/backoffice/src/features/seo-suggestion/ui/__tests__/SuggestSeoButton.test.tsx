// Feature 84 — o botão "Sugerir com IA" (`SIA-10`, `SIA-11`, `SIA-12`, `SIA-20`). Só o desenho; a
// fiação é provada pela página real em `AdminProductFormPage.seo.test.tsx`.

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import SuggestSeoButton from '../SuggestSeoButton'

const props = (extra: Partial<Parameters<typeof SuggestSeoButton>[0]> = {}) => ({
  name: 'Anel Coração',
  status: 'idle' as const,
  message: null,
  canUndo: false,
  onSuggest: vi.fn(),
  onUndo: vi.fn(),
  ...extra,
})

/** Token exato: `h-11` não pode ser casado dentro de `min-h-11`. */
const temClasse = (el: Element, token: string) => (el.getAttribute('class') ?? '').split(/\s+/).includes(token)

describe('SuggestSeoButton', () => {
  it('com nome: "Sugerir com IA" habilitado, e o toque chama onSuggest', () => {
    const p = props()
    render(<SuggestSeoButton {...p} />)
    const botao = screen.getByRole('button', { name: 'Sugerir com IA' })
    expect(botao).toBeEnabled()
    fireEvent.click(botao)
    expect(p.onSuggest).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Preencha o nome do produto primeiro.')).not.toBeInTheDocument()
  })

  it('SIA-11: nome vazio (ou só espaço) ⇒ desabilitado, com a dica ligada ao botão', () => {
    render(<SuggestSeoButton {...props({ name: '   ' })} />)
    const botao = screen.getByRole('button', { name: 'Sugerir com IA' })
    expect(botao).toBeDisabled()
    const dica = screen.getByText('Preencha o nome do produto primeiro.')
    expect(botao).toHaveAttribute('aria-describedby', dica.id)
  })

  // Conserto do QA (BUG-…-sugerir-e-desfazer-soltam-o-foco): em voo o botão é desabilitado por
  // `aria-disabled`, NÃO pelo `disabled` nativo — o nativo tira o foco de quem acabou de apertar Enter.
  // O toque em voo é ignorado no próprio botão (e o hook ignora de novo).
  it('SIA-10: em voo ⇒ "Sugerindo…", aria-disabled (sem `disabled` nativo), o toque é ignorado, giro desarmável', () => {
    const p = props({ status: 'loading' })
    const { container } = render(<SuggestSeoButton {...p} />)
    const botao = screen.getByRole('button', { name: 'Sugerindo…' })
    expect(botao).toHaveAttribute('aria-disabled', 'true')
    expect(botao).not.toHaveAttribute('disabled')
    fireEvent.click(botao)
    expect(p.onSuggest).not.toHaveBeenCalled()
    expect(screen.queryByRole('button', { name: 'Sugerir com IA' })).not.toBeInTheDocument()
    const giro = container.querySelector('svg.animate-spin')!
    expect(giro).toBeTruthy()
    expect(temClasse(giro, 'motion-reduce:animate-none')).toBe(true)
  })

  // O 503 chega com o botão FOCADO (ela acabou de tocá-lo), então o `disabled` nativo soltaria o foco
  // também aqui: `aria-disabled`, com o toque ignorado. Só o "sem nome" segue com o nativo — ali o foco
  // está no campo Nome, não no botão.
  it('SIA-20: disabled ⇒ o botão continua VISÍVEL, aria-disabled (sem nativo), o toque é ignorado, e a frase está na região viva', () => {
    const p = props({ status: 'disabled', message: 'Sugestão por IA não está configurada.' })
    render(<SuggestSeoButton {...p} />)
    const botao = screen.getByRole('button', { name: 'Sugerir com IA' })
    expect(botao).toHaveAttribute('aria-disabled', 'true')
    expect(botao).not.toHaveAttribute('disabled')
    fireEvent.click(botao)
    expect(p.onSuggest).not.toHaveBeenCalled()
    const regiao = screen.getByRole('status')
    expect(regiao).toHaveAttribute('aria-live', 'polite')
    expect(regiao).toHaveTextContent('Sugestão por IA não está configurada.')
  })

  it('a região viva existe vazia antes de qualquer frase (o leitor de tela precisa dela montada)', () => {
    render(<SuggestSeoButton {...props()} />)
    expect(screen.getByRole('status')).toHaveTextContent('')
  })

  it('idle com nome: sem aria-disabled', () => {
    render(<SuggestSeoButton {...props()} />)
    expect(screen.getByRole('button', { name: 'Sugerir com IA' })).not.toHaveAttribute('aria-disabled')
  })

  it('"Desfazer" some ao ser usado e o foco vai para "Sugerir com IA" (não cai no body)', () => {
    const p = props({ canUndo: true })
    const { rerender } = render(<SuggestSeoButton {...p} />)
    const desfazer = screen.getByRole('button', { name: 'Desfazer' })
    desfazer.focus()
    fireEvent.click(desfazer)
    rerender(<SuggestSeoButton {...p} canUndo={false} />)
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Sugerir com IA' }))
  })

  it('SIA-12: "Desfazer" só aparece com canUndo, e chama onUndo', () => {
    const { rerender } = render(<SuggestSeoButton {...props()} />)
    expect(screen.queryByRole('button', { name: 'Desfazer' })).not.toBeInTheDocument()
    const p = props({ canUndo: true })
    rerender(<SuggestSeoButton {...p} />)
    fireEvent.click(screen.getByRole('button', { name: 'Desfazer' }))
    expect(p.onUndo).toHaveBeenCalledTimes(1)
  })

  // O piso de 44px passou de `h-11` (altura FIXA) para `min-h-11`: com a fonte do sistema a 200 % em
  // 390 o rótulo não cabia numa linha e o botão vazava ~60px do cartão (prova em navegador da 84, D2).
  it.each(['Sugerir com IA', 'Desfazer'])('"%s": piso de 44px e rótulo que quebra em vez de vazar (token exato)', nome => {
    render(<SuggestSeoButton {...props({ canUndo: true })} />)
    const botao = screen.getByRole('button', { name: nome })
    for (const t of ['min-h-11', 'h-auto', 'max-w-full', 'whitespace-normal']) expect(temClasse(botao, t)).toBe(true)
    // O `cn` do Button funde as classes: a altura fixa e o `nowrap` do botão base não podem sobrar.
    for (const t of ['h-10', 'h-11', 'whitespace-nowrap']) expect(temClasse(botao, t)).toBe(false)
  })
})
