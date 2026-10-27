import { cn } from '@estrelinha/ui/lib/utils'
import { formatCount } from '@estrelinha/core/stats'
import type { AccessChart, AccessColumn } from '@estrelinha/core/live'
import { alturaDaBarra } from '../model/barras'

/** Sem número: a faixa ainda não chegou, ou terminou antes de a contagem começar (nunca `0`). */
const semNumero = (c: AccessColumn) => c.valor === null

const nomeDaColuna = (c: AccessColumn): string => {
  if (c.destaque === 'futura') return `${c.rotulo}: ainda não chegou`
  if (c.destaque === 'sem_contagem' || c.valor === null) return `${c.rotulo}: antes da contagem`
  return `${c.rotulo}: ${formatCount(c.valor)} ${c.valor === 1 ? 'visita' : 'visitas'}`
}

/**
 * O gráfico da seção Acessos (feature `83`, `LAV-52`, `LAV-53`): 8 faixas de 3 h (Hoje, Ontem) ou um
 * dia por coluna (Semana). Quem decide colunas, rótulos e destaque é `accessChart` (`core/live`), com
 * a faixa em andamento e o "hoje" do SERVIDOR; aqui só se desenha.
 *
 * - `atual` em `accent` (preenchimento, nunca texto) com o rótulo em `ink`; `passada` em `primary`;
 *   `futura` e `sem_contagem` sem número, trilho de 4 px em `line`.
 * - **Sem transição nenhuma nas barras** (`LAV-64`, por construção).
 * - Com a fonte grande, cada coluna tem piso em `rem` e o gráfico rola DENTRO do cartão
 *   (`overflow-x-auto`): o valor nunca pinta sobre o vizinho, e o `body` não rola (`LAV-52`, `LAV-63`).
 */
const GraficoDosAcessos = ({ grafico }: { grafico: AccessChart }) => {
  const max = Math.max(0, ...grafico.colunas.map((c) => c.valor ?? 0))
  return (
    <>
      <h3 className="text-[17px]">{grafico.titulo}</h3>
      <ol data-testid="colunas" className="mt-[18px] flex min-h-[120px] items-end gap-1.5 overflow-x-auto">
        {grafico.colunas.map((c, i) => (
          <li
            key={`${c.rotulo}-${i}`}
            data-testid="coluna"
            data-destaque={c.destaque}
            aria-label={nomeDaColuna(c)}
            className="flex min-w-[2.75rem] flex-1 flex-col items-center gap-1.5"
          >
            <span aria-hidden="true" data-testid="valor" className="text-[11px] font-medium text-estrelinha-ink-soft">
              {semNumero(c) ? '' : formatCount(c.valor as number)}
            </span>
            <span
              aria-hidden="true"
              data-testid="barra"
              style={{ height: `${alturaDaBarra(c.valor, max)}px` }}
              className={cn(
                'block w-full rounded-[6px]',
                c.destaque === 'atual' && !semNumero(c)
                  ? 'bg-estrelinha-accent'
                  : semNumero(c)
                    ? 'bg-estrelinha-line'
                    : 'bg-estrelinha-primary',
              )}
            />
            <span
              aria-hidden="true"
              data-testid="rotulo"
              className={cn(
                'whitespace-nowrap text-[11px] font-semibold',
                c.destaque === 'atual' ? 'text-estrelinha-ink' : 'text-estrelinha-ink-soft',
              )}
            >
              {c.rotulo}
            </span>
          </li>
        ))}
      </ol>
      <p className="mt-3.5 text-xs text-estrelinha-ink-soft">{grafico.nota}</p>
      {grafico.semHora && <p className="mt-1 text-xs text-estrelinha-ink-soft">{grafico.semHora}</p>}
    </>
  )
}

export default GraficoDosAcessos
