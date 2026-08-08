import { useState, useEffect } from 'react'
import { Mail } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@estrelinha/ui/input-otp'
import { useAuthFlow } from '../../model/useAuthFlow'

const RESEND_SECONDS = 60

const formatCooldown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

const AuthCodeStep = () => {
  const { email, submitCode, sendCode, goTo } = useAuthFlow()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cooldown, setCooldown] = useState(RESEND_SECONDS)

  useEffect(() => {
    const t = setInterval(() => setCooldown((c) => (c <= 1 ? 0 : c - 1)), 1000)
    return () => clearInterval(t)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (code.length !== 6) {
      setError('Digite os 6 dígitos do código')
      return
    }
    setError(null)
    setLoading(true)
    const res = await submitCode(code)
    setLoading(false)
    if (res.error) setError(res.error)
  }

  const handleResend = async () => {
    if (cooldown > 0) return
    const res = await sendCode(email)
    if (res.error) {
      setError(res.error)
      return
    }
    setError(null)
    setCode('')
    setCooldown(RESEND_SECONDS)
  }

  return (
    <div className="flex flex-col items-center text-center">
      <div className="w-16 h-16 rounded-2xl bg-estrelinha-primary/10 flex items-center justify-center mb-4">
        <Mail className="w-7 h-7 text-estrelinha-primary" />
      </div>
      <h2 className="font-heading text-2xl font-bold text-estrelinha-ink">Digite o código</h2>
      <p className="text-sm text-estrelinha-ink-soft mt-1">Enviamos um código de 6 dígitos para</p>
      <p className="text-sm font-bold text-estrelinha-ink">{email}</p>

      <form onSubmit={handleSubmit} className="w-full flex flex-col items-center mt-6 gap-4">
        <InputOTP maxLength={6} value={code} onChange={setCode}>
          <InputOTPGroup className="gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <InputOTPSlot
                key={i}
                index={i}
                className="w-12 h-14 text-xl rounded-xl border-estrelinha-line first:rounded-l-xl last:rounded-r-xl border-l"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>

        {error && <p className="text-sm text-red-500" role="alert">{error}</p>}

        <Button
          type="submit"
          disabled={loading}
          className="w-full rounded-sm bg-estrelinha-primary text-white border-0 hover:bg-estrelinha-primary hover:opacity-95 transition-all"
        >
          {loading ? 'Verificando...' : 'Verificar código'}
        </Button>
      </form>

      <div className="flex items-center gap-1.5 mt-4 text-sm">
        <span className="text-estrelinha-ink-soft">Não recebeu o código?</span>
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0}
          className="font-semibold text-estrelinha-primary disabled:text-estrelinha-ink-soft disabled:cursor-default hover:underline disabled:no-underline"
        >
          {cooldown > 0 ? `Reenviar em ${formatCooldown(cooldown)}` : 'Reenviar código'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => goTo('entry')}
        className="text-sm text-estrelinha-primary font-medium mt-3 hover:underline"
      >
        Usar outro e-mail
      </button>
    </div>
  )
}

export default AuthCodeStep
