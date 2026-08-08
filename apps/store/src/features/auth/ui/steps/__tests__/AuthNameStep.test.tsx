import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import AuthNameStep from '../AuthNameStep'

const { flow } = vi.hoisted(() => ({
  flow: { submitName: vi.fn() },
}))

vi.mock('../../../model/useAuthFlow', () => ({ useAuthFlow: () => flow }))

beforeEach(() => {
  vi.clearAllMocks()
  flow.submitName.mockResolvedValue({ error: null })
})

describe('AuthNameStep (AUTH-04)', () => {
  it('renders the name prompt', () => {
    render(<AuthNameStep />)
    expect(screen.getByText('Como podemos te chamar?')).toBeInTheDocument()
  })

  it('submits a valid name', async () => {
    render(<AuthNameStep />)
    fireEvent.change(screen.getByLabelText('Seu nome'), { target: { value: 'Maria Silva' } })
    fireEvent.click(screen.getByRole('button', { name: 'Concluir cadastro' }))
    await waitFor(() => expect(flow.submitName).toHaveBeenCalledWith('Maria Silva'))
  })

  it('rejects a blank name and shows an error without submitting', async () => {
    render(<AuthNameStep />)
    fireEvent.change(screen.getByLabelText('Seu nome'), { target: { value: '   ' } })
    fireEvent.submit(screen.getByLabelText('Seu nome').closest('form')!)
    expect(await screen.findByRole('alert')).toBeInTheDocument()
    expect(flow.submitName).not.toHaveBeenCalled()
  })
})
