import { describe, expect, it } from 'vitest'

import {
  EVENT_AUDIENCE,
  MATERIAL_EVENTS,
  MATERIAL_INSTRUCTIONS_EVENT,
  NOTIFICATION_EVENTS,
  NOTIFICATION_EVENT_LABELS,
  isMaterialEvent,
  isNotificationEvent,
} from '../events.ts'

/**
 * NTF-03 / FIX-02 — o vocabulário tem UM dono e está completo.
 *
 * O `Record<NotificationEvent, string>` já fecha o D2 em `tsc`; os casos abaixo guardam o que o
 * compilador não vê — a ORDEM da jornada (que é a ordem da aba do painel), o texto dos rótulos que
 * o histórico já exibia, e o tom.
 */

describe('NOTIFICATION_EVENTS — os quinze, na ordem da jornada (spec, tabela de eventos)', () => {
  it('são exatamente os quinze da spec, nesta ordem', () => {
    expect([...NOTIFICATION_EVENTS]).toEqual([
      'order_received',
      'order_paid',
      'material_instructions',
      'payment_rejected',
      'pix_expired',
      'order_cancelled',
      'payment_refunded',
      'material_tracking_registered',
      'material_received',
      'in_production',
      'order_shipped',
      'order_delivered',
      'post_delivery_care',
      'owner_order_paid',
      'owner_material_incoming',
    ])
  })

  it('nenhum evento se repete', () => {
    expect(new Set(NOTIFICATION_EVENTS).size).toBe(NOTIFICATION_EVENTS.length)
  })

  it('`isNotificationEvent` aceita cada um e recusa o que está fora (o handler valida antes do banco)', () => {
    for (const event of NOTIFICATION_EVENTS) expect(isNotificationEvent(event)).toBe(true)
    // Os dois fantasmas do D2: nunca existiram no `check`, e caíam no fallback do histórico.
    expect(isNotificationEvent('order_confirmed')).toBe(false)
    expect(isNotificationEvent('payment_approved')).toBe(false)
    expect(isNotificationEvent('')).toBe(false)
    expect(isNotificationEvent(null)).toBe(false)
    expect(isNotificationEvent(42)).toBe(false)
  })
})

describe('NOTIFICATION_EVENT_LABELS — cada evento tem rótulo (FIX-02, AC 2)', () => {
  it('cobre os quinze, sem chave sobrando', () => {
    expect(Object.keys(NOTIFICATION_EVENT_LABELS).sort()).toEqual([...NOTIFICATION_EVENTS].sort())
  })

  it('os dois rótulos que o backoffice já exibia mantêm o texto', () => {
    expect(NOTIFICATION_EVENT_LABELS.order_shipped).toBe('Aviso de postagem enviado')
    expect(NOTIFICATION_EVENT_LABELS.material_received).toBe('Aviso de material recebido enviado')
  })

  it('os dois que caíam no fallback ganham o rótulo da spec', () => {
    expect(NOTIFICATION_EVENT_LABELS.order_received).toBe('Confirmação do pedido enviada')
    expect(NOTIFICATION_EVENT_LABELS.order_paid).toBe('Aviso de pagamento aprovado enviado')
  })

  it('nenhum rótulo é vazio, nenhum leva exclamação, e nenhum repete outro', () => {
    const rotulos = Object.values(NOTIFICATION_EVENT_LABELS)
    for (const rotulo of rotulos) {
      expect(rotulo.trim().length).toBeGreaterThan(0)
      expect(rotulo).not.toContain('!')
    }
    expect(new Set(rotulos).size).toBe(rotulos.length)
  })
})

describe('EVENT_AUDIENCE — quem recebe (spec, coluna Destinatário)', () => {
  it('cobre os quinze', () => {
    expect(Object.keys(EVENT_AUDIENCE).sort()).toEqual([...NOTIFICATION_EVENTS].sort())
  })

  it('só os dois `owner_*` vão para a dona; os outros treze vão para a cliente', () => {
    const daDona = NOTIFICATION_EVENTS.filter((e) => EVENT_AUDIENCE[e] === 'owner')
    expect(daDona).toEqual(['owner_order_paid', 'owner_material_incoming'])
    const daCliente = NOTIFICATION_EVENTS.filter((e) => EVENT_AUDIENCE[e] === 'customer')
    expect(daCliente).toHaveLength(13)
  })
})

describe('MATERIAL_EVENTS — os que proíbem exclamação (spec, AC 4 dos eventos)', () => {
  it('são exatamente os quatro da AC', () => {
    expect([...MATERIAL_EVENTS]).toEqual([
      'material_instructions',
      'material_tracking_registered',
      'material_received',
      'in_production',
    ])
  })

  it('todo evento de material é da cliente — o aviso à dona sobre material fica fora', () => {
    for (const event of MATERIAL_EVENTS) expect(EVENT_AUDIENCE[event]).toBe('customer')
    expect(isMaterialEvent('owner_material_incoming')).toBe(false)
    expect(isMaterialEvent('material_received')).toBe(true)
    expect(isMaterialEvent('order_paid')).toBe(false)
  })
})

describe('MATERIAL_INSTRUCTIONS_EVENT — o único evento com {{endereco_atelie}} (feature 53, ABN-08)', () => {
  it('é `material_instructions`, e é ele mesmo um dos quinze', () => {
    expect(MATERIAL_INSTRUCTIONS_EVENT).toBe('material_instructions')
    expect(NOTIFICATION_EVENTS).toContain(MATERIAL_INSTRUCTIONS_EVENT)
  })

  it('é evento de material — o gate de endereço da aba de Notificações se apoia nisso', () => {
    expect(isMaterialEvent(MATERIAL_INSTRUCTIONS_EVENT)).toBe(true)
  })
})
