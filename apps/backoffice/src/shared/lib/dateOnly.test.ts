// Feature 18 / T1 — DSC-05 AC 5.
//
// O que se prova: a ida e a volta usam a MESMA referência, então o dia escolhido sobrevive ao
// round-trip em qualquer fuso. As asserções são todas independentes de fuso de propósito — pinar um
// ISO absoluto aqui faria o teste passar nesta máquina e falhar no CI.

import { describe, expect, it } from 'vitest'
import {
  dateFromDateOnly,
  dateOnlyFromDate,
  dateOnlyFromIso,
  formatDateOnly,
  formatIsoAsDate,
  isoFromDateOnly,
  shortIsoAsDate,
} from './dateOnly'

describe('dateOnly — a ida e a volta', () => {
  it('o dia escolhido volta igual, em qualquer fuso', () => {
    for (const day of ['2026-01-01', '2026-08-31', '2026-09-30', '2026-12-31']) {
      expect(dateOnlyFromIso(isoFromDateOnly(day))).toBe(day)
    }
  })

  it('o dia clicado no calendário volta igual', () => {
    const date = dateFromDateOnly('2026-08-31')!
    expect(dateOnlyFromDate(date)).toBe('2026-08-31')
    // Meia-noite LOCAL: é o que o `react-day-picker` compara para marcar a célula.
    expect(date.getHours()).toBe(0)
    expect(date.getDate()).toBe(31)
    expect(date.getMonth()).toBe(7)
  })

  it('`new Date("2026-08-31")` seria o dia 30 em fuso negativo — o construtor por partes não é', () => {
    // A armadilha que `dateFromDateOnly` existe para evitar: string só-data é UTC pela spec do JS.
    const naive = new Date('2026-08-31')
    const built = dateFromDateOnly('2026-08-31')!
    if (naive.getTimezoneOffset() > 0) {
      // Fuso negativo (Brasil): a forma ingênua cai no dia 30.
      expect(naive.getDate()).toBe(30)
    }
    expect(built.getDate()).toBe(31)
  })

  it('vazio, nulo e ISO inválido não inventam dia', () => {
    expect(dateOnlyFromIso(null)).toBe('')
    expect(dateOnlyFromIso('')).toBe('')
    expect(dateOnlyFromIso('nem-data')).toBe('')
    expect(isoFromDateOnly('')).toBeNull()
    expect(isoFromDateOnly(null)).toBeNull()
    expect(dateFromDateOnly('')).toBeUndefined()
    expect(dateOnlyFromDate(undefined)).toBe('')
  })

  it('a gravação segue sendo meia-noite local — a convenção não mudou nesta feature', () => {
    expect(isoFromDateOnly('2026-08-01')).toBe(new Date('2026-08-01T00:00:00').toISOString())
  })
})

describe('dateOnly — exibição', () => {
  it('formata em dd/MM/yyyy e dd/MM sem passar por `toLocaleDateString`', () => {
    expect(formatDateOnly('2026-08-31')).toBe('31/08/2026')
    expect(formatIsoAsDate(isoFromDateOnly('2026-09-30'))).toBe('30/09/2026')
    expect(shortIsoAsDate(isoFromDateOnly('2026-09-30'))).toBe('30/09')
  })

  it('sem data, não há texto', () => {
    expect(formatDateOnly(null)).toBe('')
    expect(formatIsoAsDate(null)).toBe('')
    expect(shortIsoAsDate(null)).toBe('')
  })
})
