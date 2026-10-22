import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuthContext } from './AuthContext'
import { Skeleton } from '@estrelinha/ui/skeleton'
import { Button } from '@estrelinha/ui/button'
import { ACCESS_UNCHECKED } from '@estrelinha/core/auth'

/**
 * O padrão do painel para o estado `unknown`: a frase e "Tentar de novo", com os tokens
 * `estrelinha-admin-*`. Sem "Sair": não é uma recusa, e sair apagaria a sessão salva.
 */
const AcessoNaoConferidoDoPainel = () => {
  const { retryAdminCheck } = useAuthContext()
  const [tentando, setTentando] = useState(false)
  const tentar = async () => {
    setTentando(true)
    await retryAdminCheck()
    setTentando(false)
  }
  return (
    <div className="flex items-center justify-center min-h-screen bg-estrelinha-admin-bg p-4">
      <div className="w-full max-w-sm space-y-4 text-center">
        <p role="alert" className="text-sm text-estrelinha-admin-text">
          {ACCESS_UNCHECKED}
        </p>
        <Button type="button" onClick={tentar} disabled={tentando} className="w-full">
          Tentar de novo
        </Button>
      </div>
    </div>
  )
}

const RequireAdmin = ({
  children,
  loginPath = '/login',
  fallback,
  unknownFallback,
}: {
  children: React.ReactNode
  loginPath?: string
  /**
   * O que desenhar enquanto a sessão é resolvida (feature 72). Opcional: sem ele, o esqueleto do
   * painel abaixo, com os tokens `estrelinha-admin-*`. O app do ateliê passa a splash dele.
   */
  fallback?: React.ReactNode
  /**
   * O que desenhar quando o papel não pôde ser conferido (`adminStatus === 'unknown'`, `MAF-23`).
   * Opcional: sem ele, a frase e o "Tentar de novo" do painel. Nunca o `Navigate` para o login —
   * isso levaria à recusa falsa.
   */
  unknownFallback?: React.ReactNode
}) => {
  const { isAdmin, adminStatus, loading } = useAuthContext()

  if (loading) {
    if (fallback !== undefined) return <>{fallback}</>
    return (
      <div className="flex items-center justify-center min-h-screen bg-estrelinha-admin-bg">
        <div className="space-y-4 w-full max-w-md p-8">
          <Skeleton className="h-8 w-48 bg-estrelinha-admin-border rounded" />
          <Skeleton className="h-4 w-full bg-estrelinha-admin-border rounded" />
          <Skeleton className="h-4 w-3/4 bg-estrelinha-admin-border rounded" />
        </div>
      </div>
    )
  }

  if (adminStatus === 'unknown') {
    if (unknownFallback !== undefined) return <>{unknownFallback}</>
    return <AcessoNaoConferidoDoPainel />
  }

  if (!isAdmin) return <Navigate to={loginPath} replace />

  return <>{children}</>
}

export default RequireAdmin
