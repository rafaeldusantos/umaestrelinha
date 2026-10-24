import { ChevronLeft } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { formatShortDate } from '@estrelinha/core/orders'
import { relativeAge } from '@estrelinha/core/stats'
import { PEDIDOS_PATH, SituacaoDoPedido, type PedidoDoDetalhe } from '@/entities/order'
import { tituloDoPedido } from '../model/titulos'

/**
 * O "Voltar" do detalhe (E7, `MAP-20`): com `state.doApp` (a linha da lista ou de "Últimos pedidos"
 * levou até aqui) volta UMA entrada — à lista no mesmo recorte e posição, ou à Início. Sem ele (link
 * colado, F5), não há histórico do app para voltar: vai à lista, por substituição.
 */
const BotaoVoltar = () => {
  const navigate = useNavigate()
  const { state } = useLocation()
  const doApp = (state as { doApp?: boolean } | null)?.doApp === true
  return (
    <button
      type="button"
      onClick={() => (doApp ? navigate(-1) : navigate(PEDIDOS_PATH, { replace: true }))}
      className="-ml-2 inline-flex min-h-11 min-w-11 items-center gap-1 rounded-sm px-2 text-sm font-medium text-estrelinha-primary"
    >
      <ChevronLeft aria-hidden="true" className="h-5 w-5" strokeWidth={1.5} />
      Voltar
    </button>
  )
}

/**
 * O cabeçalho do detalhe (feature `74`, `MAP-20`, `MAP-43`, `MAP-46`). Existe em TODO estado da
 * página (E5): sem o pedido, o `h1` diz "Pedido" — o foco do `MobileLayout` precisa de um `h1` para ir.
 *
 * Com o pedido: "Pedido #0244", a data da compra no dia de BRASÍLIA (`formatShortDate`), há quanto
 * tempo contra o `lido_em` do SERVIDOR (`relativeAge`), e o selo da situação na voz do ateliê
 * (`SituacaoDoPedido`). Nada aqui decide.
 */
const CabecalhoDoPedido = ({ pedido, lidoEm }: { pedido?: PedidoDoDetalhe | null; lidoEm?: string | null }) => {
  const data = pedido ? formatShortDate(pedido.created_at) : null
  const tempo = pedido && lidoEm ? relativeAge(pedido.created_at, lidoEm) : null
  return (
    <header className="space-y-2">
      <BotaoVoltar />
      <h1 className="font-display text-2xl [overflow-wrap:anywhere]">{tituloDoPedido(pedido)}</h1>
      {pedido && (
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <SituacaoDoPedido pedido={pedido} />
          <span data-parte="data" className="text-sm text-estrelinha-ink-soft">
            {[data, tempo].filter(Boolean).join(' · ')}
          </span>
        </div>
      )}
    </header>
  )
}

export default CabecalhoDoPedido
