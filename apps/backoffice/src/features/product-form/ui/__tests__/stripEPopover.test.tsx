// Feature 67 — D3 e D4 da prova em navegador (390 × 844). jsdom não mede layout, então a régua é a
// DECLARAÇÃO, por token exato (`L-034`), nas duas metades (celular e `sm:`, `L-029`); a medida é do
// navegador (`prova-navegador.md`, "Reprova depois do conserto").

import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

const h = vi.hoisted(() => ({ props: [] as Record<string, unknown>[] }))
vi.mock('@estrelinha/ui/popover', () => ({
  Popover: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  PopoverTrigger: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  PopoverContent: ({ children, ...props }: { children: React.ReactNode } & Record<string, unknown>) => {
    h.props.push(props)
    return <div data-testid="conteudo">{children}</div>
  },
}))

import SuggestionStrip from '../SuggestionStrip'
import MarkPopover from '../MarkPopover'

const tem = (cls: string, token: string) =>
  new RegExp(`(?:^|\\s)${token.replace(/[.*+?^${}()|[\]\\:]/g, '\\$&')}(?![-\\w])`).test(cls)

describe('D3 — a faixa de sugestão não espreme o texto no celular', () => {
  const textoDaFaixa = () => screen.getByText('Sugestão: Pingente — Opção Modelo = Pingente').parentElement!

  it('no celular o texto ocupa a linha inteira e não encolhe (os botões descem)', () => {
    render(<SuggestionStrip texto="Sugestão: Pingente — Opção Modelo = Pingente" onAceitar={vi.fn()} onRecusar={vi.fn()} podeRecusar />)
    const cls = textoDaFaixa().className
    expect(tem(cls, 'w-full')).toBe(true)
    expect(tem(cls, 'flex-none')).toBe(true)
    // O defeito: `flex-1` sem prefixo é base 0, e o texto cedia a largura aos botões `shrink-0`.
    expect(tem(cls, 'flex-1')).toBe(false)
    expect(tem(screen.getByTestId('faixa-sugestao').className, 'flex-wrap')).toBe(true)
  })

  it('a partir de `sm` volta a dividir a linha com os botões (desktop inalterado)', () => {
    render(<SuggestionStrip texto="Sugestão: Pingente — Opção Modelo = Pingente" onAceitar={vi.fn()} onRecusar={vi.fn()} podeRecusar />)
    const cls = textoDaFaixa().className
    expect(tem(cls, 'sm:flex-1')).toBe(true)
    expect(tem(cls, 'sm:w-auto')).toBe(true)
    expect(tem(cls, 'min-w-0')).toBe(true)
  })

  it('SENSOR: a régua é de token exato — `sm:flex-1` não conta como `flex-1`, nem `w-full` como `max-w-full`', () => {
    expect(tem('sm:flex-1', 'flex-1')).toBe(false)
    expect(tem('max-w-full', 'w-full')).toBe(false)
    expect(tem('min-w-0 flex-1', 'flex-1')).toBe(true)
  })
})

describe('D4 — o popover de "Marcar" respeita o gutter de 16px', () => {
  it('passa `collisionPadding={16}` ao Radix e mantém o teto de largura de 100vw − 32px', () => {
    h.props = []
    render(<MarkPopover rotulo="Cor = Prata 925" grupos={[]} marcados={new Set()} naPecaToda={new Set()} onToggle={vi.fn()} />)
    expect(screen.getByTestId('conteudo')).toBeInTheDocument()
    expect(h.props).toHaveLength(1)
    expect(h.props[0].collisionPadding).toBe(16)
    expect(h.props[0].align).toBe('start')
    expect(tem(String(h.props[0].className), 'w-[min(360px,calc(100vw-32px))]')).toBe(true)
  })
})
