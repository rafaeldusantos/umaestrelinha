import { cn } from '@estrelinha/ui/lib/utils'
import { formatPrice, formatPriceWhole } from '@estrelinha/core/formatters'
import type { StoreOverview } from '@estrelinha/core/stats'
import { FalhaDoBloco, Traco, type Leitura } from '@/shared/ui/leitura'
import { barrasDaSemana } from '../model/barras'

/**
 * "Vendas · 7 dias" (feature `73`, `MAI-10`): o faturamento das vendas de cada dia de Brasília, em
 * R$ mil com uma casa, numa barra por dia. Sem biblioteca: são sete `div`s.
 *
 * - Os dias vêm decididos pelo banco (`semana`, do mais antigo a hoje); aqui não se calcula dia.
 * - A barra mais alta é a do maior valor; o dia sem venda tem `—` e o piso de altura.
 * - Só a última é "hoje", e só ela tem a cor de destaque (`accent`, preenchimento — nunca texto).
 */
const WeekChart = ({ leitura }: { leitura: Leitura<StoreOverview> }) => {
  const r = leitura.dado
  const carregando = !r && !leitura.falhou
  const barras = r ? barrasDaSemana(r.semana) : []
  const total = r ? r.semana.reduce((s, d) => s + d.faturamento, 0) : 0

  return (
    <section
      aria-labelledby="vendas-7-dias"
      aria-busy={carregando ? 'true' : undefined}
      className="rounded-lg border border-estrelinha-line bg-estrelinha-surface p-[18px]"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h3 id="vendas-7-dias" className="text-[17px]">
          Vendas · 7 dias
        </h3>
        {r && (
          <span data-testid="total-da-semana" className="whitespace-nowrap font-display text-base font-bold text-estrelinha-primary">
            {formatPriceWhole(total)}
          </span>
        )}
      </div>

      {leitura.falhou && !r ? (
        <FalhaDoBloco tentarDeNovo={leitura.tentarDeNovo} />
      ) : r ? (
        <ol className="mt-[18px] flex h-[120px] items-end gap-2.5">
          {barras.map((b) => (
            <li
              key={b.dia}
              data-testid="barra"
              aria-label={`${b.hoje ? 'Hoje' : b.rotulo}: ${b.faturamento > 0 ? formatPrice(b.faturamento) : 'sem venda'}`}
              className="flex min-w-0 flex-1 flex-col items-center gap-1.5"
            >
              <span aria-hidden="true" className="text-[11px] font-medium text-estrelinha-ink-soft">
                {b.valor}
              </span>
              <span
                aria-hidden="true"
                data-testid="altura"
                style={{ height: `${b.altura}px` }}
                className={cn(
                  'block w-full rounded-sm',
                  b.hoje ? 'bg-estrelinha-accent' : b.faturamento > 0 ? 'bg-estrelinha-primary' : 'bg-estrelinha-line',
                )}
              />
              <span
                aria-hidden="true"
                className={cn(
                  'text-[11px] font-semibold uppercase tracking-[.06em]',
                  b.hoje ? 'text-estrelinha-ink' : 'text-estrelinha-ink-soft',
                )}
              >
                {b.rotulo}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <div className="mt-[18px] flex h-[120px] items-end gap-2.5">
          {Array.from({ length: 7 }, (_, i) => (
            <Traco key={i} className="h-16 flex-1" />
          ))}
        </div>
      )}

      <p className="mt-3.5 text-xs text-estrelinha-ink-soft">Pedidos pagos, em R$ mil.</p>
    </section>
  )
}

export default WeekChart
