// O cupom da proposta (feature 89, `MON-07`). A validação é `validateCoupon` — a MESMA função da loja
// (que delega a `couponRefusal`, de `core/coupons`) —, com o e-mail da cliente para o cupom de
// primeira compra e o subtotal CHEIO das peças (o que a loja e a function `order-proposals` usam). A
// recusa aparece com o texto da loja, sem tradução: "Cupom expirado." é o mesmo aqui e no caixa.

import { useId, useState } from 'react'
import { X } from 'lucide-react'
import { Input } from '@estrelinha/ui/input'
import { validateCoupon } from '@estrelinha/core/hooks/useCoupons'
import { isValidEmail, normalizeEmail } from '@estrelinha/core/validators'
import { ActionButton, FormCard } from '@/shared/ui'
import type { DraftCoupon } from '../model/draft'

interface Props {
  coupon: DraftCoupon | null
  /** O subtotal cheio das peças prontas, antes de qualquer desconto. */
  subtotal: number
  email: string
  /** O cupom perdeu para a promoção vigente (não acumula). */
  descartado?: boolean
  onApply: (coupon: DraftCoupon) => void
  onRemove: () => void
}

const CouponField = ({ coupon, subtotal, email, descartado = false, onApply, onRemove }: Props) => {
  const id = useId()
  const [codigo, setCodigo] = useState('')
  const [recusa, setRecusa] = useState<string | null>(null)
  const [aplicando, setAplicando] = useState(false)

  const aplicar = async () => {
    setRecusa(null)
    setAplicando(true)
    try {
      const limpo = normalizeEmail(email)
      const r = await validateCoupon({
        code: codigo,
        subtotal,
        shippingCost: 0,
        customerEmail: isValidEmail(limpo) ? limpo : undefined,
      })
      if (!r.ok || !r.coupon) {
        setRecusa(r.error ?? 'Cupom inválido.')
        return
      }
      onApply({ code: r.coupon.code, rule: { type: r.coupon.type, value: Number(r.coupon.value) } })
      setCodigo('')
    } finally {
      setAplicando(false)
    }
  }

  return (
    <FormCard title="Cupom">
      {coupon ? (
        <div data-testid="cupom-aplicado" className="space-y-2">
          <div className="flex min-h-11 items-center justify-between gap-2 rounded-lg border border-input bg-muted/30 px-3">
            <span className="min-w-0 truncate text-sm font-semibold text-foreground">{coupon.code}</span>
            <button
              type="button"
              onClick={onRemove}
              aria-label={`Tirar o cupom ${coupon.code}`}
              className="flex min-h-11 w-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors motion-reduce:transition-none hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" aria-hidden />
            </button>
          </div>
          {descartado && (
            <p role="status" className="text-xs text-muted-foreground">
              A promoção vigente vale mais e não acumula com este cupom — o cupom não entra no total.
            </p>
          )}
        </div>
      ) : (
        // Não é `<form>`: a página da montagem pode ser um formulário, e formulário dentro de
        // formulário é HTML inválido. Enter no campo aplica, como num formulário.
        <div className="flex flex-wrap items-end gap-2">
          <div className="min-w-0 flex-1 basis-40 space-y-1.5">
            <label htmlFor={id} className="text-sm font-medium text-foreground">
              Código do cupom
            </label>
            <Input
              id={id}
              className="h-11 uppercase"
              value={codigo}
              onChange={(e) => {
                setCodigo(e.target.value)
                setRecusa(null)
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  if (codigo.trim()) void aplicar()
                }
              }}
              autoComplete="off"
            />
          </div>
          <ActionButton type="button" onClick={() => void aplicar()} variant="outline" alvo44 pending={aplicando} pendingLabel="Conferindo…" disabled={codigo.trim() === ''}>
            Aplicar
          </ActionButton>
        </div>
      )}
      {recusa && (
        <p role="alert" data-testid="cupom-recusa" className="text-sm text-destructive">
          {recusa}
        </p>
      )}
    </FormCard>
  )
}

export default CouponField
