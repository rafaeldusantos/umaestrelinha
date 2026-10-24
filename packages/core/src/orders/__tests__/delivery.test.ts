import { describe, expect, it } from 'vitest'

import { shippingLine } from '../delivery.ts'

/** Feature `74` (`MAP-26`, `MAP-27`): a linha do rastreio de saída no bloco "Entrega". */
describe('shippingLine', () => {
  it('com código ⇒ "Rastreio <código>", em qualquer estado', () => {
    expect(shippingLine({ status: 'shipped', tracking_code: 'BR123456789BR' })).toBe('Rastreio BR123456789BR')
    expect(shippingLine({ status: 'delivered', tracking_code: 'BR1' })).toBe('Rastreio BR1')
  })

  it('enviado sem código ⇒ "Enviado sem código de rastreio"', () => {
    expect(shippingLine({ status: 'shipped', tracking_code: null })).toBe('Enviado sem código de rastreio')
    expect(shippingLine({ status: 'shipped', tracking_code: '   ' })).toBe('Enviado sem código de rastreio')
  })

  it.each(['pending', 'paid', 'separating'])('`%s` sem código ⇒ "Ainda não postado"', (status) => {
    expect(shippingLine({ status, tracking_code: null })).toBe('Ainda não postado')
  })

  it.each(['delivered', 'cancelled'])('`%s` sem código ⇒ "Sem rastreio"', (status) => {
    expect(shippingLine({ status, tracking_code: null })).toBe('Sem rastreio')
  })

  it('retirada no escritório ⇒ null, mesmo com código (MAP-27)', () => {
    expect(shippingLine({ status: 'separating', tracking_code: null, shipping_service_id: 'retirada' })).toBeNull()
    expect(shippingLine({ status: 'delivered', tracking_code: 'X', shipping_service_id: 'retirada' })).toBeNull()
  })
})
