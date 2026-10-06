import { describe, expect, it } from 'vitest'
import { MEASUREMENT_ID_REFUSAL, measurementIdRefusal, normalizeMeasurementId } from '../ids.ts'

// ANL-03 — a frase é a da spec, letra por letra. Escrevê-la aqui por extenso (e não importar a
// constante para comparar com ela mesma) é o que faz o teste reprovar se alguém a reescrever.
const FRASE = 'O ID começa com G-, seguido de letras e números.'

describe('measurementIdRefusal (ANL-03)', () => {
  it('a constante exportada é a frase exata da spec', () => {
    expect(MEASUREMENT_ID_REFUSAL).toBe(FRASE)
  })

  it('aceita o ID real da propriedade', () => {
    expect(measurementIdRefusal('G-SQL517XDQZ')).toBeNull()
  })

  it('apara espaços e passa para maiúsculas antes de conferir', () => {
    expect(normalizeMeasurementId(' g-sql517xdqz ')).toBe('G-SQL517XDQZ')
    expect(measurementIdRefusal(' g-sql517xdqz ')).toBeNull()
  })

  it.each([
    ['UA-1-1', 'Universal Analytics'],
    ['GTM-K5N4XKF', 'contêiner do GTM'],
    ['G-', 'só o prefixo'],
    ['G-ABC', 'curto demais'],
    ['', 'vazio'],
    ['   ', 'só espaço'],
    ['G-ABCDEFGHIJKLM', 'longo demais (13)'],
    ['G-ABC 123', 'espaço no meio'],
    ['G_SQL517XDQZ', 'sem hífen'],
  ])('recusa %s (%s) com a frase exata', (raw) => {
    expect(measurementIdRefusal(raw)).toBe(FRASE)
  })

  it('aceita as duas pontas do tamanho (6 e 12 caracteres depois do G-)', () => {
    expect(measurementIdRefusal('G-ABC123')).toBeNull()
    expect(measurementIdRefusal('G-ABCDEF123456')).toBeNull()
  })

  it('valor ausente é recusado, nunca lança', () => {
    expect(measurementIdRefusal(null)).toBe(FRASE)
    expect(measurementIdRefusal(undefined)).toBe(FRASE)
    expect(normalizeMeasurementId(null)).toBe('')
  })
})
