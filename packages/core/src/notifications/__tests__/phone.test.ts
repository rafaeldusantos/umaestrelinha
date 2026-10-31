import { describe, expect, it } from 'vitest'

import { normalizeBrPhone, whatsappChatUrl } from '../phone.ts'

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

describe('whatsappChatUrl (feature 76, MAC-26)', () => {
  it('monta o wa.me do número normalizado, por extenso', () => {
    expect(whatsappChatUrl('+55 (51) 99812-4471')).toBe('https://wa.me/5551998124471')
    expect(whatsappChatUrl('5551998124471')).toBe('https://wa.me/5551998124471')
    expect(whatsappChatUrl('(51) 3012-3456')).toBe('https://wa.me/555130123456')
  })

  it('número que não presta, vazio, nulo e indefinido → null', () => {
    expect(whatsappChatUrl('123')).toBeNull()
    expect(whatsappChatUrl('')).toBeNull()
    expect(whatsappChatUrl(null)).toBeNull()
    expect(whatsappChatUrl(undefined)).toBeNull()
  })

  it('nunca carrega mensagem pronta', () => {
    expect(whatsappChatUrl('(51) 99812-4471')).not.toContain('text=')
  })
})

describe('whatsappChatUrl com mensagem pronta (feature 89, LNK-02)', () => {
  it('com texto: o texto vai em ?text= codificado por encodeURIComponent, por extenso', () => {
    const texto = 'Oi, Ana! Montei seu pedido: https://loja.exemplo/pedido-montado#abc&x=1 ✓'
    expect(whatsappChatUrl('(51) 99812-4471', texto)).toBe(
      'https://wa.me/5551998124471?text=Oi%2C%20Ana!%20Montei%20seu%20pedido%3A%20https%3A%2F%2Floja.exemplo%2Fpedido-montado%23abc%26x%3D1%20%E2%9C%93',
    )
  })

  it('o fragmento e o & do link não escapam do parâmetro (decodifica de volta ao texto inteiro)', () => {
    const texto = 'veja https://x.y/pedido-montado#tok&a=b\nlinha 2'
    const url = new URL(whatsappChatUrl('51998124471', texto) as string)
    expect(url.hash).toBe('')
    expect([...url.searchParams.keys()]).toEqual(['text'])
    expect(url.searchParams.get('text')).toBe(texto)
  })

  it('sem texto, texto vazio ou nulo: a URL de hoje, sem ?text=', () => {
    const hoje = 'https://wa.me/5551998124471'
    expect(whatsappChatUrl('(51) 99812-4471')).toBe(hoje)
    expect(whatsappChatUrl('(51) 99812-4471', undefined)).toBe(hoje)
    expect(whatsappChatUrl('(51) 99812-4471', '')).toBe(hoje)
    expect(whatsappChatUrl('(51) 99812-4471', null)).toBe(hoje)
  })

  it('número que não presta continua null, mesmo com texto', () => {
    expect(whatsappChatUrl('123', 'Oi')).toBeNull()
    expect(whatsappChatUrl(null, 'Oi')).toBeNull()
  })
})
