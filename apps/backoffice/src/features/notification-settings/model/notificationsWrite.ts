// Feature 53 (T05) — a ÚNICA função que constrói o valor gravado em `store_settings.notifications`
// (`ABN-13`). `useUpdateSettings` faz `upsert` substituindo o valor INTEIRO da chave — uma escrita
// que só carregasse o evento editado apagaria, em silêncio, a customização dos outros 14 na próxima
// leitura. Por isso esta função sempre itera `NOTIFICATION_EVENTS` inteiro, nunca um subconjunto.

import {
  NOTIFICATION_EVENTS,
  type EventChannelSettings,
  type EmailFields,
  type NotificationEvent,
  type NotificationSettings,
} from '@estrelinha/core/notifications'

/**
 * Reconstrói `NotificationSettings.events` a partir do estado RESOLVIDO dos 15 eventos (o que
 * `resolveAllEventSettings` devolve, com as edições da Adri já aplicadas por cima). `resolved`
 * precisa conter os 15 — quem chama (T06) sempre parte de `resolveAllEventSettings`, então um evento
 * "não tocado" ainda está lá, com o valor gravado/default, não ausente.
 *
 * `post_delivery_days` é PRESERVADO, nunca editado por esta feature: o campo não tem UI aqui (não
 * tem leitor — `BL-037`, o `pg_cron` que dispara `post_delivery_care` não existe ainda), e expor um
 * número que não faz nada prometeria uma funcionalidade que a loja não tem.
 */
export function buildNotificationsValue(
  resolved: Record<NotificationEvent, EventChannelSettings<EmailFields>>,
  postDeliveryDays: number,
): NotificationSettings {
  const events = {} as NotificationSettings['events']
  for (const event of NOTIFICATION_EVENTS) {
    events[event] = { email: resolved[event] }
  }
  return { events, post_delivery_days: postDeliveryDays }
}
