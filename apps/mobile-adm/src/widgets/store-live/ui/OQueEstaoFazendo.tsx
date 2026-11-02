import { BOUGHT_LABEL, CHECKOUT_NOTE, DOING_TITLE, liveFunnelRows, type LiveFunnelStage, type StoreLive } from '@estrelinha/core/live'
import { formatCount } from '@estrelinha/core/stats'
import { FalhaDoBloco, Traco, type Leitura } from '@/shared/ui/leitura'
import { CARTAO, NUMERO, TITULO } from './estilo'

const COR: Record<LiveFunnelStage, string> = {
  olhando: 'bg-estrelinha-field',
  sacola: 'bg-estrelinha-primary',
  checkout: 'bg-estrelinha-accent',
}

/**
 * **B. O que estão fazendo** — as três faixas do funil (exclusivas: somam o total de "Agora na loja")
 * com a barra de proporção, e "Compraram (últimos 30 min)" só com o número, porque vem de `orders` e
 * não faz parte de quem está na loja. Com ninguém na loja, as barras ficam vazias. A largura chega
 * pronta de `core/live`; as barras não animam.
 */
const OQueEstaoFazendo = ({ leitura }: { leitura: Leitura<StoreLive> }) => {
  const l = leitura.dado
  return (
    <section aria-labelledby="o-que-estao-fazendo" aria-busy={!l && !leitura.falhou ? 'true' : undefined} className={CARTAO}>
      <h2 id="o-que-estao-fazendo" className={TITULO}>
        {DOING_TITLE}
      </h2>
      {!l && leitura.falhou ? (
        <div className="mt-1">
          <FalhaDoBloco tentarDeNovo={leitura.tentarDeNovo} />
        </div>
      ) : !l ? (
        <div className="mt-3 space-y-3">
          <Traco className="h-8 w-full" />
          <Traco className="h-8 w-full" />
          <Traco className="h-8 w-full" />
        </div>
      ) : (
        <>
          <div className="mt-3 flex flex-col gap-3">
            {liveFunnelRows(l.agora).map((f) => (
              <div key={f.stage} data-testid={`funil-${f.stage}`} className="flex flex-col gap-1.5">
                <div className="flex justify-between gap-2 text-sm">
                  <span>{f.rotulo}</span>
                  <span className={NUMERO}>{formatCount(f.n)}</span>
                </div>
                <span className="flex h-1.5 overflow-hidden rounded-full bg-estrelinha-ground-deep">
                  <span data-testid={`barra-${f.stage}`} style={{ width: `${f.pct}%` }} className={`rounded-full ${COR[f.stage]}`} />
                </span>
              </div>
            ))}
            <div data-testid="funil-compraram" className="flex justify-between gap-2 text-sm">
              <span>{BOUGHT_LABEL}</span>
              <span className={NUMERO}>{formatCount(l.compraram_30min)}</span>
            </div>
          </div>
          {l.agora.checkout > 0 && (
            <p data-testid="nota-do-checkout" className="mt-3.5 border-t border-estrelinha-line pt-3 text-[13px] leading-[1.45] text-estrelinha-ink-soft">
              {CHECKOUT_NOTE}
            </p>
          )}
        </>
      )}
    </section>
  )
}

export default OQueEstaoFazendo
