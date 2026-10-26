import { formatPriceWhole } from '@estrelinha/core/formatters'
import { monthName, paidOrdersLabel, type StoreOverview } from '@estrelinha/core/stats'
import { FalhaDoBloco, Traco, type Leitura } from '@/shared/ui/leitura'

const CARD = 'min-w-0 rounded-lg border border-estrelinha-line bg-estrelinha-surface p-4'
const ROTULO = 'text-[11px] font-semibold uppercase tracking-[.1em] text-estrelinha-ink-soft'
const NUMERO = 'mt-2 whitespace-nowrap font-display text-xl font-bold text-estrelinha-primary'
const LINHA = 'mt-1 text-xs text-estrelinha-ink-soft'

/**
 * O mês e as clientes novas (feature `73`, `MAI-11`, `MAI-12`, `MAI-28`), lado a lado.
 *
 * - O nome do mês vem do `mes` (`'AAAA-MM'`) que o banco devolveu, por texto (`monthName`).
 * - "1 pedido pago" / "N pedidos pagos" (`paidOrdersLabel`).
 * - Duas colunas `auto-fit` com piso de `8.75rem` (`MAI-28`): em 360 com a fonte padrão cabem duas,
 *   e `R$ 101.055` cabe no card; com a fonte do sistema maior o piso cresce junto (é `rem`) e a grade
 *   cai para uma coluna, em vez de o número passar por cima do card vizinho
 *   (`BUG-20261022-numeros-se-sobrepoem-com-fonte-grande`, QA da `73`).
 */
const MonthCards = ({ leitura }: { leitura: Leitura<StoreOverview> }) => {
  const r = leitura.dado
  const carregando = !r && !leitura.falhou

  if (leitura.falhou && !r) {
    return (
      <section aria-label="O mês" className={CARD}>
        <FalhaDoBloco tentarDeNovo={leitura.tentarDeNovo} />
      </section>
    )
  }

  return (
    <section aria-label="O mês" aria-busy={carregando ? 'true' : undefined} data-testid="cards-do-mes" className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,8.75rem),1fr))] gap-3">
      <div role="group" aria-label={r ? `Faturamento de ${monthName(r.mes)}` : 'Faturamento do mês'} className={CARD}>
        <div className={ROTULO}>{r ? `Fat. de ${monthName(r.mes)}` : 'Fat. do mês'}</div>
        {r ? (
          <>
            <div className={NUMERO}>{formatPriceWhole(r.mes_resumo.faturamento)}</div>
            <div className={LINHA}>{paidOrdersLabel(r.mes_resumo.vendas)}</div>
          </>
        ) : (
          <Traco className="mt-3 h-6 w-24" />
        )}
      </div>
      <div role="group" aria-label="Clientes novas" className={CARD}>
        <div className={ROTULO}>Clientes novas</div>
        {r ? (
          <>
            <div className={NUMERO}>{new Intl.NumberFormat('pt-BR').format(r.clientes_novas)}</div>
            <div className={LINHA}>primeira compra no mês</div>
          </>
        ) : (
          <Traco className="mt-3 h-6 w-12" />
        )}
      </div>
    </section>
  )
}

export default MonthCards
