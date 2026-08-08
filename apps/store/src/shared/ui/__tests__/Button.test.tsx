import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Link } from 'react-router-dom'
import { Button } from '../Button'

/**
 * O botão da loja, contra as ACs de `PAP-04`.
 *
 * O que estes testes protegem não é a aparência — é a **distinção de forma**:
 * ação é 14px, rótulo é pílula, disco é disco. Sem isso a loja volta a ter
 * quatro coisas diferentes com a mesma silhueta.
 */

const VARIANTS = ['primary', 'secondary', 'onInk', 'inkSolid', 'ghost'] as const

describe('Button — forma', () => {
  it.each(VARIANTS)('a variante `%s` usa `rounded-button`', (variant) => {
    render(<Button variant={variant}>Ação</Button>)
    expect(screen.getByRole('button')).toHaveClass('rounded-button')
  })

  it.each(VARIANTS)('a variante `%s` NÃO usa `rounded-pill`', (variant) => {
    // Pílula é rótulo (badge, chip, tag, campo de busca). Um botão em pílula
    // é o defeito que a feature 19 existe para desfazer.
    render(<Button variant={variant}>Ação</Button>)
    expect(screen.getByRole('button')).not.toHaveClass('rounded-pill')
  })

  it('toda variante tem borda de 2px transparente, para contorno e sólido casarem de altura', () => {
    const { rerender } = render(<Button variant="primary">Ação</Button>)
    expect(screen.getByRole('button')).toHaveClass('border-2', 'border-transparent')

    rerender(<Button variant="secondary">Ação</Button>)
    expect(screen.getByRole('button')).toHaveClass('border-2', 'border-nanita-ink')
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
  it('primário é Carmim com texto branco', () => {
    // Prancha 20b: Carmim é "todo o dinheiro da tela".
    render(<Button variant="primary">Comprar</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-nanita-jam', 'text-white')
  })

  it('secundário é contorno Grafite, sem fundo sólido', () => {
    render(<Button variant="secondary">Criar o meu</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('border-nanita-ink', 'text-nanita-ink')
    // Classe exata, não regex: `hover:bg-nanita-ink/[0.06]` é intencional — o
    // que não pode existir é fundo sólido em repouso.
    const classes = button.className.split(/\s+/)
    expect(classes).not.toContain('bg-nanita-jam')
    expect(classes).not.toContain('bg-nanita-ink')
    expect(classes).not.toContain('bg-nanita-glaze')
  })

  it('sobre Grafite o botão é Carimbo com texto Grafite — nunca Carmim', () => {
    // Carmim sobre Grafite lê a 2,18:1. Carimbo, a 5,22:1.
    render(<Button variant="onInk">Ativar lembrete</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-nanita-glaze', 'text-nanita-ink')
    expect(button).not.toHaveClass('bg-nanita-jam')
  })

  it('sobre Carimbo o botão é Grafite com texto branco', () => {
    render(<Button variant="inkSolid">Quero 10% OFF</Button>)
    expect(screen.getByRole('button')).toHaveClass('bg-nanita-ink', 'text-white')
  })
})

describe('Button — tipografia e comportamento', () => {
  it('o rótulo sai em Fredoka 600', () => {
    render(<Button>Ação</Button>)
    expect(screen.getByRole('button')).toHaveClass('font-display', 'font-semibold')
  })

  it('`asChild` renderiza o filho e preserva as classes', () => {
    // É o que permite um `<Link>` agir como botão sem `<button>` dentro de `<a>`.
    render(
      <MemoryRouter>
        <Button asChild variant="primary">
          <Link to="/colecao/anime">Explorar coleções</Link>
        </Button>
      </MemoryRouter>,
    )

    const link = screen.getByRole('link', { name: 'Explorar coleções' })
    expect(link).toHaveClass('rounded-button', 'bg-nanita-jam')
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
    expect(button).toHaveClass('mt-4', 'bg-nanita-jam', 'rounded-button')
  })
})
