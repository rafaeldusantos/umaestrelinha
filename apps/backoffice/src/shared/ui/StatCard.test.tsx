import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DollarSign } from 'lucide-react'
import StatCard from './StatCard'

describe('StatCard', () => {
  it('renders label and value', () => {
    render(<StatCard label="Pedidos Hoje" value={42} />)
    expect(screen.getByText('Pedidos Hoje')).toBeInTheDocument()
    expect(screen.getByText('42')).toBeInTheDocument()
  })

  it('renders a string value', () => {
    render(<StatCard label="Faturamento" value="R$ 1.234,00" />)
    expect(screen.getByText('R$ 1.234,00')).toBeInTheDocument()
  })

  it('renders the subtitle only when provided', () => {
    const { rerender } = render(<StatCard label="Taxa" value="10%" />)
    expect(screen.queryByText('3 recuperados')).not.toBeInTheDocument()
    rerender(<StatCard label="Taxa" value="10%" subtitle="3 recuperados" />)
    expect(screen.getByText('3 recuperados')).toBeInTheDocument()
  })

  it('renders an icon when provided', () => {
    const { container } = render(<StatCard label="Fat." value="R$ 0" icon={DollarSign} accent="text-emerald-500" />)
    expect(container.querySelector('svg')).toBeInTheDocument()
  })
})
