import { primaryImage } from '@estrelinha/core/media'
import { NOBODY_ON_JEWEL, WATCHING_TITLE, liveWatchingRows, peopleCount, type StoreLive } from '@estrelinha/core/live'
import { EnvioIcon } from '@estrelinha/ui/icons'
import { cn } from '@estrelinha/ui/lib/utils'
import FotoDaPeca from '@/shared/ui/FotoDaPeca'
import { FalhaDoBloco, Traco, type Leitura } from '@/shared/ui/leitura'
import { FRASE, TITULO } from './estilo'

/**
 * **C. Joias sendo vistas agora** — até 5 joias, com a foto (`primaryImage`, molde do `TopJewels`), e
 * a linha do Guia de envio do material sempre que alguém estiver nele, ordenadas juntas por
 * `core/live` (mais pessoas primeiro, empate por nome). Sem joia nem Guia, a frase.
 */
const JoiasSendoVistas = ({ leitura }: { leitura: Leitura<StoreLive> }) => {
  const l = leitura.dado
  const linhas = l ? liveWatchingRows(l.joias, l.guia) : []
  return (
    <section
      aria-labelledby="joias-sendo-vistas"
      aria-busy={!l && !leitura.falhou ? 'true' : undefined}
      className="min-w-0 rounded-[20px] border border-estrelinha-line bg-estrelinha-surface px-4 py-1"
    >
      <h2 id="joias-sendo-vistas" className={cn('mb-0.5 mt-3', TITULO)}>
        {WATCHING_TITLE}
      </h2>
      {!l && leitura.falhou ? (
        <FalhaDoBloco tentarDeNovo={leitura.tentarDeNovo} />
      ) : !l ? (
        <div className="space-y-3 py-2.5">
          <Traco className="h-10 w-full" />
          <Traco className="h-10 w-full" />
        </div>
      ) : linhas.length === 0 ? (
        <p className={cn('py-2.5', FRASE)}>{NOBODY_ON_JEWEL}</p>
      ) : (
        <ul>
          {linhas.map((j, i) => (
            <li key={j.id} data-testid="linha-vista" className={cn('flex items-center gap-3 py-2.5', i > 0 && 'border-t border-estrelinha-line')}>
              {j.kind === 'joia' ? (
                <FotoDaPeca foto={primaryImage(j.imagens)?.url ?? null} tamanho={40} />
              ) : (
                <span
                  data-testid="icone-do-guia"
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-sm bg-estrelinha-ground-deep text-estrelinha-primary"
                >
                  <EnvioIcon aria-hidden className="h-[22px] w-[22px]" />
                </span>
              )}
              <span className="min-w-0 flex-1 text-sm">{j.nome}</span>
              <span className="whitespace-nowrap text-[13px] text-estrelinha-ink-soft">{peopleCount(j.pessoas)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

export default JoiasSendoVistas
