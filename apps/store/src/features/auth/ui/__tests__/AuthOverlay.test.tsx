import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AuthOverlay from '../AuthOverlay'
import { useAuthUiStore } from '../../model/authUiStore'

const { flow, isMobileRef } = vi.hoisted(() => ({
  flow: {
    email: '',
    sendCode: vi.fn(),
    submitCode: vi.fn(),
    submitName: vi.fn(),
    loginWithPassword: vi.fn(),
    sendReset: vi.fn(),
    loginWithGoogle: vi.fn(),
    goTo: vi.fn(),
    setEmail: vi.fn(),
  },
  isMobileRef: { value: false },
}))

vi.mock('../../model/useAuthFlow', () => ({ useAuthFlow: () => flow }))
vi.mock('@estrelinha/ui/hooks/use-mobile', () => ({ useIsMobile: () => isMobileRef.value }))

beforeEach(() => {
  vi.clearAllMocks()
  isMobileRef.value = false
  useAuthUiStore.setState({ isOpen: false, step: 'entry', email: '', returnTo: null })
})

describe('AuthOverlay (AUTH-01, AUTH-09)', () => {
  it('renders the desktop modal with the brand panel and current step', () => {
    useAuthUiStore.setState({ isOpen: true, step: 'entry' })
    render(<AuthOverlay />)
    expect(screen.getByTestId('auth-brand-panel')).toBeInTheDocument()
    expect(screen.getByText('Entrar ou criar conta')).toBeInTheDocument()
  })

  it('shows the brand benefits on the desktop panel', () => {
    useAuthUiStore.setState({ isOpen: true, step: 'entry' })
    render(<AuthOverlay />)
    expect(screen.getByText('Frete grátis acima de R$150')).toBeInTheDocument()
    expect(screen.getByText('Peça única, feita à mão')).toBeInTheDocument()
    expect(screen.getByText('Acompanhe seu pedido do início ao fim')).toBeInTheDocument()
  })

  it('routes to the current step (code)', () => {
    useAuthUiStore.setState({ isOpen: true, step: 'code' })
    render(<AuthOverlay />)
    expect(screen.getByText('Digite o código')).toBeInTheDocument()
  })

  it('renders the mobile drawer without the brand panel', () => {
    isMobileRef.value = true
    useAuthUiStore.setState({ isOpen: true, step: 'entry' })
    render(<AuthOverlay />)
    expect(screen.getByText('Entrar ou criar conta')).toBeInTheDocument()
    expect(screen.queryByTestId('auth-brand-panel')).not.toBeInTheDocument()
  })

  it('closing the modal (X) resets the store open state', () => {
    useAuthUiStore.setState({ isOpen: true, step: 'entry' })
    render(<AuthOverlay />)
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    expect(useAuthUiStore.getState().isOpen).toBe(false)
  })

  it('renders nothing when closed', () => {
    useAuthUiStore.setState({ isOpen: false })
    render(<AuthOverlay />)
    expect(screen.queryByText('Entrar ou criar conta')).not.toBeInTheDocument()
  })
})
