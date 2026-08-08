// Estimativa de entrega — domínio puro (roda em Node, Deno e browser).
// SHP-09: data = hoje + handling_days + delivery_range, contados em dias úteis (seg–sex, sem feriados).
// SHP-06: a opção mais barata é a que recebe "Grátis" quando o threshold é atingido.
// `today` é sempre parâmetro — nunca `new Date()` interno — para o cálculo ser determinístico.

import type { ShippingQuote } from '@estrelinha/supabase/types/shipping'

export type { ShippingQuote }

const MONTHS_PT_BR = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
]

/**
 * Soma `days` dias úteis (seg–sex) a `from`, sem alterar a data recebida.
 * `days = 0` devolve a própria data de entrada, inclusive quando ela cai no fim de semana.
 */
export function addBusinessDays(from: Date, days: number): Date {
  const result = new Date(from.getTime())
  let remaining = Math.max(0, Math.trunc(days))

  while (remaining > 0) {
    result.setDate(result.getDate() + 1)
    const weekday = result.getDay()
    if (weekday !== 0 && weekday !== 6) remaining--
  }

  return result
}

/**
 * Converte a cotação na janela de datas exibida.
 * `delivery_range` ausente → `delivery_time` vale como min e max.
 */
export function quoteToEstimate(
  quote: ShippingQuote,
  handlingDays: number,
  today: Date,
): { min: Date; max: Date } {
  const rangeMin = quote.delivery_range?.min ?? quote.delivery_time
  const rangeMax = quote.delivery_range?.max ?? quote.delivery_time

  return {
    min: addBusinessDays(today, handlingDays + rangeMin),
    max: addBusinessDays(today, handlingDays + rangeMax),
  }
}

/** `"entre 4 e 6 de agosto"` quando min ≠ max; `"em 30 de julho"` quando são o mesmo dia. */
export function formatEstimate(min: Date, max: Date): string {
  const sameDay =
    min.getFullYear() === max.getFullYear() &&
    min.getMonth() === max.getMonth() &&
    min.getDate() === max.getDate()

  if (sameDay) return `em ${min.getDate()} de ${MONTHS_PT_BR[min.getMonth()]}`

  if (min.getMonth() === max.getMonth() && min.getFullYear() === max.getFullYear()) {
    return `entre ${min.getDate()} e ${max.getDate()} de ${MONTHS_PT_BR[min.getMonth()]}`
  }

  return `entre ${min.getDate()} de ${MONTHS_PT_BR[min.getMonth()]} e ${max.getDate()} de ${MONTHS_PT_BR[max.getMonth()]}`
}

/**
 * `id` da opção de menor preço. `price` vem como string do Melhor Envio e é comparado
 * como número — comparação textual colocaria "18.90" antes de "9.90".
 */
export function cheapestQuoteId(quotes: ShippingQuote[]): number | null {
  let cheapestId: number | null = null
  let cheapestPrice = Number.POSITIVE_INFINITY

  for (const quote of quotes ?? []) {
    const price = Number.parseFloat(quote.price)
    if (!Number.isFinite(price)) continue
    if (price < cheapestPrice) {
      cheapestPrice = price
      cheapestId = quote.id
    }
  }

  return cheapestId
}
