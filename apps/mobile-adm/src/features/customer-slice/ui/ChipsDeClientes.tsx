import { cn } from '@estrelinha/ui/lib/utils'
import { CUSTOMER_SLICES, type CustomerSliceId } from '@estrelinha/core/customers'

import { useMaisAdiante } from '../model/useMaisAdiante'

/**
 * Os três chips dos recortes da lista de clientes (feature `76`, `MAC-07`, `MAC-31`; molde de
 * `ChipsDeRecorte`).
 *
 * - **A ordem e os rótulos são de `CUSTOMER_SLICES`** (`core`): nenhum recorte declarado aqui.
 * - **Só o chip do recorte atual está pressionado** (`aria-pressed`).
 * - **Quem navega é a página**: o toque só emite o id. O endereço tem um dono só (`clientesHref`).
 * - **A faixa rola DENTRO de si**: `overflow-x-auto` com `min-w-0`; os chips não encolhem nem quebram
 *   (é a faixa que rola, nunca o `body`). Com a fonte grande, "Compraram mais de uma vez" não cabe
 *   ao lado dos outros: o degradê à direita (camada `aria-hidden`) diz que há mais.
 * - Alvo de 44 px (o protótipo tinha 38); a troca de cor não se move com movimento reduzido.
 */
const ChipsDeClientes = ({
  recorte,
  aoTrocar,
}: {
  recorte: CustomerSliceId
  aoTrocar: (id: CustomerSliceId) => void
}) => {
  const { faixa, maisAdiante, aoRolar } = useMaisAdiante()
  return (
    <div className="relative -mx-4 min-w-0">
      <div
        ref={faixa}
        onScroll={aoRolar}
        role="group"
        aria-label="Recortes das clientes"
        data-testid="faixa-de-chips"
        className="flex min-w-0 gap-2 overflow-x-auto px-4 pb-1"
      >
        {CUSTOMER_SLICES.map((s) => {
          const pressionado = s.id === recorte
          return (
            <button
              key={s.id}
              type="button"
              aria-pressed={pressionado}
              data-recorte={s.id}
              onClick={() => aoTrocar(s.id)}
              className={cn(
                'min-h-11 shrink-0 whitespace-nowrap rounded-pill border px-4 text-sm font-medium transition-colors motion-reduce:transition-none',
                pressionado
                  ? 'border-estrelinha-primary bg-estrelinha-primary text-estrelinha-on-primary'
                  : 'border-estrelinha-field bg-estrelinha-surface text-estrelinha-ink',
              )}
            >
              {s.label}
            </button>
          )
        })}
      </div>
      <span
        aria-hidden="true"
        data-testid="afordancia-dos-chips"
        data-visivel={maisAdiante ? 'true' : 'false'}
        className={cn(
          'pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-estrelinha-ground to-transparent transition-opacity motion-reduce:transition-none',
          maisAdiante ? 'opacity-100' : 'opacity-0',
        )}
      />
    </div>
  )
}

export default ChipsDeClientes
