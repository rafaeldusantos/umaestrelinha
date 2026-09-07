// Feature 42 — a forma de `store_settings.notifications`, e a leitura com recuo para o default.
//
// Os tipos moram aqui e são REEXPORTADOS por `@estrelinha/supabase/types/settings` (molde de
// `MenuPromo`, feature 33): quem usa a forma é a regra — o motor da edge function, que roda em Deno
// e só alcança este pacote por caminho relativo com `.ts` —, e o pacote de tipos apenas descreve a
// coluna. Declarar lá e importar aqui tornaria este módulo inalcançável pela function.

import type { NotificationEvent } from './events.ts'
import { NOTIFICATION_EVENTS } from './events.ts'
import { DEFAULT_NOTIFICATIONS } from './defaults.ts'

/** Os canais que a tabela `order_notifications` aceita. O WhatsApp é a feature 43. */
export const NOTIFICATION_CHANNELS = ['email', 'whatsapp'] as const
export type NotificationChannel = (typeof NOTIFICATION_CHANNELS)[number]

export const isNotificationChannel = (value: unknown): value is NotificationChannel =>
  typeof value === 'string' && (NOTIFICATION_CHANNELS as readonly string[]).includes(value)

/**
 * O que a dona edita num e-mail (`PNL-02`): redação, não estrutura. Itens, totais, endereço,
 * rastreio, casca e o DESTINO do CTA são código com um dono (`render/layout.ts`).
 */
export interface EmailFields {
  subject: string
  heading: string
  lead: string
  /** ≤ 5 linhas, ≤ 160 caracteres cada — a versão texto e o "Status: …" de hoje. */
  extra: string[]
  /** O rótulo do botão. O destino é sempre `{{link_conta}}` e não é editável. */
  cta_label: string
}

export interface EventChannelSettings<F> {
  enabled: boolean
  fields: F
}

/** Por evento, um bloco por canal. O `whatsapp` entra aqui na feature 43. */
export interface NotificationEventSettings {
  email: EventChannelSettings<EmailFields>
}

export interface NotificationSettings {
  events: Record<NotificationEvent, NotificationEventSettings>
  /** P3 — dias depois de `delivered` para `post_delivery_care` ficar elegível. */
  post_delivery_days: number
}

/**
 * O bloco de UM canal de UM evento, com recuo para o default campo a campo.
 *
 * Aceita `undefined`/`null`/parcial porque o banco pode ser anterior à migration (edge case da
 * spec: "nunca deixar de enviar os quatro que já saem") ou ter sido gravado por uma versão do
 * painel que não conhecia um campo novo. O merge é raso dentro de `fields`: o que a dona escreveu
 * vence, o que ela nunca viu vem do default.
 */
export function resolveEventSettings(
  settings: Partial<NotificationSettings> | null | undefined,
  event: NotificationEvent,
  channel: 'email',
): EventChannelSettings<EmailFields> {
  const padrao = DEFAULT_NOTIFICATIONS.events[event][channel]
  const gravado = settings?.events?.[event]?.[channel]
  if (!gravado) return { enabled: padrao.enabled, fields: { ...padrao.fields, extra: [...padrao.fields.extra] } }
  return {
    enabled: typeof gravado.enabled === 'boolean' ? gravado.enabled : padrao.enabled,
    fields: { ...padrao.fields, ...(gravado.fields ?? {}) },
  }
}

/** Todos os eventos resolvidos — o que a aba do painel lista, na ordem da jornada. */
export function resolveAllEventSettings(
  settings: Partial<NotificationSettings> | null | undefined,
  channel: 'email',
): Record<NotificationEvent, EventChannelSettings<EmailFields>> {
  const saida = {} as Record<NotificationEvent, EventChannelSettings<EmailFields>>
  for (const event of NOTIFICATION_EVENTS) saida[event] = resolveEventSettings(settings, event, channel)
  return saida
}
