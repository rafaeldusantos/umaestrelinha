import { formatPrice, formatPriceWhole } from '@estrelinha/core/formatters'
import { formatCount, type MovementPeriodKey, type StoreMovement } from '@estrelinha/core/stats'
import { PERIODOS } from '@/entities/stats'

/** Como a dona assina (assunção da spec, `n — confirmar`). */
export const NOME_DA_DONA = 'Adri'

// O vocabulário de período subiu para `entities/stats/model/periodos.ts` (feature `83`): o cartão
// "Visitas hoje" e a seção Acessos o leem também. Reexportado POR REFERÊNCIA para os testes da `73` não
// mudarem (`periodosComDonoUnico.test.ts` confere o `toBe`).
export { PERIODOS }

/** Os quatro números de um período, já escritos (`MAI-03`: o ticket sem venda é `—`). */
export const numerosDoPeriodo = (m: StoreMovement, periodo: MovementPeriodKey) => {
  const p = m.periodos[periodo]
  return [
    { rotulo: 'Faturamento', valor: formatPriceWhole(p.faturamento), grande: true },
    { rotulo: 'Vendas', valor: formatCount(p.vendas), grande: true },
    { rotulo: 'Ticket médio', valor: p.vendas === 0 || p.ticket === null ? '—' : formatPrice(p.ticket), grande: false },
    { rotulo: 'Visitas', valor: formatCount(p.visitas), grande: false },
  ]
}
