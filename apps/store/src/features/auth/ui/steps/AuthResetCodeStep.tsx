import { useState, useEffect } from 'react'
import { KeyRound } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@estrelinha/ui/input-otp'
import { useAuthFlow } from '../../model/useAuthFlow'

const RESEND_SECONDS = 60

const formatCooldown = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

/**
 * Código de recuperação de senha. Mesma mecânica do AuthCodeStep (login), mas
 * verifica com type: 'recovery' e segue para a definição da senha nova.
 */
const AuthResetCodeStep = () => {
  const { email, submitResetCode, sendReset, goTo } = useAuthFlow()
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
    const res = await submitResetCode(code)
    setLoading(false)
    if (res.error) setError(res.error)
  }

  const handleResend = async () => {
    if (cooldown > 0) return
    const res = await sendReset(email)
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
      <div className="w-16 h-16 rounded-2xl bg-nanita-jam/10 flex items-center justify-center mb-4">
        <KeyRound className="w-7 h-7 text-nanita-jam" />
      </div>
      <h2 className="font-heading text-2xl font-bold text-nanita-ink">Digite o código</h2>
      <p className="text-sm text-nanita-plum mt-1">
        Enviamos um código de 6 dígitos para redefinir a senha de
      </p>
      <p className="text-sm font-bold text-nanita-ink">{email}</p>

      <form onSubmit={handleSubmit} className="w-full flex flex-col items-center mt-6 gap-4">
        <InputOTP maxLength={6} value={code} onChange={setCode}>
          <InputOTPGroup className="gap-2">
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <InputOTPSlot
                key={i}
                index={i}
                className="w-12 h-14 text-xl rounded-xl border-nanita-border first:rounded-l-xl last:rounded-r-xl border-l"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>

        {error && <p className="text-sm text-red-500" role="alert">{error}</p>}

        <Button
          type="submit"
          disabled={loading}
          className="w-full rounded-sm bg-nanita-jam text-white border-0 hover:bg-nanita-jam hover:opacity-95 transition-all"
        >
          {loading ? 'Verificando...' : 'Verificar código'}
        </Button>
      </form>

      <div className="flex items-center gap-1.5 mt-4 text-sm">
        <span className="text-nanita-plum">Não recebeu o código?</span>
        <button
          type="button"
          onClick={handleResend}
          disabled={cooldown > 0}
          className="font-semibold text-nanita-jam disabled:text-nanita-plum disabled:cursor-default hover:underline disabled:no-underline"
        >
          {cooldown > 0 ? `Reenviar em ${formatCooldown(cooldown)}` : 'Reenviar código'}
        </button>
      </div>

      <button
        type="button"
        onClick={() => goTo('password')}
        className="text-sm text-nanita-jam font-medium mt-3 hover:underline"
      >
        Voltar para o login
      </button>
    </div>
  )
}

export default AuthResetCodeStep
