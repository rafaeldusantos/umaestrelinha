// Campanhas de desconto — o fim que a dona digita e o fim que o banco guarda.
//
// O banco guarda `ends_at` EXCLUSIVO (a vigência é `[starts_at, ends_at)`, e a constraint de
// exclusão compara intervalos meio-abertos). A dona digita e lê o ÚLTIMO MINUTO que vale: "Termina em
// 30/11 23:59". Gravar soma um minuto (`ends_at` = 01/12 00:00); mostrar subtrai um minuto. A
// conversão mora aqui, num lugar só — escrita duas vezes, a tela mostraria um fim e o banco valeria
// outro.
//
// As datas e horas digitadas são de Brasília (`time/local.ts`, `STORE_TIME_ZONE`), nunca do aparelho.
//
// Folha alcançável pelo Deno: todo import é relativo com `.ts` explícito.

import { storeLocalInput, storeLocalToInstant } from '../time/local.ts'

const MINUTO = 60_000

/** `ends_at` exclusivo ⇒ o último minuto que vale (ISO). */
export const lastMinuteOf = (endsAt: string): string => new Date(new Date(endsAt).getTime() - MINUTO).toISOString()

/** O último minuto que vale (ISO) ⇒ `ends_at` exclusivo. */
export const endsAtFromLastMinute = (lastMinute: string): string =>
  new Date(new Date(lastMinute).getTime() + MINUTO).toISOString()

/** `starts_at` ⇒ o valor do campo de início, em Brasília (`'2026-11-13T00:00'`). */
export const campaignStartInput = (startsAt: string): string => storeLocalInput(startsAt)

/** `ends_at` ⇒ o valor do campo de fim: o último minuto que vale, em Brasília (`'2026-11-30T23:59'`). */
export const campaignEndInput = (endsAt: string): string => storeLocalInput(lastMinuteOf(endsAt))

/** O início digitado (Brasília) ⇒ `starts_at`. Texto fora da forma ⇒ `null`. */
export const campaignStartsAtFromInput = (valor: string): string | null => storeLocalToInstant(valor)

/** O fim digitado (o último minuto que vale, Brasília) ⇒ `ends_at` exclusivo. Fora da forma ⇒ `null`. */
export const campaignEndsAtFromInput = (valor: string): string | null => {
  const instante = storeLocalToInstant(valor)
  return instante === null ? null : endsAtFromLastMinute(instante)
}
