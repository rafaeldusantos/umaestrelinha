import { describe, expect, it } from 'vitest'
// Importado pelo barrel: prova que maskCpf/stripCpf/isValidCpf saem de @nanapin/core/validators.
import { isValidCpf, maskCpf, stripCpf } from '../index'

// PGD-01: campo CPF com máscara 000.000.000-00
// PGD-02: menos/mais de 11 dígitos ou DV incorreto => inválido (CTA desabilitado)

describe('maskCpf', () => {
  it('formata 11 dígitos como 000.000.000-00', () => {
    expect(maskCpf('12345678909')).toBe('123.456.789-09')
  })

  it('formata progressivamente enquanto a cliente digita', () => {
    expect(maskCpf('123')).toBe('123')
    expect(maskCpf('1234')).toBe('123.4')
    expect(maskCpf('1234567')).toBe('123.456.7')
    expect(maskCpf('123456789')).toBe('123.456.789')
  })

  it('ignora dígitos além do 11º', () => {
    expect(maskCpf('123456789091234')).toBe('123.456.789-09')
  })

  it('reaplica a máscara sobre um valor já mascarado', () => {
    expect(maskCpf('123.456.789-09')).toBe('123.456.789-09')
  })
})

describe('stripCpf', () => {
  it('remove a máscara e devolve só dígitos', () => {
    expect(stripCpf('123.456.789-09')).toBe('12345678909')
  })

  it('não trunca: preserva dígitos além do 11º para que isValidCpf possa reprovar', () => {
    expect(stripCpf('123.456.789-0912')).toBe('1234567890912')
  })
})

describe('isValidCpf', () => {
  it('aceita CPF válido com máscara', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true)
  })

  it('aceita o mesmo CPF válido sem máscara', () => {
    expect(isValidCpf('52998224725')).toBe(true)
  })

  it('aceita outro CPF válido (DV terminando em 0)', () => {
    expect(isValidCpf('123.456.789-09')).toBe(true)
  })

  it('rejeita CPF com menos de 11 dígitos', () => {
    expect(isValidCpf('5299822472')).toBe(false)
  })

  it('rejeita CPF com mais de 11 dígitos', () => {
    expect(isValidCpf('529982247251')).toBe(false)
  })

  it('rejeita string vazia', () => {
    expect(isValidCpf('')).toBe(false)
  })

  it('rejeita todos os dígitos iguais mesmo quando o DV fecha', () => {
    // 111.111.111-11 satisfaz o algoritmo de DV — a rejeição é explícita.
    expect(isValidCpf('11111111111')).toBe(false)
    expect(isValidCpf('000.000.000-00')).toBe(false)
    expect(isValidCpf('99999999999')).toBe(false)
  })

  it('rejeita primeiro dígito verificador incorreto', () => {
    // válido é ...-25; aqui o 1º DV vira 3
    expect(isValidCpf('529.982.247-35')).toBe(false)
  })

  it('rejeita segundo dígito verificador incorreto', () => {
    // válido é ...-25; aqui o 2º DV vira 6
    expect(isValidCpf('529.982.247-26')).toBe(false)
  })

  it('rejeita CPF com 11 caracteres mas letras no lugar de dígitos', () => {
    expect(isValidCpf('5299822472a')).toBe(false)
  })
})
