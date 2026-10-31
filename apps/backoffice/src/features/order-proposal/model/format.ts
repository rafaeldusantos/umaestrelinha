// Data e hora no dia da loja (Brasília), para o histórico e a lista de propostas.

import { STORE_TIME_ZONE } from '@estrelinha/core/time'

const DATA_HORA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: STORE_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})
const DATA = new Intl.DateTimeFormat('pt-BR', {
  timeZone: STORE_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
})

const ler = (iso: string | null | undefined): Date | null => {
  if (!iso) return null
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? null : d
}

export const formatDateTime = (iso: string | null | undefined): string => {
  const d = ler(iso)
  return d ? DATA_HORA.format(d) : ''
}

export const formatDate = (iso: string | null | undefined): string => {
  const d = ler(iso)
  return d ? DATA.format(d) : ''
}
