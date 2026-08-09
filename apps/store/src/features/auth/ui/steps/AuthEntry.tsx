import { useState } from 'react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { useAuthFlow } from '../../model/useAuthFlow'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
)

const AuthEntry = () => {
  const { email: storeEmail, sendCode, loginWithGoogle, goTo, setEmail } = useAuthFlow()
  const [email, setEmailLocal] = useState(storeEmail)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!EMAIL_RE.test(email.trim())) {
      setError('Digite um e-mail válido')
      return
    }
    setError(null)
    setLoading(true)
    const res = await sendCode(email.trim())
    setLoading(false)
    if (res.error) setError(res.error)
  }

  return (
    <div className="flex flex-col">
      <div className="space-y-1 mb-6">
        <h2 className="font-heading text-2xl font-bold text-estrelinha-ink">Entrar ou criar conta</h2>
        <p className="text-sm text-estrelinha-ink-soft">Para acompanhar seus pedidos e favoritos</p>
      </div>

      <Button
        type="button"
        variant="outline"
        onClick={loginWithGoogle}
        className="w-full rounded-xl border-2 border-estrelinha-line hover:border-estrelinha-primary/30 hover:bg-estrelinha-ground-deep transition-all gap-2"
      >
        <GoogleIcon />
        Continuar com Google
      </Button>

      <div className="relative my-5">
        <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-estrelinha-line" /></div>
        <div className="relative flex justify-center"><span className="bg-white px-3 text-xs text-estrelinha-ink-soft">ou continue com e-mail</span></div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <Label htmlFor="auth-email">E-mail</Label>
        <Input
          id="auth-email"
          type="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmailLocal(e.target.value)}
          className="rounded-xl border-estrelinha-field"
        />
        {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
        <Button
          type="submit"
          disabled={loading}
          className="w-full rounded-sm bg-estrelinha-primary text-white border-0 hover:bg-estrelinha-primary hover:opacity-95 transition-all"
        >
          {loading ? 'Enviando...' : 'Enviar código'}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => { setEmail(email); goTo('password') }}
        className="text-sm text-estrelinha-primary font-medium mt-4 mx-auto hover:underline"
      >
        Prefere usar senha? Clique aqui
      </button>

      <p className="text-xs text-estrelinha-ink-soft text-center mt-5">
        Ao continuar, você concorda com os Termos de Uso e Política de Privacidade
      </p>
    </div>
  )
}

export default AuthEntry
