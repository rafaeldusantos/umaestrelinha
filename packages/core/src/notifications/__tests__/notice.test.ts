import { describe, expect, it } from 'vitest'

import { DEFAULT_NOTIFICATIONS } from '../defaults.ts'
import type { NotificationEvent } from '../events.ts'
import { customerNoticeFor, sentCustomerEvents } from '../notice.ts'
import type { NotificationSettings } from '../settings.ts'

/**
 * Feature 88 — a previsão "este gesto manda e-mail à cliente?" (`AVS-14`..`AVS-16`, `A-01` e os
 * edge cases da spec: sem e-mail, configurações ainda não lidas, retirada).
 *
 * Os padrões são os de `DEFAULT_NOTIFICATIONS`: `order_shipped` e `material_received` nascem LIGADOS;
 * `order_delivered`, `order_cancelled`, `in_production` e `material_tracking_registered`, desligados.
 */

const nada = new Set<NotificationEvent>()

/** Configurações com os eventos pedidos ligados ou desligados sobre os padrões. */
const config = (ligados: NotificationEvent[] = [], desligados: NotificationEvent[] = []): NotificationSettings => {
  const events = JSON.parse(JSON.stringify(DEFAULT_NOTIFICATIONS.events))
  for (const e of ligados) events[e].email.enabled = true
  for (const e of desligados) events[e].email.enabled = false
  return { events, post_delivery_days: 7 }
}

const pedido = (over: Record<string, unknown> = {}) => ({
  status: 'separating',
  payment_status: 'approved',
  paid_at: '2026-10-20T12:00:00Z',
  mp_order_id: 'ORD-1',
  tracking_code: null as string | null,
  material_status: 'nao_aplicavel',
  material_tracking_code: null as string | null,
  shipping_service_id: '1',
  customer_email: 'mariana@exemplo.invalid',
  ...over,
})

describe('order_status_changed → Enviado (AVS-15)', () => {
  it('sem rastreio, nada sai: o par TRG-12 ainda não fecha', () => {
    expect(customerNoticeFor('order_status_changed', pedido({ status: 'shipped' }), config(), nada)).toEqual({ send: [], alreadySent: [] })
  })

  it('com rastreio e "Pedido postado" ligado (padrão), sai `order_shipped`', () => {
    expect(customerNoticeFor('order_status_changed', pedido({ status: 'shipped', tracking_code: 'BR123' }), config(), nada)).toEqual({
      send: ['order_shipped'],
      alreadySent: [],
    })
  })

  it('o ajuste de um status já avisado (A-01): `order_shipped` já enviado vai para `alreadySent`, e nada sai', () => {
    const enviados = new Set<NotificationEvent>(['order_shipped'])
    expect(customerNoticeFor('order_status_changed', pedido({ status: 'shipped', tracking_code: 'BR123' }), config(), enviados)).toEqual({
      send: [],
      alreadySent: ['order_shipped'],
    })
  })

  it('"Pedido postado" desligado: nada sai, e nem conta como "já enviado"', () => {
    const enviados = new Set<NotificationEvent>(['order_shipped'])
    expect(
      customerNoticeFor('order_status_changed', pedido({ status: 'shipped', tracking_code: 'BR123' }), config([], ['order_shipped']), enviados),
    ).toEqual({ send: [], alreadySent: [] })
  })
})

describe('order_status_changed → outros status', () => {
  it('Entregue com o evento desligado (padrão): nada', () => {
    expect(customerNoticeFor('order_status_changed', pedido({ status: 'delivered' }), config(), nada)).toEqual({ send: [], alreadySent: [] })
  })

  it('Entregue com o evento ligado: `order_delivered`', () => {
    expect(customerNoticeFor('order_status_changed', pedido({ status: 'delivered' }), config(['order_delivered']), nada).send).toEqual([
      'order_delivered',
    ])
  })

  it('Cancelado desligado (padrão): nada; ligado: `order_cancelled`', () => {
    expect(customerNoticeFor('order_status_changed', pedido({ status: 'cancelled' }), config(), nada).send).toEqual([])
    expect(customerNoticeFor('order_status_changed', pedido({ status: 'cancelled' }), config(['order_cancelled']), nada).send).toEqual([
      'order_cancelled',
    ])
  })

  it('voltar o status (Enviado → Em separação) não avisa ninguém', () => {
    expect(customerNoticeFor('order_status_changed', pedido({ status: 'separating', tracking_code: 'BR123' }), config(), nada)).toEqual({
      send: [],
      alreadySent: [],
    })
  })
})

describe('retirada no escritório (AVS-16)', () => {
  it('"Enviado" num pedido de retirada: `orderStateFailure` recusa `order_shipped`, e nada sai', () => {
    expect(
      customerNoticeFor('order_status_changed', pedido({ status: 'shipped', tracking_code: 'BR123', shipping_service_id: 'retirada' }), config(), nada),
    ).toEqual({ send: [], alreadySent: [] })
  })

  it('"Entregue" num pedido de retirada segue a regra de sempre (ligado ⇒ sai)', () => {
    expect(
      customerNoticeFor('order_status_changed', pedido({ status: 'delivered', shipping_service_id: 'retirada' }), config(['order_delivered']), nada).send,
    ).toEqual(['order_delivered'])
  })
})

describe('material', () => {
  it('material recebido (ligado por padrão): `material_received`', () => {
    expect(customerNoticeFor('material_status_changed', pedido({ material_status: 'material_recebido' }), config(), nada).send).toEqual([
      'material_received',
    ])
  })

  it('em produção: desligado por padrão ⇒ nada; ligado ⇒ `in_production`', () => {
    expect(customerNoticeFor('material_status_changed', pedido({ material_status: 'em_producao' }), config(), nada).send).toEqual([])
    expect(customerNoticeFor('material_status_changed', pedido({ material_status: 'em_producao' }), config(['in_production']), nada).send).toEqual([
      'in_production',
    ])
  })

  it('o código do envelope: só o e-mail da cliente entra; o aviso da dona (`owner_material_incoming`) NUNCA, mesmo ligado', () => {
    const p = pedido({ material_status: 'material_enviado', material_tracking_code: 'AA123BR' })
    expect(customerNoticeFor('material_tracking_set', p, config(['material_tracking_registered', 'owner_material_incoming']), nada)).toEqual({
      send: ['material_tracking_registered'],
      alreadySent: [],
    })
    // Com o e-mail da cliente desligado (padrão), nada pergunta — o da dona não conta.
    expect(customerNoticeFor('material_tracking_set', p, config(['owner_material_incoming']), nada)).toEqual({ send: [], alreadySent: [] })
  })

  it('o pagamento aprovado produz `order_paid` e `owner_order_paid`: só o da cliente entra', () => {
    expect(customerNoticeFor('payment_approved', pedido(), config(), nada).send).toEqual(['order_paid'])
  })
})

describe('edge cases da spec', () => {
  it.each([null, undefined, '', '   '])('sem e-mail da cliente (%j): nada sai e nada conta como já enviado', (email) => {
    const enviados = new Set<NotificationEvent>(['order_shipped'])
    expect(
      customerNoticeFor('order_status_changed', pedido({ status: 'shipped', tracking_code: 'BR123', customer_email: email }), config(), enviados),
    ).toEqual({ send: [], alreadySent: [] })
  })

  it.each([null, undefined])('configurações ainda não lidas (%j) caem nos padrões — nunca em "nenhum e-mail"', (settings) => {
    expect(customerNoticeFor('order_status_changed', pedido({ status: 'shipped', tracking_code: 'BR123' }), settings, nada).send).toEqual([
      'order_shipped',
    ])
    expect(customerNoticeFor('order_status_changed', pedido({ status: 'delivered' }), settings, nada).send).toEqual([])
  })
})

describe('sentCustomerEvents', () => {
  it('conta só e-mail `sent` de evento da cliente', () => {
    const r = sentCustomerEvents([
      { event: 'order_shipped', channel: 'email', status: 'sent' },
      { event: 'material_received', channel: 'email', status: 'skipped' },
      { event: 'order_delivered', channel: 'email', status: 'failed' },
      { event: 'order_cancelled', channel: 'email', status: 'pending' },
      { event: 'owner_order_paid', channel: 'push', status: 'sent' },
      { event: 'owner_material_incoming', channel: 'email', status: 'sent' },
      { event: 'in_production', channel: 'whatsapp', status: 'sent' },
      { event: 'evento_que_nao_existe', channel: 'email', status: 'sent' },
    ])
    expect([...r]).toEqual(['order_shipped'])
  })

  it('a saída alimenta a previsão: `skipped` NÃO conta como já enviado, então o e-mail pulado é perguntado de novo', () => {
    const enviados = sentCustomerEvents([{ event: 'order_shipped', channel: 'email', status: 'skipped' }])
    expect(customerNoticeFor('order_status_changed', pedido({ status: 'shipped', tracking_code: 'BR123' }), config(), enviados)).toEqual({
      send: ['order_shipped'],
      alreadySent: [],
    })
  })
})
