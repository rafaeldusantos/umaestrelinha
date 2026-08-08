import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import PageHeader from './PageHeader'

describe('PageHeader', () => {
  it('renders the title as a heading', () => {
    render(<PageHeader title="Produtos" />)
    expect(screen.getByRole('heading', { name: 'Produtos' })).toBeInTheDocument()
  })

  it('renders the subtitle only when provided', () => {
    const { rerender } = render(<PageHeader title="Produtos" />)
    expect(screen.queryByText('Gerencie o catálogo')).not.toBeInTheDocument()
    rerender(<PageHeader title="Produtos" subtitle="Gerencie o catálogo" />)
    expect(screen.getByText('Gerencie o catálogo')).toBeInTheDocument()
  })

  it('renders actions when provided', () => {
    render(<PageHeader title="Produtos" actions={<button>Novo</button>} />)
    expect(screen.getByRole('button', { name: 'Novo' })).toBeInTheDocument()
  })

  it('calls backTo when the back button is clicked', () => {
    const backTo = vi.fn()
    render(<PageHeader title="Editar" backTo={backTo} />)
    fireEvent.click(screen.getByRole('button', { name: 'Voltar' }))
    expect(backTo).toHaveBeenCalledTimes(1)
  })

  it('does not render a back button without backTo', () => {
    render(<PageHeader title="Editar" />)
    expect(screen.queryByRole('button', { name: 'Voltar' })).not.toBeInTheDocument()
  })
})
