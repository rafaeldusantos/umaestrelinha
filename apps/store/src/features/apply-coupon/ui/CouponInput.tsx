import { useState } from 'react'
import { Tag, X, Loader2, Check } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { toast } from 'sonner'
import { validateCoupon } from '@estrelinha/core/hooks/useCoupons'
import { useCouponStore } from '@/entities/coupon/model/couponStore'
import { formatPrice } from '@estrelinha/core/formatters'

interface Props {
  subtotal: number
  shippingCost: number
  customerEmail?: string
  /**
   * `drawer` é o desenho da gaveta do carrinho: campo tracejado e botão sólido em geleia. Só muda
   * classe — a validação, o toast e o `couponStore` são os mesmos, e é por isso que a gaveta reusa
   * este componente em vez de ter a própria entrada de cupom.
   */
  variant?: 'default' | 'drawer'
}

const CouponInput = ({ subtotal, shippingCost, customerEmail, variant = 'default' }: Props) => {
  const { applied, setCoupon, clearCoupon } = useCouponStore()
  const [code, setCode] = useState('')
  const [loading, setLoading] = useState(false)

  const apply = async () => {
    if (!code.trim()) return
    setLoading(true)
    const res = await validateCoupon({ code, subtotal, shippingCost, customerEmail })
    setLoading(false)
    if (!res.ok || !res.coupon) {
      toast.error(res.error || 'Cupom inválido.')
      return
    }
    setCoupon(res.coupon)
    setCode('')
    toast.success(`Cupom ${res.coupon.code} aplicado!`)
  }

  const drawer = variant === 'drawer'

  const remove = () => {
    clearCoupon()
    toast.message('Cupom removido')
  }

  if (applied && drawer) {
    // Padrão do board "04 · Checkout Desktop — Uma página" (grupo "Cupom Aplicado"): uma linha de
    // borda a borda, sem card. Dentro da gaveta, um cartão aqui competiria com as linhas de item.
    return (
      <div className="flex items-center gap-2.5 px-5 py-3.5 md:px-6">
        <Tag className="h-4 w-4 shrink-0 text-estrelinha-primary" strokeWidth={2.2} />
        <p className="min-w-0 flex-1 truncate text-sm font-semibold leading-[18px] text-estrelinha-ink">
          {applied.code} aplicado
        </p>
        <span className="shrink-0 text-sm font-semibold leading-[18px] text-estrelinha-primary">
          {applied.freeShipping ? 'Frete grátis' : `−${formatPrice(applied.discount)}`}
        </span>
        <button
          type="button"
          onClick={remove}
          aria-label="Remover cupom"
          className="relative shrink-0 text-estrelinha-ink-soft transition-colors after:absolute after:-inset-2 after:content-[''] hover:text-estrelinha-primary"
        >
          <X className="h-[15px] w-[15px]" strokeWidth={2.4} />
        </button>
      </div>
    )
  }

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-2 bg-estrelinha-primary/5 border border-estrelinha-primary/30 rounded-xl p-3">
        <div className="flex items-center gap-2 min-w-0">
          <Check className="w-4 h-4 text-estrelinha-primary shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-estrelinha-ink truncate">{applied.code}</p>
            <p className="text-xs text-estrelinha-ink-soft">
              {applied.freeShipping
                ? 'Frete grátis'
                : `Desconto de ${formatPrice(applied.discount)}`}
            </p>
          </div>
        </div>
        <button
          onClick={remove}
          aria-label="Remover cupom"
          className="text-estrelinha-ink-soft hover:text-red-500 shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    )
  }

  return (
    <div className={drawer ? 'flex gap-2 px-5 py-3 md:px-6 md:py-3.5' : 'flex gap-2'}>
      <div className="relative flex-1">
        <Tag className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-estrelinha-primary" />
        <Input
          placeholder={drawer ? 'Código do cupom' : 'Cupom de desconto'}
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && apply()}
          className={
            drawer
              ? 'h-11 rounded-[10px] border border-dashed border-estrelinha-line bg-estrelinha-ground-deep/30 pl-9 text-[13px] uppercase text-estrelinha-ink placeholder:normal-case placeholder:text-estrelinha-ink-soft'
              : 'pl-9 uppercase'
          }
        />
      </div>
      <Button
        type="button"
        onClick={apply}
        disabled={loading || !code.trim()}
        variant={drawer ? 'default' : 'outline'}
        className={
          drawer
            ? 'h-11 shrink-0 rounded-[10px] border-0 bg-estrelinha-primary px-4 text-[13px] font-bold text-white hover:bg-estrelinha-primary hover:opacity-95'
            : 'rounded-md border-2 border-estrelinha-primary text-estrelinha-primary hover:bg-estrelinha-ground-deep shrink-0'
        }
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Aplicar'}
      </Button>
    </div>
  )
}

export default CouponInput
