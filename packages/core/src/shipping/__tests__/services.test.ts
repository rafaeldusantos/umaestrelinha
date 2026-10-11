import { describe, expect, it } from 'vitest'
import {
  ALLOWED_SHIPPING_SERVICE_IDS,
  ALLOWED_SHIPPING_SERVICES_PARAM,
  isAllowedShippingService,
} from '../services.ts'

describe('serviços de frete oferecidos', () => {
  it('são exatamente Correios PAC (1) e SEDEX (2)', () => {
    expect([...ALLOWED_SHIPPING_SERVICE_IDS]).toEqual([1, 2])
    expect(ALLOWED_SHIPPING_SERVICES_PARAM).toBe('1,2')
  })

  it('aceita PAC e SEDEX, por número ou por string', () => {
    expect(isAllowedShippingService(1)).toBe(true)
    expect(isAllowedShippingService(2)).toBe(true)
    expect(isAllowedShippingService('1')).toBe(true)
    expect(isAllowedShippingService('2')).toBe(true)
  })

  it('recusa os outros serviços do Melhor Envio (Jadlog, Mini Envios, Loggi…)', () => {
    for (const id of [3, 4, 17, 31, '3', '17']) {
      expect(isAllowedShippingService(id)).toBe(false)
    }
  })

  it('recusa id ausente ou malformado', () => {
    for (const id of [undefined, null, '', ' ', 'PAC', NaN, 1.5, {}]) {
      expect(isAllowedShippingService(id)).toBe(false)
    }
  })
})
