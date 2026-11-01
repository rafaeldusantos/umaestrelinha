// O cupom da proposta (feature 89, `MON-07`). A validação é `validateCoupon` — a MESMA função da loja
// (que delega a `couponRefusal`, de `core/coupons`) —, com o e-mail da cliente para o cupom de
// primeira compra e o subtotal CHEIO das peças (o que a loja e a function `order-proposals` usam). A
// recusa aparece com o texto da loja, sem tradução: "Cupom expirado." é o mesmo aqui e no caixa.

import { useId, useState } from 'react'
import { Input } from '@estrelinha/ui/input'
import { validateCoupon } from '@estrelinha/core/hooks/useCoupons'
import { isValidEmail, normalizeEmail } from '@estrelinha/core/validators'
import { ActionButton } from '@/shared/ui'
import type { DraftCoupon } from '../model/draft'
import { rotuloDoCupom } from '../model/coupon'
import { LINK_ACAO } from './estilos'

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
    <div className="space-y-2">
      <span className="block text-sm font-medium text-foreground">Cupom</span>
      {coupon ? (
        <div data-testid="cupom-aplicado" className="space-y-2">
          <div className="flex min-h-11 flex-wrap items-center gap-x-2.5 rounded-xl border border-estrelinha-admin-emerald/30 bg-estrelinha-admin-emerald/10 px-3 py-1">
            <span className="font-mono text-sm font-bold text-estrelinha-admin-emerald">{coupon.code}</span>
            <span className="min-w-0 text-sm text-muted-foreground">{rotuloDoCupom(coupon.rule)}</span>
            <button type="button" onClick={onRemove} aria-label={`Tirar o cupom ${coupon.code}`} className={`${LINK_ACAO} ml-auto`}>
              Tirar
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
        <>
          <div className="flex flex-wrap items-end gap-2">
            <Input
              id={id}
              aria-label="Código do cupom"
              placeholder="Código"
              className="h-11 min-w-0 flex-1 basis-40 uppercase"
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
            <ActionButton type="button" onClick={() => void aplicar()} variant="outline" alvo44 pending={aplicando} pendingLabel="Conferindo…" disabled={codigo.trim() === ''}>
              Aplicar
            </ActionButton>
          </div>
          {!recusa && <p className="text-xs text-muted-foreground">A mesma regra do caixa da loja.</p>}
        </>
      )}
      {recusa && (
        <p role="alert" data-testid="cupom-recusa" className="text-sm text-destructive">
          {recusa}
        </p>
      )}
    </div>
  )
}

export default CouponField
