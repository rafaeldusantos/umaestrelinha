import { Truck } from 'lucide-react'
import { formatPrice } from '@estrelinha/core/formatters'
import { useShippingSettings } from '@estrelinha/core/hooks/useStoreSettings'

const FreeShippingBar = ({ currentTotal }: { currentTotal: number }) => {
  const { free_shipping_threshold } = useShippingSettings()
  const remaining = free_shipping_threshold - currentTotal
  const progress = Math.min((currentTotal / free_shipping_threshold) * 100, 100)

  if (remaining <= 0) {
    return (
      <div className="bg-estrelinha-primary/10 border border-estrelinha-primary/30 rounded-xl p-3 flex items-center gap-2">
        <Truck className="w-4 h-4 text-estrelinha-primary" />
        <span className="text-sm font-medium text-estrelinha-primary">Frete grátis!</span>
      </div>
    )
  }

  return (
    <div className="bg-estrelinha-ground-deep rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <Truck className="w-4 h-4 text-estrelinha-ink-soft" />
        <span className="text-xs text-estrelinha-ink-soft">
          Faltam <strong className="text-estrelinha-ink">{formatPrice(remaining)}</strong> para frete grátis
        </span>
      </div>
      <div className="w-full h-1.5 bg-estrelinha-line rounded-full overflow-hidden">
        <div className="h-full bg-estrelinha-primary rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

export default FreeShippingBar
