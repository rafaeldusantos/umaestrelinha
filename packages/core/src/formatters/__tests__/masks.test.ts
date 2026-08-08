import { describe, expect, it } from 'vitest'
import {
  parseBRL, formatBRL,
  parseGrams, formatGrams,
  parseCm, formatCm,
  parsePercent, formatPercent,
} from '../index'

// Testes derivados de PFM-10 e do "Done when" da T8.
//
// O NBSP aparece de novo aqui: `Intl.NumberFormat('pt-BR')` não usa espaço comum. Mesma razão do
// teste de `formatPrice` — drift de ICU tem que virar teste vermelho, não glifo estranho num campo.
const NBSP = ' '

describe('parseBRL — o que a pessoa digita ou cola', () => {
  it.each([
    ['R$ 1.234,56', 1234.56],
    ['R$1.234,56', 1234.56],
    ['1.234,56', 1234.56],
    ['1234,56', 1234.56],
    ['1234.56', 1234.56],
    ['1234', 1234],
    ['0,90', 0.9],
    [',5', 0.5],
    ['14,90', 14.9],
  ])('parseBRL(%o) → %s', (input, expected) => {
    expect(parseBRL(input)).toBe(expected)
  })

  it(`tolera o NBSP que o próprio Intl emite — colar de volta o que a tela mostrou tem que funcionar`, () => {
    expect(parseBRL(`R$${NBSP}1.234,56`)).toBe(1234.56)
  })

  it('a ambiguidade de ponto sem vírgula é resolvida pelo tamanho do último grupo', () => {
    expect(parseBRL('1.234')).toBe(1234)        // 3 dígitos → milhar (leitura pt-BR)
    expect(parseBRL('1.234.567')).toBe(1234567) // milhar encadeado
    expect(parseBRL('1234.56')).toBe(1234.56)   // 2 dígitos → decimal (formato de máquina)
    expect(parseBRL('12.5')).toBe(12.5)         // 1 dígito → decimal
  })

  it('preserva o sinal negativo', () => {
    expect(parseBRL('-1.234,56')).toBe(-1234.56)
    expect(parseBRL('R$ -10')).toBe(-10)
  })

  it('aceita number direto, para o campo poder ser reidratado sem round-trip por string', () => {
    expect(parseBRL(1234.56)).toBe(1234.56)
    expect(parseBRL(0)).toBe(0)
  })
})

describe('parseBRL — nunca NaN', () => {
  it.each([
    ['texto sem número', 'abc'],
    ['string vazia', ''],
    ['só espaço', '   '],
    ['só símbolo', 'R$'],
    ['só pontuação', '.,.'],
    ['null', null],
    ['undefined', undefined],
    ['objeto', {}],
    ['NaN', Number.NaN],
    ['Infinity', Number.POSITIVE_INFINITY],
  ])('%s → null', (_label, input) => {
    expect(parseBRL(input)).toBeNull()
  })

  it('nenhuma entrada inválida produz NaN — NaN se propaga calado até o banco', () => {
    for (const input of ['abc', '', 'R$', null, undefined, {}]) {
      expect(Number.isNaN(parseBRL(input) as number)).toBe(false)
    }
  })
})

describe('formatBRL — valor DENTRO do input, sem o símbolo', () => {
  it.each([
    [1234.56, `1.234,56`],
    [0, `0,00`],
    [14.9, `14,90`],
    [1234567.8, `1.234.567,80`],
    [-1234.56, `-1.234,56`],
  ])('formatBRL(%s) → %o', (value, expected) => {
    expect(formatBRL(value)).toBe(expected)
  })

  it('NÃO inclui R$ — o símbolo é slot fixo na UI, fora do valor', () => {
    expect(formatBRL(1234.56)).not.toContain('R$')
  })

  it.each([[null], [undefined], [Number.NaN]])('%s → string vazia', value => {
    expect(formatBRL(value as number)).toBe('')
  })

  it('ida e volta é estável', () => {
    for (const v of [0, 0.9, 14.9, 1234.56, 1234567.8]) {
      expect(parseBRL(formatBRL(v))).toBe(v)
    }
  })
})

describe('parseGrams / formatGrams — a pessoa digita gramas, o banco guarda kg', () => {
  it('parseGrams("18") → 0.018 kg', () => {
    expect(parseGrams('18')).toBe(0.018)
  })

  it.each([
    ['18', 0.018],
    ['22', 0.022],
    ['1000', 1],
    ['0', 0],
    ['1500', 1.5],
  ])('parseGrams(%o) → %s kg', (input, expected) => {
    expect(parseGrams(input)).toBe(expected)
  })

  it('formatGrams(0.018) → "18 g"', () => {
    expect(formatGrams(0.018)).toBe('18 g')
  })

  it('nunca vaza casa decimal para a tela, mesmo com kg de precisão sub-grama', () => {
    // O banco é numeric(6,3), mas nada impede um valor legado com mais precisão, e
    // `kg * 1000` em ponto flutuante não é confiável para todo valor. O contrato aqui é:
    // a saída é SEMPRE "<inteiro> g".
    for (const kg of [0.018, 0.0185, 0.02249, 0.1, 0.3333, 1]) {
      expect(formatGrams(kg)).toMatch(/^-?\d+ g$/)
    }
    expect(formatGrams(0.0185)).toBe('19 g')  // 18,5 arredonda para cima
    expect(formatGrams(0.01849)).toBe('18 g')
  })

  it('ida e volta é estável nos pesos reais do catálogo', () => {
    for (const grams of ['16', '18', '22', '45']) {
      expect(formatGrams(parseGrams(grams))).toBe(`${grams} g`)
    }
  })

  it('arredonda para 3 casas, que é a precisão de numeric(6,3)', () => {
    expect(parseGrams('18,7')).toBe(0.019)
  })

  it.each([[null], [undefined], ['abc'], ['']])('parseGrams(%o) → null', input => {
    expect(parseGrams(input)).toBeNull()
  })

  it.each([[null], [undefined], [Number.NaN]])('formatGrams(%o) → string vazia', value => {
    expect(formatGrams(value as number)).toBe('')
  })
})

describe('parseCm / formatCm — uma casa decimal', () => {
  it.each([
    ['11', 11],
    ['11,5', 11.5],
    ['11.5', 11.5],
    ['11,47', 11.5],
  ])('parseCm(%o) → %s', (input, expected) => {
    expect(parseCm(input)).toBe(expected)
  })

  // Espaço COMUM antes do sufixo, não NBSP: o sufixo é concatenado por nós, não pelo Intl.
  // Consistente com `formatGrams` ("18 g"). O NBSP só aparece onde o próprio Intl o emite.
  it.each([
    [11, '11,0 cm'],
    [11.5, '11,5 cm'],
    [2, '2,0 cm'],
  ])('formatCm(%s) → %o', (value, expected) => {
    expect(formatCm(value)).toBe(expected)
  })

  it('o separador do sufixo é espaço comum, não NBSP', () => {
    expect(formatCm(11).charCodeAt(4)).toBe(0x20)
  })

  it('o sufixo cm não entra no valor de volta', () => {
    expect(parseCm(formatCm(11.5))).toBe(11.5)
  })

  it.each([[null], [undefined], ['abc']])('parseCm(%o) → null', input => {
    expect(parseCm(input)).toBeNull()
  })
})

describe('parsePercent / formatPercent — inteiro', () => {
  it.each([
    ['10', 10],
    ['10,4', 10],
    ['10,6', 11],
    ['-5', -5],
  ])('parsePercent(%o) → %s', (input, expected) => {
    expect(parsePercent(input)).toBe(expected)
  })

  it.each([[10, '10%'], [10.6, '11%'], [0, '0%']])('formatPercent(%s) → %o', (value, expected) => {
    expect(formatPercent(value)).toBe(expected)
  })

  it('o sufixo % não entra no valor de volta', () => {
    expect(parsePercent(formatPercent(10))).toBe(10)
  })

  it.each([[null], [undefined], ['abc']])('parsePercent(%o) → null', input => {
    expect(parsePercent(input)).toBeNull()
  })
})
