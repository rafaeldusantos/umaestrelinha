import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ShoppingCart } from 'lucide-react'
import EmptyState from './EmptyState'

describe('EmptyState', () => {
  it('renders the message', () => {
    render(<EmptyState message="Nenhum registro encontrado" />)
    expect(screen.getByText('Nenhum registro encontrado')).toBeInTheDocument()
  })

  it('renders the hint when provided', () => {
    render(<EmptyState message="Vazio" hint="Adicione o primeiro item" />)
    expect(screen.getByText('Adicione o primeiro item')).toBeInTheDocument()
  })

  it('does not render a hint when not provided', () => {
    const { container } = render(<EmptyState message="Vazio" />)
    // Só o parágrafo da mensagem deve existir
    expect(container.querySelectorAll('p')).toHaveLength(1)
  })

  it('renders the action when provided', () => {
    render(<EmptyState message="Vazio" action={<button>Criar</button>} />)
    expect(screen.getByRole('button', { name: 'Criar' })).toBeInTheDocument()
  })

  it('renders an icon when provided', () => {
    const { container } = render(<EmptyState message="Vazio" icon={ShoppingCart} />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
