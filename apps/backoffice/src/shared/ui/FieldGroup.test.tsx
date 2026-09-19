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

  // `switchClassName` (feature 53, ABN-10) é ADITIVO: sem ele, os 7 chamadores de antes desta
  // feature (frete, material, pagamento×2, checkout, carrinho) não mudam nem um pixel.
  it('sem `switchClassName`, o switch não ganha classe nenhuma de alvo de toque estendido', () => {
    render(<ToggleField label="Sem extensão" checked={false} onChange={() => {}} />)
    expect(screen.getByRole('switch').className).not.toContain('before:absolute')
  })

  it('com `switchClassName`, a classe passa a existir no switch — o alvo de toque real', () => {
    render(
      <ToggleField
        label="Com extensão"
        checked={false}
        onChange={() => {}}
        switchClassName="before:absolute before:-top-[10px]"
      />,
    )
    const switchEl = screen.getByRole('switch')
    expect(switchEl.className).toContain('before:absolute')
    expect(switchEl.className).toContain('before:-top-[10px]')
    // E os defaults do Switch (a forma visual) continuam lá — não foram substituídos.
    expect(switchEl.className).toContain('h-6')
    expect(switchEl.className).toContain('w-11')
  })
})
