import { describe, expect, it } from 'vitest'

import { isOrderId } from '../../orders/list.ts'
import { isCustomerId } from '../id.ts'

describe('isCustomerId (MAC-14)', () => {
  it('é, por referência, o predicado do pedido (um só dono do uuid)', () => {
    expect(isCustomerId).toBe(isOrderId)
  })

  it('aceita uuid, em qualquer caixa', () => {
    expect(isCustomerId('00000000-0000-4000-c076-0000000d0001')).toBe(true)
    expect(isCustomerId('0A1B2C3D-0000-4000-8000-0123456789AB')).toBe(true)
  })

  it('recusa vazio, null, número, uuid truncado e a forma com chaves', () => {
    for (const ruim of ['', null, undefined, 12, '00000000-0000-4000-c076-0000000d000', '{00000000-0000-4000-c076-0000000d0001}', 'abc', ' 00000000-0000-4000-c076-0000000d0001'])
      expect(isCustomerId(ruim)).toBe(false)
  })
})
