import { describe, expect, it } from 'vitest'
import {
  DEFAULT_NOTIFICATIONS,
  NOTIFICATION_EVENTS,
  type EmailFields,
  type EventChannelSettings,
  type NotificationEvent,
} from '@estrelinha/core/notifications'

import { buildNotificationsValue } from '../notificationsWrite'

/** Um `resolved` de FAZ-DE-CONTA — cada evento com um `subject` que não é o default, para que o
 * teste consiga distinguir "veio de `resolved`" de "veio de `DEFAULT_NOTIFICATIONS` por engano". */
function fakeResolved(): Record<NotificationEvent, EventChannelSettings<EmailFields>> {
  const saida = {} as Record<NotificationEvent, EventChannelSettings<EmailFields>>
  for (const event of NOTIFICATION_EVENTS) {
    saida[event] = {
      enabled: true,
      fields: {
        subject: `assunto-fake-${event}`,
        heading: 'Título fake',
        lead: 'Texto fake.',
        extra: ['Linha fake'],
        cta_label: 'Abrir',
      },
    }
  }
  return saida
}

describe('buildNotificationsValue — ABN-13, a escrita sempre com os 17', () => {
  it('o objeto construído tem as 17 chaves de events, sempre', () => {
    const construido = buildNotificationsValue(fakeResolved(), 7)
    expect(Object.keys(construido.events)).toHaveLength(17)
    for (const event of NOTIFICATION_EVENTS) expect(construido.events[event]).toBeDefined()
  })

  it('mesmo quando `resolved` só reflete a edição de 1 evento, as 17 chaves saem completas', () => {
    const resolved = fakeResolved()
    resolved.pix_expired = { enabled: false, fields: { ...resolved.pix_expired.fields, subject: 'PIX expirado — editado' } }

    const construido = buildNotificationsValue(resolved, 7)
    expect(Object.keys(construido.events)).toHaveLength(17)
  })

  it('SENSOR — os outros 14 saem com o valor de `resolved`, não de DEFAULT_NOTIFICATIONS por engano', () => {
    const resolved = fakeResolved()
    resolved.pix_expired = {
      enabled: false,
      fields: { ...resolved.pix_expired.fields, subject: 'PIX expirado — editado' },
    }

    const construido = buildNotificationsValue(resolved, 7)

    for (const event of NOTIFICATION_EVENTS) {
      if (event === 'pix_expired') continue
      // Se a função tivesse reconstruído a partir do DEFAULT em vez do `resolved`, o subject seria o
      // do default (ex.: "Pedido {{numero_pedido}} recebido — aguardando o PIX" para order_received)
      // em vez do fake — este assert reprovaria.
      expect(construido.events[event].email.fields.subject).toBe(`assunto-fake-${event}`)
      expect(construido.events[event].email.fields.subject).not.toBe(
        DEFAULT_NOTIFICATIONS.events[event].email.fields.subject,
      )
    }
    // O evento editado carrega a edição.
    expect(construido.events.pix_expired.email.enabled).toBe(false)
    expect(construido.events.pix_expired.email.fields.subject).toBe('PIX expirado — editado')
  })

  it('cada evento vira { email: resolved[event] } — o formato de NotificationEventSettings', () => {
    const resolved = fakeResolved()
    const construido = buildNotificationsValue(resolved, 7)
    for (const event of NOTIFICATION_EVENTS) {
      expect(construido.events[event]).toEqual({ email: resolved[event] })
    }
  })

  it('post_delivery_days de entrada == de saída, byte a byte', () => {
    expect(buildNotificationsValue(fakeResolved(), 0).post_delivery_days).toBe(0)
    expect(buildNotificationsValue(fakeResolved(), 30).post_delivery_days).toBe(30)
    expect(buildNotificationsValue(fakeResolved(), DEFAULT_NOTIFICATIONS.post_delivery_days).post_delivery_days).toBe(
      DEFAULT_NOTIFICATIONS.post_delivery_days,
    )
  })
})
