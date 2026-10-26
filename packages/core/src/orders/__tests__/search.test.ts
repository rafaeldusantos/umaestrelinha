import { describe, expect, it } from 'vitest'

import { ORDER_SEARCH_COLUMNS, SEARCH_DEBOUNCE_MS, buildOrderSearchCondition } from '../search.ts'

/**
 * Feature `74` (`MAP-10`, `MAP-11`, `MAP-12`): a busca subiu do painel byte a byte. A condição é o
 * texto que vai ao `.or()` do PostgREST, então a régua é o TEXTO inteiro.
 */
const condicao = (termo: string): string =>
  [
    `order_number.ilike.%${termo}%`,
    `customer_name.ilike.%${termo}%`,
    `customer_email.ilike.%${termo}%`,
    `tracking_code.ilike.%${termo}%`,
    `material_tracking_code.ilike.%${termo}%`,
  ].join(',')

describe('a busca de pedido', () => {
  it('as cinco colunas do painel, nesta ordem', () => {
    expect([...ORDER_SEARCH_COLUMNS]).toEqual([
      'order_number',
      'customer_name',
      'customer_email',
      'tracking_code',
      'material_tracking_code',
    ])
  })

  it('`#0244`, `0244` e `244` caem no número sem o `#` (MAP-10)', () => {
    expect(buildOrderSearchCondition('#0244')).toBe(condicao('0244'))
    expect(buildOrderSearchCondition('0244')).toBe(condicao('0244'))
    expect(buildOrderSearchCondition('244')).toBe(condicao('244'))
  })

  it('só espaços vale como sem busca (MAP-12)', () => {
    expect(buildOrderSearchCondition('   ')).toBeNull()
    expect(buildOrderSearchCondition('')).toBeNull()
    expect(buildOrderSearchCondition('#')).toBeNull()
  })

  it('`,`, `(` e `)` viram espaço, nunca um erro de consulta (MAP-12)', () => {
    expect(buildOrderSearchCondition('ana,(silva)')).toBe(condicao('ana  silva'))
    expect(buildOrderSearchCondition('ana,(silva)')).not.toMatch(/[(),]%/)
  })

  it('o debounce é 300 ms (MAP-11)', () => {
    expect(SEARCH_DEBOUNCE_MS).toBe(300)
  })
})
