import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FieldGroup, ToggleField } from './FieldGroup'

describe('FieldGroup', () => {
  it('renders label and children', () => {
    render(<FieldGroup label="Nome"><input aria-label="nome" /></FieldGroup>)
    expect(screen.getByText('Nome')).toBeInTheDocument()
    expect(screen.getByLabelText('nome')).toBeInTheDocument()
  })

  it('renders the hint only when provided', () => {
    const { rerender } = render(<FieldGroup label="CEP"><input /></FieldGroup>)
    expect(screen.queryByText('Somente números')).not.toBeInTheDocument()
    rerender(<FieldGroup label="CEP" hint="Somente números"><input /></FieldGroup>)
    expect(screen.getByText('Somente números')).toBeInTheDocument()
  })
})

describe('ToggleField', () => {
  it('renders label and description', () => {
    render(<ToggleField label="Ativo" description="Visível na loja" checked={false} onChange={() => {}} />)
    expect(screen.getByText('Ativo')).toBeInTheDocument()
    expect(screen.getByText('Visível na loja')).toBeInTheDocument()
  })

  it('calls onChange with the new value when toggled', () => {
    const onChange = vi.fn()
    render(<ToggleField label="PIX" checked={false} onChange={onChange} />)
    fireEvent.click(screen.getByRole('switch'))
    expect(onChange).toHaveBeenCalledWith(true)
  })
})
