// "Atualizada em <data> às <hora> por <nome>" — a última edição da observação do pedido.
//
// O painel e o app do ateliê mostram a mesma frase; escrita nos dois, ela divergiria sem nada
// quebrar. Fica fora de `adminNote.ts`, que é folha sem import: esta lê o dia e a hora no fuso da loja
// pelos donos que já existem, por caminho relativo com extensão explícita.

import { calendarParts, formatShortDate } from './situation.ts'
import { formatStoreHour } from '../time/format.ts'

export interface AdminNoteAuthorInput {
  updated_at: string
  updated_by_name: string | null
}

/** A linha de autoria, ou `null` sem observação (ou com a data ilegível). */
export function adminNoteAuthorLine(nota: AdminNoteAuthorInput | null | undefined): string | null {
  if (!nota) return null
  const dia = formatShortDate(nota.updated_at)
  const ano = calendarParts(nota.updated_at)?.year
  if (!dia || !ano) return null
  const nome = typeof nota.updated_by_name === 'string' ? nota.updated_by_name.trim() : ''
  return `Atualizada em ${dia} ${ano} às ${formatStoreHour(nota.updated_at)}${nome ? ` por ${nome}` : ''}`
}
