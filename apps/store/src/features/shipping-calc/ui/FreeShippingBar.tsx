import { Truck } from 'lucide-react'
import { formatPrice } from '@estrelinha/core/formatters'
import { useShippingSettings } from '@estrelinha/core/hooks/useStoreSettings'

const FreeShippingBar = ({ currentTotal }: { currentTotal: number }) => {
  const { free_shipping_threshold } = useShippingSettings()
  const remaining = free_shipping_threshold - currentTotal
  const progress = Math.min((currentTotal / free_shipping_threshold) * 100, 100)

  if (remaining <= 0) {
    return (
      <div className="bg-nanita-jam/10 border border-nanita-jam/30 rounded-xl p-3 flex items-center gap-2">
        <Truck className="w-4 h-4 text-nanita-jam" />
        <span className="text-sm font-medium text-nanita-jam">Frete grátis! 🎉</span>
      </div>
    )
  }

  return (
    <div className="bg-nanita-sugar rounded-xl p-3">
      <div className="flex items-center gap-2 mb-2">
        <Truck className="w-4 h-4 text-nanita-plum" />
        <span className="text-xs text-nanita-plum">
          Faltam <strong className="text-nanita-ink">{formatPrice(remaining)}</strong> para frete grátis
        </span>
      </div>
      <div className="w-full h-1.5 bg-nanita-border rounded-full overflow-hidden">
        <div className="h-full bg-nanita-jam rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
    </div>
  )
}

export default FreeShippingBar
