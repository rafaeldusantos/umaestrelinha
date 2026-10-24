import { describe, expect, it } from 'vitest'

import {
  PAYMENT_METHOD_FALLBACK,
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_TONES,
  paymentMethodLabel,
  type AdminPaymentStatus,
} from '../labels.ts'
import * as barril from '../index.ts'

/**
 * Feature `74` (`MAP-25`, `MAP-48`, A15): os rótulos do meio de pagamento subiram do painel sem
 * mudar uma letra, e o tom do selo de pagamento nasceu aqui.
 *
 * As palavras abaixo foram COPIADAS do disco do painel (`apps/backoffice/src/entities/order/api/
 * orderQuery.ts`, no `775e407e`) antes da troca — é o "byte a byte" de `MAP-48` posto em teste. A
 * identidade de referência com o painel é de `regrasDoPedidoNoCore.test.ts`, na suíte de lá.
 */
describe('PAYMENT_METHOD_LABELS — os meios, como o painel sempre disse', () => {
  it('as quatro palavras do painel, byte a byte, mais `card` — o meio que o checkout da PRÓPRIA loja grava (B01)', () => {
    // `card` é o que a function `checkout` grava para todo pedido de cartão feito na loja (0174,
    // 0178–0182 no banco local). Sem ele o detalhe do ateliê mostrava "card" cru
    // (`BUG-20261024-pagamento-por-cartao-aparece-como-card`). As quatro de antes não mudam.
    expect(PAYMENT_METHOD_LABELS).toEqual({
      pix: 'PIX',
      card: 'Cartão de crédito',
      credit_card: 'Cartão de crédito',
      boleto: 'Boleto',
      manual: 'Manual',
    })
  })

  it.each([
    ['card', 'Cartão de crédito'],
    ['credit_card', 'Cartão de crédito'],
    ['pix', 'PIX'],
    [' pix ', 'PIX'],
  ])('paymentMethodLabel(%j) ⇒ %s', (meio, rotulo) => {
    expect(paymentMethodLabel(meio)).toBe(rotulo)
  })

  it.each([['wallet_xyz'], [''], [null], [undefined]])(
    'meio fora da lista (%j) nunca sai cru: "Outra forma de pagamento"',
    (meio) => {
      expect(PAYMENT_METHOD_FALLBACK).toBe('Outra forma de pagamento')
      expect(paymentMethodLabel(meio)).toBe(PAYMENT_METHOD_FALLBACK)
    },
  )

  it('a função e a palavra de recuo saem pelo barril', () => {
    expect(barril.paymentMethodLabel).toBe(paymentMethodLabel)
    expect(barril.PAYMENT_METHOD_FALLBACK).toBe(PAYMENT_METHOD_FALLBACK)
  })

  it('sai pelo barril de `core/orders` como a mesma referência', () => {
    expect(barril.PAYMENT_METHOD_LABELS).toBe(PAYMENT_METHOD_LABELS)
  })
})

describe('PAYMENT_STATUS_TONES — o tom do selo de pagamento (A15)', () => {
  const ESPERADO: Record<AdminPaymentStatus, string> = {
    pending: 'wait',
    approved: 'done',
    rejected: 'alert',
    refunded: 'neutral',
    expired: 'neutral',
    cancelled: 'alert',
  }

  it.each(Object.entries(ESPERADO))('%s ⇒ %s', (status, tom) => {
    expect(PAYMENT_STATUS_TONES[status as AdminPaymentStatus]).toBe(tom)
  })

  it('é exaustivo: exatamente os seis estados de `orders_payment_status_check`, nem um a mais', () => {
    expect(Object.keys(PAYMENT_STATUS_TONES).sort()).toEqual(
      ['approved', 'cancelled', 'expired', 'pending', 'refunded', 'rejected'],
    )
    expect(Object.keys(PAYMENT_STATUS_TONES).sort()).toEqual(
      Object.keys(barril.ORDER_PAYMENT_STATUS_LABELS).sort(),
    )
  })

  it('sai pelo barril como a mesma referência', () => {
    expect(barril.PAYMENT_STATUS_TONES).toBe(PAYMENT_STATUS_TONES)
  })
})
