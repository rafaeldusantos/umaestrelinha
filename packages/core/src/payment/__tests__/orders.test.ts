import { describe, expect, it } from 'vitest'
import {
  buildOrderPayload,
  extractPaymentId,
  extractPixData,
  formatAmount,
  ORDER_EXPIRATION,
  pixExpiresAt,
  resolveCardOutcome,
  type MpOrder,
} from '../orders'
import type { Payer } from '../payer'

// Testes derivados da spec de 09-checkout-orders-api (ORD-01…ORD-04), NÃO da implementação.
//   ORD-01: POST /v1/orders com type online, processing_mode automatic,
//           external_reference = order_id, expiration_time "PT30M"
//   ORD-02: total_amount e transactions.payments[0].amount são STRING com 2 casas,
//           e idênticos entre si
//   ORD-03: cartão → payment_method { id, type: credit_card, token, installments }
//   ORD-04: PIX    → payment_method { id: pix, type: bank_transfer } e SEM date_of_expiration

const PAYER: Payer = {
  email: 'cliente@exemplo.com',
  first_name: 'Nana',
  last_name: 'Pin',
  identification: { type: 'CPF', number: '39053344705' },
}

const ORDER_ID = '7b3f2a10-1c4d-4e8b-9f21-5a6b7c8d9e0f'

const pixInput = { orderId: ORDER_ID, total: 48, payer: PAYER, method: 'pix' as const }

const cardInput = {
  orderId: ORDER_ID,
  total: 48,
  payer: PAYER,
  method: 'card' as const,
  card: { token: 'tok_abc123', payment_method_id: 'master', installments: 3 },
}

describe('formatAmount (ORD-02)', () => {
  it.each([
    [48, '48.00'],
    [48.5, '48.50'],
    [0.01, '0.01'],
  ])('serializa %s como "%s"', (value, expected) => {
    expect(formatAmount(value)).toBe(expected)
  })

  it('devolve string, nunca número — o MP recusa número neste campo', () => {
    expect(typeof formatAmount(48)).toBe('string')
  })
})

describe('buildOrderPayload — envelope da order (ORD-01)', () => {
  const payload = buildOrderPayload(pixInput)

  it('type é "online"', () => {
    expect(payload.type).toBe('online')
  })

  it('processing_mode é "automatic"', () => {
    expect(payload.processing_mode).toBe('automatic')
  })

  it('external_reference é o uuid do pedido', () => {
    expect(payload.external_reference).toBe(ORDER_ID)
  })

  it('expiration_time é a duração ISO-8601 "PT30M"', () => {
    expect(payload.expiration_time).toBe('PT30M')
    expect(ORDER_EXPIRATION).toBe('PT30M')
  })
})

describe('buildOrderPayload — valores como string idêntica (ORD-02)', () => {
  it.each([
    [48, '48.00'],
    [48.5, '48.50'],
  ])('total %s vira "%s" em total_amount E em payments[0].amount', (total, expected) => {
    const payload = buildOrderPayload({ ...pixInput, total })
    expect(payload.total_amount).toBe(expected)
    expect(payload.transactions.payments[0].amount).toBe(expected)
  })

  it('total_amount e amount são idênticos entre si', () => {
    const payload = buildOrderPayload({ ...cardInput, total: 123.45 })
    expect(payload.total_amount).toBe(payload.transactions.payments[0].amount)
  })
})

describe('buildOrderPayload — cartão (ORD-03)', () => {
  const payload = buildOrderPayload(cardInput)

  it('payment_method traz id, type credit_card, token, installments e statement_descriptor', () => {
    expect(payload.transactions.payments[0].payment_method).toEqual({
      id: 'master',
      type: 'credit_card',
      token: 'tok_abc123',
      installments: 3,
      statement_descriptor: 'NANITA',
    })
  })

  // No Orders o descritor de fatura vive DENTRO de payment_method; na Payments API ficava na raiz.
  // Deixá-lo na raiz não quebraria nenhum teste — só sumiria da fatura do cliente, em silêncio.
  it('statement_descriptor NÃO fica na raiz da order', () => {
    expect(payload).not.toHaveProperty('statement_descriptor')
  })
})

describe('buildOrderPayload — PIX (ORD-04)', () => {
  const payload = buildOrderPayload(pixInput)

  it('payment_method é exatamente { id: pix, type: bank_transfer }', () => {
    expect(payload.transactions.payments[0].payment_method).toEqual({
      id: 'pix',
      type: 'bank_transfer',
    })
  })

  it('NÃO emite date_of_expiration — a expiração é o expiration_time da raiz', () => {
    expect(payload).not.toHaveProperty('date_of_expiration')
    expect(payload.transactions.payments[0]).not.toHaveProperty('date_of_expiration')
  })
})

describe('buildOrderPayload — payer na raiz da order (PGD-04)', () => {
  it('payer sai na raiz, com o identification do pedido preservado', () => {
    const payload = buildOrderPayload(pixInput)
    expect(payload.payer).toEqual(PAYER)
  })

  it('payer NÃO é duplicado dentro de transactions.payments[0]', () => {
    const payload = buildOrderPayload(cardInput)
    expect(payload.transactions.payments[0]).not.toHaveProperty('payer')
  })
})

// ORD-06: QR lido de transactions.payments[0].payment_method; ausência devolve o shape vazio
// que a tela já trata (nunca lança). PER-02: id do payment interno.
//
// Formatos de id conforme MEDIDO em sandbox (T16): `ORDTST01K…` para a order e `PAY01K…` para o
// payment — não `01J…`/`pay_…` como a spec supunha (D8).

const pixOrder: MpOrder = {
  id: 'ORDTST01KYMAPS387GPYD6WV2YA8VEBJ',
  status: 'action_required',
  status_detail: 'waiting_transfer',
  transactions: {
    payments: [
      {
        id: 'PAY01KYMAPS3TS0TTZJ5Z0GEPNGH1',
        status: 'action_required',
        payment_method: {
          qr_code: '00020126580014br.gov.bcb.pix',
          qr_code_base64: 'iVBORw0KGgoAAAANSUhEUg==',
          ticket_url: 'https://www.mercadopago.com.br/sandbox/payments/123',
        },
      },
    ],
  },
}

describe('extractPixData (ORD-06)', () => {
  it('lê qr_code e qr_code_base64 da order', () => {
    expect(extractPixData(pixOrder)).toEqual({
      qr_code: '00020126580014br.gov.bcb.pix',
      qr_code_base64: 'iVBORw0KGgoAAAANSUhEUg==',
    })
  })

  it('sem qr_code → qr_code "" e qr_code_base64 null (contrato atual da tela)', () => {
    const semQr: MpOrder = { transactions: { payments: [{ id: 'PAY01K1', payment_method: {} }] } }
    expect(extractPixData(semQr)).toEqual({
      qr_code: '',
      qr_code_base64: null,
    })
  })

  it.each([
    ['transactions ausente', {} as MpOrder],
    ['payments vazio', { transactions: { payments: [] } } as MpOrder],
    ['payment_method ausente', { transactions: { payments: [{ id: 'PAY01K1' }] } } as MpOrder],
  ])('%s → mesmo fallback, sem lançar', (_label, order) => {
    expect(() => extractPixData(order)).not.toThrow()
    expect(extractPixData(order)).toEqual({
      qr_code: '',
      qr_code_base64: null,
    })
  })

  // D5: o MP ECOA `expiration_time: "PT30M"` em vez de resolver a duração. Enquanto esse valor saía
  // como `expires_at`, `new Date(expires_at)` era Invalid Date e o cronômetro do PIX recebia NaN.
  it('D5: nunca devolve string de duração ISO-8601 — expires_at não sai daqui', () => {
    const comEco = { ...pixOrder, expiration_time: 'PT30M' } as MpOrder
    const data = extractPixData(comEco)

    expect(data).not.toHaveProperty('expires_at')
    expect(Object.values(data)).not.toContain('PT30M')
    for (const value of Object.values(data)) {
      expect(String(value)).not.toMatch(/^PT\d/)
    }
  })
})

describe('pixExpiresAt (ORD-06, D5)', () => {
  it('devolve o ISO de now + 30 min', () => {
    expect(pixExpiresAt(new Date('2026-07-28T12:00:00Z'))).toBe('2026-07-28T12:30:00.000Z')
  })

  it('é a mesma janela declarada em ORDER_EXPIRATION (fonte única)', () => {
    const minutos = Number(/^PT(\d+)M$/.exec(ORDER_EXPIRATION)?.[1])
    const now = new Date('2026-07-28T12:00:00Z')
    expect(pixExpiresAt(now)).toBe(new Date(now.getTime() + minutos * 60_000).toISOString())
  })

  it('é puro: o mesmo relógio devolve sempre o mesmo valor', () => {
    const now = new Date('2026-07-28T23:59:00Z')
    expect(pixExpiresAt(now)).toBe(pixExpiresAt(now))
    // E o valor é parseável — era exatamente o que "PT30M" não era.
    expect(Number.isNaN(new Date(pixExpiresAt(now)).getTime())).toBe(false)
  })
})

describe('extractPaymentId (PER-02)', () => {
  it('devolve o id do payment interno (PAY01K…), não o id da order', () => {
    expect(extractPaymentId(pixOrder)).toBe('PAY01KYMAPS3TS0TTZJ5Z0GEPNGH1')
    expect(extractPaymentId(pixOrder)).not.toBe(pixOrder.id)
  })

  it.each([
    ['transactions ausente', {} as MpOrder],
    ['payments vazio', { transactions: { payments: [] } } as MpOrder],
    ['payment sem id', { transactions: { payments: [{ status: 'processed' }] } } as MpOrder],
  ])('%s → null', (_label, order) => {
    expect(extractPaymentId(order)).toBeNull()
  })
})

// STA-02 / STA-03: a loja não tem UI de desafio 3DS, então action_required de CARTÃO é recusa.
// action_required + waiting_transfer é o PIX aguardando pagamento e segue pending.

describe('resolveCardOutcome (STA-02, STA-03)', () => {
  it('processed → approved', () => {
    expect(resolveCardOutcome({ status: 'processed', status_detail: 'accredited' })).toEqual({
      status: 'approved',
      statusDetail: 'accredited',
    })
  })

  it('action_required + waiting_transfer → pending (é o PIX, não desafio)', () => {
    expect(
      resolveCardOutcome({ status: 'action_required', status_detail: 'waiting_transfer' }),
    ).toEqual({ status: 'pending', statusDetail: 'waiting_transfer' })
  })

  it.each([
    ['pending_challenge'],
    ['pending_capture'],
    [null],
  ])('action_required com detail %s → rejected (STA-03)', (detail) => {
    expect(resolveCardOutcome({ status: 'action_required', status_detail: detail })).toEqual({
      status: 'rejected',
      statusDetail: detail,
    })
  })

  it('failed → rejected preservando o status_detail cc_rejected_* (STA-04)', () => {
    expect(
      resolveCardOutcome({ status: 'failed', status_detail: 'cc_rejected_insufficient_amount' }),
    ).toEqual({ status: 'rejected', statusDetail: 'cc_rejected_insufficient_amount' })
  })

  // D6 (medido no T16): na recusa a RAIZ traz o genérico "failed"; o detalhe acionável só existe no
  // payment. Ler a raiz mandava "failed" para `friendlyMessage`, que caía no fallback genérico.
  it('D6: prefere o status_detail do payment quando a raiz traz o genérico "failed"', () => {
    expect(
      resolveCardOutcome({
        id: 'ORDTST01KYMB0S1TKGKCWFSB1ZRR3EW7',
        status: 'failed',
        status_detail: 'failed',
        transactions: {
          payments: [
            {
              id: 'PAY01KYMB0S2C8YD1XN4Q1BHXKGNK',
              status: 'failed',
              status_detail: 'rejected_by_issuer',
            },
          ],
        },
      }),
    ).toEqual({ status: 'rejected', statusDetail: 'rejected_by_issuer' })
  })

  it('D6: sem status_detail no payment, cai para o da raiz', () => {
    expect(
      resolveCardOutcome({
        status: 'failed',
        status_detail: 'cc_rejected_high_risk',
        transactions: { payments: [{ id: 'PAY01K1', status: 'failed' }] },
      }),
    ).toEqual({ status: 'rejected', statusDetail: 'cc_rejected_high_risk' })
  })

  it('status desconhecido → status null (webhook ignora e loga)', () => {
    expect(resolveCardOutcome({ status: 'at_terminal' }).status).toBeNull()
    expect(resolveCardOutcome({}).status).toBeNull()
  })
})
