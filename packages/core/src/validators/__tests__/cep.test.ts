import { describe, expect, it } from 'vitest'
// Importado pelo barrel: prova que maskCep/stripCep saem de @estrelinha/core/validators.
import { maskCep, stripCep } from '../index'

// Comportamento preservado de AddressStep.tsx:11 (a implementação subiu para o domínio).
// SHP-03: o portão "CEP com 8 dígitos" depende de stripCep não truncar.

describe('maskCep', () => {
  it('formata 8 dígitos como 00000-000', () => {
    expect(maskCep('01310100')).toBe('01310-100')
  })

  it('não insere o hífen antes do 6º dígito', () => {
    expect(maskCep('01310')).toBe('01310')
  })

  it('ignora dígitos além do 8º', () => {
    expect(maskCep('013101009')).toBe('01310-100')
  })

  it('reaplica a máscara sobre um valor já mascarado', () => {
    expect(maskCep('01310-100')).toBe('01310-100')
  })
})

describe('stripCep', () => {
  it('remove o hífen e devolve só dígitos', () => {
    expect(stripCep('01310-100')).toBe('01310100')
  })

  it('não trunca: 9 dígitos continuam 9 para que o portão de 8 dígitos reprove', () => {
    expect(stripCep('013101009')).toBe('013101009')
  })
})
