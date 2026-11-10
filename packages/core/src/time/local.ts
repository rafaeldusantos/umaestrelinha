// A data e a hora "de parede" de Brasília, e o instante que elas são.
//
// O campo de data e hora do painel (`<input type="datetime-local">`) não carrega fuso: o valor é
// `AAAA-MM-DDTHH:MM`. O navegador leria esse texto no fuso do APARELHO, e a dona em viagem gravaria a
// hora errada. A régua é o fuso da loja (`STORE_TIME_ZONE`), declarado num lugar só.
//
// Folha alcançável pelo Deno: o único import leva a extensão explícita.

import { STORE_TIME_ZONE } from './zone.ts'

const PARTES = new Intl.DateTimeFormat('en-US', {
  timeZone: STORE_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
})

/** O relógio de parede de Brasília num instante, em milissegundos "como se fosse UTC". */
const paredeEm = (instante: number): number => {
  const p = PARTES.formatToParts(new Date(instante))
  const n = (tipo: string): number => Number(p.find((x) => x.type === tipo)?.value ?? '0')
  return Date.UTC(n('year'), n('month') - 1, n('day'), n('hour') % 24, n('minute'), n('second'))
}

const FORMA = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/

/**
 * `'2026-11-09T14:30'` (Brasília) ⇒ `'2026-11-09T17:30:00.000Z'`. Texto fora da forma, ou data que
 * não existe (mês 13, hora 25), devolve `null`.
 */
export function storeLocalToInstant(valor: string): string | null {
  const m = FORMA.exec(valor ?? '')
  if (!m) return null
  const [ano, mes, dia, hora, minuto] = m.slice(1).map(Number)
  const parede = Date.UTC(ano, mes - 1, dia, hora, minuto)
  const conferido = new Date(parede)
  if (
    conferido.getUTCFullYear() !== ano || conferido.getUTCMonth() !== mes - 1 || conferido.getUTCDate() !== dia ||
    conferido.getUTCHours() !== hora || conferido.getUTCMinutes() !== minuto
  ) {
    return null
  }
  // O deslocamento do fuso no instante aproximado, e de novo no corrigido (a mudança de horário, se
  // um dia voltar, cai entre os dois).
  let instante = parede - (paredeEm(parede) - parede)
  instante = parede - (paredeEm(instante) - instante)
  return new Date(instante).toISOString()
}

/** O instante como valor do campo, na hora de Brasília: `'2026-11-09T17:30:59Z'` ⇒ `'2026-11-09T14:30'`. */
export function storeLocalInput(iso: string): string {
  return new Date(paredeEm(new Date(iso).getTime())).toISOString().slice(0, 16)
}
