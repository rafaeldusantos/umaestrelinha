import { describe, expect, it } from 'vitest'

import {
  CUSTOMER_SLICES,
  DEFAULT_CUSTOMER_SLICE,
  OPEN_CUSTOMER_RULE,
  RETURNING_CUSTOMER_RULE,
  applyCustomerSlice,
  customerSliceRule,
  isCustomerSliceId,
  type CustomerSliceId,
} from '../slices.ts'

/** Dublê estrutural que REGISTRA cada chamada (a cadeia é o que se mede). */
const dubleDeConsulta = () => {
  const chamadas: unknown[][] = []
  const b = {
    gte(col: string, value: number) {
      chamadas.push(['gte', col, value])
      return b
    },
  }
  return { b, chamadas }
}

describe('CUSTOMER_SLICES (MAC-07)', () => {
  it('são três, na ordem do protótipo, com os rótulos por extenso', () => {
    expect(CUSTOMER_SLICES).toEqual([
      { id: 'todas', label: 'Todas' },
      { id: 'recorrentes', label: 'Compraram mais de uma vez' },
      { id: 'em-aberto', label: 'Com pedido em aberto' },
    ])
  })

  it('o padrão é "todas"', () => {
    expect(DEFAULT_CUSTOMER_SLICE).toBe('todas')
  })

  it('isCustomerSliceId aceita o vocabulário e recusa o resto', () => {
    for (const ok of ['todas', 'recorrentes', 'em-aberto']) expect(isCustomerSliceId(ok)).toBe(true)
    for (const ruim of ['voltaram', '', 'TODAS', null, undefined, 1, {}]) expect(isCustomerSliceId(ruim)).toBe(false)
  })
})

describe('customerSliceRule (MAC-08, MAC-09)', () => {
  it('"todas" não tem regra', () => {
    expect(customerSliceRule('todas')).toBeNull()
  })

  it('"recorrentes" é a regra de "Voltaram" do painel: duas compras pagas', () => {
    expect(customerSliceRule('recorrentes')).toEqual({ col: 'orders_paid', min: 2 })
    expect(customerSliceRule('recorrentes')).toBe(RETURNING_CUSTOMER_RULE)
  })

  it('"em-aberto" lê a coluna orders_open, ao menos um', () => {
    expect(customerSliceRule('em-aberto')).toEqual({ col: 'orders_open', min: 1 })
    expect(customerSliceRule('em-aberto')).toBe(OPEN_CUSTOMER_RULE)
  })

  it('id fora do vocabulário LANÇA', () => {
    expect(() => customerSliceRule('voltaram' as CustomerSliceId)).toThrow(/desconhecido/)
  })
})

describe('applyCustomerSlice', () => {
  it('recorrentes ⇒ gte("orders_paid", 2), uma chamada', () => {
    const { b, chamadas } = dubleDeConsulta()
    expect(applyCustomerSlice(b, 'recorrentes')).toBe(b)
    expect(chamadas).toEqual([['gte', 'orders_paid', 2]])
  })

  it('em-aberto ⇒ gte("orders_open", 1), uma chamada', () => {
    const { b, chamadas } = dubleDeConsulta()
    applyCustomerSlice(b, 'em-aberto')
    expect(chamadas).toEqual([['gte', 'orders_open', 1]])
  })

  it('todas ⇒ nenhuma chamada, devolve o mesmo builder', () => {
    const { b, chamadas } = dubleDeConsulta()
    expect(applyCustomerSlice(b, 'todas')).toBe(b)
    expect(chamadas).toEqual([])
  })

  it('id desconhecido LANÇA e não chama nada', () => {
    const { b, chamadas } = dubleDeConsulta()
    expect(() => applyCustomerSlice(b, 'x' as CustomerSliceId)).toThrow()
    expect(chamadas).toEqual([])
  })
})
