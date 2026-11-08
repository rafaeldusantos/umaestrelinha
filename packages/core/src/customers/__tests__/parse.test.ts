import { describe, expect, it } from 'vitest'

import { CUSTOMER_PARSE_TEXT_MAX, parseCustomerText, parsedFieldCount } from '../parse.ts'

// A saída crua do modelo passa por aqui antes de chegar a qualquer campo: o que não confere vira
// vazio, nunca um valor inventado. Os valores esperados são literais escritos à mão.

const CPF_VALIDO = '529.982.247-25'

const cru = (extra: Record<string, unknown> = {}) => ({
  name: '  Maria   Souza ',
  email: ' Maria.Souza@Exemplo.com ',
  phone: '51999998888',
  cpf: '52998224725',
  cep: '90010000',
  street: 'Rua dos Andradas',
  number: '1001',
  complement: 'apto 3',
  neighborhood: 'Centro Histórico',
  city: 'Porto Alegre',
  state: 'rs',
  ...extra,
})

describe('parseCustomerText — contato e endereço', () => {
  it('aplica a máscara do telefone e do CEP, a forma canônica do e-mail e a do CPF', () => {
    const p = parseCustomerText(cru(), 'contact_and_address')
    expect(p.contact).toEqual({
      name: 'Maria Souza',
      email: 'maria.souza@exemplo.com',
      phone: '(51) 99999-8888',
      cpf: CPF_VALIDO,
    })
    expect(p.address).toEqual({
      cep: '90010-000',
      street: 'Rua dos Andradas',
      number: '1001',
      complement: 'apto 3',
      neighborhood: 'Centro Histórico',
      city: 'Porto Alegre',
      state: 'RS',
    })
  })

  it('telefone fixo de 10 dígitos sai na forma de fixo', () => {
    expect(parseCustomerText(cru({ phone: '5133334444' }), 'contact_and_address').contact.phone).toBe('(51) 3333-4444')
  })

  it('o DDI 55 na frente do número é tirado', () => {
    expect(parseCustomerText(cru({ phone: '+55 51 99999-8888' }), 'contact_and_address').contact.phone).toBe('(51) 99999-8888')
  })

  it('CPF com o dígito verificador errado vira vazio', () => {
    expect(parseCustomerText(cru({ cpf: '529.982.247-26' }), 'contact_and_address').contact.cpf).toBe('')
  })

  it('CPF de dígitos repetidos vira vazio', () => {
    expect(parseCustomerText(cru({ cpf: '11111111111' }), 'contact_and_address').contact.cpf).toBe('')
  })

  it('e-mail inválido vira vazio', () => {
    expect(parseCustomerText(cru({ email: 'maria arroba exemplo' }), 'contact_and_address').contact.email).toBe('')
    expect(parseCustomerText(cru({ email: 'maria@exemplo' }), 'contact_and_address').contact.email).toBe('')
  })

  it('telefone sem 10 ou 11 dígitos vira vazio', () => {
    expect(parseCustomerText(cru({ phone: '99998888' }), 'contact_and_address').contact.phone).toBe('')
  })

  it('CEP sem 8 dígitos vira vazio', () => {
    expect(parseCustomerText(cru({ cep: '9001000' }), 'contact_and_address').address.cep).toBe('')
  })

  it('UF que não existe vira vazio', () => {
    expect(parseCustomerText(cru({ state: 'XX' }), 'contact_and_address').address.state).toBe('')
    expect(parseCustomerText(cru({ state: 'Rio Grande do Sul' }), 'contact_and_address').address.state).toBe('')
  })

  it('campo ausente, nulo ou que não é texto vira vazio', () => {
    const p = parseCustomerText({ name: 42, email: null, street: ['Rua'] }, 'contact_and_address')
    expect(p.contact).toEqual({ name: '', email: '', phone: '', cpf: '' })
    expect(p.address.street).toBe('')
    expect(p.address.city).toBe('')
  })

  it('saída que não é objeto vira tudo vazio', () => {
    const p = parseCustomerText('Maria Souza', 'contact_and_address')
    expect(parsedFieldCount(p)).toBe(0)
    expect(p.contact).toEqual({ name: '', email: '', phone: '', cpf: '' })
  })

  it('texto acima do teto do campo é cortado', () => {
    const p = parseCustomerText(cru({ name: 'a'.repeat(500) }), 'contact_and_address')
    expect(p.contact.name.length).toBeLessThanOrEqual(120)
  })

  it('conta os campos preenchidos (o "Preenchi N de 11")', () => {
    expect(parsedFieldCount(parseCustomerText(cru(), 'contact_and_address'))).toBe(11)
    expect(parsedFieldCount(parseCustomerText(cru({ email: 'x', cpf: '', complement: '' }), 'contact_and_address'))).toBe(8)
  })
})

describe('parseCustomerText — só o endereço', () => {
  it('não devolve contato, mesmo que a saída crua traga', () => {
    const p = parseCustomerText(cru(), 'address')
    expect(p.contact).toBeNull()
    expect(p.address.cep).toBe('90010-000')
    expect(parsedFieldCount(p)).toBe(7)
  })
})

describe('o teto do texto colado', () => {
  it('é 2.000 caracteres', () => {
    expect(CUSTOMER_PARSE_TEXT_MAX).toBe(2000)
  })
})
