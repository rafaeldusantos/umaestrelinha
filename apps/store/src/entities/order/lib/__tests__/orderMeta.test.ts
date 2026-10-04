import { describe, expect, it } from 'vitest'
import {
  CONFIRMATION_HEADLINES,
  confirmationHeadline,
  deadlineLabel,
  orderDateLabel,
  piecesCount,
  piecesLabel,
} from '../orderMeta'

// Feature 59 — `DET-01` ("Feito em {d MMM yyyy} · {n} peças") e `LST-02` ("2 out 2026 · 1 peça").

describe('piecesLabel — a quantidade de peças é a soma das quantidades', () => {
  it('"1 peça" no singular, "N peças" no plural', () => {
    expect(piecesLabel([{ quantity: 1 }])).toBe('1 peça')
    expect(piecesLabel([{ quantity: 1 }, { quantity: 2 }])).toBe('3 peças')
    expect(piecesLabel([{ quantity: 2 }])).toBe('2 peças')
  })

  it('lista vazia ou ausente: "0 peças", sem lançar', () => {
    expect(piecesLabel([])).toBe('0 peças')
    expect(piecesLabel(null)).toBe('0 peças')
    expect(piecesCount([{ quantity: null }, { quantity: 3 }])).toBe(3)
  })
})

describe('orderDateLabel — "2 out 2026"', () => {
  it('dia, mês abreviado e ano, no fuso da loja', () => {
    expect(orderDateLabel('2026-10-02T15:00:00Z')).toBe('2 out 2026')
    // 01:00 UTC do dia 3 ainda é dia 2 em Porto Alegre.
    expect(orderDateLabel('2026-10-03T01:00:00Z')).toBe('2 out 2026')
  })

  it('vazia ou ilegível: null', () => {
    expect(orderDateLabel(null)).toBeNull()
    expect(orderDateLabel('ontem')).toBeNull()
  })
})

describe('deadlineLabel — "até {d de mês}" (PEN-03, no detalhe e na conta)', () => {
  it('"11 de outubro", no fuso da loja', () => {
    expect(deadlineLabel(new Date('2026-10-11T15:00:00Z'))).toBe('11 de outubro')
    // 01:00 UTC do dia 12 ainda é dia 11 em Porto Alegre.
    expect(deadlineLabel(new Date('2026-10-12T01:00:00Z'))).toBe('11 de outubro')
  })

  it('data ausente ou ilegível: null', () => {
    expect(deadlineLabel(null)).toBeNull()
    expect(deadlineLabel(new Date('xx'))).toBeNull()
  })
})

// `DET-01` (decisão do usuário, 2026-10-04): o subtítulo caloroso muda com a etapa.
describe('confirmationHeadline — a frase calorosa só enquanto é verdade', () => {
  const pago = '2026-09-14T13:00:00Z'

  it('pago e ainda no ateliê → "É nosso!", em qualquer status de preparo', () => {
    for (const status of ['pending', 'paid', 'separating']) {
      expect(confirmationHeadline({ status, payment_status: 'approved', paid_at: pago })).toBe('pago')
    }
    expect(CONFIRMATION_HEADLINES.pago).toBe('É nosso!')
  })

  it('pagamento pendente → "Pedido registrado"', () => {
    expect(confirmationHeadline({ status: 'pending', payment_status: 'pending', paid_at: null })).toBe(
      'registrado',
    )
    expect(CONFIRMATION_HEADLINES.registrado).toBe('Pedido registrado')
  })

  it('enviado, entregue ou cancelado → sem subtítulo, mesmo pago', () => {
    for (const status of ['shipped', 'delivered', 'cancelled']) {
      expect(confirmationHeadline({ status, payment_status: 'approved', paid_at: pago })).toBeNull()
    }
  })

  // ⚠️ Invertido depois da prova em navegador: com o PIX expirado a página dizia "Pedido registrado"
  // e "aguardando a confirmação do pagamento" logo acima de "O código PIX expirou".
  it('PIX expirado ou pagamento recusado → sem subtítulo (o estado do topo fala)', () => {
    for (const payment_status of ['expired', 'rejected']) {
      expect(confirmationHeadline({ status: 'pending', payment_status, paid_at: null })).toBeNull()
    }
  })

  it('reembolsado → sem subtítulo, mesmo com paid_at e status de preparo', () => {
    expect(confirmationHeadline({ status: 'paid', payment_status: 'refunded', paid_at: pago })).toBeNull()
  })

  it('"pago" é paid_at, a mesma coluna da frase de e-mail (STO-01) — approved sem paid_at não é "É nosso!"', () => {
    expect(confirmationHeadline({ status: 'pending', payment_status: 'approved', paid_at: null })).toBe(
      'registrado',
    )
  })
})
