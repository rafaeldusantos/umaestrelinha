import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AuthNewPasswordStep from '../AuthNewPasswordStep'

const { flow } = vi.hoisted(() => ({
  flow: { submitNewPassword: vi.fn() },
}))

vi.mock('../../../model/useAuthFlow', () => ({ useAuthFlow: () => flow }))

const fill = (password: string, confirm: string) => {
  fireEvent.change(screen.getByLabelText('Nova senha'), { target: { value: password } })
  fireEvent.change(screen.getByLabelText('Confirmar nova senha'), { target: { value: confirm } })
}

beforeEach(() => {
  vi.clearAllMocks()
  flow.submitNewPassword.mockResolvedValue({ error: null })
})

describe('AuthNewPasswordStep (AUTH-08)', () => {
  it('renders the heading', () => {
    render(<AuthNewPasswordStep />)
    expect(screen.getByText('Criar nova senha')).toBeInTheDocument()
  })

  it('submits the new password when both fields match', async () => {
    render(<AuthNewPasswordStep />)
    fill('novaSenha123', 'novaSenha123')
    fireEvent.click(screen.getByRole('button', { name: 'Salvar senha' }))
    await waitFor(() => expect(flow.submitNewPassword).toHaveBeenCalledWith('novaSenha123'))
  })

  it('blocks a password below the minimum length', async () => {
    render(<AuthNewPasswordStep />)
    fill('123', '123')
    fireEvent.click(screen.getByRole('button', { name: 'Salvar senha' }))
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(flow.submitNewPassword).not.toHaveBeenCalled()
  })

  it('blocks mismatched passwords', async () => {
    render(<AuthNewPasswordStep />)
    fill('novaSenha123', 'outraSenha123')
    fireEvent.click(screen.getByRole('button', { name: 'Salvar senha' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('As senhas não conferem')
    expect(flow.submitNewPassword).not.toHaveBeenCalled()
  })

  it('surfaces the backend error', async () => {
    flow.submitNewPassword.mockResolvedValue({ error: 'Sessão expirada. Entre novamente.' })
    render(<AuthNewPasswordStep />)
    fill('novaSenha123', 'novaSenha123')
    fireEvent.click(screen.getByRole('button', { name: 'Salvar senha' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('Sessão expirada. Entre novamente.')
  })

  it('toggles password visibility', () => {
    render(<AuthNewPasswordStep />)
    const input = screen.getByLabelText('Nova senha')
    expect(input).toHaveAttribute('type', 'password')
    fireEvent.click(screen.getByRole('button', { name: 'Mostrar senha' }))
    expect(input).toHaveAttribute('type', 'text')
  })
})
