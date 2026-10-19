// Feature 67 — D2 da prova em navegador: as contagens do valor com as duas formas de marcação.
import { describe, expect, it } from 'vitest'
import { contagemDoValor, pecasDoValor } from '../copy'

describe('contagemDoValor — a linha do valor em /admin/filtros', () => {
  it('sem marcação por opção é a frase da 66, intacta', () => {
    expect(contagemDoValor(183)).toBe('183 peças marcadas')
    expect(contagemDoValor(1, 0)).toBe('1 peça marcada')
    expect(contagemDoValor(0, 0)).toBe('0 peças marcadas')
  })

  it('as duas formas DIVERGINDO: cada uma na própria unidade, nunca somadas como "peças"', () => {
    const frase = contagemDoValor(183, 171)
    expect(frase).toBe('183 peças na peça toda · 171 marcações por opção')
    // A soma (354) seria "peças" contando duas vezes a peça com as duas formas.
    expect(frase).not.toContain('354')
  })

  it('só por opção não diz "0 peças"', () => {
    expect(contagemDoValor(0, 145)).toBe('145 marcações por opção')
    expect(contagemDoValor(0, 1)).toBe('1 marcação por opção')
  })

  it('o singular nas duas parcelas', () => {
    expect(contagemDoValor(1, 1)).toBe('1 peça na peça toda · 1 marcação por opção')
  })
})

describe('pecasDoValor — o cabeçalho da marcação em massa (peças distintas, pela união)', () => {
  it('sem marcação por opção é a frase da 66', () => {
    expect(pecasDoValor(new Set(['a', 'b']), [])).toBe('2 peças marcadas')
  })

  it('a peça com as DUAS formas no mesmo valor conta UMA vez no total, e aparece nas duas parcelas', () => {
    // a: peça toda e por opção · b: só peça toda · c, d: só por opção.
    expect(pecasDoValor(new Set(['a', 'b']), ['a', 'c', 'd'])).toBe('4 peças marcadas · 2 na peça toda · 3 por opção')
  })

  it('formas totalmente divergentes: a união é a soma', () => {
    expect(pecasDoValor(new Set(['a']), ['b', 'c'])).toBe('3 peças marcadas · 1 na peça toda · 2 por opção')
  })

  it('id repetido no iterável (duas opções da mesma peça) não conta duas vezes', () => {
    expect(pecasDoValor(new Set(), ['c', 'c'])).toBe('1 peça marcada por opção')
  })
})
