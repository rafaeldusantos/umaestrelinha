import { useEffect } from 'react'
import { useAuthContext } from '@estrelinha/auth'
import { loginEvent, signUpEvent } from '@estrelinha/core/analytics'
import { track } from '@/shared/lib/analytics'

/**
 * Feature 61 · EVT-16, EVT-17 (P2) — entrar e criar conta.
 *
 * `method` é como a cliente entrou, em palavras estáveis para o relatório: `codigo` (os 6 dígitos
 * por e-mail), `senha` e `google`. Conta nova só nasce pelo código (`verifyOtp` com `isNewUser`); a
 * senha e o Google entram em conta que já existe — o Google pode criar uma, mas a loja não tem como
 * distinguir no retorno, e afirmar `sign_up` sem saber seria inventar o dado.
 */
export type AuthMethod = 'codigo' | 'senha' | 'google'

export function trackLogin(method: AuthMethod): void {
  track(loginEvent({ method }))
}

export function trackSignUp(method: AuthMethod): void {
  track(signUpEvent({ method }))
}

/**
 * O Google sai da loja e volta por redirecionamento: o `login` só pode ser contado NA VOLTA, com a
 * sessão de pé. A marca fica em `sessionStorage` (morre com a aba, e o retorno é na mesma aba) e é
 * consumida uma vez.
 */
const MARCA_GOOGLE = 'estrelinha-google-login'

export function markGoogleLogin(): void {
  try {
    window.sessionStorage.setItem(MARCA_GOOGLE, '1')
  } catch {
    // Sem armazenamento, o login pelo Google simplesmente não é contado.
  }
}

/** Montado onde a volta do Google aterrissa (o cabeçalho da loja e o checkout). */
export function useGoogleLoginReturn(): void {
  const { user } = useAuthContext()
  useEffect(() => {
    if (!user) return
    let marcado = false
    try {
      marcado = window.sessionStorage.getItem(MARCA_GOOGLE) === '1'
      if (marcado) window.sessionStorage.removeItem(MARCA_GOOGLE)
    } catch {
      return
    }
    if (marcado) trackLogin('google')
  }, [user])
}
