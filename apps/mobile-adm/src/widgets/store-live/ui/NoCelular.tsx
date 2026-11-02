import { MOBILE_TITLE, NOBODY_IN_STORE_LINE, liveMobileLine, type StoreLive } from '@estrelinha/core/live'
import { cn } from '@estrelinha/ui/lib/utils'
import { FalhaDoBloco, Traco, type Leitura } from '@/shared/ui/leitura'
import { CARTAO, EYEBROW, FRASE } from './estilo'

/**
 * **E. No celular** — "{m} de {n}", com "o resto pelo computador ou tablet" só quando nem todos estão
 * no celular. Linha inteira (Cidades está fora). O aparelho é calculado no servidor.
 */
const NoCelular = ({ leitura }: { leitura: Leitura<StoreLive> }) => {
  const l = leitura.dado
  const linha = l ? liveMobileLine(l.aparelho, l.agora.total) : null
  return (
    <section aria-labelledby="no-celular" aria-busy={!l && !leitura.falhou ? 'true' : undefined} className={CARTAO}>
      <h2 id="no-celular" className={EYEBROW}>
        {MOBILE_TITLE}
      </h2>
      {!l && leitura.falhou ? (
        <FalhaDoBloco tentarDeNovo={leitura.tentarDeNovo} />
      ) : !l ? (
        <Traco className="mt-2 h-6 w-20" />
      ) : !linha ? (
        <p className={cn('mt-2', FRASE)}>{NOBODY_IN_STORE_LINE}</p>
      ) : (
        <>
          <p data-testid="no-celular-numero" className="mt-2 font-display text-[20px] font-bold text-estrelinha-primary">
            {linha.principal}
          </p>
          {linha.resto && <p className="mt-1 text-xs text-estrelinha-ink-soft">{linha.resto}</p>}
        </>
      )}
    </section>
  )
}

export default NoCelular
