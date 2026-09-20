import { describe, expect, it } from 'vitest'

import { NOTIFICATION_EVENTS } from '../events.ts'
import { type OrderSnapshot, preconditionFailure } from '../precondition.ts'

/**
 * NTF-03 — a pré-condição de cada um dos quinze eventos (spec, tabela "Eventos", coluna
 * "Pré-condição relida"). Um caso "passa" e um caso por motivo de recusa, por evento.
 *
 * A dona do e-mail: `ctx.ownerEmail`. Os casos de cliente passam `DONA` de propósito, para provar
 * que ela NÃO influencia evento nenhum fora dos `owner_*`.
 */

const DONA = { ownerEmail: 'adri@loja.umaestrelinha.com.br' }

/** Um pedido pago, sem material, com rastreio de saída — a forma mais "completa" possível. */
const pago = (extra: OrderSnapshot = {}): OrderSnapshot => ({
  status: 'pending',
  payment_status: 'approved',
  paid_at: '2026-09-06T12:00:00Z',
  mp_order_id: 'ORD-1',
  tracking_code: null,
  material_status: 'nao_aplicavel',
  material_tracking_code: null,
  ...extra,
})

describe('preconditionFailure — todo evento é decidido (nenhum cai fora do switch)', () => {
  it.each(NOTIFICATION_EVENTS)('%s devolve string ou null, nunca undefined', (event) => {
    const veredito = preconditionFailure(event, {}, {})
    expect(veredito === null || typeof veredito === 'string').toBe(true)
  })
})

describe('order_received — `payment_status = pending` ∧ `mp_order_id`', () => {
  it('passa com PIX gerado e pagamento pendente', () => {
    expect(preconditionFailure('order_received', pago({ payment_status: 'pending' }), DONA)).toBeNull()
  })
  it('recusa pedido que já não está pendente', () => {
    expect(preconditionFailure('order_received', pago({ payment_status: 'approved' }))).toBe('order_not_pending')
  })
  it('recusa pedido pendente sem order no MP', () => {
    expect(preconditionFailure('order_received', pago({ payment_status: 'pending', mp_order_id: null }))).toBe(
      'no_mp_order',
    )
  })
})

describe('order_paid — `paid_at` ∧ `material_status ≠ aguardando_material` (NTF-10)', () => {
  it('passa com pedido pago e sem material a esperar', () => {
    expect(preconditionFailure('order_paid', pago(), DONA)).toBeNull()
  })
  it('passa também com material já recebido — o que bloqueia é só o "aguardando"', () => {
    expect(preconditionFailure('order_paid', pago({ material_status: 'material_recebido' }))).toBeNull()
  })
  it('recusa pedido sem `paid_at`, mesmo com `status = paid`', () => {
    // A RPC `apply_payment_approval` nunca toca `orders.status`; `paid_at` é a verdade.
    expect(preconditionFailure('order_paid', pago({ paid_at: null, status: 'paid' }))).toBe('order_not_paid')
  })
  it('RECUSA `aguardando_material` — o e-mail certo é `material_instructions`', () => {
    expect(preconditionFailure('order_paid', pago({ material_status: 'aguardando_material' }))).toBe(
      'material_pending',
    )
  })
})

describe('material_instructions — `paid_at` ∧ `material_status = aguardando_material`', () => {
  it('passa com pedido pago à espera do material', () => {
    expect(preconditionFailure('material_instructions', pago({ material_status: 'aguardando_material' }))).toBeNull()
  })
  it('recusa pedido não pago', () => {
    expect(
      preconditionFailure('material_instructions', pago({ paid_at: null, material_status: 'aguardando_material' })),
    ).toBe('order_not_paid')
  })
  it('RECUSA `nao_aplicavel` — não há material a instruir', () => {
    expect(preconditionFailure('material_instructions', pago({ material_status: 'nao_aplicavel' }))).toBe(
      'material_not_pending',
    )
  })
  it('recusa material já enviado — a instrução chegaria depois do envelope', () => {
    expect(preconditionFailure('material_instructions', pago({ material_status: 'material_enviado' }))).toBe(
      'material_not_pending',
    )
  })
})

describe('payment_rejected — `payment_status = rejected`', () => {
  it('passa', () => {
    expect(preconditionFailure('payment_rejected', pago({ payment_status: 'rejected', paid_at: null }))).toBeNull()
  })
  it('recusa pagamento aprovado', () => {
    expect(preconditionFailure('payment_rejected', pago())).toBe('payment_not_rejected')
  })
})

describe('pix_expired — `payment_status = expired`', () => {
  it('passa', () => {
    expect(preconditionFailure('pix_expired', pago({ payment_status: 'expired', paid_at: null }))).toBeNull()
  })
  it('recusa PIX ainda pendente — o aviso sairia antes de vencer', () => {
    expect(preconditionFailure('pix_expired', pago({ payment_status: 'pending', paid_at: null }))).toBe(
      'payment_not_expired',
    )
  })
})

describe('order_cancelled — `status = cancelled`', () => {
  it('passa', () => {
    expect(preconditionFailure('order_cancelled', pago({ status: 'cancelled' }))).toBeNull()
  })
  it('recusa pedido em qualquer outro status', () => {
    expect(preconditionFailure('order_cancelled', pago({ status: 'shipped' }))).toBe('order_not_cancelled')
  })
})

describe('payment_refunded — `payment_status = refunded`', () => {
  it('passa', () => {
    expect(preconditionFailure('payment_refunded', pago({ payment_status: 'refunded' }))).toBeNull()
  })
  it('recusa pagamento só cancelado', () => {
    expect(preconditionFailure('payment_refunded', pago({ payment_status: 'cancelled' }))).toBe(
      'payment_not_refunded',
    )
  })
})

describe('material_tracking_registered — `material_enviado` ∧ `material_tracking_code`', () => {
  it('passa com o rastreio de ENTRADA preenchido', () => {
    expect(
      preconditionFailure(
        'material_tracking_registered',
        pago({ material_status: 'material_enviado', material_tracking_code: 'AA123456789BR' }),
      ),
    ).toBeNull()
  })
  it('recusa quando o material ainda não foi postado', () => {
    expect(
      preconditionFailure(
        'material_tracking_registered',
        pago({ material_status: 'aguardando_material', material_tracking_code: 'AA123456789BR' }),
      ),
    ).toBe('material_not_sent')
  })
  it('recusa `material_enviado` sem código — e espaço em branco não é código', () => {
    expect(
      preconditionFailure(
        'material_tracking_registered',
        pago({ material_status: 'material_enviado', material_tracking_code: '   ' }),
      ),
    ).toBe('no_material_tracking_code')
  })
  it('NÃO aceita o rastreio de SAÍDA no lugar do de entrada', () => {
    // `tracking_code` é o envelope da joia postada; aqui a pergunta é sobre o envelope que a
    // cliente mandou. Reusar um pelo outro é o defeito que `packages/core/CLAUDE.md` registra.
    expect(
      preconditionFailure(
        'material_tracking_registered',
        pago({ material_status: 'material_enviado', tracking_code: 'BB000000000BR', material_tracking_code: null }),
      ),
    ).toBe('no_material_tracking_code')
  })
})

describe('material_received — `material_status = material_recebido` (MAT-09)', () => {
  it('passa', () => {
    expect(preconditionFailure('material_received', pago({ material_status: 'material_recebido' }))).toBeNull()
  })
  it('recusa quem ainda não postou — "recebemos suas cinzas" para quem não mandou nada', () => {
    expect(preconditionFailure('material_received', pago({ material_status: 'material_enviado' }))).toBe(
      'material_not_received',
    )
  })
})

describe('in_production — `material_status = em_producao`', () => {
  it('passa', () => {
    expect(preconditionFailure('in_production', pago({ material_status: 'em_producao' }))).toBeNull()
  })
  it('recusa material só recebido', () => {
    expect(preconditionFailure('in_production', pago({ material_status: 'material_recebido' }))).toBe(
      'material_not_in_production',
    )
  })
})

describe('order_shipped — `status = shipped` ∧ `tracking_code` (o par, em qualquer ordem)', () => {
  it('passa com os dois lados do par', () => {
    expect(preconditionFailure('order_shipped', pago({ status: 'shipped', tracking_code: 'BB000000000BR' }))).toBeNull()
  })
  it('recusa `shipped` sem código — sai quando o rastreio for salvo', () => {
    expect(preconditionFailure('order_shipped', pago({ status: 'shipped', tracking_code: '' }))).toBe(
      'no_tracking_code',
    )
  })
  it('recusa código salvo antes de marcar enviado — sai quando o status mudar', () => {
    expect(preconditionFailure('order_shipped', pago({ status: 'processing', tracking_code: 'BB000000000BR' }))).toBe(
      'order_not_shipped',
    )
  })
})

describe('order_delivered — `status = delivered`', () => {
  it('passa', () => {
    expect(preconditionFailure('order_delivered', pago({ status: 'delivered' }))).toBeNull()
  })
  it('recusa pedido só postado', () => {
    expect(preconditionFailure('order_delivered', pago({ status: 'shipped' }))).toBe('order_not_delivered')
  })
})

describe('post_delivery_care — `status = delivered` (o "há ≥ N dias" é da rotina, P3)', () => {
  it('passa com pedido entregue', () => {
    expect(preconditionFailure('post_delivery_care', pago({ status: 'delivered' }))).toBeNull()
  })
  it('recusa pedido não entregue', () => {
    expect(preconditionFailure('post_delivery_care', pago({ status: 'shipped' }))).toBe('order_not_delivered')
  })
})

describe('owner_order_received — pedido aguardando pagamento, e alguém para avisar (AVD-05)', () => {
  it('passa com o pedido pendente e destinatário configurado', () => {
    expect(preconditionFailure('owner_order_received', { payment_status: 'pending' }, DONA)).toBeNull()
  })

  it('NÃO exige `mp_order_id`, diferente do evento da cliente', () => {
    // A cliente recebe um e-mail sobre o PIX que foi gerado; este diz apenas que entrou pedido.
    // Exigir o id da Mercado Pago acoplaria o aviso interno a um detalhe que ele não menciona — e o
    // par abaixo é o que prende essa diferença, porque ela é fácil de "consertar" por simetria.
    expect(preconditionFailure('owner_order_received', { payment_status: 'pending' }, DONA)).toBeNull()
    expect(preconditionFailure('order_received', { payment_status: 'pending' }, DONA)).toBe('no_mp_order')
  })

  it('recusa pedido que já saiu de pendente', () => {
    expect(preconditionFailure('owner_order_received', { payment_status: 'approved' }, DONA)).toBe(
      'order_not_pending',
    )
  })

  it('recusa com `no_owner_contact` sem destinatário', () => {
    expect(preconditionFailure('owner_order_received', { payment_status: 'pending' }, { ownerEmail: '' })).toBe(
      'no_owner_contact',
    )
    expect(preconditionFailure('owner_order_received', { payment_status: 'pending' })).toBe('no_owner_contact')
  })
})

describe('owner_payment_rejected — pagamento recusado, e alguém para avisar (AVD-05)', () => {
  it('passa com o pagamento recusado e destinatário configurado', () => {
    expect(preconditionFailure('owner_payment_rejected', { payment_status: 'rejected' }, DONA)).toBeNull()
  })

  it('recusa quando o pagamento NÃO foi recusado', () => {
    // O estado é a única coisa que separa este aviso de uma mentira: "a operadora recusou" sobre um
    // pedido aprovado é a loja dizendo a coisa errada para quem toma decisão a partir dela.
    expect(preconditionFailure('owner_payment_rejected', { payment_status: 'approved' }, DONA)).toBe(
      'payment_not_rejected',
    )
    expect(preconditionFailure('owner_payment_rejected', { payment_status: 'pending' }, DONA)).toBe(
      'payment_not_rejected',
    )
  })

  it('recusa com `no_owner_contact` sem destinatário', () => {
    expect(preconditionFailure('owner_payment_rejected', { payment_status: 'rejected' }, { ownerEmail: '  ' })).toBe(
      'no_owner_contact',
    )
    expect(preconditionFailure('owner_payment_rejected', { payment_status: 'rejected' })).toBe('no_owner_contact')
  })

  it('o ESTADO é conferido antes do destinatário — o motivo nomeia o defeito mais grave', () => {
    // Com os dois errados, o slug que vai para o log é o do estado: "não há para quem avisar" é
    // configuração faltando, e "o pagamento não foi recusado" é o chamador pedindo a coisa errada.
    expect(preconditionFailure('owner_payment_rejected', { payment_status: 'approved' }, { ownerEmail: '' })).toBe(
      'payment_not_rejected',
    )
  })
})

describe('owner_order_paid — `paid_at`, e alguém para avisar (NTF-15)', () => {
  it('passa com pedido pago e e-mail da loja configurado', () => {
    expect(preconditionFailure('owner_order_paid', pago(), DONA)).toBeNull()
  })
  it('passa mesmo com material a esperar — a dona é avisada nos dois ramos da bifurcação', () => {
    expect(preconditionFailure('owner_order_paid', pago({ material_status: 'aguardando_material' }), DONA)).toBeNull()
  })
  it('recusa pedido não pago', () => {
    expect(preconditionFailure('owner_order_paid', pago({ paid_at: null }), DONA)).toBe('order_not_paid')
  })
  it('recusa com `no_owner_contact` quando `general.email` está vazio, em branco ou ausente', () => {
    expect(preconditionFailure('owner_order_paid', pago(), { ownerEmail: '' })).toBe('no_owner_contact')
    expect(preconditionFailure('owner_order_paid', pago(), { ownerEmail: '   ' })).toBe('no_owner_contact')
    expect(preconditionFailure('owner_order_paid', pago())).toBe('no_owner_contact')
  })
})

describe('owner_material_incoming — `material_status = material_enviado`, e alguém para avisar', () => {
  it('passa', () => {
    expect(preconditionFailure('owner_material_incoming', pago({ material_status: 'material_enviado' }), DONA)).toBeNull()
  })
  it('recusa material ainda não postado', () => {
    expect(preconditionFailure('owner_material_incoming', pago({ material_status: 'aguardando_material' }), DONA)).toBe(
      'material_not_sent',
    )
  })
  it('recusa com `no_owner_contact` sem e-mail da loja', () => {
    expect(preconditionFailure('owner_material_incoming', pago({ material_status: 'material_enviado' }))).toBe(
      'no_owner_contact',
    )
  })
})

describe('o e-mail da dona não influencia evento nenhum da cliente', () => {
  it.each(NOTIFICATION_EVENTS.filter((e) => !e.startsWith('owner_')))('%s dá o mesmo veredito com e sem dona', (event) => {
    const pedido = pago({ status: 'shipped', tracking_code: 'X', material_status: 'material_recebido' })
    expect(preconditionFailure(event, pedido, DONA)).toBe(preconditionFailure(event, pedido, {}))
  })
})
