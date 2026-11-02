import {
  LIVE_CARD_TITLE,
  LIVE_CHART_FROM,
  LIVE_CHART_TO,
  LIVE_WINDOW_LINE,
  NOBODY_IN_STORE_LINE,
  liveMiniBars,
  liveNotMeasuredLine,
  peopleWord,
  type StoreLive,
} from '@estrelinha/core/live'
import { formatCount } from '@estrelinha/core/stats'
import { cn } from '@estrelinha/ui/lib/utils'
import { FalhaDoBloco, Traco, type Leitura } from '@/shared/ui/leitura'

/** As 30 barras: 56 px de altura, piso de 3 px, proporcionais ao maior minuto. */
const BARRAS = 30
const ALTURA = 56

/**
 * **A. Agora na loja** — o cartão `ink` do topo da Loja ao vivo. O número é o ÚNICO ouro como texto
 * do app, e só porque está sobre `ink` (4,78:1). Os 30 minutos chegam do servidor (o último é igual
 * ao total de agora); as alturas são de `core/live`. Nenhuma transição nas barras.
 *
 * Estados: carregando (traços), falha (a frase e "Tentar de novo", como cada bloco), loja ainda não medida (a frase de Acessos), ninguém na loja (a frase, com o gráfico).
 */
const AgoraNaLoja = ({ leitura }: { leitura: Leitura<StoreLive> }) => {
  const l = leitura.dado
  const carregando = !l && !leitura.falhou
  const naoMedida = l ? liveNotMeasuredLine(l) : null
  const total = l?.agora.total ?? 0

  return (
    <section
      aria-labelledby="agora-na-loja"
      aria-busy={carregando ? 'true' : undefined}
      data-testid="bloco-agora-na-loja"
      className="min-w-0 rounded-[20px] bg-estrelinha-ink p-5 text-estrelinha-on-primary"
    >
      <h2
        id="agora-na-loja"
        className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[.1em] text-estrelinha-on-primary"
      >
        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-estrelinha-accent" />
        {LIVE_CARD_TITLE}
      </h2>
      {!l && leitura.falhou ? (
        <FalhaDoBloco tentarDeNovo={leitura.tentarDeNovo} escuro />
      ) : !l ? (
        <>
          <Traco escuro className="mt-2.5 h-14 w-24" />
          <Traco escuro className="mt-5 h-14 w-full" />
        </>
      ) : naoMedida ? (
        <p className="mt-2.5 text-sm">{naoMedida}</p>
      ) : (
        <>
          <div className="mt-2.5 flex flex-wrap items-baseline gap-x-2.5 gap-y-1">
            {total === 0 ? (
              <p className="text-[15px] font-semibold">{NOBODY_IN_STORE_LINE}</p>
            ) : (
              <>
                <span
                  data-testid="numero-ao-vivo"
                  className="font-display text-[56px] font-bold leading-none tracking-[-0.03em] text-estrelinha-accent"
                >
                  {formatCount(total)}
                </span>
                <span className="text-[15px] font-light">
                  {peopleWord(total)} {LIVE_WINDOW_LINE}
                </span>
              </>
            )}
          </div>
          <div data-testid="grafico-30-min" aria-hidden="true" className="mt-5 flex h-14 items-end gap-[3px]">
            {liveMiniBars(l.minutos, BARRAS, ALTURA).map((b, i) => (
              <span
                key={i}
                data-n={b.n}
                style={{ height: `${b.altura}px` }}
                className={cn('flex-1 rounded-[2px]', b.atual ? 'bg-estrelinha-accent' : 'bg-estrelinha-on-primary/20')}
              />
            ))}
          </div>
          <div aria-hidden="true" className="mt-1.5 flex justify-between text-[11px] text-estrelinha-on-primary/75">
            <span>{LIVE_CHART_FROM}</span>
            <span>{LIVE_CHART_TO}</span>
          </div>
        </>
      )}
    </section>
  )
}

export default AgoraNaLoja
