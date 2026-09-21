import { describe, expect, it } from 'vitest'
// Importado pelo barrel: prova que maskPhone/stripPhone/isValidBrPhone saem de
// @estrelinha/core/validators, e não de um caminho profundo.
import { isValidBrPhone, maskPhone, stripPhone } from '../index'

describe('maskPhone', () => {
  it('formata 11 dígitos como (00) 00000-0000', () => {
    expect(maskPhone('11988887777')).toBe('(11) 98888-7777')
  })

  it('formata 10 dígitos como (00) 0000-0000 — telefone fixo', () => {
    expect(maskPhone('1133334444')).toBe('(11) 3333-4444')
  })

  it('cresce um dígito por vez sem inventar separador', () => {
    expect(maskPhone('1')).toBe('1')
    expect(maskPhone('11')).toBe('11')
    expect(maskPhone('119')).toBe('(11) 9')
    expect(maskPhone('119888')).toBe('(11) 9888')
    expect(maskPhone('1198888')).toBe('(11) 9888-8')
  })

  // O caso que o ramo de 10 existe para atender: o 11º dígito MOVE o hífen. Com um ramo só, um
  // fixo de 10 dígitos sairia `(11) 33334-444`.
  it('move o hífen quando o 11º dígito chega', () => {
    expect(maskPhone('1198888777')).toBe('(11) 9888-8777')
    expect(maskPhone('11988887777')).toBe('(11) 98888-7777')
  })

  it('ignora dígitos além do 11º', () => {
    expect(maskPhone('119888877779')).toBe('(11) 98888-7777')
  })

  it('reaplica a máscara sobre um valor já mascarado', () => {
    expect(maskPhone('(11) 98888-7777')).toBe('(11) 98888-7777')
  })

  it('aceita o que a pessoa colou com +55, espaço ou ponto', () => {
    expect(maskPhone('11 98888.7777')).toBe('(11) 98888-7777')
  })

  it('devolve string vazia para entrada sem dígito nenhum', () => {
    expect(maskPhone('')).toBe('')
    expect(maskPhone('abc')).toBe('')
  })
})

describe('stripPhone', () => {
  it('remove parênteses, espaço e hífen', () => {
    expect(stripPhone('(11) 98888-7777')).toBe('11988887777')
  })

  // Espelha `stripCep`: truncar aqui faria `isValidBrPhone` aprovar um número comprido demais.
  it('não trunca: 12 dígitos continuam 12 para que o portão reprove', () => {
    expect(stripPhone('119888877779')).toBe('119888877779')
  })
})

describe('isValidBrPhone', () => {
  it('aceita celular (11) e fixo (10)', () => {
    expect(isValidBrPhone('(11) 98888-7777')).toBe(true)
    expect(isValidBrPhone('(11) 3333-4444')).toBe(true)
  })

  it('recusa curto demais, comprido demais e vazio', () => {
    expect(isValidBrPhone('(11) 9888-777')).toBe(false)
    expect(isValidBrPhone('119888877779')).toBe(false)
    expect(isValidBrPhone('')).toBe(false)
  })
})
