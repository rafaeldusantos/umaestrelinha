import { useState } from 'react'
import { MapPin } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { useAuthFlow } from '../../model/useAuthFlow'

const AuthNameStep = () => {
  const { submitName } = useAuthFlow()
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError('Digite seu nome')
      return
    }
    setError(null)
    setLoading(true)
    const res = await submitName(name.trim())
    setLoading(false)
    if (res.error) setError(res.error)
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-nanita-jam/10 flex items-center justify-center mb-4">
        <MapPin className="w-7 h-7 text-nanita-jam" />
      </div>
      <h2 className="font-heading text-2xl font-bold text-nanita-ink">Como podemos te chamar?</h2>
      <p className="text-sm text-nanita-plum mt-1">Falta só o seu nome para criar sua conta</p>

      <form onSubmit={handleSubmit} className="w-full text-left mt-6 space-y-2">
        <Label htmlFor="auth-name">Seu nome</Label>
        <Input
          id="auth-name"
          placeholder="Ex.: Maria Silva"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="rounded-xl border-nanita-border"
        />
        {error && <p className="text-sm text-red-500" role="alert">{error}</p>}
        <Button
          type="submit"
          disabled={loading}
          className="w-full rounded-sm bg-nanita-jam text-white border-0 hover:bg-nanita-jam hover:opacity-95 transition-all"
        >
          {loading ? 'Salvando...' : 'Concluir cadastro'}
        </Button>
      </form>

      <p className="text-xs text-nanita-plum mt-4">Você poderá alterar isso depois na sua conta</p>
    </div>
  )
}

export default AuthNameStep
