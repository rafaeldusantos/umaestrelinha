import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Button } from '@estrelinha/ui/button'
import { useAuthUiStore } from '@/features/auth'

/**
 * /entrar — deep-link/fallback route. The login itself lives in the
 * contextual AuthOverlay (mounted in StoreLayout); this route just opens it.
 */
const AuthPage = () => {
  const isOpen = useAuthUiStore((s) => s.isOpen)
  const openAuth = useAuthUiStore((s) => s.open)

  useEffect(() => {
    openAuth()
  }, [openAuth])

  return (
    <div className="container py-20 text-center max-w-md mx-auto">
      <h1 className="font-heading text-2xl font-bold text-nanita-ink mb-3">Acesse sua conta</h1>
      <p className="text-nanita-plum mb-6">Entre ou crie sua conta para continuar.</p>
      {!isOpen && (
        <Button
          onClick={() => openAuth()}
          className="rounded-button bg-nanita-jam text-white border-0 hover:bg-nanita-jam hover:opacity-95 hover:scale-[1.02] transition-all"
        >
          Entrar ou criar conta
        </Button>
      )}
      <div className="mt-4">
        <Link to="/" className="text-nanita-jam hover:underline">Voltar ao início</Link>
      </div>
    </div>
  )
}

export default AuthPage
