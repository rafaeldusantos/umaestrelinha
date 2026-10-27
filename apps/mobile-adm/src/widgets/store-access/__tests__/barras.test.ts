// Feature `83` · T07 — `LAV-52`: a altura da barra, `max(4, round(v ÷ máx × 84))`.
import { describe, expect, it } from 'vitest'
import { ALTURA_MAXIMA, ALTURA_MINIMA, alturaDaBarra } from '../model/barras'

describe('alturaDaBarra', () => {
  it('as medidas do protótipo: 84 no topo, piso de 4', () => {
    expect(ALTURA_MAXIMA).toBe(84)
    expect(ALTURA_MINIMA).toBe(4)
  })

  it('o maior valor tem 84; a metade, 42', () => {
    expect(alturaDaBarra(1000, 1000)).toBe(84)
    expect(alturaDaBarra(500, 1000)).toBe(42)
  })

  it('1 de 1000 (0,084 px) sobe ao piso de 4', () => {
    expect(alturaDaBarra(1, 1000)).toBe(4)
  })

  it('máximo zero (todos os valores 0) ⇒ 4, nunca NaN', () => {
    expect(alturaDaBarra(0, 0)).toBe(4)
  })

  it('sem valor (faixa futura ou antes da contagem) ⇒ 4', () => {
    expect(alturaDaBarra(null, 1000)).toBe(4)
  })
})
