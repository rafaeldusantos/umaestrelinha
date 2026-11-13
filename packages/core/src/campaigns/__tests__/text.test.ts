import { describe, expect, it } from 'vitest'
import {
  campaignEndInput,
  campaignEndsAtFromInput,
  campaignPercentBadge,
  campaignPeriodLabel,
  campaignPiecesLabel,
  campaignShowcaseLine,
  campaignStartInput,
  campaignStartsAtFromInput,
  campaignStatusLine,
  endsAtFromLastMinute,
  lastMinuteOf,
  percentList,
} from '../index.ts'

const BF = { starts_at: '2026-11-13T03:00:00.000Z', ends_at: '2026-12-01T03:00:00.000Z', active: true }

describe('o fim digitado ↔ o fim gravado', () => {
  it('30/11 23:59 digitado (Brasília) grava 01/12 00:00 (exclusivo)', () => {
    expect(campaignEndsAtFromInput('2026-11-30T23:59')).toBe('2026-12-01T03:00:00.000Z')
  })

  it('01/12 00:00 gravado mostra 30/11 23:59', () => {
    expect(campaignEndInput('2026-12-01T03:00:00.000Z')).toBe('2026-11-30T23:59')
  })

  it('ida e volta', () => {
    expect(campaignEndInput(campaignEndsAtFromInput('2026-11-30T23:59')!)).toBe('2026-11-30T23:59')
    expect(lastMinuteOf(endsAtFromLastMinute('2026-11-30T12:00:00.000Z'))).toBe('2026-11-30T12:00:00.000Z')
  })

  it('o início não muda: 13/11 00:00 é o instante exato', () => {
    expect(campaignStartsAtFromInput('2026-11-13T00:00')).toBe('2026-11-13T03:00:00.000Z')
    expect(campaignStartInput('2026-11-13T03:00:00.000Z')).toBe('2026-11-13T00:00')
  })

  it('texto fora da forma ⇒ null', () => {
    expect(campaignEndsAtFromInput('2026-11-30')).toBeNull()
    expect(campaignStartsAtFromInput('')).toBeNull()
  })
})

describe('a linha da vitrine, com 1, 2 e 3 percentuais', () => {
  it('um', () => {
    expect(campaignShowcaseLine([10], BF.ends_at)).toBe('Peças com 10% de desconto até 30 de novembro.')
  })

  it('dois', () => {
    expect(campaignShowcaseLine([20, 10], BF.ends_at)).toBe('Peças com 10% e 20% de desconto até 30 de novembro.')
  })

  it('três, em ordem crescente', () => {
    expect(campaignShowcaseLine([20, 10, 15], BF.ends_at)).toBe('Peças com 10%, 15% e 20% de desconto até 30 de novembro.')
    expect(percentList([20, 10, 15])).toBe('10%, 15% e 20%')
  })
})

describe('os textos da lista e da edição', () => {
  it('a vigência: "13/11 a 30/11/2026"', () => {
    expect(campaignPeriodLabel(BF)).toBe('13/11 a 30/11/2026')
    expect(campaignPeriodLabel({ starts_at: '2026-12-20T03:00:00.000Z', ends_at: '2027-01-03T03:00:00.000Z' })).toBe(
      '20/12/2026 a 02/01/2027',
    )
  })

  it('o estado por extenso', () => {
    expect(campaignStatusLine(BF, '2026-11-20T12:00:00.000Z')).toBe('em vigência até 30/11 às 23:59')
    expect(campaignStatusLine(BF, '2026-11-01T12:00:00.000Z')).toBe('agendada — começa em 13/11 às 00:00')
    expect(campaignStatusLine(BF, '2026-12-05T12:00:00.000Z')).toBe('encerrada em 30/11')
    expect(campaignStatusLine({ ...BF, active: false }, '2026-11-20T12:00:00.000Z')).toBe('desligada')
  })

  it('o percentual do selo leva o sinal de menos tipográfico', () => {
    expect(campaignPercentBadge(20)).toBe('−20%')
  })

  it('as peças', () => {
    expect(campaignPiecesLabel(0)).toBe('nenhuma peça')
    expect(campaignPiecesLabel(1)).toBe('1 peça')
    expect(campaignPiecesLabel(9)).toBe('9 peças')
  })
})
