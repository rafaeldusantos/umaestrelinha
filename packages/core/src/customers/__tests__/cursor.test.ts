import { describe, expect, it } from 'vitest'

import { CUSTOMER_ORDERS_PAGE_SIZE, CUSTOMER_PAGE_SIZE, customerCursorFilter } from '../cursor.ts'

const ID = '00000000-0000-4000-c076-0000000d0001'

describe('tamanhos de página', () => {
  it('25 clientes e 20 pedidos por vez', () => {
    expect(CUSTOMER_PAGE_SIZE).toBe(25)
    expect(CUSTOMER_ORDERS_PAGE_SIZE).toBe(20)
  })
})

describe('customerCursorFilter (R1)', () => {
  it('com data: os três ramos, por extenso, o instante cru entre aspas', () => {
    expect(customerCursorFilter({ last_activity_at: '2031-05-01T10:00:00.123456+00:00', id: ID })).toBe(
      'last_activity_at.lt."2031-05-01T10:00:00.123456+00:00",and(last_activity_at.eq."2031-05-01T10:00:00.123456+00:00",id.gt.00000000-0000-4000-c076-0000000d0001),last_activity_at.is.null',
    )
  })

  it('com data nula: só o desempate por id entre os nulos', () => {
    expect(customerCursorFilter({ last_activity_at: null, id: ID })).toBe(
      'and(last_activity_at.is.null,id.gt.00000000-0000-4000-c076-0000000d0001)',
    )
  })

  it('o id é maior-que (gt) em ambos: crescente', () => {
    expect(customerCursorFilter({ last_activity_at: null, id: ID })).toContain('id.gt.')
    expect(customerCursorFilter({ last_activity_at: '2031-01-01T00:00:00+00:00', id: ID })).not.toContain('id.lt.')
  })

  it('id que não é uuid LANÇA — nada vai ao or()', () => {
    for (const ruim of ['', 'x', 'a),id.gt.1', null, undefined, 3])
      expect(() => customerCursorFilter({ last_activity_at: null, id: ruim as string })).toThrow(/uuid/)
  })

  it('cursor ausente LANÇA', () => {
    expect(() => customerCursorFilter(undefined as never)).toThrow()
  })

  it('data com aspas ou barra LANÇA (não escapa da string)', () => {
    expect(() => customerCursorFilter({ last_activity_at: '2031"),id.gt.0', id: ID })).toThrow(/data/)
    expect(() => customerCursorFilter({ last_activity_at: 'a\\b', id: ID })).toThrow(/data/)
  })
})
