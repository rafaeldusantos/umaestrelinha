import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AuthEntry from '../AuthEntry'

const { flow } = vi.hoisted(() => ({
  flow: {
    email: '',
    sendCode: vi.fn(),
    loginWithGoogle: vi.fn(),
    goTo: vi.fn(),
    setEmail: vi.fn(),
  },
}))

vi.mock('../../../model/useAuthFlow', () => ({ useAuthFlow: () => flow }))

beforeEach(() => {
  vi.clearAllMocks()
  flow.sendCode.mockResolvedValue({ error: null })
})

describe('AuthEntry (AUTH-02, AUTH-10)', () => {
  it('renders the entry heading and Google option', () => {
    render(<AuthEntry />)
    expect(screen.getByText('Entrar ou criar conta')).toBeInTheDocument()
    expect(screen.getByText('Continuar com Google')).toBeInTheDocument()
  })

  it('sends the code for a valid email', async () => {
    render(<AuthEntry />)
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'maria@email.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }))
    await waitFor(() => expect(flow.sendCode).toHaveBeenCalledWith('maria@email.com'))
  })

  it('blocks an invalid email and shows an error without sending', async () => {
    render(<AuthEntry />)
    const input = screen.getByLabelText('E-mail')
    fireEvent.change(input, { target: { value: 'not-an-email' } })
    // Submit the form directly to exercise the component's own validation
    // (bypasses jsdom's native type=email constraint, which is a separate guard).
    fireEvent.submit(input.closest('form')!)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(flow.sendCode).not.toHaveBeenCalled()
  })

  it('starts Google login when the Google button is clicked', () => {
    render(<AuthEntry />)
    fireEvent.click(screen.getByText('Continuar com Google'))
    expect(flow.loginWithGoogle).toHaveBeenCalled()
  })

  it('switches to the password step preserving the typed email', () => {
    render(<AuthEntry />)
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'maria@email.com' } })
    fireEvent.click(screen.getByText('Prefere usar senha? Clique aqui'))
    expect(flow.setEmail).toHaveBeenCalledWith('maria@email.com')
    expect(flow.goTo).toHaveBeenCalledWith('password')
  })
})
