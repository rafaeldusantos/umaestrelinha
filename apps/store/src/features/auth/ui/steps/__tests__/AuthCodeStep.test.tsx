import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import AuthCodeStep from '../AuthCodeStep'

const { flow } = vi.hoisted(() => ({
  flow: {
    email: 'maria@email.com',
    submitCode: vi.fn(),
    sendCode: vi.fn(),
    goTo: vi.fn(),
  },
}))

vi.mock('../../../model/useAuthFlow', () => ({ useAuthFlow: () => flow }))

const typeCode = (value: string) => {
  const input = document.querySelector('input') as HTMLInputElement
  fireEvent.change(input, { target: { value } })
}

beforeEach(() => {
  vi.clearAllMocks()
  flow.submitCode.mockResolvedValue({ error: null })
  flow.sendCode.mockResolvedValue({ error: null })
})

describe('AuthCodeStep (AUTH-03, AUTH-07)', () => {
  it('shows the target email in the instructions', () => {
    render(<AuthCodeStep />)
    expect(screen.getByText('Digite o código')).toBeInTheDocument()
    expect(screen.getByText('maria@email.com')).toBeInTheDocument()
  })

  it('submits the entered 6-digit code', async () => {
    render(<AuthCodeStep />)
    typeCode('429831')
    fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }))
    await waitFor(() => expect(flow.submitCode).toHaveBeenCalledWith('429831'))
  })

  it('shows an error when the code is invalid, staying on the step', async () => {
    flow.submitCode.mockResolvedValue({ error: 'Código inválido ou expirado. Peça um novo.' })
    render(<AuthCodeStep />)
    typeCode('000000')
    fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Código inválido ou expirado. Peça um novo.')
  })

  it('disables resend during the cooldown and shows a countdown', () => {
    render(<AuthCodeStep />)
    const resend = screen.getByRole('button', { name: /Reenviar em/ })
    expect(resend).toBeDisabled()
  })

  it('enables resend after the cooldown and resends the code', async () => {
    vi.useFakeTimers()
    let unmount = () => {}
    try {
      ;({ unmount } = render(<AuthCodeStep />))
      await act(async () => {
        vi.advanceTimersByTime(60_000)
      })
      const resend = screen.getByRole('button', { name: 'Reenviar código' })
      expect(resend).not.toBeDisabled()
      fireEvent.click(resend)
      expect(flow.sendCode).toHaveBeenCalledWith('maria@email.com')
    } finally {
      unmount()
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  // O que este teste garante é o COOLDOWN (linha final), não a mensagem: `sendCode` é mockado já
  // devolvendo a string, então ele passaria mesmo se ninguém a produzisse — foi o que aconteceu
  // até 2026-08-02, com a `validation.md` da feature 04 registrando um PASS falso.
  // Quem produz a string é `authErrorMessage` em `packages/core/src/auth/errors.ts`, e quem prova
  // isso é `authContext.test.tsx` ("traduz o rate limit de reenvio para o português da loja").
  it('surfaces a rate-limit error on resend (does not restart the cooldown)', async () => {
    vi.useFakeTimers()
    let unmount = () => {}
    try {
      flow.sendCode.mockResolvedValue({ error: 'Aguarde alguns segundos para reenviar' })
      ;({ unmount } = render(<AuthCodeStep />))
      await act(async () => {
        vi.advanceTimersByTime(60_000)
      })
      const resend = screen.getByRole('button', { name: 'Reenviar código' })
      await act(async () => {
        fireEvent.click(resend)
      })
      expect(screen.getByRole('alert')).toHaveTextContent('Aguarde alguns segundos para reenviar')
      // cooldown not restarted -> resend still enabled
      expect(screen.getByRole('button', { name: 'Reenviar código' })).not.toBeDisabled()
    } finally {
      unmount()
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('goes back to entry with "Usar outro e-mail"', () => {
    render(<AuthCodeStep />)
    fireEvent.click(screen.getByText('Usar outro e-mail'))
    expect(flow.goTo).toHaveBeenCalledWith('entry')
  })
})

afterEach(() => {
  vi.useRealTimers()
})

describe('AuthCodeStep — embutido no checkout (alvo explícito)', () => {
  const alvo = { email: 'marina@exemplo.com', returnTo: '/checkout' }

  it('verifica com o alvo, não com o e-mail do store', async () => {
    flow.email = ''
    try {
      render(<AuthCodeStep target={alvo} onUseOtherEmail={vi.fn()} />)
      typeCode('429831')
      fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }))
      await waitFor(() => expect(flow.submitCode).toHaveBeenCalledWith('429831', alvo))
    } finally {
      flow.email = 'maria@email.com'
    }
  })

  it('não repete o título nem o e-mail — quem os diz é o aviso de quem embute', () => {
    render(<AuthCodeStep target={alvo} onUseOtherEmail={vi.fn()} />)

    expect(screen.queryByText('Digite o código')).not.toBeInTheDocument()
    expect(screen.queryByText('marina@exemplo.com')).not.toBeInTheDocument()
  })

  it('"Usar outro e-mail" chama quem embute, não o passo de entrada do overlay', () => {
    const trocar = vi.fn()
    render(<AuthCodeStep target={alvo} onUseOtherEmail={trocar} />)

    fireEvent.click(screen.getByRole('button', { name: 'Usar outro e-mail' }))

    expect(trocar).toHaveBeenCalledTimes(1)
    expect(flow.goTo).not.toHaveBeenCalled()
  })
})
