import { DIRECT_NOTE, NOBODY_IN_STORE_LINE, SOURCES_TITLE, liveSourceRows, type StoreLive } from '@estrelinha/core/live'
import { formatCount } from '@estrelinha/core/stats'
import { cn } from '@estrelinha/ui/lib/utils'
import { FalhaDoBloco, Traco, type Leitura } from '@/shared/ui/leitura'
import { CARTAO, FRASE, GRADE, NUMERO, TITULO } from './estilo'

/** A cor de cada faixa (protótipo); "Outros" não está nele e leva o neutro `ink-soft`. */
const COR: Record<string, string> = {
  instagram: 'bg-estrelinha-primary',
  google: 'bg-estrelinha-primary-strong',
  whatsapp: 'bg-estrelinha-accent',
  direto: 'bg-estrelinha-field',
  outros: 'bg-estrelinha-ink-soft',
}

/**
 * **D. De onde vieram** — as pessoas que estão na loja agora (as mesmas do total), por faixa de
 * origem, calculada no servidor no primeiro pulso. Barra empilhada e legenda em grade; a faixa com
 * zero some, e com um número ímpar de faixas a última ocupa a linha inteira.
 */
const DeOndeVieram = ({ leitura }: { leitura: Leitura<StoreLive> }) => {
  const l = leitura.dado
  const faixas = l ? liveSourceRows(l.origens) : []
  return (
    <section aria-labelledby="de-onde-vieram" aria-busy={!l && !leitura.falhou ? 'true' : undefined} className={CARTAO}>
      <h2 id="de-onde-vieram" className={TITULO}>
        {SOURCES_TITLE}
      </h2>
      {!l && leitura.falhou ? (
        <div className="mt-1">
          <FalhaDoBloco tentarDeNovo={leitura.tentarDeNovo} />
        </div>
      ) : !l ? (
        <Traco className="mt-3 h-10 w-full" />
      ) : l.agora.total === 0 ? (
        <p className={cn('mt-3', FRASE)}>{NOBODY_IN_STORE_LINE}</p>
      ) : (
        <>
          <div data-testid="barra-das-origens" aria-hidden="true" className="mt-3 flex h-2.5 gap-0.5 overflow-hidden rounded-full">
            {faixas.map((f) => (
              <span key={f.faixa} data-faixa={f.faixa} style={{ flex: f.n }} className={COR[f.faixa]} />
            ))}
          </div>
          <ul data-testid="legenda-das-origens" className={cn('mt-3 gap-x-3 gap-y-2', GRADE)}>
            {faixas.map((f, i) => (
              <li
                key={f.faixa}
                className={cn('flex items-center gap-2 text-sm', faixas.length % 2 === 1 && i === faixas.length - 1 && 'col-span-full')}
              >
                <span aria-hidden="true" className={cn('h-2.5 w-2.5 shrink-0 rounded-[3px]', COR[f.faixa])} />
                <span className="min-w-0 flex-1">{f.rotulo}</span>
                <span className={NUMERO}>{formatCount(f.n)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-xs text-estrelinha-ink-soft">{DIRECT_NOTE}</p>
        </>
      )}
    </section>
  )
}

export default DeOndeVieram
