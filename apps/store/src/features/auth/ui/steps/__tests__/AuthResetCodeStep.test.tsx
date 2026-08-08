import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react'
import AuthResetCodeStep from '../AuthResetCodeStep'

const { flow } = vi.hoisted(() => ({
  flow: {
    email: 'maria@email.com',
    submitResetCode: vi.fn(),
    sendReset: vi.fn(),
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
  flow.submitResetCode.mockResolvedValue({ error: null })
  flow.sendReset.mockResolvedValue({ error: null })
})

describe('AuthResetCodeStep (AUTH-08)', () => {
  it('shows the target email in the instructions', () => {
    render(<AuthResetCodeStep />)
    expect(screen.getByText('Digite o código')).toBeInTheDocument()
    expect(screen.getByText('maria@email.com')).toBeInTheDocument()
  })

  it('submits the entered 6-digit recovery code', async () => {
    render(<AuthResetCodeStep />)
    typeCode('429831')
    fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }))
    await waitFor(() => expect(flow.submitResetCode).toHaveBeenCalledWith('429831'))
  })

  it('blocks an incomplete code without calling the backend', async () => {
    render(<AuthResetCodeStep />)
    typeCode('4298')
    fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(flow.submitResetCode).not.toHaveBeenCalled()
  })

  it('shows an error when the code is invalid, staying on the step', async () => {
    flow.submitResetCode.mockResolvedValue({ error: 'Código inválido ou expirado. Peça um novo.' })
    render(<AuthResetCodeStep />)
    typeCode('000000')
    fireEvent.click(screen.getByRole('button', { name: 'Verificar código' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Código inválido ou expirado. Peça um novo.')
  })

  it('disables resend during the cooldown', () => {
    render(<AuthResetCodeStep />)
    expect(screen.getByRole('button', { name: /Reenviar em/ })).toBeDisabled()
  })

  it('resends the recovery code after the cooldown', async () => {
    vi.useFakeTimers()
    let unmount = () => {}
    try {
      ;({ unmount } = render(<AuthResetCodeStep />))
      await act(async () => {
        vi.advanceTimersByTime(60_000)
      })
      const resend = screen.getByRole('button', { name: 'Reenviar código' })
      expect(resend).not.toBeDisabled()
      fireEvent.click(resend)
      expect(flow.sendReset).toHaveBeenCalledWith('maria@email.com')
    } finally {
      unmount()
      vi.clearAllTimers()
      vi.useRealTimers()
    }
  })

  it('goes back to the password step', () => {
    render(<AuthResetCodeStep />)
    fireEvent.click(screen.getByText('Voltar para o login'))
    expect(flow.goTo).toHaveBeenCalledWith('password')
  })
})

afterEach(() => {
  vi.useRealTimers()
})
