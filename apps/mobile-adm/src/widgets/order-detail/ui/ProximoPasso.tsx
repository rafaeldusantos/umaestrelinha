import { EstrelinhaStarIcon } from '@estrelinha/ui/icons'
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
    // O cartão escuro do protótipo: `ink` com o texto em `on-primary` (12:1) e a estrela em `accent`,
    // o único par em que o ouro pode ficar sobre o fundo (4,78:1, o token diz isso).
    <div data-testid="proximo-passo" className="flex items-start gap-3 rounded-lg bg-estrelinha-ink p-4 text-estrelinha-on-primary">
      <EstrelinhaStarIcon aria-hidden className="mt-px h-5 w-5 shrink-0 text-estrelinha-accent" />
      <div className="min-w-0">
        <p className="text-[15px] font-medium [overflow-wrap:anywhere]">{label}</p>
        {blocker && <p className="mt-0.5 text-[13px] font-light text-estrelinha-on-primary/85 [overflow-wrap:anywhere]">{blocker}</p>}
      </div>
    </div>
  )
}

export default ProximoPasso
