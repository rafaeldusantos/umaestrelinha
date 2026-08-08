// Feature 18 / T4 — DSC-06 AC 1. As quatro saídas, que agora as DUAS listagens leem.

import { describe, expect, it } from 'vitest'
import { isoFromDateOnly } from './dateOnly'
import { validityLabel } from './vigencia'

const iso = (day: string) => isoFromDateOnly(day)!

describe('validityLabel', () => {
  it('sem nenhuma data: `Sem fim`', () => {
    expect(validityLabel(null, null)).toBe('Sem fim')
    // O cupom dizia `Sem prazo`. Uma palavra por conceito, e o conceito é o mesmo.
    expect(validityLabel(null, null)).not.toBe('Sem prazo')
  })

  it('só fim: `até 30/09`', () => {
    expect(validityLabel(null, iso('2026-09-30'))).toBe('até 30/09')
  })

  it('só início: `a partir de 01/08`', () => {
    expect(validityLabel(iso('2026-08-01'), null)).toBe('a partir de 01/08')
  })

  it('os dois: a faixa', () => {
    expect(validityLabel(iso('2026-08-01'), iso('2026-08-31'))).toBe('01/08 – 31/08')
  })
})
