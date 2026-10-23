import { formatPrice, formatPriceWhole } from '@estrelinha/core/formatters'
import type { MovementPeriodKey, StoreMovement } from '@estrelinha/core/stats'

/** Como a dona assina (assunção da spec, `n — confirmar`). */
export const NOME_DA_DONA = 'Adri'

export const PERIODOS: readonly { id: MovementPeriodKey; rotulo: string; falado: string }[] = [
  { id: 'hoje', rotulo: 'Hoje', falado: 'hoje' },
  { id: 'ontem', rotulo: 'Ontem', falado: 'ontem' },
  { id: 'semana', rotulo: 'Semana', falado: 'esta semana' },
]

const INTEIRO = new Intl.NumberFormat('pt-BR')

/** Os quatro números de um período, já escritos (`MAI-03`: o ticket sem venda é `—`). */
export const numerosDoPeriodo = (m: StoreMovement, periodo: MovementPeriodKey) => {
  const p = m.periodos[periodo]
  return [
    { rotulo: 'Faturamento', valor: formatPriceWhole(p.faturamento), grande: true },
    { rotulo: 'Vendas', valor: INTEIRO.format(p.vendas), grande: true },
    { rotulo: 'Ticket médio', valor: p.vendas === 0 || p.ticket === null ? '—' : formatPrice(p.ticket), grande: false },
    { rotulo: 'Visitas', valor: INTEIRO.format(p.visitas), grande: false },
  ]
}
