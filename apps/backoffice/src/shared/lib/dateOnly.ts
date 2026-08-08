// O dia, sem hora (feature 18 / T1, DSC-05 AC 5).
//
// `coupons.valid_from`/`valid_until` e `promotions.valid_from`/`valid_until` são `timestamptz`, mas o
// que a dona da loja escolhe é um DIA. Traduzir entre as duas coisas é onde nasce o erro de um dia —
// e o repo já tinha **dois** tradutores discordando:
//
//   * `AdminCouponsPage.toDateInput` cortava a string (`iso.slice(0, 10)`) ⇒ componentes **UTC**;
//   * `promotion-form/model/schema.ts.toDateInput` usava `getFullYear`/`getMonth` ⇒ componentes
//     **locais**.
//
// Os dois concordam em fuso negativo (todos os do Brasil) e divergem em fuso positivo, porque a
// gravação é meia-noite **local**: `2026-08-31T00:00:00` em UTC+2 vira `2026-08-30T22:00:00Z`, e
// cortar a string devolve `2026-08-30`. Um módulo só, e a ida e a volta passam a usar a mesma
// referência — a volta é exata em qualquer fuso.
//
// A convenção de GRAVAÇÃO não muda aqui: segue meia-noite local, como as duas telas já gravavam.
// Que "válido até 30/09" morra às 00:00 de 30/09 é outro defeito, de outra camada (os dois leitores
// de vigência comparam `new Date(valid_until) < now`) — está registrado como `BL-004`.

const pad = (value: number) => `${value}`.padStart(2, '0')

/** `2026-08-31` — o formato que os campos e o `zod` trocam entre si. */
export type DateOnly = string

/** ISO gravado ⇒ `2026-08-31`. `null`/vazio/inválido ⇒ `''`. */
export const dateOnlyFromIso = (iso: string | null | undefined): DateOnly => {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''
  return dateOnlyFromDate(date)
}

/** `2026-08-31` ⇒ ISO de meia-noite **local**. Vazio ⇒ `null` (a coluna é nullable). */
export const isoFromDateOnly = (value: DateOnly | null | undefined): string | null => {
  if (!value) return null
  const date = dateFromDateOnly(value)
  return date ? date.toISOString() : null
}

/**
 * `2026-08-31` ⇒ `Date` de meia-noite local — o que o `react-day-picker` marca no calendário.
 *
 * `new Date('2026-08-31')` NÃO serve: string só-data é interpretada como UTC pela spec do JS, e em
 * fuso negativo o `Date` resultante cai no dia 30. Os três números vão para o construtor separados.
 */
export const dateFromDateOnly = (value: DateOnly | null | undefined): Date | undefined => {
  if (!value) return undefined
  const [year, month, day] = value.split('-').map(Number)
  if (!year || !month || !day) return undefined
  const date = new Date(year, month - 1, day)
  return Number.isNaN(date.getTime()) ? undefined : date
}

/** `Date` ⇒ `2026-08-31`, pelos componentes **locais** (o dia que a pessoa clicou no calendário). */
export const dateOnlyFromDate = (date: Date | undefined): DateOnly => {
  if (!date || Number.isNaN(date.getTime())) return ''
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/** `2026-08-31` ⇒ `31/08/2026`. Formatação por partes, sem `toLocaleDateString`. */
export const formatDateOnly = (value: DateOnly | null | undefined): string => {
  if (!value) return ''
  const [year, month, day] = value.split('-')
  if (!year || !month || !day) return ''
  return `${day}/${month}/${year}`
}

/** ISO ⇒ `31/08/2026`. O atalho que as listagens usam. */
export const formatIsoAsDate = (iso: string | null | undefined): string =>
  formatDateOnly(dateOnlyFromIso(iso))

/** ISO ⇒ `31/08` — a forma curta da coluna de vigência. */
export const shortIsoAsDate = (iso: string | null | undefined): string => {
  const value = dateOnlyFromIso(iso)
  if (!value) return ''
  const [, month, day] = value.split('-')
  return `${day}/${month}`
}
