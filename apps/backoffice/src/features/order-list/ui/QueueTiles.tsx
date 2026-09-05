import { queueAge, queueAgeLabel } from '@estrelinha/core/material'
import type { OrderFilters, QueueTile } from '@/entities/order/api/orderQuery'

/**
 * `PED-12` / `D4` — o topo da tela diz **o que cobra**, não o que existe.
 *
 * Quatro contadores clicáveis, e cada um aplica um filtro. A diferença entre isto e "148 pedidos"
 * é a diferença entre um número e uma pergunta respondida.
 *
 * **Só o primeiro tem acento**, e a razão é que ele é o único que ACUMULA: ninguém pode fazer nada
 * até o envelope chegar. Ele carrega a idade do mais antigo, que é o que transforma "5 pedidos" em
 * "5 pedidos, e um deles há 9 dias".
 *
 * Os outros três são espera com prazo, falha silenciosa (`enviado sem rastreio` — a cliente não
 * recebeu o aviso) e nada-a-fazer. **O quarto está ali justamente para dizer que não é fila**: sem
 * ele, a Adri olha 7 Pix pendentes e acha que deve algo a alguém.
 *
 * A faixa rola **dentro do próprio container** (`overflow-x-auto` + `shrink-0` nos itens), e não
 * empurra o body: no mobile quem não pode encolher é a trilha, não o item.
 */
interface Props {
  tiles: QueueTile[]
  counts: Record<string, number>
  /** Só o primeiro tile usa. `null` quando não há ninguém esperando. */
  oldestWaitingAt?: string | null
  filters: OrderFilters
  onApply: (next: OrderFilters) => void
}

const QueueTiles = ({ tiles, counts, oldestWaitingAt, filters, onApply }: Props) => (
  <div
    className="-mx-1 mb-4 flex gap-3 overflow-x-auto px-1 pb-1"
    role="group"
    aria-label="O que precisa de ação"
  >
    {tiles.map(tile => {
      const total = counts[tile.id] ?? 0
      const idade = tile.accent && oldestWaitingAt ? queueAge(oldestWaitingAt) : null

      return (
        <button
          key={tile.id}
          type="button"
          onClick={() => onApply(tile.apply(filters))}
          // `min-w` + `shrink-0`: a trilha rola, o cartão não amassa. `text-left` porque o conteúdo
          // é uma frase, não um rótulo centralizado.
          className={`min-h-[44px] w-[240px] shrink-0 rounded-xl border bg-estrelinha-admin-card p-4 text-left transition-colors hover:border-estrelinha-admin-border-hover ${
            tile.accent
              ? 'border-l-4 border-l-estrelinha-admin-amber border-y-border border-r-border'
              : 'border-border'
          }`}
        >
          <span className="block text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {tile.label}
          </span>

          <span className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">{total}</span>
            {idade && (
              <span className="text-xs font-medium text-estrelinha-admin-amber">
                o mais antigo {queueAgeLabel(idade)}
              </span>
            )}
          </span>

          <span className="mt-1 block text-xs text-muted-foreground">{tile.hint}</span>
        </button>
      )
    })}
  </div>
)

export default QueueTiles
