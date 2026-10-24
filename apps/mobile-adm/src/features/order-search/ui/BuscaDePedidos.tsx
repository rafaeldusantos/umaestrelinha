import { SEARCH_DEBOUNCE_MS } from '@estrelinha/core/orders'
import CampoDeBusca from '@/shared/ui/CampoDeBusca'

export const PLACEHOLDER_DA_BUSCA = 'Número, nome, e-mail ou rastreio'
export const ROTULO_DA_BUSCA = 'Buscar pedido'

/**
 * O campo de busca da lista de pedidos (feature `74`, `MAP-10`, `MAP-11`, `MAP-42`). Desde a `76` é um
 * invólucro de `CampoDeBusca` (`shared/ui`), que é o dono do debounce, do `inicial` e do 48 px; aqui
 * ficam o id, o rótulo, o placeholder e o atraso de `core` (o mesmo do painel).
 */
const BuscaDePedidos = ({ aoBuscar, inicial = '' }: { aoBuscar: (termo: string) => void; inicial?: string }) => (
  <CampoDeBusca
    id="busca-de-pedidos"
    rotulo={ROTULO_DA_BUSCA}
    placeholder={PLACEHOLDER_DA_BUSCA}
    atraso={SEARCH_DEBOUNCE_MS}
    aoBuscar={aoBuscar}
    inicial={inicial}
  />
)

export default BuscaDePedidos
