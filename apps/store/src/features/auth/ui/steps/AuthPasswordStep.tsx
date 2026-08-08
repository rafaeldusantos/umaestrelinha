import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { useAuthFlow } from '../../model/useAuthFlow'

const AuthPasswordStep = () => {
  const { email: storeEmail, loginWithPassword, goTo, setEmail } = useAuthFlow()
  const [email, setEmailLocal] = useState(storeEmail)
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    const res = await loginWithPassword(email.trim(), password)
    setLoading(false)
    if (res.error) setError(res.error)
  }

  return (
    <div className="flex flex-col">
      <div className="space-y-1 mb-6">
        <h2 className="font-heading text-2xl font-bold text-nanita-ink">Entrar com senha</h2>
        <p className="text-sm text-nanita-plum">Bem-vinda de volta!</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pw-email">E-mail</Label>
          <Input
            id="pw-email"
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={(e) => setEmailLocal(e.target.value)}
            className="rounded-xl border-nanita-border"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw-password">Senha</Label>
          <div className="relative">
            <Input
              id="pw-password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-xl border-nanita-border pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-nanita-plum hover:text-nanita-ink"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        <div className="flex justify-end">
          <button
            type="button"
            onClick={() => { setEmail(email); goTo('reset') }}
            className="text-sm text-nanita-jam font-medium hover:underline"
          >
            Esqueceu a senha?
          </button>
        </div>

        {error && <p className="text-sm text-red-500" role="alert">{error}</p>}

        <Button
          type="submit"
          disabled={loading}
          className="w-full rounded-button bg-nanita-jam text-white border-0 hover:bg-nanita-jam hover:opacity-95 transition-all"
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>

      <button
        type="button"
        onClick={() => { setEmail(email); goTo('entry') }}
        className="text-sm text-nanita-plum mt-4 mx-auto hover:text-nanita-ink"
      >
        Sem senha? Receber código por e-mail
      </button>
    </div>
  )
}

export default AuthPasswordStep
