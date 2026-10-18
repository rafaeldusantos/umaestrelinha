import { describe, expect, it } from 'vitest'
import { contrastRatio } from '@estrelinha/core/color'
import {
  INSTAGRAM_CTA_GRADIENT,
  INSTAGRAM_CTA_STOPS,
  INSTAGRAM_CTA_TEXT,
  INSTAGRAM_GLYPH_STOPS,
  INSTAGRAM_RING_GRADIENT,
} from '../instagram'

/**
 * As cores do Instagram no convite (feature 65, V2) não passam por `contrast.test.ts`, que mede só
 * a paleta `estrelinha`. Este arquivo é a régua delas: o texto do botão é branco sobre um gradiente,
 * e um gradiente só é legível se TODA parada for — o texto atravessa o botão inteiro.
 */
describe('as cores do Instagram — o botão', () => {
  it('a régua tem o que medir', () => {
    // Âncora: uma lista vazia aprovaria o `it.each` abaixo sem medir nada.
    expect(INSTAGRAM_CTA_STOPS.length).toBeGreaterThanOrEqual(2)
  })

  it.each([...INSTAGRAM_CTA_STOPS])('texto branco sobre %s passa de 4,5:1', cor => {
    expect(contrastRatio(INSTAGRAM_CTA_TEXT, cor)).toBeGreaterThanOrEqual(4.5)
  })

  it('a régua reprova o amarelo e o laranja do ícone — é por isso que eles ficam fora do botão', () => {
    // Sensor: se a régua aprovasse estas duas, ela não estaria medindo nada.
    expect(contrastRatio(INSTAGRAM_CTA_TEXT, INSTAGRAM_GLYPH_STOPS[0])).toBeLessThan(4.5)
    expect(contrastRatio(INSTAGRAM_CTA_TEXT, INSTAGRAM_GLYPH_STOPS[1])).toBeLessThan(4.5)
  })

  it('o gradiente do botão é feito só das paradas medidas, e o do anel, só das do ícone', () => {
    const cores = (g: string) => g.match(/#[0-9A-F]{6}/gi)
    expect(cores(INSTAGRAM_CTA_GRADIENT)).toEqual([...INSTAGRAM_CTA_STOPS])
    expect(cores(INSTAGRAM_RING_GRADIENT)).toEqual([...INSTAGRAM_GLYPH_STOPS])
  })
})
