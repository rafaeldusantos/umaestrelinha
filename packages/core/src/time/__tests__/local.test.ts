import { describe, expect, it } from 'vitest'

import { storeLocalInput, storeLocalToInstant } from '../local.ts'
import * as barril from '../index.ts'

// A data e a hora que a admin digita são de Brasília (`STORE_TIME_ZONE`), nunca do aparelho dela.
// O valor do campo é o formato do `<input type="datetime-local">`: `AAAA-MM-DDTHH:MM`, sem fuso.

describe('a hora de Brasília do campo, e o instante que ela é', () => {
  it('14h30 de 09/11/2026 em Brasília é 17h30 UTC', () => {
    expect(storeLocalToInstant('2026-11-09T14:30')).toBe('2026-11-09T17:30:00.000Z')
  })

  it('a virada do dia: 22h em Brasília já é o dia seguinte em UTC', () => {
    expect(storeLocalToInstant('2026-01-31T22:05')).toBe('2026-02-01T01:05:00.000Z')
  })

  it('o instante volta ao valor do campo na hora de Brasília (o "agora" que preenche o campo)', () => {
    expect(storeLocalInput('2026-11-09T17:30:59.000Z')).toBe('2026-11-09T14:30')
    expect(storeLocalInput('2026-02-01T01:05:00.000Z')).toBe('2026-01-31T22:05')
  })

  it('meia-noite em Brasília sai 00, nunca 24', () => {
    expect(storeLocalInput('2026-03-10T03:00:00.000Z')).toBe('2026-03-10T00:00')
  })

  it('texto que não é data e hora não vira instante', () => {
    expect(storeLocalToInstant('')).toBeNull()
    expect(storeLocalToInstant('09/11/2026 14:30')).toBeNull()
    expect(storeLocalToInstant('2026-13-40T25:99')).toBeNull()
  })

  it('o barril expõe os dois', () => {
    expect(barril.storeLocalToInstant).toBe(storeLocalToInstant)
    expect(barril.storeLocalInput).toBe(storeLocalInput)
  })
})
