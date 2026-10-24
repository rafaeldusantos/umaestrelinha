import { queueBlock, type OrderSlice, type QueueBlockId } from '@estrelinha/core/orders'

export const LIMPAR_FILTRO = 'Limpar filtro'

/**
 * "Filtro: <rótulo do bloco>" com "Limpar filtro" (feature `74`, `MAP-05`, `MAP-42`).
 *
 * O rótulo é o do bloco em `QUEUE_BLOCKS` (`core`) — o mesmo da Início, que montou o endereço. Limpar
 * emite `{ visao: 'tudo' }`: a lista vai a "Tudo", e quem troca o endereço é a página.
 */
const FaixaDoBloco = ({ bloco, aoTrocar }: { bloco: QueueBlockId; aoTrocar: (slice: OrderSlice) => void }) => (
  <div
    data-testid="faixa-do-bloco"
    className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-md border border-estrelinha-line bg-estrelinha-surface px-3 py-1"
  >
    <p className="min-w-0 text-sm text-estrelinha-ink">{`Filtro: ${queueBlock(bloco).label}`}</p>
    <button
      type="button"
      onClick={() => aoTrocar({ visao: 'tudo' })}
      className="min-h-11 rounded-sm px-2 text-sm font-medium text-estrelinha-primary"
    >
      {LIMPAR_FILTRO}
    </button>
  </div>
)

export default FaixaDoBloco
