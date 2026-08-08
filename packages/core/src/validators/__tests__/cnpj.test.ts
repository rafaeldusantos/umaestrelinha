import { describe, expect, it } from 'vitest'
// Importado pelo barrel: prova que maskCnpj/stripCnpj/isValidCnpj saem de @nanapin/core/validators.
import { isValidCnpj, maskCnpj, stripCnpj } from '../index'

// DOC-01: campo de documento com máscara 00.000.000/0000-00 a partir do 12º dígito
// DOC-02: 14 dígitos com os dois DVs corretos => válido; qualquer outra coisa => inválido

describe('maskCnpj', () => {
  it('formata 14 dígitos como 00.000.000/0000-00', () => {
    expect(maskCnpj('11222333000181')).toBe('11.222.333/0001-81')
  })

  it('formata progressivamente enquanto a cliente digita', () => {
    expect(maskCnpj('11')).toBe('11')
    expect(maskCnpj('112')).toBe('11.2')
    expect(maskCnpj('11222')).toBe('11.222')
    expect(maskCnpj('11222333')).toBe('11.222.333')
    expect(maskCnpj('112223330')).toBe('11.222.333/0')
    expect(maskCnpj('1122233300018')).toBe('11.222.333/0001-8')
  })

  it('ignora dígitos além do 14º', () => {
    expect(maskCnpj('1122233300018199')).toBe('11.222.333/0001-81')
  })

  it('reaplica a máscara sobre um valor já mascarado', () => {
    expect(maskCnpj('11.222.333/0001-81')).toBe('11.222.333/0001-81')
  })
})

describe('stripCnpj', () => {
  it('remove a máscara e devolve só dígitos', () => {
    expect(stripCnpj('11.222.333/0001-81')).toBe('11222333000181')
  })

  it('não trunca: preserva dígitos além do 14º para que isValidCnpj possa reprovar', () => {
    expect(stripCnpj('11.222.333/0001-8199')).toBe('1122233300018199')
  })
})

describe('isValidCnpj', () => {
  it('aceita CNPJ válido com máscara', () => {
    expect(isValidCnpj('11.222.333/0001-81')).toBe(true)
  })

  it('aceita o mesmo CNPJ válido sem máscara', () => {
    expect(isValidCnpj('11222333000181')).toBe(true)
  })

  it('aceita outro CNPJ válido (1º DV zero)', () => {
    expect(isValidCnpj('33.000.167/0001-01')).toBe(true)
  })

  it('rejeita CNPJ com menos de 14 dígitos', () => {
    expect(isValidCnpj('1122233300018')).toBe(false)
  })

  it('rejeita CNPJ com mais de 14 dígitos', () => {
    expect(isValidCnpj('112223330001811')).toBe(false)
  })

  it('rejeita string vazia', () => {
    expect(isValidCnpj('')).toBe(false)
  })

  it('rejeita todos os dígitos iguais mesmo quando o DV fecha', () => {
    // 11.111.111/1111-11 satisfaz o algoritmo de DV — a rejeição é explícita.
    expect(isValidCnpj('11111111111111')).toBe(false)
    expect(isValidCnpj('11.111.111/1111-11')).toBe(false)
    expect(isValidCnpj('00000000000000')).toBe(false)
  })

  it('rejeita primeiro dígito verificador incorreto', () => {
    // válido é ...-81; aqui o 1º DV vira 9
    expect(isValidCnpj('11.222.333/0001-91')).toBe(false)
  })

  it('rejeita segundo dígito verificador incorreto', () => {
    // válido é ...-81; aqui o 2º DV vira 2
    expect(isValidCnpj('11.222.333/0001-82')).toBe(false)
  })

  it('rejeita CNPJ com 14 caracteres mas letras no lugar de dígitos', () => {
    expect(isValidCnpj('1122233300018a')).toBe(false)
  })

  it('rejeita um CPF válido: 11 dígitos não são CNPJ', () => {
    expect(isValidCnpj('529.982.247-25')).toBe(false)
  })
})
