import { describe, expect, it } from 'vitest'

import { pickupGate } from '../pickupGate.ts'

/**
 * `RET-15` (feature `63`) — a decisão de `handleCreate` antes da primeira chamada ao Melhor Envio.
 * A fiação (a linha inteira chega aqui, o `if` decide só por isto, antes da API) é medida por
 * `_shared/__tests__/retiradaSemEtiqueta.test.ts`.
 */
describe('pickupGate — pedido de retirada não tem etiqueta', () => {
  it('pedido de retirada ⇒ 422 pickup_order', () => {
    expect(pickupGate({ shipping_service_id: 'retirada' })).toEqual({ status: 422, error: 'pickup_order' })
  })

  it('a linha inteira, com as outras colunas, decide pela coluna do serviço', () => {
    const linha = { id: 'p1', shipping_service_id: 'retirada', shipping_method: 'Retirada no escritório' }
    expect(pickupGate(linha)).toEqual({ status: 422, error: 'pickup_order' })
  })

  it('pedido dos Correios segue para a API (null)', () => {
    expect(pickupGate({ shipping_service_id: '1' })).toBeNull()
    expect(pickupGate({ shipping_service_id: '2' })).toBeNull()
  })

  it('serviço nulo, ausente, ou linha nula segue (null) — nunca recusa por falta de dado', () => {
    expect(pickupGate({ shipping_service_id: null })).toBeNull()
    expect(pickupGate({})).toBeNull()
    expect(pickupGate(null)).toBeNull()
    expect(pickupGate(undefined)).toBeNull()
  })

  it('a COLUNA passada no lugar da linha não é lida como retirada (a forma do defeito F06)', () => {
    expect(pickupGate('retirada' as never)).toBeNull()
  })
})
