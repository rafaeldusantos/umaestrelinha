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
      aria-label="Voltar"
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-estrelinha-ink"
    >
      <ChevronLeft aria-hidden="true" className="h-[22px] w-[22px]" strokeWidth={1.5} />
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
    // A barra do protótipo (60 px, `surface`, fio embaixo): voltar, título com a data, e o selo à
    // direita. Ela sangra até as bordas da tela (`-mx-4 -mt-4`, o recuo do `main`) e fica presa no
    // topo enquanto o pedido rola — o número e a situação continuam à vista.
    <header className="sticky top-0 z-10 -mx-4 -mt-4 flex min-h-[60px] flex-wrap items-center gap-x-1.5 gap-y-1 border-b border-estrelinha-line bg-estrelinha-surface py-2 pl-2 pr-4">
      <BotaoVoltar />
      {/* Com a fonte grande o selo desce para a linha de baixo, em vez de espremer o título numa coluna
          ou empurrar a tela para o lado: o título tem piso de largura e o selo cede (`max-w-full`). */}
      <div className="min-w-0 flex-[1_1_9rem]">
        <h1 className="font-display text-[17px] font-bold leading-tight [overflow-wrap:anywhere]">{tituloDoPedido(pedido)}</h1>
        {pedido && (
          <p data-parte="data" className="text-xs text-estrelinha-ink-soft">
            {[data, tempo].filter(Boolean).join(' · ')}
          </p>
        )}
      </div>
      {pedido && (
        <div className="ml-auto min-w-0 max-w-full">
          <SituacaoDoPedido pedido={pedido} />
        </div>
      )}
    </header>
  )
}

export default CabecalhoDoPedido
