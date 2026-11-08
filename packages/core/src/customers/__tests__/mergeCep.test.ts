import { describe, expect, it } from 'vitest'

import { mergeCep } from '../mergeCep.ts'
import type { ParsedAddress } from '../parse.ts'

// "O CEP manda": quando o serviço de CEP conhece o CEP, rua, bairro, cidade e UF vêm dele, não do
// texto. Sem resposta do serviço, fica o que o texto trouxe.

const lido: ParsedAddress = {
  cep: '90010-000',
  street: 'R. Andradas',
  number: '1001',
  complement: 'apto 3',
  neighborhood: 'Centro',
  city: 'POA',
  state: 'RS',
}

const conhecido = {
  street: 'Rua dos Andradas',
  neighborhood: 'Centro Histórico',
  city: 'Porto Alegre',
  state: 'RS',
  manual: false,
}

describe('mergeCep', () => {
  it('o serviço conhece o CEP ⇒ rua, bairro, cidade e UF vêm dele; número e complemento ficam do texto', () => {
    const r = mergeCep(lido, conhecido)
    expect(r.address).toEqual({
      cep: '90010-000',
      street: 'Rua dos Andradas',
      number: '1001',
      complement: 'apto 3',
      neighborhood: 'Centro Histórico',
      city: 'Porto Alegre',
      state: 'RS',
    })
    expect(r.fromCep).toEqual(['street', 'neighborhood', 'city', 'state'])
  })

  it('sem resposta do serviço ⇒ fica o que o texto trouxe', () => {
    const r = mergeCep(lido, null)
    expect(r.address).toEqual(lido)
    expect(r.fromCep).toEqual([])
  })

  it('o serviço não conhece o CEP (manual) ⇒ fica o que o texto trouxe', () => {
    const r = mergeCep(lido, { street: '', neighborhood: '', city: '', state: '', manual: true })
    expect(r.address).toEqual(lido)
    expect(r.fromCep).toEqual([])
  })

  it('CEP de cidade, sem rua no serviço ⇒ a rua do texto fica, e cidade e UF vêm do serviço', () => {
    const r = mergeCep(lido, { street: '', neighborhood: '', city: 'Porto Alegre', state: 'RS', manual: false })
    expect(r.address.street).toBe('R. Andradas')
    expect(r.address.neighborhood).toBe('Centro')
    expect(r.address.city).toBe('Porto Alegre')
    expect(r.fromCep).toEqual(['city', 'state'])
  })

  it('não muda o endereço que recebeu', () => {
    const copia = { ...lido }
    mergeCep(lido, conhecido)
    expect(lido).toEqual(copia)
  })
})
