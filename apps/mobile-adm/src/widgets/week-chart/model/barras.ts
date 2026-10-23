import { thousandsLabel, weekdayShort, type OverviewDay } from '@estrelinha/core/stats'

/** A altura da barra mais alta, e o piso do dia sem venda (o protótipo: 84 e 4). */
export const ALTURA_MAXIMA = 84
export const ALTURA_MINIMA = 4

/** As barras já calculadas, na ORDEM DO BANCO (do mais antigo a hoje) — nunca reordenadas aqui. */
export const barrasDaSemana = (semana: readonly OverviewDay[]) => {
  const maior = Math.max(0, ...semana.map((d) => d.faturamento))
  return semana.map((d, i) => ({
    dia: d.dia,
    hoje: i === semana.length - 1,
    rotulo: i === semana.length - 1 ? 'hoje' : weekdayShort(d.dow),
    valor: thousandsLabel(d.faturamento),
    faturamento: d.faturamento,
    altura: maior > 0 ? Math.max(ALTURA_MINIMA, Math.round((d.faturamento / maior) * ALTURA_MAXIMA)) : ALTURA_MINIMA,
  }))
}
