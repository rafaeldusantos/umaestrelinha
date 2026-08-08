import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AuthResetStep from '../AuthResetStep'

const { flow } = vi.hoisted(() => ({
  flow: { email: '', sendReset: vi.fn(), goTo: vi.fn() },
}))

vi.mock('../../../model/useAuthFlow', () => ({ useAuthFlow: () => flow }))

beforeEach(() => {
  vi.clearAllMocks()
  flow.sendReset.mockResolvedValue({ error: null })
})

describe('AuthResetStep (AUTH-08)', () => {
  it('renders the reset heading', () => {
    render(<AuthResetStep />)
    expect(screen.getByText('Redefinir senha')).toBeInTheDocument()
  })

  it('requests a reset code for a valid email', async () => {
    render(<AuthResetStep />)
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'maria@email.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }))
    // A transição para o step reset-code é responsabilidade do sendReset (useAuthFlow).
    await waitFor(() => expect(flow.sendReset).toHaveBeenCalledWith('maria@email.com'))
  })

  it('surfaces the backend error and stays on the form', async () => {
    flow.sendReset.mockResolvedValue({ error: 'Aguarde alguns segundos para reenviar' })
    render(<AuthResetStep />)
    fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'maria@email.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Enviar código' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Aguarde alguns segundos para reenviar')
  })

  it('blocks an invalid email without calling the backend', async () => {
    render(<AuthResetStep />)
    const input = screen.getByLabelText('E-mail')
    fireEvent.change(input, { target: { value: 'nope' } })
    fireEvent.submit(input.closest('form')!)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(flow.sendReset).not.toHaveBeenCalled()
  })

  it('goes back to the password step', () => {
    render(<AuthResetStep />)
    fireEvent.click(screen.getByText('Voltar'))
    expect(flow.goTo).toHaveBeenCalledWith('password')
  })
})
