// Feature `76` · T15 — nome, inicial e telefone da cliente (`MAC-03`, `MAC-15`, `MAC-17`).
import { describe, expect, it } from 'vitest'

import { inicialDoCliente, nomeDoCliente, telefoneDoCliente } from '../identidade'

describe('nomeDoCliente', () => {
  it('o nome aparado', () => expect(nomeDoCliente({ name: '  Marina Duarte ', email: 'm@exemplo.invalid' })).toBe('Marina Duarte'))
  it('vazio ⇒ o e-mail', () => expect(nomeDoCliente({ name: '', email: 'm@exemplo.invalid' })).toBe('m@exemplo.invalid'))
  it('só espaços ⇒ o e-mail', () => expect(nomeDoCliente({ name: '   ', email: 'm@exemplo.invalid' })).toBe('m@exemplo.invalid'))
  it('null ⇒ o e-mail', () => expect(nomeDoCliente({ name: null, email: 'm@exemplo.invalid' })).toBe('m@exemplo.invalid'))
  it('ausente ⇒ o e-mail', () => expect(nomeDoCliente({ email: 'm@exemplo.invalid' })).toBe('m@exemplo.invalid'))
})

describe('inicialDoCliente', () => {
  it('a primeira letra do nome, em maiúscula', () => expect(inicialDoCliente({ name: 'marina', email: 'x@y.z' })).toBe('M'))
  it('aparada antes de pegar a letra', () => expect(inicialDoCliente({ name: '  ana', email: 'x@y.z' })).toBe('A'))
  it('acentuada em maiúscula', () => expect(inicialDoCliente({ name: 'érica', email: 'x@y.z' })).toBe('É'))
  it('sem nome: a do e-mail, nunca `?`', () => {
    expect(inicialDoCliente({ name: null, email: 'beatriz@exemplo.invalid' })).toBe('B')
    expect(inicialDoCliente({ name: '   ', email: 'zeca@exemplo.invalid' })).toBe('Z')
  })
  it('é a primeira letra DO QUE nomeDoCliente devolve', () => {
    const c = { name: ' lívia', email: 'a@b.c' }
    expect(inicialDoCliente(c)).toBe(nomeDoCliente(c)[0].toLocaleUpperCase('pt-BR'))
  })
  it('um par de substituição (emoji) não vira meia letra', () => {
    expect(inicialDoCliente({ name: '😀 Ana', email: 'a@b.c' })).toBe('😀')
  })
})

describe('telefoneDoCliente', () => {
  it('só dígitos com DDD', () =>
    expect(telefoneDoCliente({ phone: '51998124471' })).toEqual({ mascarado: '(51) 99812-4471', whatsapp: 'https://wa.me/5551998124471' }))
  it('com +55 e máscara', () =>
    expect(telefoneDoCliente({ phone: '+55 (51) 99812-4471' })).toEqual({ mascarado: '(51) 99812-4471', whatsapp: 'https://wa.me/5551998124471' }))
  it('com 55 na frente, só dígitos', () =>
    expect(telefoneDoCliente({ phone: '5551998124471' })).toEqual({ mascarado: '(51) 99812-4471', whatsapp: 'https://wa.me/5551998124471' }))
  it('fixo de dez dígitos', () =>
    expect(telefoneDoCliente({ phone: '(51) 3012-3456' })).toEqual({ mascarado: '(51) 3012-3456', whatsapp: 'https://wa.me/555130123456' }))
  it('curto demais ⇒ null (um número que o wa.me não entende não vira link)', () => expect(telefoneDoCliente({ phone: '123' })).toBeNull())
  it('null e ausente ⇒ null', () => {
    expect(telefoneDoCliente({ phone: null })).toBeNull()
    expect(telefoneDoCliente({})).toBeNull()
  })
  it('o link não leva texto', () => expect(telefoneDoCliente({ phone: '51998124471' }).whatsapp).not.toContain('?'))
})
