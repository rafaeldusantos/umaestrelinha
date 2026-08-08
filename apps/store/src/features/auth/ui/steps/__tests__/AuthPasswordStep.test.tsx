import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AuthPasswordStep from '../AuthPasswordStep'

const { flow } = vi.hoisted(() => ({
  flow: {
    email: 'maria@email.com',
    loginWithPassword: vi.fn(),
    goTo: vi.fn(),
    setEmail: vi.fn(),
  },
}))

vi.mock('../../../model/useAuthFlow', () => ({ useAuthFlow: () => flow }))

beforeEach(() => {
  vi.clearAllMocks()
  flow.loginWithPassword.mockResolvedValue({ error: null })
})

describe('AuthPasswordStep (AUTH-06)', () => {
  it('renders the password heading with the prefilled email', () => {
    render(<AuthPasswordStep />)
    expect(screen.getByText('Entrar com senha')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toHaveValue('maria@email.com')
  })

  it('toggles password visibility', () => {
    render(<AuthPasswordStep />)
    const pw = screen.getByLabelText('Senha')
    expect(pw).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(pw).toHaveAttribute('type', 'text')
    fireEvent.click(screen.getByRole('button', { name: 'Ocultar senha' }))
    expect(pw).toHaveAttribute('type', 'password')
  })

  it('submits credentials and shows the error on invalid login', async () => {
    flow.loginWithPassword.mockResolvedValue({ error: 'E-mail ou senha inválidos' })
    render(<AuthPasswordStep />)
    fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'wrongpass' } })
    fireEvent.click(screen.getByRole('button', { name: 'Entrar' }))
    await waitFor(() =>
      expect(flow.loginWithPassword).toHaveBeenCalledWith('maria@email.com', 'wrongpass'),
    )
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha inválidos')
  })

  it('goes to the reset step from "Esqueceu a senha?"', () => {
    render(<AuthPasswordStep />)
    fireEvent.click(screen.getByText('Esqueceu a senha?'))
    expect(flow.goTo).toHaveBeenCalledWith('reset')
  })

  it('returns to the OTP flow keeping the email', () => {
    render(<AuthPasswordStep />)
    fireEvent.click(screen.getByText('Sem senha? Receber código por e-mail'))
    expect(flow.setEmail).toHaveBeenCalledWith('maria@email.com')
    expect(flow.goTo).toHaveBeenCalledWith('entry')
  })
})
