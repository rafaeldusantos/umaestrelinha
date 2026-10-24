import { Link } from 'react-router-dom'
import { formatPrice } from '@estrelinha/core/formatters'
import { formatShortDate } from '@estrelinha/core/orders'
import { relativeAge } from '@estrelinha/core/stats'
import { SituacaoDoPedido, pedidoHref } from '@/entities/order'
import { rotuloDoPedido, type PedidoDaFicha } from '@/entities/customer'

/**
 * Um pedido na ficha da cliente (feature `76`, `MAC-18`, `MAC-20`, `MAC-31`, `MAC-32`).
 *
 * - **Nada aqui decide**: o rótulo é de `rotuloDoPedido` ("#0244 · Pingente Gota"; sem item, só o
 *   número), a data de `formatShortDate` (dia de Brasília), o "há N dias" de `relativeAge` contra o
 *   `lido_em` do SERVIDOR, o total de `formatPrice` e o selo de `SituacaoDoPedido` (`orderSituation`,
 *   público `atelie`) — nenhuma tabela de rótulo no app.
 * - **A linha inteira é o alvo** (44 px) e leva ao detalhe com `state: { doApp: true }`: o "Voltar" do
 *   pedido devolve à ficha, na mesma posição (`MAC-20`).
 * - Tudo que pode ser longo quebra, e o total pode descer para a linha de baixo.
 */
const LinhaDoPedidoDaCliente = ({ pedido, lidoEm }: { pedido: PedidoDaFicha; lidoEm: string }) => {
  const data = formatShortDate(pedido.created_at)
  const tempo = relativeAge(pedido.created_at, lidoEm)
  return (
    <Link
      to={pedidoHref(pedido.id)}
      state={{ doApp: true }}
      data-testid="pedido-da-cliente"
      className="flex min-h-11 flex-wrap items-start gap-x-3 gap-y-1 py-3 text-estrelinha-ink"
    >
      <div className="min-w-[min(100%,8rem)] flex-1">
        <div data-parte="rotulo" className="text-sm font-medium [overflow-wrap:anywhere]">
          {rotuloDoPedido(pedido)}
        </div>
        <div data-parte="quando" className="mt-0.5 text-xs text-estrelinha-ink-soft [overflow-wrap:anywhere]">
          {[data, tempo].filter(Boolean).join(' · ')}
        </div>
        <div className="mt-1.5">
          <SituacaoDoPedido pedido={pedido} />
        </div>
      </div>
      <span
        data-parte="total"
        className="ml-auto min-w-0 max-w-full text-right font-display text-sm font-bold text-estrelinha-primary [overflow-wrap:anywhere]"
      >
        {formatPrice(pedido.total)}
      </span>
    </Link>
  )
}

export default LinhaDoPedidoDaCliente
