import { describe, expect, it, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MoneyInput, WeightInput, DimensionInput } from './index'

// Testes derivados de PFM-10 (UI) e do "Done when" da T27.
//
// A aritmética de parse/format é testada como função pura em `@nanapin/core/formatters`. O que se
// prova AQUI é o comportamento de campo: o que chega no `onChange`, o que aparece na tela, e o que
// NÃO acontece quando a entrada é lixo.

const paste = (el: HTMLElement, text: string) => fireEvent.change(el, { target: { value: text } })

describe('MoneyInput', () => {
  it('colar "R$ 1.234,56" chama onChange(1234.56)', () => {
    const onChange = vi.fn()
    render(<MoneyInput value={null} onChange={onChange} aria-label="preço" />)
    paste(screen.getByLabelText('preço'), 'R$ 1.234,56')
    expect(onChange).toHaveBeenCalledWith(1234.56)
  })

  it.each([
    ['1.234,56', 1234.56],
    ['1234,56', 1234.56],
    ['1234.56', 1234.56],
    ['14,90', 14.9],
    ['0', 0],
  ])('digitar %o chama onChange(%s)', (text, expected) => {
    const onChange = vi.fn()
    render(<MoneyInput value={null} onChange={onChange} aria-label="preço" />)
    paste(screen.getByLabelText('preço'), text)
    expect(onChange).toHaveBeenCalledWith(expected)
  })

  it('colar texto sem número NÃO chama onChange — o valor anterior sobrevive', () => {
    const onChange = vi.fn()
    render(<MoneyInput value={14.9} onChange={onChange} aria-label="preço" />)
    paste(screen.getByLabelText('preço'), 'abc')
    expect(onChange).not.toHaveBeenCalled()
  })

  it('nenhuma entrada inválida produz NaN', () => {
    const onChange = vi.fn()
    render(<MoneyInput value={14.9} onChange={onChange} aria-label="preço" />)
    for (const junk of ['abc', 'R$', '...', '---']) {
      paste(screen.getByLabelText('preço'), junk)
    }
    for (const call of onChange.mock.calls) {
      expect(Number.isNaN(call[0])).toBe(false)
    }
  })

  it('esvaziar o campo é intenção explícita e propaga null', () => {
    const onChange = vi.fn()
    render(<MoneyInput value={14.9} onChange={onChange} aria-label="preço" />)
    paste(screen.getByLabelText('preço'), '')
    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('exibe o valor formatado quando fora de foco', () => {
    render(<MoneyInput value={1234.56} onChange={vi.fn()} aria-label="preço" />)
    expect(screen.getByLabelText('preço')).toHaveValue('1.234,56')
  })

  it('o prefixo R$ existe na tela mas NÃO entra no valor do input', () => {
    render(<MoneyInput value={1234.56} onChange={vi.fn()} aria-label="preço" />)
    expect(screen.getByText('R$')).toBeInTheDocument()
    expect(screen.getByLabelText('preço')).not.toHaveValue('R$ 1.234,56')
  })

  it('digitar não reformata a cada tecla — dá para escrever 14,90 inteiro', () => {
    const onChange = vi.fn()
    render(<MoneyInput value={null} onChange={onChange} aria-label="preço" />)
    const input = screen.getByLabelText('preço')
    fireEvent.focus(input)
    paste(input, '14,')
    // Se o componente reformatasse no meio da digitação, o texto viraria "14,00" aqui.
    expect(input).toHaveValue('14,')
  })

  it('ao sair do foco, reformata a partir do número', () => {
    const onChange = vi.fn()
    const { rerender } = render(<MoneyInput value={null} onChange={onChange} aria-label="preço" />)
    const input = screen.getByLabelText('preço')
    fireEvent.focus(input)
    paste(input, '14,9')
    rerender(<MoneyInput value={14.9} onChange={onChange} aria-label="preço" />)
    fireEvent.blur(input)
    expect(input).toHaveValue('14,90')
  })
})

describe('WeightInput — digita grama, guarda kg', () => {
  it('value 0.018 exibe 18', () => {
    render(<WeightInput value={0.018} onChange={vi.fn()} aria-label="peso" />)
    expect(screen.getByLabelText('peso')).toHaveValue('18')
  })

  it('digitar 20 chama onChange(0.02) — a conversão g→kg é do componente', () => {
    const onChange = vi.fn()
    render(<WeightInput value={null} onChange={onChange} aria-label="peso" />)
    paste(screen.getByLabelText('peso'), '20')
    expect(onChange).toHaveBeenCalledWith(0.02)
  })

  it.each([['18', 0.018], ['22', 0.022], ['1000', 1]])(
    'digitar %o chama onChange(%s) kg', (text, expected) => {
      const onChange = vi.fn()
      render(<WeightInput value={null} onChange={onChange} aria-label="peso" />)
      paste(screen.getByLabelText('peso'), text)
      expect(onChange).toHaveBeenCalledWith(expected)
    },
  )

  it('o sufixo g aparece na tela e não entra no valor', () => {
    render(<WeightInput value={0.018} onChange={vi.fn()} aria-label="peso" />)
    expect(screen.getByText('g')).toBeInTheDocument()
    expect(screen.getByLabelText('peso')).not.toHaveValue('18 g')
  })

  it('ida e volta é estável: 18 g → 0.018 kg → 18 g', () => {
    const onChange = vi.fn()
    const { rerender } = render(<WeightInput value={null} onChange={onChange} aria-label="peso" />)
    paste(screen.getByLabelText('peso'), '18')
    expect(onChange).toHaveBeenCalledWith(0.018)
    rerender(<WeightInput value={0.018} onChange={onChange} aria-label="peso" />)
    expect(screen.getByLabelText('peso')).toHaveValue('18')
  })
})

describe('DimensionInput', () => {
  it('value 11.5 exibe 11,5', () => {
    render(<DimensionInput value={11.5} onChange={vi.fn()} aria-label="largura" />)
    expect(screen.getByLabelText('largura')).toHaveValue('11,5')
  })

  it('digitar 11,5 chama onChange(11.5)', () => {
    const onChange = vi.fn()
    render(<DimensionInput value={null} onChange={onChange} aria-label="largura" />)
    paste(screen.getByLabelText('largura'), '11,5')
    expect(onChange).toHaveBeenCalledWith(11.5)
  })

  it('o sufixo cm aparece na tela e não entra no valor', () => {
    render(<DimensionInput value={11.5} onChange={vi.fn()} aria-label="largura" />)
    expect(screen.getByText('cm')).toBeInTheDocument()
    expect(screen.getByLabelText('largura')).not.toHaveValue('11,5 cm')
  })
})

describe('estado desabilitado', () => {
  it.each([
    ['MoneyInput', MoneyInput],
    ['WeightInput', WeightInput],
    ['DimensionInput', DimensionInput],
  ])('%s respeita disabled', (_name, Component) => {
    render(<Component value={1} onChange={vi.fn()} disabled aria-label="campo" />)
    expect(screen.getByLabelText('campo')).toBeDisabled()
  })
})
