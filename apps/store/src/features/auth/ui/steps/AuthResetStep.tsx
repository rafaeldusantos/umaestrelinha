import { useState } from 'react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { useAuthFlow } from '../../model/useAuthFlow'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

const AuthResetStep = () => {
  const { email: storeEmail, sendReset, goTo } = useAuthFlow()
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
    // Em caso de sucesso, sendReset navega para o step 'reset-code'.
    const res = await sendReset(email.trim())
    setLoading(false)
    if (res.error) setError(res.error)
  }

  return (
    <div className="flex flex-col">
      <div className="space-y-1 mb-6">
        <h2 className="font-heading text-2xl font-bold text-estrelinha-ink">Redefinir senha</h2>
        <p className="text-sm text-estrelinha-ink-soft">
          Você receberá um código de 6 dígitos por e-mail para criar uma nova senha
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-2">
        <Label htmlFor="reset-email">E-mail</Label>
        <Input
          id="reset-email"
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
        onClick={() => goTo('password')}
        className="text-sm text-estrelinha-ink-soft mt-4 mx-auto hover:text-estrelinha-ink"
      >
        Voltar
      </button>
    </div>
  )
}

export default AuthResetStep
