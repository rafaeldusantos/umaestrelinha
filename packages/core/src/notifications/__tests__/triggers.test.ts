import { describe, expect, it } from 'vitest'

import { EVENT_AUDIENCE } from '../events.ts'
import {
  CUSTOMER_TRIGGERS,
  NOTIFICATION_TRIGGERS,
  eventsForTrigger,
  isNotificationTrigger,
} from '../triggers.ts'

/**
 * `AD-032` — quem dispara nomeia o gatilho; `core` deriva os eventos. Um caso por gatilho × estado
 * relevante, com a bifurcação da aprovação nos DOIS sentidos (NTF-10) e os gatilhos do webhook
 * (NTF-11), do status (NTF-12, NTF-14), do material (NTF-13) e da dona (NTF-15).
 */

describe('os oito gatilhos', () => {
  it('são os oito do design, e `isNotificationTrigger` recusa o resto', () => {
    expect([...NOTIFICATION_TRIGGERS]).toEqual([
      'pix_created',
      'payment_approved',
      'payment_rejected',
      'payment_expired',
      'payment_refunded',
      'order_status_changed',
      'material_status_changed',
      'material_tracking_set',
    ])
    for (const t of NOTIFICATION_TRIGGERS) expect(isNotificationTrigger(t)).toBe(true)
    // Um EVENTO não é um gatilho: a porta `trigger` responde 400 a `order_paid`.
    expect(isNotificationTrigger('order_paid')).toBe(false)
    expect(isNotificationTrigger(undefined)).toBe(false)
  })
})

describe('pix_created (create-payment com QR)', () => {
  it('→ `order_received` para a cliente e `owner_order_received` para a dona, NESTA ordem', () => {
    // A ordem é regra, não estética (feature 42, cabeçalho de `eventsForTrigger`): o orçamento de
    // tempo do caixa é compartilhado, e se um dos dois não couber, quem espera é o aviso interno.
    // Uma asserção de conteúdo (`toContain` nos dois) seria verdadeira com a ordem invertida.
    expect(eventsForTrigger('pix_created', { payment_status: 'pending', mp_order_id: 'x' })).toEqual([
      'order_received',
      'owner_order_received',
    ])
  })
})

describe('payment_approved — a bifurcação (NTF-10, AC 1)', () => {
  it('com `aguardando_material` → `material_instructions` e o aviso à dona, e NÃO `order_paid`', () => {
    const eventos = eventsForTrigger('payment_approved', { paid_at: 'x', material_status: 'aguardando_material' })
    expect(eventos).toEqual(['material_instructions', 'owner_order_paid'])
    expect(eventos).not.toContain('order_paid')
  })

  it('com `nao_aplicavel` → `order_paid` e o aviso à dona, e NÃO `material_instructions`', () => {
    const eventos = eventsForTrigger('payment_approved', { paid_at: 'x', material_status: 'nao_aplicavel' })
    expect(eventos).toEqual(['order_paid', 'owner_order_paid'])
    expect(eventos).not.toContain('material_instructions')
  })

  it('material já recebido também cai em `order_paid` — só o "aguardando" bifurca', () => {
    expect(eventsForTrigger('payment_approved', { paid_at: 'x', material_status: 'material_recebido' })).toEqual([
      'order_paid',
      'owner_order_paid',
    ])
  })

  it('a cliente vem ANTES da dona — ordem de envio quando o orçamento do caixa é compartilhado', () => {
    const eventos = eventsForTrigger('payment_approved', { paid_at: 'x', material_status: 'nao_aplicavel' })
    expect(EVENT_AUDIENCE[eventos[0]]).toBe('customer')
    expect(EVENT_AUDIENCE[eventos[1]]).toBe('owner')
  })
})

describe('os gatilhos do webhook (NTF-11) — um evento cada', () => {
  it('payment_expired → `pix_expired`', () => {
    expect(eventsForTrigger('payment_expired', { payment_status: 'expired' })).toEqual(['pix_expired'])
  })
  it('payment_rejected → o da cliente e o da dona, nesta ordem', () => {
    expect(eventsForTrigger('payment_rejected', { payment_status: 'rejected' })).toEqual([
      'payment_rejected',
      'owner_payment_rejected',
    ])
  })
  it('payment_refunded → `payment_refunded`', () => {
    expect(eventsForTrigger('payment_refunded', { payment_status: 'refunded' })).toEqual(['payment_refunded'])
  })
})

describe('order_status_changed — por `status` (NTF-12, NTF-14)', () => {
  it('cancelled → `order_cancelled`', () => {
    expect(eventsForTrigger('order_status_changed', { status: 'cancelled' })).toEqual(['order_cancelled'])
  })
  it('shipped → `order_shipped` (o par com o rastreio é decidido pela pré-condição, não aqui)', () => {
    expect(eventsForTrigger('order_status_changed', { status: 'shipped', tracking_code: null })).toEqual([
      'order_shipped',
    ])
  })
  it('delivered → `order_delivered`', () => {
    expect(eventsForTrigger('order_status_changed', { status: 'delivered' })).toEqual(['order_delivered'])
  })
  it('processing, pending ou desconhecido → nada', () => {
    expect(eventsForTrigger('order_status_changed', { status: 'processing' })).toEqual([])
    expect(eventsForTrigger('order_status_changed', { status: 'pending' })).toEqual([])
    expect(eventsForTrigger('order_status_changed', {})).toEqual([])
  })
})

describe('material_status_changed — por `material_status` (NTF-13, NTF-14)', () => {
  it('material_recebido → `material_received`', () => {
    expect(eventsForTrigger('material_status_changed', { material_status: 'material_recebido' })).toEqual([
      'material_received',
    ])
  })
  it('em_producao → `in_production`', () => {
    expect(eventsForTrigger('material_status_changed', { material_status: 'em_producao' })).toEqual([
      'in_production',
    ])
  })
  it('material_enviado → nada por aqui: o rastreio é o fato completo, e ele tem gatilho próprio', () => {
    expect(eventsForTrigger('material_status_changed', { material_status: 'material_enviado' })).toEqual([])
  })
  it('aguardando_material e nao_aplicavel → nada', () => {
    expect(eventsForTrigger('material_status_changed', { material_status: 'aguardando_material' })).toEqual([])
    expect(eventsForTrigger('material_status_changed', { material_status: 'nao_aplicavel' })).toEqual([])
  })
})

describe('material_tracking_set — o par cliente + dona (NTF-13, AC 3)', () => {
  it('→ `material_tracking_registered` para ela e `owner_material_incoming` para a dona, nesta ordem', () => {
    expect(
      eventsForTrigger('material_tracking_set', { material_status: 'material_enviado', material_tracking_code: 'AA1' }),
    ).toEqual(['material_tracking_registered', 'owner_material_incoming'])
  })
})

describe('CUSTOMER_TRIGGERS — o que a porta `notify` aceita da cliente', () => {
  it('contém só `material_tracking_set`, e tem tamanho 1', () => {
    expect([...CUSTOMER_TRIGGERS]).toEqual(['material_tracking_set'])
    expect(CUSTOMER_TRIGGERS).toHaveLength(1)
  })

  it('todo gatilho de cliente é um gatilho válido', () => {
    for (const t of CUSTOMER_TRIGGERS) expect(isNotificationTrigger(t)).toBe(true)
  })
})

describe('todo gatilho devolve lista — nunca undefined', () => {
  it.each(NOTIFICATION_TRIGGERS)('%s', (trigger) => {
    expect(Array.isArray(eventsForTrigger(trigger, {}))).toBe(true)
  })
})
