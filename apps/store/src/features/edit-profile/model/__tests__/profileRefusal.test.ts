import { describe, expect, it } from 'vitest'
import { NOME_INCOMPLETO, WHATSAPP_INVALIDO, profileRefusal } from '../profileRefusal'

// Feature 59 — DAD-03: nome vazio ou com menos de 2 caracteres, ou WhatsApp sem 10 ou 11 dígitos,
// não grava, e o campo diz o motivo.

describe('profileRefusal — os literais (DAD-03)', () => {
  it('as frases de cada motivo', () => {
    expect(NOME_INCOMPLETO).toBe('Informe seu nome completo.')
    expect(WHATSAPP_INVALIDO).toBe('Informe um WhatsApp com DDD.')
  })
})

describe('profileRefusal — o nome (DAD-03)', () => {
  it.each(['', '   ', 'A', ' A '])('nome %p é recusado', (name) => {
    expect(profileRefusal({ name, phone: '51998765432' })).toEqual({ name: NOME_INCOMPLETO, phone: null })
  })

  it('duas letras já passam (o piso é 2, aparado)', () => {
    expect(profileRefusal({ name: ' Al ', phone: '51998765432' })).toBeNull()
  })
})

describe('profileRefusal — o WhatsApp (DAD-03)', () => {
  it.each(['', '519987654', '519987654321', '(51) 9876-543'])('telefone %p é recusado', (phone) => {
    expect(profileRefusal({ name: 'Ana Nunes', phone })).toEqual({ name: null, phone: WHATSAPP_INVALIDO })
  })

  it.each(['(51) 3333-4444', '(51) 99876-5432', '51998765432'])('telefone %p passa (10 ou 11 dígitos)', (phone) => {
    expect(profileRefusal({ name: 'Ana Nunes', phone })).toBeNull()
  })
})

describe('profileRefusal — os dois juntos', () => {
  it('os dois motivos aparecem ao mesmo tempo', () => {
    expect(profileRefusal({ name: 'A', phone: '51' })).toEqual({
      name: NOME_INCOMPLETO,
      phone: WHATSAPP_INVALIDO,
    })
  })
})
