import { describe, expect, it } from 'vitest'

import { normalizeBrPhone } from '../phone.ts'

/**
 * PNL-07 — o comportamento de `whatsappNumber` (backoffice), agora com um dono em `core`. Os quatro
 * casos de `orderList.test.ts` continuam valendo lá; aqui entram os que o painel nunca precisou
 * distinguir e o WhatsApp da feature 43 vai precisar.
 */

describe('normalizeBrPhone', () => {
  it('11 dígitos (celular com DDD) ganha o 55', () => {
    expect(normalizeBrPhone('51999184227')).toBe('5551999184227')
  })

  it('10 dígitos (fixo com DDD) também é aceito, e ganha o 55', () => {
    expect(normalizeBrPhone('5133334444')).toBe('555133334444')
  })

  it('já com 55 na frente, sai igual — idempotente', () => {
    expect(normalizeBrPhone('5551999184227')).toBe('5551999184227')
    expect(normalizeBrPhone(normalizeBrPhone('51999184227'))).toBe('5551999184227')
  })

  it('máscara, espaço e + são descartados: `(51) 99918-4227` e `+55 (51) 99918-4227`', () => {
    expect(normalizeBrPhone('(51) 99918-4227')).toBe('5551999184227')
    expect(normalizeBrPhone('+55 (51) 99918-4227')).toBe('5551999184227')
  })

  it('vazio, nulo e indefinido → null', () => {
    expect(normalizeBrPhone('')).toBeNull()
    expect(normalizeBrPhone('   ')).toBeNull()
    expect(normalizeBrPhone(null)).toBeNull()
    expect(normalizeBrPhone(undefined)).toBeNull()
  })

  it('9 dígitos (sem DDD) → null — número curto demais para discar', () => {
    expect(normalizeBrPhone('999184227')).toBeNull()
    expect(normalizeBrPhone('1234')).toBeNull()
  })

  it('só letras → null', () => {
    expect(normalizeBrPhone('sem telefone')).toBeNull()
  })
})
