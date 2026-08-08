import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { MIN_PASSWORD_LENGTH } from '@nanapin/core/constants'
import { Button } from '@nanapin/ui/button'
import { Input } from '@nanapin/ui/input'
import { Label } from '@nanapin/ui/label'
import { useAuthFlow } from '../../model/useAuthFlow'

/**
 * Senha nova, ao final do reset. Só é alcançável com a sessão de recovery já
 * estabelecida pelo AuthResetCodeStep.
 */
const AuthNewPasswordStep = () => {
  const { submitNewPassword } = useAuthFlow()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < MIN_PASSWORD_LENGTH) {
      setError(`A senha precisa de pelo menos ${MIN_PASSWORD_LENGTH} caracteres`)
      return
    }
    if (password !== confirm) {
      setError('As senhas não conferem')
      return
    }
    setError(null)
    setLoading(true)
    const res = await submitNewPassword(password)
    setLoading(false)
    if (res.error) setError(res.error)
  }

  return (
    <div className="flex flex-col">
      <div className="space-y-1 mb-6">
        <h2 className="font-heading text-2xl font-bold text-nanita-ink">Criar nova senha</h2>
        <p className="text-sm text-nanita-plum">
          Mínimo de {MIN_PASSWORD_LENGTH} caracteres. Você já entra na conta em seguida.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="new-password">Nova senha</Label>
          <div className="relative">
            <Input
              id="new-password"
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

        <div className="space-y-2">
          <Label htmlFor="confirm-password">Confirmar nova senha</Label>
          <Input
            id="confirm-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="rounded-xl border-nanita-border"
          />
        </div>

        {error && <p className="text-sm text-red-500" role="alert">{error}</p>}

        <Button
          type="submit"
          disabled={loading}
          className="w-full rounded-button bg-nanita-jam text-white border-0 hover:bg-nanita-jam hover:opacity-95 transition-all"
        >
          {loading ? 'Salvando...' : 'Salvar senha'}
        </Button>
      </form>
    </div>
  )
}

export default AuthNewPasswordStep
