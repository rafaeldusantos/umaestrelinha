// A linha do escritório num pedido de retirada (feature 63, `RET-14`).
//
// O endereço NÃO é gravado no pedido: ele vem da configuração atual (`store_settings.material`),
// pela mesma regra que a loja usa para oferecer a retirada — `pickupLocation`, dono único em
// `@estrelinha/core/shipping`. Montado só para pedido de retirada, então a leitura da configuração
// não entra no caminho dos pedidos dos Correios.

import { useMaterialSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { pickupLocation } from '@estrelinha/core/shipping'

const PickupLocation = ({ className }: { className?: string }) => {
  const local = pickupLocation(useMaterialSettings())
  return (
    <p className={className} data-testid="pickup-location">
      {local ?? 'Endereço do escritório não cadastrado — preencha o Material na seção Frete e Material.'}
    </p>
  )
}

export default PickupLocation
