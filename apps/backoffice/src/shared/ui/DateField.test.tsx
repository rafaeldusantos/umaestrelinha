// Feature 18 / T2 — DSC-05 AC 1-4.
//
// O calendário é o do `react-day-picker` de verdade (não dublado): é ele que decide o idioma dos
// meses, e "em português" é a AC. O dia clicado é escolhido pelo próprio texto da célula.

import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DateField from './DateField'

const onChange = vi.fn()

const setup = (value = '') => {
  onChange.mockClear()
  render(
    <DateField
      label="Válida de"
      value={value}
      onChange={onChange}
      placeholder="Vale desde já"
      hint="Sem datas, a regra vale enquanto estiver ativa."
    />,
  )
}

const openCalendar = () => fireEvent.click(screen.getByRole('button', { name: 'Válida de' }))

describe('DateField', () => {
  it('sem data escolhida, o botão mostra o texto de vazio — não uma data de hoje (AC 3)', () => {
    setup()

    expect(screen.getByRole('button', { name: 'Válida de' })).toHaveTextContent('Vale desde já')
    expect(screen.getByText('Sem datas, a regra vale enquanto estiver ativa.')).toBeInTheDocument()
  })

  it('com data escolhida, mostra dd/MM/yyyy (AC 2)', () => {
    setup('2026-08-31')

    expect(screen.getByRole('button', { name: 'Válida de' })).toHaveTextContent('31/08/2026')
  })

  it('não usa `<input type="date">` (AC 1)', () => {
    setup('2026-08-31')

    expect(document.querySelector('input[type="date"]')).toBeNull()
  })

  it('o calendário abre em pt-BR e o dia clicado sai como `YYYY-MM-DD`', () => {
    setup('2026-08-31')

    openCalendar()

    // Nome do mês em português — a prova de que o `locale` chegou ao `react-day-picker`.
    expect(screen.getByText(/agosto 2026/i)).toBeInTheDocument()

    fireEvent.click(screen.getByRole('gridcell', { name: '12' }))

    expect(onChange).toHaveBeenCalledWith('2026-08-12')
  })

  it('o mês aberto é o da data escolhida, não o de hoje', () => {
    setup('2026-12-25')

    openCalendar()

    expect(screen.getByText(/dezembro 2026/i)).toBeInTheDocument()
  })

  it('limpar só existe com data, e grava vazio (AC 4)', () => {
    setup()
    expect(screen.queryByRole('button', { name: 'Limpar Válida de' })).not.toBeInTheDocument()

    setup('2026-08-31')
    fireEvent.click(screen.getByRole('button', { name: 'Limpar Válida de' }))

    expect(onChange).toHaveBeenCalledWith('')
  })
})
