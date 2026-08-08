import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FormCard from './FormCard'

describe('FormCard', () => {
  it('renders its children', () => {
    render(<FormCard><span>Conteúdo do card</span></FormCard>)
    expect(screen.getByText('Conteúdo do card')).toBeInTheDocument()
  })

  it('renders the title and description when provided', () => {
    render(
      <FormCard title="Informações gerais" description="Dados básicos do produto">
        <span>x</span>
      </FormCard>,
    )
    expect(screen.getByText('Informações gerais')).toBeInTheDocument()
    expect(screen.getByText('Dados básicos do produto')).toBeInTheDocument()
  })

  it('does not render a title when not provided', () => {
    render(<FormCard><span>corpo</span></FormCard>)
    expect(screen.queryByText('Informações gerais')).not.toBeInTheDocument()
  })

  it('renders a footer when provided', () => {
    render(<FormCard footer={<button>Salvar</button>}><span>x</span></FormCard>)
    expect(screen.getByRole('button', { name: 'Salvar' })).toBeInTheDocument()
  })
})
