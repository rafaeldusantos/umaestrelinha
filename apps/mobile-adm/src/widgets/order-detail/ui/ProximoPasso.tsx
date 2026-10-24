import { nextStep, rowSummary } from '@estrelinha/core/orders'
import type { PedidoDoDetalhe } from '@/entities/order'

/**
 * O próximo passo do pedido (feature `74`, `MAP-21`, A18): o `label` de `nextStep` e, quando há, a
 * frase de `rowSummary` — os dois de `core`, os mesmos do painel.
 *
 * **Sem botão e sem o `blockedReason`** (G-A18): as frases de `core` terminam em "Você pode avançar
 * assim mesmo.", e a `74` não avança nada — texto que manda tocar num botão inexistente é o CTA
 * morto (`58`). O motivo entra com a `75`.
 */
const ProximoPasso = ({ pedido }: { pedido: PedidoDoDetalhe }) => {
  const { label } = nextStep(pedido)
  const { blocker } = rowSummary(pedido)
  return (
    <div data-testid="proximo-passo" className="rounded-lg border-l-4 border-estrelinha-primary bg-estrelinha-surface px-4 py-3 text-estrelinha-ink">
      <p className="text-sm font-semibold [overflow-wrap:anywhere]">{label}</p>
      {blocker && <p className="mt-1 text-sm [overflow-wrap:anywhere]">{blocker}</p>}
    </div>
  )
}

export default ProximoPasso
