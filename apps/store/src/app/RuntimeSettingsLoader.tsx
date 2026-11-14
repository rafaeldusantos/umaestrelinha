import { useEffect } from 'react'
import { useStoreSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { setRuntimeShippingSettings } from '@estrelinha/core/constants'
import { freeShippingConfigOf } from '@estrelinha/core/shipping'

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
    // A configuração do frete grátis sai do leitor único do jsonb, e não campo a campo.
    const frete = freeShippingConfigOf(data.shipping)
    setRuntimeShippingSettings({
      // Interruptor, faixa e regiões juntos, e não um depois do outro: o `cartStore` decide frete
      // pelos três, e hidratar só a faixa deixaria uma janela em que ele enxerga a faixa nova com o
      // interruptor velho — frete zerado numa loja que já desligou o benefício.
      free_shipping_enabled: frete.free_shipping_enabled,
      free_shipping_threshold: frete.free_shipping_threshold,
      free_shipping_regions: frete.free_shipping_regions,
      default_shipping_cost: data.shipping.default_shipping_cost,
    })
  }, [data])

  return null
}

export default RuntimeSettingsLoader
