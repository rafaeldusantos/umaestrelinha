import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { FieldGroup, ToggleField } from './FieldGroup'
import { CharCounter } from './CharCounter'

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

// ───────────────────────────────────────────────────────────────────────────
// Feature 56 — o contador na linha do rótulo
// ───────────────────────────────────────────────────────────────────────────

describe('FieldGroup — o slot `counter` (LEG-14)', () => {
  it('sem `counter`, nada muda: nenhum nó a mais além do rótulo', () => {
    // Aditivo. Os ~30 `FieldGroup` anteriores a esta feature não passam nada, e não podem ganhar
    // texto novo por tabela.
    render(<FieldGroup label="Nome"><input aria-label="nome" /></FieldGroup>)
    expect(screen.getByText('Nome')).toBeInTheDocument()
    expect(screen.queryByTestId('contador')).toBeNull()
  })

  it('com `counter`, ele fica na MESMA linha do rótulo — e não abaixo do campo', () => {
    render(
      <FieldGroup
        label="Assunto"
        counter={<CharCounter data-testid="contador" value="abc" limit={70} />}
        hint="uma dica qualquer"
      >
        <input aria-label="assunto" />
      </FieldGroup>,
    )

    const rotulo = screen.getByText('Assunto')
    const contador = screen.getByTestId('contador')

    // A régua é o PAI COMPARTILHADO. "Existe na tela" seria verdade também com o contador empilhado
    // sob o input, que é exatamente de onde ele saiu — lá ele disputava espaço com a `hint`, que é
    // o outro texto de apoio, e empurrava a dica a cada tecla.
    expect(contador.parentElement).toBe(rotulo.parentElement)
    // …e ele NÃO é irmão da dica.
    expect(contador.parentElement).not.toBe(screen.getByText('uma dica qualquer').parentElement)
  })
})

describe('CharCounter (LEG-14, LEG-19)', () => {
  it('conta o comprimento contra o limite', () => {
    render(<CharCounter data-testid="c" value="quatro" limit={70} />)
    expect(screen.getByTestId('c')).toHaveTextContent('6/70')
  })

  it('campo ainda não tocado conta ZERO, não quebra', () => {
    // `undefined` chega de verdade: os campos de `EmailFields` são opcionais no tipo de rascunho.
    render(<CharCounter data-testid="c" value={undefined} limit={40} />)
    expect(screen.getByTestId('c')).toHaveTextContent('0/40')
  })

  it('conta CARACTERE, e não palavra nem byte', () => {
    // `é` é um caractere e dois bytes em UTF-8. A régua do servidor (`limitsRefusal`, em `core`) usa
    // `.length` de JavaScript; se o contador da tela medisse outra coisa, ele diria "cabe" sobre um
    // texto que o servidor recusa.
    render(<CharCounter data-testid="c" value="ação" limit={10} />)
    expect(screen.getByTestId('c')).toHaveTextContent('4/10')
  })
})
