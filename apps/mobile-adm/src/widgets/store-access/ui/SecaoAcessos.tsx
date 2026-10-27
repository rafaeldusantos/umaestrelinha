import { useState } from 'react'
import { cn } from '@estrelinha/ui/lib/utils'
import {
  ACCESS_TITLE,
  CHART_UNAVAILABLE,
  CONSENT_NOTE,
  accessCards,
  accessChart,
} from '@estrelinha/core/live'
import {
  cappedLine,
  countingSinceLine,
  emptyCounterLine,
  type MovementPeriodKey,
  type StoreMovement,
} from '@estrelinha/core/stats'
import { PERIODOS } from '@/entities/stats'
import { FalhaDoBloco, Traco, type Leitura } from '@/shared/ui/leitura'
import GraficoDosAcessos from './GraficoDosAcessos'

const CARTAO = 'min-w-0 rounded-[20px] border border-estrelinha-line bg-estrelinha-surface p-4'
const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[.1em] text-estrelinha-ink-soft'
/** Visitas e Vendas lado a lado, a Conversão em largura inteira; a 200 % de fonte, uma coluna. */
const GRADE = 'grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-3 [&>*:last-child]:col-span-full'
const NOTA = 'text-xs text-estrelinha-ink-soft'
const ROTULOS = ['Visitas', 'Vendas', 'Conversão'] as const

/**
 * A seção **Acessos** da Loja ao vivo (feature `83`, `LAV-50`..`LAV-55`, `LAV-67`).
 *
 * - Recebe a leitura do movimento por prop (a MESMA da faixa do Início, `['store-movement']`) e nunca
 *   chama RPC: trocar de período não lê nada, os três vêm da mesma resposta.
 * - O período inicial vem da entrada (`periodoDaEntrada`, na página); depois, é estado da seção.
 * - Toda regra — números, variação, gráfico, notas — é de `core/live` e `core/stats/counterNotes`.
 * - Três estados exclusivos (`L-063`): carregando (`aria-busy`, traços, seletor travado, nenhum
 *   número), falha sem dado (a frase e "Tentar de novo", nenhum número), e dado. Sem a chave `acessos`
 *   (banco antigo), os números sem variação e a frase estática do gráfico, SEM botão.
 */
const SecaoAcessos = ({ leitura, periodoInicial }: { leitura: Leitura<StoreMovement>; periodoInicial: MovementPeriodKey }) => {
  const [periodo, setPeriodo] = useState<MovementPeriodKey>(periodoInicial)
  const m = leitura.dado
  const carregando = !m && !leitura.falhou
  const falado = PERIODOS.find((p) => p.id === periodo)?.falado ?? periodo
  const grafico = m ? accessChart(m, periodo) : null
  const notas = m ? [countingSinceLine(periodo, m), cappedLine(periodo, m), emptyCounterLine(m)].filter((n): n is string => !!n) : []

  return (
    <section aria-labelledby="acessos" aria-busy={carregando ? 'true' : undefined} className="space-y-3">
      <h2 id="acessos" className="text-xl">
        {ACCESS_TITLE}
      </h2>

      <div className="grid grid-cols-3 gap-1 rounded-[12px] bg-estrelinha-ground-deep p-1">
        {PERIODOS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={periodo === p.id}
            disabled={!m}
            onClick={() => setPeriodo(p.id)}
            className={cn(
              'min-h-11 rounded-[6px] text-sm font-semibold',
              periodo === p.id
                ? 'bg-estrelinha-surface text-estrelinha-ink shadow-[0_1px_2px_rgba(35,48,58,.12)]'
                : 'bg-transparent text-estrelinha-ink-soft',
            )}
          >
            {p.rotulo}
          </button>
        ))}
      </div>

      {leitura.falhou && !m ? (
        <div className={CARTAO}>
          <FalhaDoBloco tentarDeNovo={leitura.tentarDeNovo} />
        </div>
      ) : m ? (
        <>
          <div data-testid="cartoes-dos-acessos" className={GRADE}>
            {accessCards(m, periodo).map((c) => (
              <div key={c.rotulo} role="group" aria-label={`${c.rotulo}, ${falado}, ${c.valor}`} className={CARTAO}>
                <div className={EYEBROW}>{c.rotulo}</div>
                <div className="mt-2 whitespace-nowrap font-display text-[22px] font-bold text-estrelinha-primary">{c.valor}</div>
                {c.variacao && (
                  <p
                    data-testid="variacao"
                    className={cn('mt-1 text-xs', c.variacao.tom === 'alta' ? 'text-estrelinha-done' : 'text-estrelinha-ink-soft')}
                  >
                    {c.variacao.texto}
                  </p>
                )}
              </div>
            ))}
          </div>

          <div data-testid="grafico" className={CARTAO}>
            {grafico ? <GraficoDosAcessos grafico={grafico} /> : <p className="text-sm text-estrelinha-ink-soft">{CHART_UNAVAILABLE}</p>}
          </div>

          {notas.map((n) => (
            <p key={n} className={NOTA}>
              {n}
            </p>
          ))}
          <p className={NOTA}>{CONSENT_NOTE}</p>
        </>
      ) : (
        <>
          <div className={GRADE}>
            {ROTULOS.map((r) => (
              <div key={r} className={CARTAO}>
                <div className={EYEBROW}>{r}</div>
                <Traco className="mt-2 h-6 w-20" />
              </div>
            ))}
          </div>
          <div className={CARTAO}>
            <Traco className="h-[120px] w-full" />
          </div>
        </>
      )}
    </section>
  )
}

export default SecaoAcessos
