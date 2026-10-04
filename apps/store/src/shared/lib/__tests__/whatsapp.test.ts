import { describe, expect, it } from 'vitest'
import { MIN_DIGITOS_WHATSAPP, whatsappHref } from '../whatsapp'

// Feature 59 — `DET-12`: "WHEN o número da loja não está configurado THEN o bloco SHALL não
// aparecer (mesma régua de `PolicyContact`)". A régua é 10 dígitos.

describe('whatsappHref — o portão de 10 dígitos', () => {
  it('o piso é 10 dígitos, o mesmo de `PolicyContact`', () => {
    expect(MIN_DIGITOS_WHATSAPP).toBe(10)
  })

  it.each([null, undefined, '', '   ', '51 9999', '519876543'])(
    'número %p (menos de 10 dígitos) devolve null',
    (numero) => {
      expect(whatsappHref(numero as string | null, 'Olá')).toBeNull()
    },
  )

  it('com 10 dígitos já monta o link — a fronteira inclui o 10', () => {
    expect(whatsappHref('5133334444', 'Olá')).toBe('https://wa.me/5133334444?text=Ol%C3%A1')
  })

  it('a máscara do número sai: só dígitos vão no endereço', () => {
    expect(whatsappHref('+55 (51) 99876-5432', 'Oi')).toBe('https://wa.me/5551998765432?text=Oi')
  })

  it('a mensagem vai codificada — espaço, acento e o `#` do número do pedido', () => {
    const href = whatsappHref('51998765432', 'Pedido #0244: dúvida')
    expect(href).toBe('https://wa.me/51998765432?text=Pedido%20%230244%3A%20d%C3%BAvida')
    expect(new URL(href as string).searchParams.get('text')).toBe('Pedido #0244: dúvida')
  })
})
