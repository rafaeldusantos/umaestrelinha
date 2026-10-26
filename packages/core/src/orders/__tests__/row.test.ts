import { describe, expect, it } from 'vitest'

import { purchaseOrdinalLabel, queueSince, rowQueueAge } from '../row.ts'

/** Feature `74` (`MAP-16`, `MAP-17`): a idade e a ordinal da linha, movidas do painel sem mudança. */
describe('purchaseOrdinalLabel — "Nª compra" (MAP-16)', () => {
  it.each([
    [1, '1ª compra'],
    [3, '3ª compra'],
    [12, '12ª compra'],
  ])('%i ⇒ %s', (n, texto) => {
    expect(purchaseOrdinalLabel(n)).toBe(texto)
  })

  it.each([0, -1, null, undefined])('sem ordinal válido (%s) ⇒ null — a linha mostra só o tempo', (n) => {
    expect(purchaseOrdinalLabel(n as number)).toBeNull()
  })
})

describe('queueSince — desde quando a linha espera', () => {
  it('sem recebimento: desde a compra', () => {
    expect(queueSince({ created_at: '2026-10-01T10:00:00Z', material_received_at: null })).toBe('2026-10-01T10:00:00Z')
  })

  it('com o envelope recebido: desde o recebimento', () => {
    expect(
      queueSince({ created_at: '2026-10-01T10:00:00Z', material_received_at: '2026-10-05T09:00:00Z' }),
    ).toBe('2026-10-05T09:00:00Z')
  })
})

describe('rowQueueAge — a idade na fila, contra um `agora` injetado (MAP-17)', () => {
  const agora = new Date('2026-10-11T10:00:00Z')

  it('aguardando o material há 10 dias ⇒ 10 dias, degrau `stale`', () => {
    expect(
      rowQueueAge({ created_at: '2026-10-01T10:00:00Z', material_received_at: null, material_status: 'aguardando_material' }, agora),
    ).toEqual({ days: 10, tier: 'stale' })
  })

  it('recebido há 2 dias conta do recebimento, não da compra', () => {
    expect(
      rowQueueAge(
        { created_at: '2026-09-01T10:00:00Z', material_received_at: '2026-10-09T10:00:00Z', material_status: 'material_recebido' },
        agora,
      ),
    ).toEqual({ days: 2, tier: 'fresh' })
  })

  it.each(['nao_aplicavel', null, ''])('sem fila de material (%s) ⇒ null', (material_status) => {
    expect(rowQueueAge({ created_at: '2026-10-01T10:00:00Z', material_received_at: null, material_status }, agora)).toBeNull()
  })
})
