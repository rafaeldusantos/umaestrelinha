import { beforeEach, describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

/**
 * `IDN-02`/`IDN-03` — o desafio de código, dentro do bloco Contato.
 *
 * ⚠️ **A fiação não é provada aqui.** Este arquivo monta o componente sozinho; quem prova que ele
 * aparece no checkout, e que o CTA trava enquanto ele está de pé, é `CheckoutPage.test.tsx`.
 */

const { sendCode, open } = vi.hoisted(() => ({ sendCode: vi.fn(), open: vi.fn() }))

vi.mock('@/features/auth', () => ({ useAuthUiStore: (sel: (s: unknown) => unknown) => sel({ open }) }))
vi.mock('@/features/auth/model/useAuthFlow', () => ({ useAuthFlow: () => ({ sendCode }) }))
vi.mock('@/features/auth/ui/steps/AuthCodeStep', () => ({
  default: () => <div data-testid="auth-code-step" />,
}))

import CheckoutSignInChallenge from '../CheckoutSignInChallenge'

beforeEach(() => {
  sendCode.mockReset().mockResolvedValue({ error: null })
  open.mockReset()
})

describe('CheckoutSignInChallenge — o aviso (IDN-02)', () => {
  it('diz que o e-mail já tem cadastro e mostra qual é', () => {
    render(<CheckoutSignInChallenge email="marina@exemplo.com" />)

    expect(screen.getByText('Este e-mail já tem cadastro na loja')).toBeInTheDocument()
    expect(screen.getByText('marina@exemplo.com')).toBeInTheDocument()
  })

  it('não culpa quem digitou nem usa vocabulário de erro', () => {
    // A pessoa não errou nada: a loja está checando algo que é dela. Numa loja memorial, o tom é
    // restrição de produto, não preferência de estilo.
    const { container } = render(<CheckoutSignInChallenge email="marina@exemplo.com" />)

    expect(container.textContent).not.toMatch(/erro|inválid|falh|não foi possível|!/i)
  })

  it('é uma região anunciável, não um parágrafo solto', () => {
    render(<CheckoutSignInChallenge email="marina@exemplo.com" />)

    expect(screen.getByRole('group', { name: 'Confirme que este e-mail é seu' })).toBeInTheDocument()
  })
})

describe('CheckoutSignInChallenge — o envio do código (IDN-03)', () => {
  it('envia o código ao montar, para o e-mail desafiado', () => {
    render(<CheckoutSignInChallenge email="marina@exemplo.com" />)

    expect(sendCode).toHaveBeenCalledWith('marina@exemplo.com')
  })

  it('envia UMA vez, mesmo com re-render', () => {
    // Sem o `ref`, uma tecla no campo de telefone dispararia outro envio — e o GoTrue tem teto de
    // e-mail por hora: a cliente ficaria sem o código por ter digitado o próprio telefone.
    const { rerender } = render(<CheckoutSignInChallenge email="marina@exemplo.com" />)
    rerender(<CheckoutSignInChallenge email="marina@exemplo.com" />)
    rerender(<CheckoutSignInChallenge email="marina@exemplo.com" />)

    expect(sendCode).toHaveBeenCalledTimes(1)
  })

  it('e-mail diferente envia de novo', () => {
    const { rerender } = render(<CheckoutSignInChallenge email="marina@exemplo.com" />)
    rerender(<CheckoutSignInChallenge email="outra@exemplo.com" />)

    expect(sendCode).toHaveBeenCalledTimes(2)
    expect(sendCode).toHaveBeenLastCalledWith('outra@exemplo.com')
  })

  it('semeia o `returnTo` no próprio checkout — é o que evita navegar ao concluir (IDN-05)', () => {
    // `finish()` do `useAuthFlow` compara `returnTo` com `window.location.pathname` e só fecha
    // quando são iguais. Com outro destino, concluir o código remontaria a página inteira.
    render(<CheckoutSignInChallenge email="marina@exemplo.com" />)

    expect(open).toHaveBeenCalledWith({ returnTo: '/checkout', step: 'code' })
  })
})

describe('CheckoutSignInChallenge — reusa o passo de código (IDN-03)', () => {
  it('renderiza o `AuthCodeStep` existente, não um campo próprio', () => {
    // Com ele vêm o reenvio, o cooldown de 60s e o tratamento de código errado. Um segundo campo
    // de 6 dígitos seriam duas máquinas de estado de login divergindo no primeiro ajuste.
    render(<CheckoutSignInChallenge email="marina@exemplo.com" />)

    expect(screen.getByTestId('auth-code-step')).toBeInTheDocument()
  })
})
