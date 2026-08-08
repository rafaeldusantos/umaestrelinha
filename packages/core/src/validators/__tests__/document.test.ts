import { describe, expect, it } from 'vitest'
// Importado pelo barrel: prova que o campo único de documento sai de @nanapin/core/validators.
import { documentLabel, isValidDocument, maskDocument, stripDocument } from '../index'

// DOC-01: máscara 000.000.000-00 até 11 dígitos e 00.000.000/0000-00 a partir do 12º
// DOC-02: 11 dígitos com DV de CPF **ou** 14 com DV de CNPJ => válido; o resto => inválido

const CPF_VALIDO = '529.982.247-25'
const CNPJ_VALIDO = '11.222.333/0001-81'

describe('maskDocument', () => {
  it('até 11 dígitos usa a máscara de CPF', () => {
    expect(maskDocument('52998224725')).toBe('529.982.247-25')
  })

  it('a partir de 12 dígitos troca para a máscara de CNPJ', () => {
    expect(maskDocument('112223330001')).toBe('11.222.333/0001')
  })

  // O caso que trava quem digita CNPJ: `maskCpf` faz `.slice(0, 11)` e o 12º dígito
  // simplesmente não entrava no campo.
  it('a máscara alterna exatamente no 12º dígito digitado', () => {
    expect(maskDocument('11222333000')).toBe('112.223.330-00')
    expect(maskDocument('112223330001')).toBe('11.222.333/0001')
  })

  it('14 dígitos ficam no formato completo de CNPJ', () => {
    expect(maskDocument('11222333000181')).toBe('11.222.333/0001-81')
  })

  it('reaplica a máscara sobre um valor já mascarado, nos dois formatos', () => {
    expect(maskDocument(CPF_VALIDO)).toBe(CPF_VALIDO)
    expect(maskDocument(CNPJ_VALIDO)).toBe(CNPJ_VALIDO)
  })
})

describe('stripDocument', () => {
  it('remove a máscara de CPF e devolve só dígitos', () => {
    expect(stripDocument(CPF_VALIDO)).toBe('52998224725')
  })

  it('remove a máscara de CNPJ e devolve os 14 dígitos', () => {
    expect(stripDocument(CNPJ_VALIDO)).toBe('11222333000181')
  })
})

describe('isValidDocument', () => {
  it('CPF válido continua válido', () => {
    expect(isValidDocument(CPF_VALIDO)).toBe(true)
    expect(isValidDocument('52998224725')).toBe(true)
  })

  it('CNPJ válido é aceito', () => {
    expect(isValidDocument(CNPJ_VALIDO)).toBe(true)
    expect(isValidDocument('11222333000181')).toBe(true)
  })

  it('CPF com DV errado é rejeitado', () => {
    expect(isValidDocument('529.982.247-26')).toBe(false)
  })

  it('CNPJ com DV errado é rejeitado', () => {
    expect(isValidDocument('11.222.333/0001-82')).toBe(false)
  })

  it('comprimento entre 11 e 14 dígitos é rejeitado', () => {
    expect(isValidDocument('112223330001')).toBe(false)
    expect(isValidDocument('1122233300018')).toBe(false)
  })

  it('11 dígitos todos iguais e 14 dígitos todos iguais são rejeitados', () => {
    expect(isValidDocument('111.111.111-11')).toBe(false)
    expect(isValidDocument('11.111.111/1111-11')).toBe(false)
  })

  it('string vazia é rejeitada', () => {
    expect(isValidDocument('')).toBe(false)
  })
})

describe('documentLabel', () => {
  it('até 11 dígitos o documento se chama CPF', () => {
    expect(documentLabel(CPF_VALIDO)).toBe('CPF')
  })

  it('acima de 11 dígitos o documento se chama CNPJ', () => {
    expect(documentLabel(CNPJ_VALIDO)).toBe('CNPJ')
  })

  it('campo vazio é tratado como CPF (o padrão do campo)', () => {
    expect(documentLabel('')).toBe('CPF')
  })
})
