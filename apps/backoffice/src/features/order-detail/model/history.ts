// `PED-27` — histórico é **um** fluxo.
//
// Desde a feature `74` a fusão dos três fios (`buildHistory`) mora em `@estrelinha/core/orders`
// (`history.ts`): o detalhe do app do ateliê conta a mesma história. Este arquivo a REEXPORTA por
// referência (`regrasDoPedidoNoCore.test.ts`, `toBe`).
//
// Os FILTROS por tipo ficam aqui: só o painel filtra o histórico (Out of Scope da `74`). O filtro é o
// que devolve a aba a quem a queria — sem obrigar quem quer a sequência a montá-la na cabeça.

import type { HistoryEvent, HistoryKind } from '@estrelinha/core/orders'

export { buildHistory, type HistoryEvent, type HistoryKind } from '@estrelinha/core/orders'

export const HISTORY_FILTERS: { id: HistoryKind | 'all'; label: string }[] = [
  { id: 'all', label: 'Tudo' },
  { id: 'status', label: 'Status' },
  { id: 'email', label: 'E-mails' },
  { id: 'note', label: 'Notas' },
]

export const filterHistory = (
  eventos: HistoryEvent[],
  filtro: HistoryKind | 'all',
): HistoryEvent[] => (filtro === 'all' ? eventos : eventos.filter(e => e.kind === filtro))
