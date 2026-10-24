import { Link } from 'react-router-dom'
import { cn } from '@estrelinha/ui/lib/utils'
import { formatPrice } from '@estrelinha/core/formatters'
import { formatOrderNumber } from '@estrelinha/core/orders'
import { relativeAge, type StoreOverview } from '@estrelinha/core/stats'
import { SituacaoDoPedido, pedidoHref, pedidosHref } from '@/entities/order'
import { FalhaDoBloco, Traco, type Leitura } from '@/shared/ui/leitura'

export const MAXIMO_DE_RECENTES = 4
export const SEM_PEDIDOS = 'Ainda não há pedidos.'

/**
 * "Últimos pedidos" (feature `73`, `MAI-14`..`MAI-16`): os 4 mais recentes, de qualquer estado, com
 * o nome, o número (`formatOrderNumber`), há quanto tempo (`relativeAge` contra o `lido_em` do
 * SERVIDOR, nunca o relógio do aparelho), o total com centavos e o selo de `orderSituation`.
 *
 * **A linha quebra com a fonte grande** (`BUG-20261023-ultimos-pedidos-estoura-com-fonte-maxima`):
 * `flex-wrap`, o nome com piso em `rem` (6rem cresce com a fonte do sistema) e o total com o selo
 * numa coluna que pode ceder. Na fonte padrão os dois cabem lado a lado, como o protótipo; quando a
 * coluna da direita deixa de caber ao lado do piso do nome, ela desce para baixo dele, à direita.
 * Antes ela era `shrink-0`, e a 175 % em 360 px media 327 px numa linha de 295 — a página rolava
 * para o lado.
 *
 * **Cada linha leva ao detalhe** (feature `74`, `MAP-52`, G-A29): a linha inteira é o link para
 * `/pedidos/<id>`, com 44 px no mínimo e o nome acessível "Pedido #0244, <cliente>" (o número de
 * `formatOrderNumber`, TE1). Ela navega com `state: { doApp: true }` (E7): o "Voltar" do detalhe volta
 * à Início. Até a `73` as linhas eram texto; "Ver todos" continua levando à visão "Tudo".
 */
const RecentOrders = ({ leitura }: { leitura: Leitura<StoreOverview> }) => {
  const r = leitura.dado
  const carregando = !r && !leitura.falhou
  const pedidos = r ? r.recentes.slice(0, MAXIMO_DE_RECENTES) : []

  return (
    <section aria-labelledby="ultimos-pedidos" aria-busy={carregando ? 'true' : undefined}>
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="ultimos-pedidos" className="text-xl">
          Últimos pedidos
        </h2>
        <Link to={pedidosHref({ visao: 'tudo' })} className="inline-flex min-h-11 items-center text-sm font-medium text-estrelinha-primary">
          Ver todos
        </Link>
      </div>
      <div className="mt-2 rounded-lg border border-estrelinha-line bg-estrelinha-surface px-4 py-1">
        {leitura.falhou && !r ? (
          <FalhaDoBloco tentarDeNovo={leitura.tentarDeNovo} />
        ) : !r ? (
          <div className="space-y-3 py-3">
            <Traco className="h-10 w-full" />
            <Traco className="h-10 w-full" />
          </div>
        ) : pedidos.length === 0 ? (
          <p className="py-3 text-sm text-estrelinha-ink-soft">{SEM_PEDIDOS}</p>
        ) : (
          <ul>
            {pedidos.map((p, i) => (
              <li key={p.id} className={cn(i > 0 && 'border-t border-estrelinha-line')}>
                <Link
                  to={pedidoHref(p.id)}
                  state={{ doApp: true }}
                  aria-label={`Pedido ${formatOrderNumber(p.order_number)}, ${p.customer_name}`}
                  data-testid="pedido-recente"
                  className="flex min-h-11 flex-wrap items-center gap-x-3 gap-y-1 py-3 text-estrelinha-ink"
                >
                <div className="min-w-[min(100%,6rem)] flex-1">
                  <div className="truncate text-sm font-medium">{p.customer_name}</div>
                  <div className="mt-0.5 text-xs text-estrelinha-ink-soft">
                    {`${formatOrderNumber(p.order_number)} · ${relativeAge(p.created_at, r.lido_em)}`}
                  </div>
                </div>
                <div className="ml-auto flex min-w-0 max-w-full flex-col items-end gap-1">
                  <span className="whitespace-nowrap font-display text-sm font-bold text-estrelinha-primary">{formatPrice(p.total)}</span>
                  <SituacaoDoPedido pedido={p} />
                </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

export default RecentOrders
