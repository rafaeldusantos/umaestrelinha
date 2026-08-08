import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useAuthFlow } from '../useAuthFlow'
import { useAuthUiStore } from '../authUiStore'
import type { AuthStep } from '../authUiStore'

const { mockCtx, navigate } = vi.hoisted(() => ({
  mockCtx: {
    signIn: vi.fn(),
    signInWithGoogle: vi.fn(),
    signInWithOtp: vi.fn(),
    verifyOtp: vi.fn(),
    updateDisplayName: vi.fn(),
    resetPassword: vi.fn(),
    verifyRecoveryCode: vi.fn(),
    updatePassword: vi.fn(),
  },
  navigate: vi.fn(),
}))

vi.mock('@nanapin/auth', () => ({ useAuthContext: () => mockCtx }))
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))

const openWith = (returnTo: string | null, step: AuthStep = 'entry', email = '') =>
  useAuthUiStore.setState({ isOpen: true, step, email, returnTo })

beforeEach(() => {
  vi.clearAllMocks()
  window.history.pushState({}, '', '/')
  useAuthUiStore.setState({ isOpen: false, step: 'entry', email: '', returnTo: null })
})

describe('useAuthFlow (AUTH-01, AUTH-05)', () => {
  it('sendCode stores the email and moves to the code step on success', async () => {
    mockCtx.signInWithOtp.mockResolvedValue({ error: null })
    openWith('/checkout')
    const { result } = renderHook(() => useAuthFlow())

    await act(async () => {
      await result.current.sendCode('maria@email.com')
    })

    expect(mockCtx.signInWithOtp).toHaveBeenCalledWith('maria@email.com')
    expect(useAuthUiStore.getState().step).toBe('code')
    expect(useAuthUiStore.getState().email).toBe('maria@email.com')
  })

  it('sendCode stays on entry and returns the error on failure', async () => {
    mockCtx.signInWithOtp.mockResolvedValue({ error: 'Aguarde alguns segundos para reenviar' })
    openWith(null)
    const { result } = renderHook(() => useAuthFlow())

    let res: { error: string | null } = { error: null }
    await act(async () => {
      res = await result.current.sendCode('maria@email.com')
    })

    expect(res.error).toBe('Aguarde alguns segundos para reenviar')
    expect(useAuthUiStore.getState().step).toBe('entry')
  })

  it('submitCode goes to the name step for a new user', async () => {
    mockCtx.verifyOtp.mockResolvedValue({ error: null, isNewUser: true })
    openWith('/checkout', 'code', 'maria@email.com')
    const { result } = renderHook(() => useAuthFlow())

    await act(async () => {
      await result.current.submitCode('429831')
    })

    expect(mockCtx.verifyOtp).toHaveBeenCalledWith('maria@email.com', '429831')
    expect(useAuthUiStore.getState().step).toBe('name')
    expect(navigate).not.toHaveBeenCalled()
  })

  it('submitCode finishes (closes + navigates to returnTo) for a returning user', async () => {
    mockCtx.verifyOtp.mockResolvedValue({ error: null, isNewUser: false })
    openWith('/favoritos', 'code', 'maria@email.com')
    const { result } = renderHook(() => useAuthFlow())

    await act(async () => {
      await result.current.submitCode('429831')
    })

    expect(useAuthUiStore.getState().isOpen).toBe(false)
    expect(navigate).toHaveBeenCalledWith('/favoritos')
  })

  it('submitCode stays on the code step and returns the error when invalid', async () => {
    mockCtx.verifyOtp.mockResolvedValue({ error: 'Código inválido ou expirado. Peça um novo.', isNewUser: false })
    openWith('/checkout', 'code', 'maria@email.com')
    const { result } = renderHook(() => useAuthFlow())

    let res: { error: string | null } = { error: null }
    await act(async () => {
      res = await result.current.submitCode('000000')
    })

    expect(res.error).toBe('Código inválido ou expirado. Peça um novo.')
    expect(useAuthUiStore.getState().step).toBe('code')
    expect(useAuthUiStore.getState().isOpen).toBe(true)
  })

  it('submitName finishes after saving the name', async () => {
    mockCtx.updateDisplayName.mockResolvedValue({ error: null })
    openWith('/checkout', 'name', 'maria@email.com')
    const { result } = renderHook(() => useAuthFlow())

    await act(async () => {
      await result.current.submitName('Maria Silva')
    })

    expect(mockCtx.updateDisplayName).toHaveBeenCalledWith('Maria Silva')
    expect(useAuthUiStore.getState().isOpen).toBe(false)
    expect(navigate).toHaveBeenCalledWith('/checkout')
  })

  it('loginWithPassword finishes to /conta when there is no returnTo', async () => {
    mockCtx.signIn.mockResolvedValue({ error: null })
    openWith(null, 'password')
    const { result } = renderHook(() => useAuthFlow())

    await act(async () => {
      await result.current.loginWithPassword('maria@email.com', 'secret123')
    })

    expect(navigate).toHaveBeenCalledWith('/conta')
  })

  it('loginWithGoogle forwards the returnTo path', () => {
    openWith('/checkout')
    const { result } = renderHook(() => useAuthFlow())
    result.current.loginWithGoogle()
    expect(mockCtx.signInWithGoogle).toHaveBeenCalledWith('/checkout')
  })

  it('loginWithGoogle defaults to /conta without a returnTo', () => {
    openWith(null)
    const { result } = renderHook(() => useAuthFlow())
    result.current.loginWithGoogle()
    expect(mockCtx.signInWithGoogle).toHaveBeenCalledWith('/conta')
  })

  it('loginWithGoogle does not enter the OTP/name step flow (Google skips name capture)', () => {
    openWith('/checkout', 'entry')
    const { result } = renderHook(() => useAuthFlow())
    result.current.loginWithGoogle()
    // OAuth is a full-page redirect; it must never route into the code/name steps
    expect(mockCtx.verifyOtp).not.toHaveBeenCalled()
    expect(mockCtx.updateDisplayName).not.toHaveBeenCalled()
    expect(useAuthUiStore.getState().step).toBe('entry')
  })

  it('sendReset stores the email and moves to the reset-code step on success', async () => {
    mockCtx.resetPassword.mockResolvedValue({ error: null })
    openWith(null, 'reset')
    const { result } = renderHook(() => useAuthFlow())

    await act(async () => {
      await result.current.sendReset('maria@email.com')
    })

    expect(mockCtx.resetPassword).toHaveBeenCalledWith('maria@email.com')
    expect(useAuthUiStore.getState().step).toBe('reset-code')
    expect(useAuthUiStore.getState().email).toBe('maria@email.com')
  })

  it('sendReset stays on the reset step and returns the error on failure', async () => {
    mockCtx.resetPassword.mockResolvedValue({ error: 'Aguarde alguns segundos para reenviar' })
    openWith(null, 'reset')
    const { result } = renderHook(() => useAuthFlow())

    let res: { error: string | null } = { error: null }
    await act(async () => {
      res = await result.current.sendReset('maria@email.com')
    })

    expect(res.error).toBe('Aguarde alguns segundos para reenviar')
    expect(useAuthUiStore.getState().step).toBe('reset')
  })

  it('submitResetCode moves to the new-password step on success', async () => {
    mockCtx.verifyRecoveryCode.mockResolvedValue({ error: null })
    openWith(null, 'reset-code', 'maria@email.com')
    const { result } = renderHook(() => useAuthFlow())

    await act(async () => {
      await result.current.submitResetCode('429831')
    })

    expect(mockCtx.verifyRecoveryCode).toHaveBeenCalledWith('maria@email.com', '429831')
    expect(useAuthUiStore.getState().step).toBe('new-password')
  })

  it('submitResetCode stays on reset-code and returns the error when invalid', async () => {
    mockCtx.verifyRecoveryCode.mockResolvedValue({ error: 'Código inválido ou expirado. Peça um novo.' })
    openWith(null, 'reset-code', 'maria@email.com')
    const { result } = renderHook(() => useAuthFlow())

    let res: { error: string | null } = { error: null }
    await act(async () => {
      res = await result.current.submitResetCode('000000')
    })

    expect(res.error).toBe('Código inválido ou expirado. Peça um novo.')
    expect(useAuthUiStore.getState().step).toBe('reset-code')
    expect(useAuthUiStore.getState().isOpen).toBe(true)
  })

  it('submitNewPassword finishes (closes + navigates to returnTo) on success', async () => {
    mockCtx.updatePassword.mockResolvedValue({ error: null })
    openWith('/checkout', 'new-password', 'maria@email.com')
    const { result } = renderHook(() => useAuthFlow())

    await act(async () => {
      await result.current.submitNewPassword('novaSenha123')
    })

    expect(mockCtx.updatePassword).toHaveBeenCalledWith('novaSenha123')
    expect(useAuthUiStore.getState().isOpen).toBe(false)
    expect(navigate).toHaveBeenCalledWith('/checkout')
  })

  it('submitNewPassword keeps the overlay open and returns the error on failure', async () => {
    mockCtx.updatePassword.mockResolvedValue({ error: 'Sessão expirada. Entre novamente.' })
    openWith(null, 'new-password', 'maria@email.com')
    const { result } = renderHook(() => useAuthFlow())

    let res: { error: string | null } = { error: null }
    await act(async () => {
      res = await result.current.submitNewPassword('novaSenha123')
    })

    expect(res.error).toBe('Sessão expirada. Entre novamente.')
    expect(useAuthUiStore.getState().step).toBe('new-password')
    expect(useAuthUiStore.getState().isOpen).toBe(true)
    expect(navigate).not.toHaveBeenCalled()
  })

  it('does not navigate when returnTo equals the current route (contextual close)', async () => {
    window.history.pushState({}, '', '/checkout')
    mockCtx.verifyOtp.mockResolvedValue({ error: null, isNewUser: false })
    openWith('/checkout', 'code', 'maria@email.com')
    const { result } = renderHook(() => useAuthFlow())

    await act(async () => {
      await result.current.submitCode('429831')
    })

    expect(useAuthUiStore.getState().isOpen).toBe(false)
    expect(navigate).not.toHaveBeenCalled()
  })
})
