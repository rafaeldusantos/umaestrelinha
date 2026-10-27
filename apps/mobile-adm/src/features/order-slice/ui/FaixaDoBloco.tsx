import { X } from 'lucide-react'
import { queueBlock, type OrderSlice, type QueueBlockId } from '@estrelinha/core/orders'

export const LIMPAR_FILTRO = 'Limpar filtro'

/**
 * "Filtro: <rótulo do bloco>" com "Limpar filtro" (feature `74`, `MAP-05`, `MAP-42`).
 *
 * O rótulo é o do bloco em `QUEUE_BLOCKS` (`core`) — o mesmo da Início, que montou o endereço. Limpar
 * emite `{ visao: 'tudo' }`: a lista vai a "Tudo", e quem troca o endereço é a página.
 */
const FaixaDoBloco = ({ bloco, aoTrocar }: { bloco: QueueBlockId; aoTrocar: (slice: OrderSlice) => void }) => (
  // O protótipo: a faixa em `ground-deep`, "Filtro:" com o bloco em negrito, e um X redondo para
  // limpar — o nome dele continua "Limpar filtro" (aria-label), e o alvo, 44 px.
  <div
    data-testid="faixa-do-bloco"
    className="flex items-center justify-between gap-3 rounded-[12px] bg-estrelinha-ground-deep py-1 pl-3.5 pr-1"
  >
    <p className="min-w-0 text-[13px] text-estrelinha-ink [overflow-wrap:anywhere]">
      Filtro: <strong className="font-semibold">{queueBlock(bloco).label}</strong>
    </p>
    <button
      type="button"
      onClick={() => aoTrocar({ visao: 'tudo' })}
      aria-label={LIMPAR_FILTRO}
      className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-estrelinha-ink"
    >
      <X aria-hidden="true" className="h-4 w-4" strokeWidth={1.75} />
    </button>
  </div>
)

export default FaixaDoBloco
