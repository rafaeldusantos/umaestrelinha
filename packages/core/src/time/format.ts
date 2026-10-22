// Feature 71 · VIS-10, VIS-38, VIS-40 — a hora escrita pelo bloco "Movimento da loja", e o dia.
//
// Um dono só da hora escrita: a primeira escrita do design misturava `HH:MM` e `HHhMM` no mesmo
// bloco. O fuso é o da loja, nunca o do aparelho — a dona em viagem continua lendo a hora de
// Brasília, que é a régua dos números ao lado.

import { STORE_TIME_ZONE } from './zone.ts'

const HORA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: STORE_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
})

/** `'2026-10-21T18:32:00Z'` ⇒ `'15h32'`, no fuso da loja e com ciclo de 23 horas. */
export function formatStoreHour(iso: string): string {
  const partes = HORA.formatToParts(new Date(iso))
  const hora = partes.find((p) => p.type === 'hour')?.value ?? ''
  const minuto = partes.find((p) => p.type === 'minute')?.value ?? ''
  return `${hora}h${minuto}`
}

/**
 * `'2026-10-21'` ⇒ `'21/10'`, por CORTE de texto.
 *
 * O valor é um DIA que o banco já decidiu, não um instante. Lido como data, ele viraria meia-noite
 * UTC — que em Porto Alegre ainda é o dia anterior.
 */
export function formatDayMonth(dia: string): string {
  return `${dia.slice(8, 10)}/${dia.slice(5, 7)}`
}
