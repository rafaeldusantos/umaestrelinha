// Feature 53 (T03) — as três seções da aba Notificações, DERIVADAS de dados que já existem em
// `core` (`ABN-01`). Nunca uma lista nova: o "defeito 01" deste projeto é exatamente uma segunda
// classificação divergindo da primeira sem quebrar nada.
//
// A régua (spec, AC 1 da história): audiência `owner` → "Avisos para você"; senão
// `isMaterialEvent(event)` → "Material"; o resto → "Pedido e pagamento". Hoje os dois grupos nunca
// se sobrepõem (nenhum evento de `MATERIAL_EVENTS` tem audiência `owner`), mas a ORDEM da checagem
// segue a da spec — owner primeiro — para não depender desse fato implícito continuar verdadeiro.

import {
  EVENT_AUDIENCE,
  isMaterialEvent,
  NOTIFICATION_EVENTS,
  type NotificationEvent,
} from '@estrelinha/core/notifications'

export type NotificationSection = 'customer' | 'material' | 'owner'

export const SECTION_LABELS: Record<NotificationSection, string> = {
  customer: 'Pedido e pagamento',
  material: 'Material',
  owner: 'Avisos para você',
}

/** As três seções, na ordem em que aparecem na aba. */
export const NOTIFICATION_SECTIONS: readonly NotificationSection[] = ['customer', 'material', 'owner']

export function sectionFor(event: NotificationEvent): NotificationSection {
  if (EVENT_AUDIENCE[event] === 'owner') return 'owner'
  if (isMaterialEvent(event)) return 'material'
  return 'customer'
}

/**
 * Os 15 eventos, agrupados nas três seções — cada evento em EXATAMENTE uma (`ABN-01`). A ordem
 * dentro de cada balde é a de `NOTIFICATION_EVENTS`, porque `NOTIFICATION_EVENTS` é iterado uma
 * única vez e cada evento é empurrado no balde da sua seção, na ordem em que chegou.
 */
export function groupedEvents(): Record<NotificationSection, NotificationEvent[]> {
  const saida: Record<NotificationSection, NotificationEvent[]> = {
    customer: [],
    material: [],
    owner: [],
  }
  for (const event of NOTIFICATION_EVENTS) {
    saida[sectionFor(event)].push(event)
  }
  return saida
}
