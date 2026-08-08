import { useCallback, useEffect, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Copy, Check, RefreshCw } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { supabase } from '@estrelinha/supabase/client'
import { formatPrice } from '@estrelinha/core/formatters'
import { usePaymentSettings } from '@estrelinha/core/hooks/useStoreSettings'
import type { PixPaymentResponse } from '@estrelinha/supabase/types'
import { useCreatePayment, PAYMENT_UNAVAILABLE_MESSAGE } from '../api/useCreatePayment'

interface Props {
  orderId: string
  /** CNF-01: valor exato a pagar, exibido em destaque. Quem monta a tela o conhece. */
  amount?: number
  onApproved: () => void
}

/**
 * Pagamento PIX: cria o pagamento ao montar, exibe QR real (`qr_code` copia-e-cola),
 * timer até `expires_at` com CTA de regeneração (PAY-11) e aprovação ao vivo via
 * Supabase Realtime na linha do pedido (PAY-13).
 *
 * CNF-01 acrescenta o valor a pagar em destaque; CNF-02, a saída para "Minha conta → Pedidos"
 * quando o código expira. O ponteiro é uma âncora, não um `Link`: o componente segue sem
 * depender de contexto de router, para a spec `09` poder montá-lo de dentro de `/conta`.
 */
const PixPayment = ({ orderId, amount, onApproved }: Props) => {
  const settings = usePaymentSettings()
  const createPayment = useCreatePayment()
  const [pix, setPix] = useState<PixPaymentResponse | null>(null)
  const [generating, setGenerating] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [secondsLeft, setSecondsLeft] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)

  const mutateRef = useRef(createPayment.mutateAsync)
  mutateRef.current = createPayment.mutateAsync
  const onApprovedRef = useRef(onApproved)
  onApprovedRef.current = onApproved

  const generate = useCallback(async () => {
    setError(null)
    setPix(null)
    setGenerating(true)
    try {
      const response = (await mutateRef.current({ order_id: orderId, method: 'pix' })) as PixPaymentResponse
      setPix(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : PAYMENT_UNAVAILABLE_MESSAGE)
    } finally {
      setGenerating(false)
    }
  }, [orderId])

  // Cria o pagamento ao montar — guard contra dupla chamada do StrictMode.
  const startedRef = useRef(false)
  useEffect(() => {
    if (startedRef.current) return
    startedRef.current = true
    void generate()
  }, [generate])

  // Timer regressivo até expires_at.
  useEffect(() => {
    if (!pix) {
      setSecondsLeft(null)
      return
    }
    const compute = () =>
      Math.max(0, Math.floor((new Date(pix.expires_at).getTime() - Date.now()) / 1000))
    setSecondsLeft(compute())
    const id = setInterval(() => setSecondsLeft(compute()), 1000)
    return () => clearInterval(id)
  }, [pix])

  // Aprovação ao vivo: UPDATE na linha do pedido → approved → sucesso (PAY-13).
  useEffect(() => {
    const channel = supabase
      .channel(`order-payment-${orderId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders', filter: `id=eq.${orderId}` },
        (payload) => {
          const next = (payload as { new?: { payment_status?: string } }).new
          if (next?.payment_status === 'approved') onApprovedRef.current()
        },
      )
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [orderId])

  const copyPix = useCallback(() => {
    if (!pix) return
    navigator.clipboard.writeText(pix.qr_code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [pix])

  if (error) {
    return (
      <div className="space-y-4">
        {/* CNF-06: erro se distingue por superfície + geleia, não por vermelho fora da paleta. */}
        <p
          role="alert"
          className="text-sm text-nanita-jam bg-nanita-sugar border border-nanita-jam/30 rounded-xl p-3"
        >
          {error}
        </p>
        <Button
          onClick={() => void generate()}
          variant="outline"
          className="w-full rounded-button border-2 border-nanita-ink bg-transparent text-nanita-ink transition-all hover:bg-transparent hover:text-nanita-ink hover:scale-[1.02]"
        >
          Tentar novamente
        </Button>
      </div>
    )
  }

  if (generating || !pix) {
    return (
      <div className="bg-nanita-sugar rounded-xl p-6 text-center text-sm text-nanita-plum">
        Gerando código PIX...
      </div>
    )
  }

  const expired = secondsLeft !== null && secondsLeft <= 0

  if (expired) {
    return (
      <div className="bg-nanita-sugar rounded-xl p-6 text-center space-y-4">
        <p className="font-heading font-bold text-nanita-ink">Código PIX expirado</p>
        <p className="text-sm text-nanita-plum">
          Sem problema: gere um novo código para o mesmo pedido.
        </p>
        <Button
          onClick={() => void generate()}
          variant="outline"
          className="rounded-button border-2 border-nanita-ink bg-transparent text-nanita-ink transition-all hover:bg-transparent hover:text-nanita-ink hover:scale-[1.02] gap-2"
        >
          <RefreshCw className="w-4 h-4" /> Gerar novo código
        </Button>
        {/* CNF-02: o pedido não se perde com o código — fica guardado na conta. */}
        <p className="text-sm text-nanita-plum">
          Pagou e o código expirou? O pedido fica guardado em{' '}
          <a href="/conta" className="font-semibold text-nanita-jam hover:underline">
            Minha conta → Pedidos
          </a>{' '}
          e você gera um PIX novo de lá.
        </p>
      </div>
    )
  }

  const min = Math.floor((secondsLeft ?? 0) / 60)
  const sec = (secondsLeft ?? 0) % 60
  // CNF-06: os últimos 5 minutos ganham geleia — urgência dentro da paleta, sem vermelho.
  const timerColor = (secondsLeft ?? 0) < 300 ? 'text-nanita-jam' : 'text-nanita-ink'

  return (
    <div className="space-y-4">
      {/* CNF-01: quanto sai da conta dela, em destaque, antes do QR. */}
      {amount !== undefined && (
        <div className="flex flex-col items-center gap-1">
          <p className="font-heading text-[38px] font-semibold leading-none tracking-[-0.03em] text-nanita-ink">
            {formatPrice(amount)}
          </p>
          {settings.pix_discount_percent > 0 && (
            <p className="text-sm font-medium text-nanita-jam">
              já com os {settings.pix_discount_percent}% de desconto do PIX
            </p>
          )}
        </div>
      )}
      <div className="bg-nanita-sugar rounded-xl p-6 text-center">
        <div className="w-48 h-48 mx-auto bg-white rounded-lg flex items-center justify-center mb-3 p-2">
          <QRCodeSVG value={pix.qr_code} size={176} aria-label="QR Code PIX" />
        </div>
        <p className={`font-heading font-bold text-lg ${timerColor}`}>
          {String(min).padStart(2, '0')}:{String(sec).padStart(2, '0')}
        </p>
        <p className="text-xs text-nanita-plum mt-1">Tempo restante para pagamento</p>
      </div>
      <div>
        <Label className="text-xs text-nanita-plum">Código Copia e Cola</Label>
        <div className="flex gap-2 mt-1">
          <Input readOnly value={pix.qr_code} className="text-xs font-mono" />
          <Button
            variant="outline"
            size="sm"
            onClick={copyPix}
            className="rounded-lg border-nanita-border shrink-0"
          >
            {copied ? (
              <Check className="w-4 h-4 text-nanita-jam" aria-label="Código copiado" />
            ) : (
              <Copy className="w-4 h-4 text-nanita-plum" aria-label="Copiar código" />
            )}
          </Button>
        </div>
      </div>
      <div className="bg-white rounded-xl p-4 text-sm text-nanita-plum space-y-1">
        <p>1. Abra o app do seu banco</p>
        <p>2. Escaneie o QR Code ou copie o código</p>
        <p>3. Confirme o pagamento — a tela avança sozinha</p>
      </div>
      {settings.pix_discount_percent > 0 && (
        <p className="text-xs text-nanita-jam font-medium text-center">
          {settings.pix_discount_percent}% de desconto no PIX aplicado!
        </p>
      )}
    </div>
  )
}

export default PixPayment
