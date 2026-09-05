import { describe, expect, it } from 'vitest'
import { contrastRatio, mixOver, parseHex, relativeLuminance } from '../contrast.ts'

/**
 * A fórmula do contraste, agora com dono em `core`.
 *
 * Os pisos das paletas **não** estão aqui — são `contrast.test.ts` (loja) e `adminTokens.test.ts`
 * (painel). Aqui se prova só o instrumento, contra valores que a WCAG fixa e que não dependem de
 * decisão de design nenhuma.
 */

describe('parseHex', () => {
  it('aceita as duas formas e normaliza a curta', () => {
    expect(parseHex('#FFF')).toEqual([255, 255, 255])
    expect(parseHex('#FFFFFF')).toEqual([255, 255, 255])
    expect(parseHex('000000')).toEqual([0, 0, 0])
    expect(parseHex('  #B45309  ')).toEqual([180, 83, 9])
  })

  it('lança em vez de devolver lixo silencioso', () => {
    // Uma cor inválida virando `[NaN, NaN, NaN]` faria toda razão sair `NaN`, e `NaN >= 4.5` é
    // `false` — o guarda reprovaria dizendo a coisa errada, ou pior, um `<` passaria.
    expect(() => parseHex('#GGG')).toThrow(/Hex inválido/)
    expect(() => parseHex('#12345')).toThrow(/Hex inválido/)
    expect(() => parseHex('')).toThrow(/Hex inválido/)
  })
})

describe('contrastRatio — os extremos que a WCAG fixa', () => {
  it('preto sobre branco é 21:1', () => {
    expect(contrastRatio('#000000', '#FFFFFF')).toBeCloseTo(21, 5)
  })

  it('uma cor contra ela mesma é 1:1', () => {
    expect(contrastRatio('#B45309', '#B45309')).toBeCloseTo(1, 10)
  })

  it('a ordem dos argumentos não muda o resultado', () => {
    expect(contrastRatio('#23303A', '#FAF8F4')).toBeCloseTo(contrastRatio('#FAF8F4', '#23303A'), 10)
  })

  it('branco tem luminância 1 e preto 0', () => {
    expect(relativeLuminance('#FFFFFF')).toBeCloseTo(1, 10)
    expect(relativeLuminance('#000000')).toBeCloseTo(0, 10)
  })
})

describe('mixOver — o fundo real de um selo translúcido', () => {
  it('alpha 0 devolve o fundo e alpha 1 devolve a cor', () => {
    expect(mixOver('#B45309', '#FFFFFF', 0)).toBe('#ffffff')
    expect(mixOver('#B45309', '#FFFFFF', 1)).toBe('#b45309')
  })

  it('a 10% sobre branco, o âmbar vira o lavado que o selo pinta', () => {
    expect(mixOver('#B45309', '#FFFFFF', 0.1)).toBe('#f8eee6')
  })

  it('medir contra o card puro SUPERESTIMA — é a razão de esta função existir', () => {
    // O selo é `bg-<token>/10 text-<token>`: o texto não está sobre o card, está sobre o próprio
    // token a 10% sobre o card. `#B45309` passa folgado contra branco e reprova contra o fundo
    // real — foi assim que a prancha da feature 34 declarou um âmbar aprovado que não passava.
    const contraOCard = contrastRatio('#B45309', '#FFFFFF')
    const contraOFundoReal = contrastRatio('#B45309', mixOver('#B45309', '#FFFFFF', 0.1))

    expect(contraOCard).toBeGreaterThan(4.5)
    expect(contraOFundoReal).toBeLessThan(4.5)
  })

  it('produz sempre 7 caracteres, com zero à esquerda quando o canal é baixo', () => {
    // `(3).toString(16)` é `"3"`, e sem o `padStart` a string sairia com 6 caracteres e o
    // `parseHex` seguinte lançaria — num guarda, isso viraria falha sem relação com a medida.
    expect(mixOver('#010203', '#000000', 1)).toBe('#010203')
    expect(mixOver('#000000', '#000000', 0.5)).toHaveLength(7)
  })
})
