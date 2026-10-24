import { describe, expect, it } from 'vitest'
import * as core from '@estrelinha/core/orders'

import { PAYMENT_METHOD_LABELS, paymentMethodLabel } from '../paymentDelivery'

/**
 * Conserto do QA da `74` (`BUG-20261024-pagamento-por-cartao-aparece-como-card`, defeito 01): o mapa
 * da loja PARTE do de `core` e só troca a voz de `manual`. Antes ele era uma segunda lista, e só ela
 * sabia que `card` é "Cartão de crédito".
 */
describe('os meios de pagamento da loja vêm de core', () => {
  it('toda chave de core existe aqui, com a MESMA palavra — menos `manual`, que é a voz da cliente', () => {
    for (const [meio, rotulo] of Object.entries(core.PAYMENT_METHOD_LABELS)) {
      if (meio === 'manual') continue
      expect(PAYMENT_METHOD_LABELS[meio], meio).toBe(rotulo)
    }
    expect(PAYMENT_METHOD_LABELS.manual).toBe('Combinado com a loja')
  })

  it('nenhuma chave que core não conheça: um meio novo entra em core, nunca só aqui', () => {
    expect(Object.keys(PAYMENT_METHOD_LABELS).sort()).toEqual(Object.keys(core.PAYMENT_METHOD_LABELS).sort())
  })

  it('o recuo é o de core', () => {
    expect(paymentMethodLabel('wallet_xyz')).toBe(core.PAYMENT_METHOD_FALLBACK)
  })
})
