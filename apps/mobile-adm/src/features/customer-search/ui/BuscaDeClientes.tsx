import { CUSTOMER_SEARCH_DEBOUNCE_MS } from '@estrelinha/core/customers'
import CampoDeBusca from '@/shared/ui/CampoDeBusca'

export const PLACEHOLDER_DA_BUSCA_DE_CLIENTES = 'Nome, e-mail ou telefone'
export const ROTULO_DA_BUSCA_DE_CLIENTES = 'Buscar cliente'

/**
 * O campo de busca da lista de clientes (feature `76`, `MAC-06`, `MAC-28`, `MAC-34`). Invólucro de
 * `CampoDeBusca` (`shared/ui`), o dono do debounce, do `inicial`, do Enter que fecha o teclado e do
 * 48 px; aqui ficam o id, o rótulo, o placeholder e o atraso de `core` (o mesmo do painel). O termo é
 * estado da página e **nunca** vai ao endereço: nome, e-mail e telefone de uma pessoa não ficam no
 * histórico do navegador.
 */
const BuscaDeClientes = ({ aoBuscar, inicial = '' }: { aoBuscar: (termo: string) => void; inicial?: string }) => (
  <CampoDeBusca
    id="busca-de-clientes"
    rotulo={ROTULO_DA_BUSCA_DE_CLIENTES}
    placeholder={PLACEHOLDER_DA_BUSCA_DE_CLIENTES}
    atraso={CUSTOMER_SEARCH_DEBOUNCE_MS}
    aoBuscar={aoBuscar}
    inicial={inicial}
  />
)

export default BuscaDeClientes
