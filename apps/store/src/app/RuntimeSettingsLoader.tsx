import { useEffect } from 'react'
import { useStoreSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { setRuntimeShippingSettings } from '@estrelinha/core/constants'

/**
 * Componente invisível: ouve as configurações da loja e hidrata os
 * valores de frete em runtime para que o cartStore (zustand, fora do
 * React) e demais consumidores não-reativos enxerguem o threshold/custo
 * configurado pelo admin.
 */
const RuntimeSettingsLoader = () => {
  const { data } = useStoreSettings()

  useEffect(() => {
    if (!data) return
    setRuntimeShippingSettings({
      free_shipping_threshold: data.shipping.free_shipping_threshold,
      default_shipping_cost: data.shipping.default_shipping_cost,
    })
  }, [data])

  return null
}

export default RuntimeSettingsLoader
