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
 * - **"Montados" entra AO FIM**, sem tirar nenhum chip, quando a página o passa: não é uma visão de pedido
 *   (fica fora de `ORDER_VIEWS`), e o rótulo — com a contagem de abertos — vem pronto. Pressionado, ele
 *   é o único chip pressionado.
 */
export interface ChipDeMontados {
  rotulo: string
  pressionado: boolean
  aoTocar: () => void
}

const CLASSE_DO_CHIP = 'min-h-11 shrink-0 whitespace-nowrap rounded-pill border-2 px-3.5 text-sm font-medium transition-colors motion-reduce:transition-none'
const CHIP_PRESSIONADO = 'border-estrelinha-primary bg-estrelinha-primary text-estrelinha-on-primary'
const CHIP_SOLTO = 'border-estrelinha-field bg-estrelinha-surface text-estrelinha-ink'

const ChipsDeRecorte = ({
  recorte,
  aoTrocar,
  montados,
}: {
  recorte: OrderSlice
  aoTrocar: (slice: OrderSlice) => void
  montados?: ChipDeMontados
}) => {
  const atual = isBlockSlice(recorte) || montados?.pressionado ? null : recorte.visao
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
            className={cn(CLASSE_DO_CHIP, pressionado ? CHIP_PRESSIONADO : CHIP_SOLTO)}
          >
            {v.label}
          </button>
        )
      })}
      {montados && (
        <button
          type="button"
          aria-pressed={montados.pressionado}
          data-visao="montados"
          onClick={montados.aoTocar}
          className={cn(CLASSE_DO_CHIP, montados.pressionado ? CHIP_PRESSIONADO : CHIP_SOLTO)}
        >
          {montados.rotulo}
        </button>
      )}
    </div>
  )
}

export default ChipsDeRecorte
