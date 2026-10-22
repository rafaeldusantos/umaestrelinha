import { useEffect, useState } from 'react'
import { useAuthContext } from '@estrelinha/auth'
import { Splash, SPLASH_MIN_MS, useMinimumDuration } from '@/features/splash'

/**
 * A splash da ABERTURA do app (feature 72, `MAF-05`/`MAF-06`).
 *
 * Fica na frente do router até as duas coisas acontecerem: o piso de 600 ms passar **e** a sessão
 * ser resolvida pela primeira vez. Ela trava (`resolvida`) na primeira resolução de propósito: o
 * `AuthProvider` volta a `loading` a cada login, e se este portão reagisse a isso o Login seria
 * desmontado no meio da entrada — levando o estado do formulário junto. Depois da abertura, quem
 * cobre um carregamento é o `fallback` do `RequireAdmin`, que é a mesma `Splash`.
 */
const BootGate = ({ children }: { children: React.ReactNode }) => {
  const pisoCumprido = useMinimumDuration(SPLASH_MIN_MS)
  const { loading } = useAuthContext()
  const [resolvida, setResolvida] = useState(!loading)

  useEffect(() => {
    if (!loading) setResolvida(true)
  }, [loading])

  if (!pisoCumprido || !(resolvida || !loading)) return <Splash />
  return <>{children}</>
}

export default BootGate
