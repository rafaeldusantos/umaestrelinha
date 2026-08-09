import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Link } from 'react-router-dom'
import { Button } from '../Button'

/**
 * O botão da loja, contra as ACs de `IDN-01`/`IDN-02`.
 *
 * O que estes testes protegem não é a aparência — é a **distinção de forma**
 * (ação é `rounded-sm`, rótulo é pílula, disco é disco) e o **par de cores de
 * cada superfície**, que é o que sustenta o contraste medido.
 */

const VARIANTS = ['primary', 'secondary', 'onInk', 'inkSolid', 'ghost'] as const

describe('Button — forma', () => {
  it.each(VARIANTS)('a variante `%s` usa `rounded-sm`', (variant) => {
    render(<Button variant={variant}>Ação</Button>)
    expect(screen.getByRole('button')).toHaveClass('rounded-sm')
  })

  it.each(VARIANTS)('a variante `%s` NÃO usa `rounded-pill`', (variant) => {
    // Pílula é rótulo (badge, chip, tag, campo de busca). Um botão em pílula
    // é o defeito que a feature 19 desfez e a 20 mantém desfeito.
    render(<Button variant={variant}>Ação</Button>)
    expect(screen.getByRole('button')).not.toHaveClass('rounded-pill')
  })

  it('toda variante tem borda de 2px transparente, para contorno e sólido casarem de altura', () => {
    const { rerender } = render(<Button variant="primary">Ação</Button>)
    expect(screen.getByRole('button')).toHaveClass('border-2', 'border-transparent')

    rerender(<Button variant="secondary">Ação</Button>)
    expect(screen.getByRole('button')).toHaveClass('border-2', 'border-estrelinha-ink')
  })

  it('o alvo de toque tem no mínimo 44px', () => {
    // Regra de mobile do CLAUDE.md — a loja é 90% celular.
    render(
      <Button size="sm">
        Ação
      </Button>,
    )
    expect(screen.getByRole('button')).toHaveClass('min-h-11')
  })
})

describe('Button — cor por variante', () => {
  it('primário é `primary` com texto `on-primary` (8,40:1)', () => {
    render(<Button variant="primary">Comprar</Button>)
    expect(screen.getByRole('button')).toHaveClass(
      'bg-estrelinha-primary',
      'text-estrelinha-on-primary',
    )
  })

  it('secundário é contorno `ink`, sem fundo sólido', () => {
    render(<Button variant="secondary">Criar o meu</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('border-estrelinha-ink', 'text-estrelinha-ink')
    // Classe exata, não regex: `hover:bg-estrelinha-ink/[0.06]` é intencional —
    // o que não pode existir é fundo sólido em repouso.
    const classes = button.className.split(/\s+/)
    expect(classes).not.toContain('bg-estrelinha-primary')
    expect(classes).not.toContain('bg-estrelinha-ink')
    expect(classes).not.toContain('bg-estrelinha-accent')
  })

  it('sobre superfície escura o botão é `accent` com texto `ink` — nunca `primary`', () => {
    // `primary` sobre `ink` lê a 1,45:1 e some. `accent` sobre `ink`, 4,78:1.
    render(<Button variant="onInk">Ativar lembrete</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-estrelinha-accent', 'text-estrelinha-ink')
    expect(button).not.toHaveClass('bg-estrelinha-primary')
  })

  it('sobre superfície de acento o botão é `ink` com texto `on-primary`', () => {
    render(<Button variant="inkSolid">Quero 10% OFF</Button>)
    expect(screen.getByRole('button')).toHaveClass(
      'bg-estrelinha-ink',
      'text-estrelinha-on-primary',
    )
  })
})

describe('Button — tipografia e comportamento', () => {
  it('o rótulo sai na família de display, semibold', () => {
    render(<Button>Ação</Button>)
    expect(screen.getByRole('button')).toHaveClass('font-display', 'font-semibold')
  })

  it('`asChild` renderiza o filho e preserva as classes', () => {
    // É o que permite um `<Link>` agir como botão sem `<button>` dentro de `<a>`.
    render(
      <MemoryRouter>
        <Button asChild variant="primary">
          <Link to="/joias-afetivas">Explorar coleções</Link>
        </Button>
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: 'Explorar coleções' })
    expect(link).toHaveClass('rounded-sm', 'bg-estrelinha-primary')
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('`block` estica na largura do container', () => {
    render(<Button block>Montar meu kit</Button>)
    expect(screen.getByRole('button')).toHaveClass('w-full')
  })

  it('desabilitado não recebe clique', () => {
    render(<Button disabled>Ação</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
    expect(button).toHaveClass('disabled:pointer-events-none')
  })

  it('`className` do chamador entra sem derrubar a variante', () => {
    render(<Button className="mt-4">Ação</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('mt-4', 'bg-estrelinha-primary', 'rounded-sm')
  })
})
