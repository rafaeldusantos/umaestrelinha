import { describe, expect, it } from 'vitest'

import { PICKUP_DONE_ACTION, nextStep, type NextStepInput } from '../nextStep.ts'

/**
 * Feature `74` (`MAP-21`, `MAP-48`): o próximo passo. As frases esperadas foram COPIADAS do disco do
 * painel (`apps/backoffice/src/features/order-detail/model/nextStep.ts`, no `775e407e`) antes da
 * troca. Os rótulos de status são os de `ORDER_STATUS_LABELS` ("Pago", "Em Separação", "Enviado",
 * "Entregue").
 */
const pedido = (o: Partial<NextStepInput>): NextStepInput => ({
  status: 'paid',
  material_status: 'nao_aplicavel',
  payment_status: 'approved',
  tracking_code: null,
  shipping_service_id: '1',
  ...o,
})

describe('nextStep — o label e o motivo, byte a byte os do painel', () => {
  it('pendente aprovado ⇒ "Próximo passo: Pago", sem motivo', () => {
    expect(nextStep(pedido({ status: 'pending' }))).toEqual({ status: 'paid', label: 'Próximo passo: Pago', blockedReason: null })
  })

  it('pendente sem aprovação ⇒ o motivo do Mercado Pago', () => {
    expect(nextStep(pedido({ status: 'pending', payment_status: 'pending' }))).toEqual({
      status: 'paid',
      label: 'Próximo passo: Pago',
      blockedReason: 'O pagamento ainda não foi aprovado pelo Mercado Pago. Marcar como pago aqui não cobra ninguém.',
    })
  })

  it('pago ⇒ "Próximo passo: Em Separação"', () => {
    expect(nextStep(pedido({ status: 'paid' }))).toEqual({ status: 'separating', label: 'Próximo passo: Em Separação', blockedReason: null })
  })

  it('pago esperando o envelope ⇒ o motivo do material', () => {
    expect(nextStep(pedido({ status: 'paid', material_status: 'aguardando_material' })).blockedReason).toBe(
      'Disponível quando o material for registrado como recebido. Você pode avançar assim mesmo.',
    )
  })

  it('pago com o material a caminho ⇒ o motivo do envelope em trânsito', () => {
    expect(nextStep(pedido({ status: 'paid', material_status: 'material_enviado' })).blockedReason).toBe(
      'O material está a caminho e ainda não foi registrado como recebido. Você pode avançar assim mesmo.',
    )
  })

  it('em separação ⇒ "Próximo passo: Enviado"', () => {
    expect(nextStep(pedido({ status: 'separating' }))).toEqual({ status: 'shipped', label: 'Próximo passo: Enviado', blockedReason: null })
  })

  it('enviado sem rastreio ⇒ "Próximo passo: Entregue" com o motivo da postagem', () => {
    expect(nextStep(pedido({ status: 'shipped', tracking_code: null }))).toEqual({
      status: 'delivered',
      label: 'Próximo passo: Entregue',
      blockedReason: 'Este pedido não tem rastreio de saída, então a cliente não recebeu o aviso de postagem.',
    })
  })

  it('enviado com rastreio ⇒ sem motivo', () => {
    expect(nextStep(pedido({ status: 'shipped', tracking_code: 'BR1' })).blockedReason).toBeNull()
  })

  it('"Pedido concluído" e "Pedido cancelado" são fim de linha', () => {
    expect(nextStep(pedido({ status: 'delivered' }))).toEqual({ status: null, label: 'Pedido concluído', blockedReason: null })
    expect(nextStep(pedido({ status: 'cancelled' }))).toEqual({ status: null, label: 'Pedido cancelado', blockedReason: null })
  })

  it('retirada em separação ⇒ "Próximo passo: Retirado no escritório", com o botão de retirada', () => {
    expect(nextStep(pedido({ status: 'separating', shipping_service_id: 'retirada' }))).toEqual({
      status: 'delivered',
      label: 'Próximo passo: Retirado no escritório',
      blockedReason: null,
      actionLabel: 'Marcar como retirado',
    })
    expect(PICKUP_DONE_ACTION).toBe('Marcar como retirado')
  })

  it('retirada levada a enviado à mão não cobra rastreio', () => {
    expect(nextStep(pedido({ status: 'shipped', shipping_service_id: 'retirada' })).blockedReason).toBeNull()
  })
})
