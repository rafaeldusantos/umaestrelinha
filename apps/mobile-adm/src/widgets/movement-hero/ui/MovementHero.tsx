import { useState, type ReactNode } from 'react'
import { cn } from '@estrelinha/ui/lib/utils'
import { greetingFor, longDateLine, storeHour, type MovementPeriodKey, type StoreMovement } from '@estrelinha/core/stats'
import { FalhaDoBloco, Traco, type Leitura } from '@/shared/ui/leitura'
import { NOME_DA_DONA, PERIODOS, numerosDoPeriodo } from '../model/numeros'

const ROTULO = 'text-[11px] font-semibold uppercase tracking-[.1em] text-estrelinha-on-primary/80'

/**
 * O topo da Início (feature `73`, `MAI-01`..`MAI-04`, `MAI-17`, `MAI-30`): a faixa escura do
 * protótipo, com a saudação, o dia, os três períodos e os quatro números do movimento.
 *
 * - **Nenhum dia nem hora do aparelho** (`MAI-04`): a saudação é a hora de Brasília do `lido_em` que o
 *   banco devolveu, e a data é o `hoje` dele, escrito por texto.
 * - **Trocar de período não lê nada** (`MAI-02`): os três vêm da mesma resposta; o escolhido é marcado
 *   com `aria-pressed`.
 * - Cada número tem nome acessível com rótulo e período ("Faturamento, hoje, R$ 1.077", `MAI-30`).
 * - O `h1` existe nos três estados: o layout leva o foco a ele na troca de aba (`MAF-29`).
 * - Os quatro números ficam numa grade `auto-fit` com piso de `9rem`: duas colunas com a fonte padrão,
 *   uma com a fonte do sistema grande. `grid-cols-2` fixo deixava `R$ 99.999` pintar por cima das
 *   vendas a 130 % (`BUG-20261022-numeros-se-sobrepoem-com-fonte-grande`, QA da `73`).
 */
const MovementHero = ({
  leitura,
  topo,
  periodo: controlado,
  aoTrocarPeriodo,
}: {
  leitura: Leitura<StoreMovement>
  topo?: ReactNode
  /**
   * Feature `83` (`LAV-50`): o período, quando a PÁGINA o controla (o cartão "Visitas hoje" leva o
   * período escolhido aqui). Sem as duas props, o estado interno de sempre (testes da `73` intactos).
   */
  periodo?: MovementPeriodKey
  aoTrocarPeriodo?: (p: MovementPeriodKey) => void
}) => {
  const [interno, setInterno] = useState<MovementPeriodKey>('hoje')
  const periodo = controlado ?? interno
  const setPeriodo = (p: MovementPeriodKey) => {
    setInterno(p)
    aoTrocarPeriodo?.(p)
  }
  const m = leitura.dado
  const carregando = !m && !leitura.falhou
  const falado = PERIODOS.find((p) => p.id === periodo)?.falado ?? periodo

  return (
    <section
      aria-busy={carregando ? 'true' : undefined}
      aria-label="Movimento da loja"
      className="-mx-4 -mt-4 bg-estrelinha-primary-strong px-5 pb-6 pt-3 text-estrelinha-on-primary"
    >
      {topo && <div className="mb-[22px]">{topo}</div>}
      {m ? (
        <>
          <h1 className="text-[28px] font-normal leading-tight tracking-[-0.02em]">
            {`${greetingFor(storeHour(m.lido_em))}, ${NOME_DA_DONA}.`}
          </h1>
          <p className="mt-1 text-sm font-light text-estrelinha-on-primary/80">{longDateLine(m.hoje)}</p>
        </>
      ) : (
        <>
          <h1 className="text-[28px] font-normal leading-tight">
            <span className="sr-only">Início</span>
            {carregando && <Traco escuro className="h-8 w-48" />}
          </h1>
          {carregando && <Traco escuro className="mt-2 h-4 w-40" />}
        </>
      )}

      {leitura.falhou && !m ? (
        <div className="mt-4">
          <FalhaDoBloco escuro tentarDeNovo={leitura.tentarDeNovo} />
        </div>
      ) : (
        <>
          <div className="mt-5 flex gap-2">
            {PERIODOS.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={periodo === p.id}
                disabled={!m}
                onClick={() => setPeriodo(p.id)}
                className={cn(
                  'min-h-11 flex-1 rounded-pill border text-[13px] font-medium',
                  periodo === p.id
                    ? 'border-estrelinha-on-primary bg-estrelinha-on-primary text-estrelinha-primary-strong'
                    : 'border-estrelinha-on-primary/40 bg-transparent text-estrelinha-on-primary',
                )}
              >
                {p.rotulo}
              </button>
            ))}
          </div>

          <div className="mt-5 grid grid-cols-[repeat(auto-fit,minmax(min(100%,9rem),1fr))] gap-x-4 gap-y-[18px]">
            {m
              ? numerosDoPeriodo(m, periodo).map((n) => (
                  <div key={n.rotulo} role="group" aria-label={`${n.rotulo}, ${falado}, ${n.valor}`} className="min-w-0">
                    <div className={ROTULO}>{n.rotulo}</div>
                    <div
                      className={cn(
                        'mt-1.5 whitespace-nowrap font-display font-bold tracking-[-0.02em]',
                        n.grande ? 'text-2xl' : 'text-xl',
                      )}
                    >
                      {n.valor}
                    </div>
                  </div>
                ))
              : ['Faturamento', 'Vendas', 'Ticket médio', 'Visitas'].map((r) => (
                  <div key={r} className="min-w-0">
                    <div className={ROTULO}>{r}</div>
                    <Traco escuro className="mt-2 h-6 w-24" />
                  </div>
                ))}
          </div>
        </>
      )}
    </section>
  )
}

export default MovementHero
