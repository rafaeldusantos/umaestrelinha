import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, waitFor, act } from '@testing-library/react'
import { AuthProvider, useAuthContext } from '@estrelinha/auth'

/* eslint-disable @typescript-eslint/no-explicit-any */

const { supabase, auth, fromResults, queries } = vi.hoisted(() => {
  const fromResults: Record<string, any> = {}
  const queries: Record<string, any> = {}
  // Stable chainable query builder per table so spies persist across from() calls.
  // Supports .select().eq().maybeSingle() and awaited .update().eq().
  const getQuery = (table: string) => {
    if (!queries[table]) {
      const result = () => fromResults[table] ?? { data: null, error: null }
      const q: any = {}
      q.select = vi.fn(() => q)
      q.eq = vi.fn(() => q)
      q.update = vi.fn(() => q)
      q.maybeSingle = vi.fn(() => Promise.resolve(result()))
      q.then = (resolve: any) => resolve(result())
      queries[table] = q
    }
    return queries[table]
  }
  const auth = {
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    signInWithOtp: vi.fn(),
    verifyOtp: vi.fn(),
    signInWithPassword: vi.fn(),
    signInWithOAuth: vi.fn(),
    resetPasswordForEmail: vi.fn(),
    updateUser: vi.fn(),
    signOut: vi.fn(),
    getUser: vi.fn().mockResolvedValue({ data: { user: null } }),
  }
  const supabase = {
    auth,
    from: vi.fn((table: string) => getQuery(table)),
  }
  return { supabase, auth, fromResults, queries }
})

vi.mock('@estrelinha/supabase/client', () => ({ supabase }))

const mountAuth = async () => {
  const hook = renderHook(() => useAuthContext(), { wrapper: AuthProvider })
  await waitFor(() => expect(hook.result.current.loading).toBe(false))
  return hook
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.keys(fromResults).forEach((k) => delete fromResults[k])
  auth.getSession.mockResolvedValue({ data: { session: null } })
  auth.onAuthStateChange.mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } })
})

describe('AuthContext.signInWithOtp (AUTH-02)', () => {
  it('sends an OTP with shouldCreateUser true and returns no error on success', async () => {
    auth.signInWithOtp.mockResolvedValue({ data: {}, error: null })
    const { result } = await mountAuth()

    let res: { error: string | null } = { error: 'unset' }
    await act(async () => {
      res = await result.current.signInWithOtp('maria@email.com')
    })

    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'maria@email.com',
      options: { shouldCreateUser: true },
    })
    expect(res.error).toBeNull()
  })

  it('normalizes the email (trim + lowercase) before sending', async () => {
    auth.signInWithOtp.mockResolvedValue({ data: {}, error: null })
    const { result } = await mountAuth()

    await act(async () => {
      await result.current.signInWithOtp('  Maria@Email.COM  ')
    })

    expect(auth.signInWithOtp).toHaveBeenCalledWith({
      email: 'maria@email.com',
      options: { shouldCreateUser: true },
    })
  })

  it('traduz o rate limit de reenvio para o português da loja', async () => {
    auth.signInWithOtp.mockResolvedValue({
      data: {},
      error: {
        message: 'For security purposes, you can only request this after 60 seconds.',
        code: 'over_email_send_rate_limit',
        status: 429,
      },
    })
    const { result } = await mountAuth()

    let res: { error: string | null } = { error: null }
    await act(async () => {
      res = await result.current.signInWithOtp('maria@email.com')
    })

    // A redação que o design da feature 04 pede desde sempre. Até 2026-08-02 nenhum código de
    // produção a produzia — só o mock do AuthCodeStep.test.tsx.
    expect(res.error).toBe('Aguarde alguns segundos para reenviar')
  })

  // Regressão de BUG-20260728-auth-local-so-entrega-ao-dono-do-resend: o remetente do Resend
  // estava no sandbox, o GoTrue devolvia 500, e a cliente lia "Error sending magic link email"
  // num `role="alert"` vermelho — em inglês, citando magic link num fluxo de código de 6 dígitos.
  it('nunca deixa o 500 do GoTrue chegar cru à cliente', async () => {
    auth.signInWithOtp.mockResolvedValue({
      data: {},
      error: {
        message: 'Error sending magic link email',
        code: 'unexpected_failure',
        status: 500,
      },
    })
    const { result } = await mountAuth()

    let res: { error: string | null } = { error: null }
    await act(async () => {
      res = await result.current.signInWithOtp('maria@email.com')
    })

    expect(res.error).toBe('Não conseguimos enviar seu código agora. Tente de novo em instantes.')
    expect(res.error).not.toContain('magic link')
  })
})

describe('AuthContext.verifyOtp (AUTH-03, AUTH-04)', () => {
  it('verifies the code with type email and returns no error on success', async () => {
    auth.verifyOtp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    fromResults.customers = { data: { name: 'Maria' }, error: null }
    const { result } = await mountAuth()

    let res: { error: string | null; isNewUser: boolean } = { error: 'unset', isNewUser: false }
    await act(async () => {
      res = await result.current.verifyOtp('maria@email.com', '429831')
    })

    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: 'maria@email.com', token: '429831', type: 'email' })
    expect(res.error).toBeNull()
  })

  it('flags isNewUser=true when the customer name is empty', async () => {
    auth.verifyOtp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    fromResults.customers = { data: { name: '' }, error: null }
    const { result } = await mountAuth()

    let res = { error: null as string | null, isNewUser: false }
    await act(async () => {
      res = await result.current.verifyOtp('maria@email.com', '429831')
    })

    expect(res.isNewUser).toBe(true)
  })

  it('flags isNewUser=false when the customer already has a name', async () => {
    auth.verifyOtp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    fromResults.customers = { data: { name: 'Maria' }, error: null }
    const { result } = await mountAuth()

    let res = { error: null as string | null, isNewUser: true }
    await act(async () => {
      res = await result.current.verifyOtp('maria@email.com', '429831')
    })

    expect(res.isNewUser).toBe(false)
  })

  it('returns an error (not throwing) when the code is invalid or expired', async () => {
    // O GoTrue devolve `otp_expired` tanto para código errado quanto para vencido.
    auth.verifyOtp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Token has expired or is invalid', code: 'otp_expired', status: 403 },
    })
    const { result } = await mountAuth()

    let res = { error: null as string | null, isNewUser: false }
    await act(async () => {
      res = await result.current.verifyOtp('maria@email.com', '000000')
    })

    expect(res.error).toBe('Código inválido ou expirado. Peça um novo.')
    expect(res.isNewUser).toBe(false)
  })

  it('normalizes a code pasted with spaces before verifying', async () => {
    auth.verifyOtp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    fromResults.customers = { data: { name: 'Maria' }, error: null }
    const { result } = await mountAuth()

    await act(async () => {
      await result.current.verifyOtp('maria@email.com', '4 2 9 8 3 1')
    })

    expect(auth.verifyOtp).toHaveBeenCalledWith({ email: 'maria@email.com', token: '429831', type: 'email' })
  })
})

describe('AuthContext.updateDisplayName (AUTH-04)', () => {
  it('persists the name to customers and to user metadata', async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    auth.updateUser.mockResolvedValue({ data: {}, error: null })
    fromResults.customers = { data: null, error: null }
    const { result } = await mountAuth()

    let res: { error: string | null } = { error: 'unset' }
    await act(async () => {
      res = await result.current.updateDisplayName('Maria Silva')
    })

    expect(queries.customers.update).toHaveBeenCalledWith({ name: 'Maria Silva' })
    expect(queries.customers.eq).toHaveBeenCalledWith('user_id', 'u1')
    expect(auth.updateUser).toHaveBeenCalledWith({ data: { full_name: 'Maria Silva' } })
    expect(res.error).toBeNull()
  })

  it('rejects a blank name without calling the backend', async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    const { result } = await mountAuth()

    let res: { error: string | null } = { error: null }
    await act(async () => {
      res = await result.current.updateDisplayName('   ')
    })

    expect(res.error).toBeTruthy()
    expect(auth.updateUser).not.toHaveBeenCalled()
    expect(supabase.from).not.toHaveBeenCalled()
  })

  it('returns an error without dropping the session when the update fails', async () => {
    auth.getUser.mockResolvedValue({ data: { user: { id: 'u1' } } })
    fromResults.customers = { data: null, error: { message: 'permission denied' } }
    const { result } = await mountAuth()

    let res: { error: string | null } = { error: null }
    await act(async () => {
      res = await result.current.updateDisplayName('Maria')
    })

    // Erro do PostgREST, não do GoTrue: a cliente não pode ler "permission denied for table".
    expect(res.error).toBe('Não foi possível salvar seu nome agora. Tente de novo.')
    expect(auth.updateUser).not.toHaveBeenCalled()
  })
})

describe('AuthContext.resetPassword (AUTH-08)', () => {
  it('requests a reset for a normalized email, without a redirect URL', async () => {
    auth.resetPasswordForEmail.mockResolvedValue({ data: {}, error: null })
    const { result } = await mountAuth()

    let res: { error: string | null } = { error: 'unset' }
    await act(async () => {
      res = await result.current.resetPassword('Maria@Email.com')
    })

    // O template de recovery entrega {{ .Token }}: não há link para redirecionar.
    expect(auth.resetPasswordForEmail).toHaveBeenCalledWith('maria@email.com')
    expect(res.error).toBeNull()
  })

  it('blocks an invalid email without calling the backend', async () => {
    const { result } = await mountAuth()

    let res: { error: string | null } = { error: null }
    await act(async () => {
      res = await result.current.resetPassword('not-an-email')
    })

    expect(res.error).toBeTruthy()
    expect(auth.resetPasswordForEmail).not.toHaveBeenCalled()
  })
})

describe('AuthContext.verifyRecoveryCode (AUTH-08)', () => {
  it('verifies the code with type recovery, normalizing email and token', async () => {
    auth.verifyOtp.mockResolvedValue({ data: { user: { id: 'u1' } }, error: null })
    const { result } = await mountAuth()

    let res: { error: string | null } = { error: 'unset' }
    await act(async () => {
      res = await result.current.verifyRecoveryCode('  Maria@Email.com ', '4 2 9 8 3 1')
    })

    expect(auth.verifyOtp).toHaveBeenCalledWith({
      email: 'maria@email.com',
      token: '429831',
      type: 'recovery',
    })
    expect(res.error).toBeNull()
  })

  it('returns the error when the recovery code is invalid or expired', async () => {
    auth.verifyOtp.mockResolvedValue({
      data: { user: null },
      error: { message: 'Token has expired or is invalid', code: 'otp_expired', status: 403 },
    })
    const { result } = await mountAuth()

    let res: { error: string | null } = { error: null }
    await act(async () => {
      res = await result.current.verifyRecoveryCode('maria@email.com', '000000')
    })

    expect(res.error).toBe('Código inválido ou expirado. Peça um novo.')
  })
})

describe('AuthContext.updatePassword (AUTH-08)', () => {
  it('persists the new password', async () => {
    auth.updateUser.mockResolvedValue({ data: {}, error: null })
    const { result } = await mountAuth()

    let res: { error: string | null } = { error: 'unset' }
    await act(async () => {
      res = await result.current.updatePassword('novaSenha123')
    })

    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'novaSenha123' })
    expect(res.error).toBeNull()
  })

  it('rejects a password shorter than the minimum without calling the backend', async () => {
    const { result } = await mountAuth()

    let res: { error: string | null } = { error: null }
    await act(async () => {
      res = await result.current.updatePassword('123')
    })

    expect(res.error).toBeTruthy()
    expect(auth.updateUser).not.toHaveBeenCalled()
  })

  it('surfaces the backend error when the update fails', async () => {
    auth.updateUser.mockResolvedValue({
      data: {},
      error: { message: 'Session expired', code: 'session_expired', status: 401 },
    })
    const { result } = await mountAuth()

    let res: { error: string | null } = { error: null }
    await act(async () => {
      res = await result.current.updatePassword('novaSenha123')
    })

    expect(res.error).toBe('Sessão expirada. Entre novamente.')
  })
})

describe('AuthContext.signInWithGoogle (AUTH-05, AUTH-10)', () => {
  it('uses a redirectTo that includes the given return path', async () => {
    auth.signInWithOAuth.mockResolvedValue({})
    const { result } = await mountAuth()

    await act(async () => {
      await result.current.signInWithGoogle('/checkout')
    })

    expect(auth.signInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: { redirectTo: expect.stringContaining('/checkout') },
    })
  })
})

// Regressão de BUG-20260802-primeiro-login-do-admin-volta-para-a-tela.
//
// `loading` precisa voltar a `true` enquanto o papel e o cliente estão em voo. Sem isso, quem lê o
// contexto decide sobre estado obsoleto: no backoffice o `RequireAdmin` via `loading: false` +
// `isAdmin: false` e expulsava a lojista já autenticada; na loja, `user` ainda `null` com
// `loading: false` reabre o overlay de auth em cima de quem acabou de entrar.
//
// O segundo teste guarda o efeito colateral que quase impediu esta correção: refresh de token do MESMO
// usuário não pode piscar `loading`, senão `/conta` e `/checkout` voltam para "Carregando..." no meio
// da sessão.
describe('AuthContext.loading durante a resolução de sessão', () => {
  /** Deixa o `setTimeout(0)` do `onAuthStateChange` disparar. */
  const tick = () => new Promise<void>((r) => setTimeout(r, 0))
  const session = (id: string) => ({ user: { id, email: `${id}@umaestrelinha.dev` } })

  it('fica true enquanto resolve uma sessão nova e só fecha com papel e cliente em mãos', async () => {
    let emit: (event: string, s: any) => void = () => {}
    auth.onAuthStateChange.mockImplementation((cb: any) => {
      emit = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
    const { result } = await mountAuth()
    expect(result.current.loading).toBe(false)

    fromResults['user_roles'] = { data: { role: 'admin' }, error: null }
    let liberar: () => void = () => {}
    const emVoo = new Promise<void>((r) => {
      liberar = r
    })
    // O builder é criado na primeira chamada de `from()`; instanciar antes de segurar o `maybeSingle`.
    supabase.from('user_roles')
    queries['user_roles'].maybeSingle = vi.fn(
      () => emVoo.then(() => ({ data: { role: 'admin' }, error: null })),
    )

    await act(async () => {
      emit('SIGNED_IN', session('u-1'))
      // A resolução é agendada FORA do callback (`setTimeout(0)`, para não ler o banco de dentro do
      // `onAuthStateChange`); este tick é o que a faz começar.
      await tick()
    })
    expect(result.current.loading).toBe(true)
    expect(result.current.isAdmin).toBe(false)

    await act(async () => {
      liberar()
      await emVoo
    })
    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.isAdmin).toBe(true)
  })

  it('não pisca loading no refresh de token do mesmo usuário', async () => {
    let emit: (event: string, s: any) => void = () => {}
    auth.onAuthStateChange.mockImplementation((cb: any) => {
      emit = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    })
    fromResults['user_roles'] = { data: { role: 'admin' }, error: null }
    const { result } = await mountAuth()

    await act(async () => {
      emit('SIGNED_IN', session('u-1'))
      await tick()
    })
    await waitFor(() => expect(result.current.loading).toBe(false))

    const chamadasAntes = queries['user_roles'].select.mock.calls.length
    await act(async () => {
      emit('TOKEN_REFRESHED', session('u-1'))
      await tick()
    })

    expect(result.current.loading).toBe(false)
    expect(queries['user_roles'].select.mock.calls.length).toBe(chamadasAntes)
  })
})
