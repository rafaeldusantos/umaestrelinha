import { Link } from 'react-router-dom'
import { cn } from '@estrelinha/ui/lib/utils'
import { QUEUE_BLOCKS } from '@estrelinha/core/orders'
import type { StoreOverview } from '@estrelinha/core/stats'
import { pedidosHref } from '@/entities/order'
import { FalhaDoBloco, Traco, type Leitura } from '@/shared/ui/leitura'
import { CONTAGEM_DO_BLOCO, idadeDoMaisAntigo } from '../model/fila'

const CARTAO = 'flex min-h-11 w-[200px] shrink-0 flex-col gap-1.5 rounded-lg border p-4 text-left'

/**
 * "Precisa de você" (feature `73`, `MAI-05`..`MAI-08`, `MAI-27`): os quatro blocos de
 * `QUEUE_BLOCKS`, na ordem dele, com o rótulo e a frase do painel.
 *
 * - Só o primeiro tem acento, e só ele carrega a idade do mais antigo (`queueAge`, a régua do painel,
 *   com o `lido_em` do servidor no lugar do relógio do aparelho). Sem pedido aguardando, sem idade.
 * - Os zeros aparecem: a seção nunca some, e não ganha frase festiva (`MAI-08`).
 * - Cada bloco leva a `/pedidos` com ele no endereço, e "Ver pedidos" à visão "Precisa de ação" —
 *   os dois endereços por `pedidosHref` (`MAI-07`).
 * - A faixa rola DENTRO de si (`overflow-x-auto`), nunca o `body` (`MAI-27`).
 */
const QueueTiles = ({ leitura }: { leitura: Leitura<StoreOverview> }) => {
  const r = leitura.dado
  const carregando = !r && !leitura.falhou

  return (
    <section aria-labelledby="precisa-de-voce" aria-busy={carregando ? 'true' : undefined} className="pt-6">
      <div className="flex items-baseline justify-between gap-4">
        <h2 id="precisa-de-voce" className="text-xl">
          Precisa de você
        </h2>
        <Link
          to={pedidosHref({ visao: 'precisa-acao' })}
          className="inline-flex min-h-11 items-center text-sm font-medium text-estrelinha-primary"
        >
          Ver pedidos
        </Link>
      </div>

      {leitura.falhou && !r ? (
        <FalhaDoBloco tentarDeNovo={leitura.tentarDeNovo} />
      ) : (
        <ul data-testid="faixa-da-fila" className="-mx-4 mt-3 flex gap-3 overflow-x-auto px-4 pb-1">
          {QUEUE_BLOCKS.map((bloco) => {
            const acento = bloco.accent
            const rotulo = cn(
              'text-[11px] font-semibold uppercase tracking-[.1em]',
              acento ? 'text-estrelinha-on-primary/80' : 'text-estrelinha-ink-soft',
            )
            const frase = cn('text-[13px] font-light leading-snug', acento ? 'text-estrelinha-on-primary/80' : 'text-estrelinha-ink-soft')
            const caixa = cn(
              CARTAO,
              acento
                ? 'border-estrelinha-ink bg-estrelinha-ink text-estrelinha-on-primary'
                : 'border-estrelinha-line bg-estrelinha-surface text-estrelinha-ink',
            )
            if (!r) {
              return (
                <li key={bloco.id} className="flex shrink-0">
                  <div className={caixa}>
                    <span className={rotulo}>{bloco.label}</span>
                    <Traco escuro={acento} className="h-8 w-12" />
                    <span className={frase}>{bloco.hint}</span>
                  </div>
                </li>
              )
            }
            const total = r.fila[CONTAGEM_DO_BLOCO[bloco.id]]
            const idade = acento ? idadeDoMaisAntigo(r.fila, r.lido_em) : null
            return (
              <li key={bloco.id} className="flex shrink-0">
                <Link to={pedidosHref({ bloco: bloco.id })} data-bloco={bloco.id} data-acento={acento ? 'true' : undefined} className={caixa}>
                  <span className={rotulo}>{bloco.label}</span>
                  <span className="flex items-baseline gap-2">
                    <span
                      className={cn(
                        'font-display text-[30px] font-bold leading-none',
                        acento ? 'text-estrelinha-accent' : 'text-estrelinha-primary',
                      )}
                    >
                      {total}
                    </span>
                    {idade && <span className={cn(rotulo, 'normal-case tracking-normal text-xs font-medium')}>{idade}</span>}
                  </span>
                  <span className={frase}>{bloco.hint}</span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

export default QueueTiles
