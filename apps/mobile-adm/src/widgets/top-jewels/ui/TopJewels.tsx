import { cn } from '@estrelinha/ui/lib/utils'
import { EstrelinhaStarIcon } from '@estrelinha/ui/icons'
import { piecesLabel, type StoreOverview } from '@estrelinha/core/stats'
import { FalhaDoBloco, Traco, type Leitura } from '@/shared/ui/leitura'

/** O teto da lista (`MAI-13`). O banco já corta em 4; aqui é a garantia do desenho. */
export const MAXIMO_DE_JOIAS = 4

export const SEM_VENDA_NO_MES = 'Ainda não houve venda neste mês.'

/**
 * "Joias mais pedidas no mês" (feature `73`, `MAI-13`): até 4 produtos, na ordem do banco (peças,
 * depois nome), cada um com "N peças" ("1 peça"). O ícone é a estrela da marca, igual em todas as
 * linhas: o desenho por tipo de joia do protótipo escolheria pelo NOME, e um nome que não casa
 * desenharia a joia errada.
 */
const TopJewels = ({ leitura }: { leitura: Leitura<StoreOverview> }) => {
  const r = leitura.dado
  const carregando = !r && !leitura.falhou
  const joias = r ? r.joias.slice(0, MAXIMO_DE_JOIAS) : []

  return (
    <section
      aria-labelledby="joias-do-mes"
      aria-busy={carregando ? 'true' : undefined}
      className="rounded-lg border border-estrelinha-line bg-estrelinha-surface p-[18px]"
    >
      <h3 id="joias-do-mes" className="mb-1.5 text-[17px]">
        Joias mais pedidas no mês
      </h3>
      {leitura.falhou && !r ? (
        <FalhaDoBloco tentarDeNovo={leitura.tentarDeNovo} />
      ) : !r ? (
        <div className="space-y-3 py-2">
          <Traco className="h-10 w-full" />
          <Traco className="h-10 w-full" />
        </div>
      ) : joias.length === 0 ? (
        <p className="py-2 text-sm text-estrelinha-ink-soft">{SEM_VENDA_NO_MES}</p>
      ) : (
        <ul>
          {joias.map((j, i) => (
            <li key={j.chave} className={cn('flex items-center gap-3 py-2.5', i > 0 && 'border-t border-estrelinha-line')}>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-estrelinha-ground-deep text-estrelinha-primary">
                <EstrelinhaStarIcon aria-hidden className="h-[22px] w-[22px]" />
              </span>
              <span className="min-w-0 flex-1 text-sm">{j.nome}</span>
              <span className="whitespace-nowrap text-[13px] text-estrelinha-ink-soft">{piecesLabel(j.pecas)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default TopJewels
