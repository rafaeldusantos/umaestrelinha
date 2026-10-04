// `SIT-01` … `SIT-10` e `SIT-12` — "em que pé está este pedido?", num rótulo só.
//
// O defeito que abriu a feature `59`: a conta conhecia 5 status, o banco tem 6, e pagar não muda
// `orders.status` — só `payment_status`. Um pedido pago aparecia "Pendente". A régua abaixo junta
// pedido, pagamento e material, e **a primeira regra que casar vence**, na ordem da spec.

import { describe, expect, it } from 'vitest'

import {
  SITUATION_LABELS,
  SITUATION_TONES,
  formatShortDate,
  orderSituation,
  situationDetail,
  type SituationKey,
} from '../situation'

const base = { status: 'pending', payment_status: 'pending', material_status: 'nao_aplicavel' }

describe('orderSituation — uma regra por caso, na ordem da spec', () => {
  it('SIT-01 — cancelado', () => {
    expect(orderSituation({ ...base, status: 'cancelled' }).label).toBe('Cancelado')
  })

  it('SIT-02 — entregue', () => {
    expect(orderSituation({ ...base, status: 'delivered', payment_status: 'approved' }).label).toBe(
      'Entregue',
    )
  })

  it('SIT-03 — enviado é "A caminho"', () => {
    expect(orderSituation({ ...base, status: 'shipped', payment_status: 'approved' }).label).toBe(
      'A caminho',
    )
  })

  it('SIT-04 — reembolsado', () => {
    expect(orderSituation({ ...base, payment_status: 'refunded' }).label).toBe('Reembolsado')
  })

  it('SIT-05 — pago com material ainda por chegar', () => {
    for (const material_status of ['aguardando_material', 'material_enviado']) {
      expect(
        orderSituation({ ...base, payment_status: 'approved', material_status }).label,
      ).toBe('Aguardando seu material')
    }
  })

  it('SIT-06 — pago, em qualquer status anterior ao envio, é "Em produção"', () => {
    // O caso do print de produção: pago, `status` ainda `pending`. Era escrito "Pendente".
    for (const status of ['pending', 'paid', 'separating']) {
      expect(orderSituation({ ...base, status, payment_status: 'approved' }).label).toBe(
        'Em produção',
      )
    }
  })

  it('SIT-06 — material já recebido ou em produção também é "Em produção"', () => {
    for (const material_status of ['material_recebido', 'em_producao']) {
      expect(
        orderSituation({ ...base, payment_status: 'approved', material_status }).label,
      ).toBe('Em produção')
    }
  })

  it('SIT-07 — PIX expirado', () => {
    expect(orderSituation({ ...base, payment_status: 'expired' }).label).toBe('PIX expirado')
  })

  it('SIT-08 — pagamento recusado', () => {
    expect(orderSituation({ ...base, payment_status: 'rejected' }).label).toBe('Pagamento recusado')
  })

  it('SIT-09 — nada casou: aguardando pagamento', () => {
    expect(orderSituation(base).label).toBe('Aguardando pagamento')
    // `payment_status = 'cancelled'` existe no vocabulário do banco e nenhuma regra o nomeia.
    expect(orderSituation({ ...base, payment_status: 'cancelled' }).label).toBe(
      'Aguardando pagamento',
    )
  })

  it('Independent Test — aprovado, `status = pending`, sem material: "Em produção"', () => {
    expect(
      orderSituation({ status: 'pending', payment_status: 'approved', material_status: null }).key,
    ).toBe('in_production')
  })
})

describe('orderSituation — a ordem entre regras que competem', () => {
  it('cancelado vence pagamento aprovado', () => {
    expect(orderSituation({ ...base, status: 'cancelled', payment_status: 'approved' }).key).toBe(
      'cancelled',
    )
  })

  it('cancelado vence reembolsado', () => {
    expect(orderSituation({ ...base, status: 'cancelled', payment_status: 'refunded' }).key).toBe(
      'cancelled',
    )
  })

  it('enviado vem antes de reembolsado — o pacote já saiu', () => {
    expect(orderSituation({ ...base, status: 'shipped', payment_status: 'refunded' }).key).toBe(
      'shipped',
    )
  })

  it('reembolsado vence "aguardando seu material"', () => {
    expect(
      orderSituation({
        ...base,
        payment_status: 'refunded',
        material_status: 'aguardando_material',
      }).key,
    ).toBe('refunded')
  })

  it('material pendente só conta com pagamento aprovado', () => {
    // Sem pagamento, a pendência é o pagamento — pedir o material antes seria pedir a cliente que
    // mande cinzas para um pedido que talvez nunca seja pago.
    expect(
      orderSituation({ ...base, payment_status: 'pending', material_status: 'aguardando_material' })
        .key,
    ).toBe('awaiting_payment')
  })

  it('entregue vence material pendente', () => {
    expect(
      orderSituation({
        status: 'delivered',
        payment_status: 'approved',
        material_status: 'aguardando_material',
      }).key,
    ).toBe('delivered')
  })
})

describe('orderSituation — fora do vocabulário (SIT-10)', () => {
  it('status desconhecido cai em "Aguardando pagamento", sem lançar', () => {
    expect(orderSituation({ ...base, status: 'arquivado', payment_status: 'approved' }).label).toBe(
      'Aguardando pagamento',
    )
  })

  it('payment_status desconhecido cai em "Aguardando pagamento", sem lançar', () => {
    expect(orderSituation({ ...base, payment_status: 'in_process' }).label).toBe(
      'Aguardando pagamento',
    )
  })

  it('valor que não é string não derruba a tela', () => {
    // `strictNullChecks: false`: uma coluna mal lida chega como `undefined` sem aviso.
    expect(
      orderSituation({ status: 42 as unknown as string, payment_status: undefined }).label,
    ).toBe('Aguardando pagamento')
    expect(orderSituation(null as never).label).toBe('Aguardando pagamento')
  })
})

describe('rótulos e tons — um dono só', () => {
  const chaves: SituationKey[] = [
    'cancelled',
    'delivered',
    'shipped',
    'refunded',
    'awaiting_material',
    'in_production',
    'pix_expired',
    'payment_rejected',
    'awaiting_payment',
  ]

  it('os nove rótulos são os literais da spec', () => {
    expect(SITUATION_LABELS).toEqual({
      cancelled: 'Cancelado',
      delivered: 'Entregue',
      shipped: 'A caminho',
      refunded: 'Reembolsado',
      awaiting_material: 'Aguardando seu material',
      in_production: 'Em produção',
      pix_expired: 'PIX expirado',
      payment_rejected: 'Pagamento recusado',
      awaiting_payment: 'Aguardando pagamento',
    })
  })

  it('os tons seguem a régua dos selos (context.md)', () => {
    expect(SITUATION_TONES).toEqual({
      cancelled: 'neutral',
      refunded: 'neutral',
      delivered: 'done',
      shipped: 'progress',
      in_production: 'progress',
      awaiting_material: 'wait',
      awaiting_payment: 'wait',
      pix_expired: 'alert',
      payment_rejected: 'alert',
    })
  })

  it('o resultado carrega chave, rótulo e tom da MESMA chave', () => {
    for (const key of chaves) {
      expect(SITUATION_LABELS[key]).toBeTruthy()
    }
    const s = orderSituation({ ...base, payment_status: 'expired' })
    expect(s).toEqual({ key: 'pix_expired', label: 'PIX expirado', tone: 'alert' })
  })
})

describe('situationDetail — a data junto do selo (SIT-12)', () => {
  it('"A caminho" com previsão ganha " · chega até 8 out"', () => {
    expect(
      situationDetail(
        { status: 'shipped', payment_status: 'approved', delivery_estimate_max: '2026-10-08' },
        [],
      ),
    ).toBe(' · chega até 8 out')
  })

  it('a previsão é DATA, não instante — "2026-10-08" não vira 7 de outubro no fuso de Brasília', () => {
    // `new Date('2026-10-08')` é meia-noite UTC, que em Porto Alegre ainda é o dia 7.
    expect(
      situationDetail(
        { status: 'shipped', payment_status: 'approved', delivery_estimate_max: '2026-01-01' },
        [],
      ),
    ).toBe(' · chega até 1 jan')
  })

  it('"A caminho" sem previsão não ganha nada', () => {
    expect(situationDetail({ status: 'shipped', payment_status: 'approved' }, [])).toBeNull()
  })

  it('"Entregue" ganha " em 12 ago" pela data do PRIMEIRO registro `delivered`', () => {
    const eventos = [
      { status: 'delivered', at: '2026-08-15T15:00:00Z' },
      { status: 'shipped', at: '2026-08-09T15:00:00Z' },
      { status: 'delivered', at: '2026-08-12T15:00:00Z' },
    ]
    expect(situationDetail({ status: 'delivered', payment_status: 'approved' }, eventos)).toBe(
      ' em 12 ago',
    )
  })

  it('o dia do evento é o de Brasília, não o de UTC', () => {
    // 01:30 UTC do dia 13 ainda é 22:30 do dia 12 em Porto Alegre.
    const eventos = [{ status: 'delivered', at: '2026-08-13T01:30:00Z' }]
    expect(situationDetail({ status: 'delivered', payment_status: 'approved' }, eventos)).toBe(
      ' em 12 ago',
    )
  })

  it('"Entregue" sem registro no histórico não ganha data', () => {
    expect(situationDetail({ status: 'delivered', payment_status: 'approved' }, [])).toBeNull()
  })

  it('outras situações não ganham data, mesmo com previsão', () => {
    expect(
      situationDetail(
        { status: 'pending', payment_status: 'approved', delivery_estimate_max: '2026-10-08' },
        [],
      ),
    ).toBeNull()
  })

  it('previsão ilegível não vira "NaN"', () => {
    expect(
      situationDetail(
        { status: 'shipped', payment_status: 'approved', delivery_estimate_max: 'amanhã' },
        [],
      ),
    ).toBeNull()
  })
})

describe('formatShortDate — "8 out", sem ponto', () => {
  it('os doze meses abreviados', () => {
    const meses = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
    meses.forEach((mes, i) => {
      const mm = String(i + 1).padStart(2, '0')
      expect(formatShortDate(`2026-${mm}-15`)).toBe(`15 ${mes}`)
    })
  })

  it('vazio ou ilegível devolve null', () => {
    expect(formatShortDate('')).toBeNull()
    expect(formatShortDate(null)).toBeNull()
    expect(formatShortDate('não é data')).toBeNull()
  })
})
