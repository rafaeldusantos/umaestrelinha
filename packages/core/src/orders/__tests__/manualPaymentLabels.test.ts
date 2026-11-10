import { describe, expect, it } from 'vitest'

import {
  MANUAL_PAYMENT_METHODS,
  MANUAL_PAYMENT_METHOD_LABELS,
  manualPaymentMethodLabel,
} from '../labels.ts'
import * as barril from '../index.ts'

// Os meios de um pagamento registrado à mão, nas duas vozes: a de quem administra (o seletor e o
// bloco Pagamento do painel) e a da cliente (o que a loja mostra no pedido dela). O valor técnico
// nunca chega à tela.

describe('os meios de um pagamento registrado à mão', () => {
  it('a lista é fixa, na ordem do seletor', () => {
    expect(MANUAL_PAYMENT_METHODS).toEqual(['pix_direto', 'transferencia', 'dinheiro', 'cartao', 'outro'])
  })

  it('a voz do painel diz o meio por extenso, e o cartão diz de onde veio', () => {
    expect(MANUAL_PAYMENT_METHOD_LABELS.admin).toEqual({
      pix_direto: 'PIX direto',
      transferencia: 'Transferência',
      dinheiro: 'Dinheiro',
      cartao: 'Cartão de crédito (link de outro gateway ou maquininha)',
      outro: 'Outro',
    })
  })

  it('a voz da cliente não fala de gateway nem de "outro"', () => {
    expect(MANUAL_PAYMENT_METHOD_LABELS.customer).toEqual({
      pix_direto: 'PIX',
      transferencia: 'Transferência',
      dinheiro: 'Dinheiro',
      cartao: 'Cartão de crédito',
      outro: 'Combinado com a loja',
    })
  })

  it.each([
    ['transferencia', 'admin', 'Transferência'],
    ['pix_direto', 'admin', 'PIX direto'],
    ['pix_direto', 'customer', 'PIX'],
    [' dinheiro ', 'customer', 'Dinheiro'],
  ] as const)('manualPaymentMethodLabel(%j, %s) ⇒ %s', (meio, voz, rotulo) => {
    expect(manualPaymentMethodLabel(meio, voz)).toBe(rotulo)
  })

  it('meio vazio ou desconhecido nunca vira o valor técnico', () => {
    expect(manualPaymentMethodLabel(null, 'admin')).toBe('Meio não informado')
    expect(manualPaymentMethodLabel('', 'admin')).toBe('Meio não informado')
    expect(manualPaymentMethodLabel('boleto_xyz', 'admin')).toBe('Meio não informado')
    expect(manualPaymentMethodLabel(null, 'customer')).toBe('Combinado com a loja')
  })

  it('o barril expõe os três', () => {
    expect(barril.MANUAL_PAYMENT_METHODS).toBe(MANUAL_PAYMENT_METHODS)
    expect(barril.MANUAL_PAYMENT_METHOD_LABELS).toBe(MANUAL_PAYMENT_METHOD_LABELS)
    expect(barril.manualPaymentMethodLabel).toBe(manualPaymentMethodLabel)
  })
})
