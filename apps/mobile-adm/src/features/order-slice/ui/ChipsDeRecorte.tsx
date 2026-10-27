import { cn } from '@estrelinha/ui/lib/utils'
import { ORDER_VIEWS, isBlockSlice, type OrderSlice } from '@estrelinha/core/orders'

/**
 * Os seis chips das visões (feature `74`, `MAP-02`, `MAP-06`, `MAP-07`, `MAP-42`, `MAP-45`).
 *
 * - **A ordem e os rótulos são de `ORDER_VIEWS`** (`core`): os mesmos do painel. Nenhuma visão
 *   declarada aqui.
 * - **Só o chip do recorte atual está pressionado** (`aria-pressed`); com um BLOCO no recorte,
 *   nenhum — o bloco não é "a visão de nome parecido" (A3), e a faixa do bloco diz o filtro.
 * - **Quem navega é a página**: o toque só emite `{ visao }`. O endereço tem um dono só
 *   (`pedidosHref`, `MAP-04`).
 * - **A faixa rola DENTRO de si** (`MAP-07`, `MAP-42`): `overflow-x-auto` com `min-w-0`, e os chips
 *   não encolhem. O `body` nunca rola na horizontal.
 * - Alvo de 44 px; a troca de cor não se move com movimento reduzido (`MAP-45`).
 */
const ChipsDeRecorte = ({ recorte, aoTrocar }: { recorte: OrderSlice; aoTrocar: (slice: OrderSlice) => void }) => {
  const atual = isBlockSlice(recorte) ? null : recorte.visao
  return (
    <div role="group" aria-label="Visões dos pedidos" data-testid="faixa-de-chips" className="-mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 pb-1">
      {ORDER_VIEWS.map((v) => {
        const pressionado = v.id === atual
        return (
          <button
            key={v.id}
            type="button"
            aria-pressed={pressionado}
            data-visao={v.id}
            onClick={() => aoTrocar({ visao: v.id })}
            className={cn(
              'min-h-11 shrink-0 whitespace-nowrap rounded-pill border-2 px-3.5 text-sm font-medium transition-colors motion-reduce:transition-none',
              pressionado
                ? 'border-estrelinha-primary bg-estrelinha-primary text-estrelinha-on-primary'
                : 'border-estrelinha-field bg-estrelinha-surface text-estrelinha-ink',
            )}
          >
            {v.label}
          </button>
        )
      })}
    </div>
  )
}

export default ChipsDeRecorte
