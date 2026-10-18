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
const { codeStepProps } = vi.hoisted(() => ({ codeStepProps: vi.fn() }))
vi.mock('@/features/auth/ui/steps/AuthCodeStep', () => ({
  default: (props: unknown) => {
    codeStepProps(props)
    return <div data-testid="auth-code-step" />
  },
}))

import CheckoutSignInChallenge from '../CheckoutSignInChallenge'

beforeEach(() => {
  sendCode.mockReset().mockResolvedValue({ error: null })
  open.mockReset()
  codeStepProps.mockReset()
})

describe('CheckoutSignInChallenge — o aviso (IDN-02)', () => {
  it('diz que o e-mail já tem cadastro e mostra qual é', () => {
    render(<CheckoutSignInChallenge email="marina@exemplo.com" onUseOtherEmail={vi.fn()} />)

    expect(screen.getByText('Este e-mail já tem cadastro na loja')).toBeInTheDocument()
    expect(screen.getByText('marina@exemplo.com')).toBeInTheDocument()
  })

  it('não culpa quem digitou nem usa vocabulário de erro', () => {
    // A pessoa não errou nada: a loja está checando algo que é dela. Numa loja memorial, o tom é
    // restrição de produto, não preferência de estilo.
    const { container } = render(<CheckoutSignInChallenge email="marina@exemplo.com" onUseOtherEmail={vi.fn()} />)

    expect(container.textContent).not.toMatch(/erro|inválid|falh|não foi possível|!/i)
  })

  it('é uma região anunciável, não um parágrafo solto', () => {
    render(<CheckoutSignInChallenge email="marina@exemplo.com" onUseOtherEmail={vi.fn()} />)

    expect(screen.getByRole('group', { name: 'Confirme que este e-mail é seu' })).toBeInTheDocument()
  })
})

describe('CheckoutSignInChallenge — o envio do código (IDN-03)', () => {
  it('envia o código ao montar, para o e-mail desafiado', () => {
    render(<CheckoutSignInChallenge email="marina@exemplo.com" onUseOtherEmail={vi.fn()} />)

    expect(sendCode).toHaveBeenCalledWith('marina@exemplo.com', {
      email: 'marina@exemplo.com',
      returnTo: '/checkout',
    })
  })

  it('envia UMA vez, mesmo com re-render', () => {
    // Sem o `ref`, uma tecla no campo de telefone dispararia outro envio — e o GoTrue tem teto de
    // e-mail por hora: a cliente ficaria sem o código por ter digitado o próprio telefone.
    const { rerender } = render(<CheckoutSignInChallenge email="marina@exemplo.com" onUseOtherEmail={vi.fn()} />)
    rerender(<CheckoutSignInChallenge email="marina@exemplo.com" onUseOtherEmail={vi.fn()} />)
    rerender(<CheckoutSignInChallenge email="marina@exemplo.com" onUseOtherEmail={vi.fn()} />)

    expect(sendCode).toHaveBeenCalledTimes(1)
  })

  it('e-mail diferente envia de novo', () => {
    const { rerender } = render(<CheckoutSignInChallenge email="marina@exemplo.com" onUseOtherEmail={vi.fn()} />)
    rerender(<CheckoutSignInChallenge email="outra@exemplo.com" onUseOtherEmail={vi.fn()} />)

    expect(sendCode).toHaveBeenCalledTimes(2)
    expect(sendCode).toHaveBeenLastCalledWith('outra@exemplo.com', {
      email: 'outra@exemplo.com',
      returnTo: '/checkout',
    })
  })

  it('NÃO abre o overlay de login — o código é pedido só aqui', () => {
    // O defeito: o desafio chamava `authUiStore.open`, e o modal subia por cima do bloco pedindo
    // o mesmo código. Duas superfícies, e fechar o modal zerava o e-mail que esta verificava.
    render(<CheckoutSignInChallenge email="marina@exemplo.com" onUseOtherEmail={vi.fn()} />)

    expect(open).not.toHaveBeenCalled()
  })

  it('passa ao passo de código o alvo do checkout e o "usar outro e-mail" de quem embute (IDN-05)', () => {
    // `returnTo` no próprio checkout é o que faz concluir o código não navegar.
    const trocar = vi.fn()
    render(<CheckoutSignInChallenge email="marina@exemplo.com" onUseOtherEmail={trocar} />)

    expect(codeStepProps).toHaveBeenCalledWith({
      target: { email: 'marina@exemplo.com', returnTo: '/checkout' },
      onUseOtherEmail: trocar,
    })
  })
})

describe('CheckoutSignInChallenge — reusa o passo de código (IDN-03)', () => {
  it('renderiza o `AuthCodeStep` existente, não um campo próprio', () => {
    // Com ele vêm o reenvio, o cooldown de 60s e o tratamento de código errado. Um segundo campo
    // de 6 dígitos seriam duas máquinas de estado de login divergindo no primeiro ajuste.
    render(<CheckoutSignInChallenge email="marina@exemplo.com" onUseOtherEmail={vi.fn()} />)

    expect(screen.getByTestId('auth-code-step')).toBeInTheDocument()
  })
})
