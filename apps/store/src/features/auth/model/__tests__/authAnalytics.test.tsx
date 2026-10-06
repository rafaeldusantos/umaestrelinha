import { beforeEach, describe, expect, it, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { useAuthUiStore } from '../authUiStore'

/**
 * Feature 61 · T20 — `login` e `sign_up` (`EVT-16`, `EVT-17`), pelo fluxo de entrada REAL
 * (`useAuthFlow`) e pela volta do Google (`useGoogleLoginReturn`).
 */
const { mockCtx, navigate, trackSpy } = vi.hoisted(() => ({
  mockCtx: {
    user: null as null | { id: string },
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
  trackSpy: vi.fn(),
}))

vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => mockCtx }))
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))
vi.mock('@/shared/lib/analytics', async importOriginal => {
  const real = await importOriginal<typeof import('@/shared/lib/analytics')>()
  return { ...real, track: (e: unknown) => trackSpy(e) }
})

import { useAuthFlow } from '../useAuthFlow'
import { useGoogleLoginReturn } from '../authAnalytics'

const eventos = () =>
  trackSpy.mock.calls.map(c => c[0] as { name: string; params: { method: string } })

beforeEach(() => {
  vi.clearAllMocks()
  mockCtx.user = null
  window.sessionStorage.clear()
  useAuthUiStore.setState({ isOpen: true, step: 'code', email: 'ana@exemplo.invalid', returnTo: '/conta' })
})

describe('pelo código de 6 dígitos', () => {
  it('conta que já existia ⇒ login, method codigo', async () => {
    mockCtx.verifyOtp.mockResolvedValue({ error: null, isNewUser: false })
    const { result } = renderHook(() => useAuthFlow())
    await act(async () => {
      await result.current.submitCode('123456')
    })
    expect(eventos()).toEqual([{ name: 'login', params: { method: 'codigo' } }])
  })

  it('conta nova ⇒ sign_up, method codigo — e não login', async () => {
    mockCtx.verifyOtp.mockResolvedValue({ error: null, isNewUser: true })
    const { result } = renderHook(() => useAuthFlow())
    await act(async () => {
      await result.current.submitCode('123456')
    })
    expect(eventos()).toEqual([{ name: 'sign_up', params: { method: 'codigo' } }])
  })

  it('código errado ⇒ nada', async () => {
    mockCtx.verifyOtp.mockResolvedValue({ error: 'Código inválido', isNewUser: false })
    const { result } = renderHook(() => useAuthFlow())
    await act(async () => {
      await result.current.submitCode('000000')
    })
    expect(eventos()).toEqual([])
  })
})

describe('pela senha', () => {
  it('senha certa ⇒ login, method senha; errada ⇒ nada', async () => {
    const { result } = renderHook(() => useAuthFlow())
    mockCtx.signIn.mockResolvedValueOnce({ error: 'Senha incorreta' })
    await act(async () => {
      await result.current.loginWithPassword('ana@exemplo.invalid', 'x')
    })
    expect(eventos()).toEqual([])
    mockCtx.signIn.mockResolvedValueOnce({ error: null })
    await act(async () => {
      await result.current.loginWithPassword('ana@exemplo.invalid', 'certa')
    })
    expect(eventos()).toEqual([{ name: 'login', params: { method: 'senha' } }])
  })
})

describe('pelo Google — o login sai NA VOLTA', () => {
  it('tocar no Google não emite nada ainda; voltar com sessão ⇒ UM login, method google', async () => {
    const { result } = renderHook(() => useAuthFlow())
    await act(async () => {
      await result.current.loginWithGoogle()
    })
    expect(mockCtx.signInWithGoogle).toHaveBeenCalledWith('/conta')
    expect(eventos()).toEqual([])

    // A volta: página nova, sessão de pé.
    mockCtx.user = { id: 'u1' }
    const { rerender } = renderHook(() => useGoogleLoginReturn())
    expect(eventos()).toEqual([{ name: 'login', params: { method: 'google' } }])
    rerender()
    renderHook(() => useGoogleLoginReturn())
    expect(eventos()).toHaveLength(1)
  })

  it('sessão sem ter passado pelo Google (recarregar a página logada) ⇒ nada', () => {
    mockCtx.user = { id: 'u1' }
    renderHook(() => useGoogleLoginReturn())
    expect(eventos()).toEqual([])
  })
})
