import { describe, expect, it } from 'vitest'
import { ADDRESS_FIELD_MESSAGES, ENDERECO_NAO_SALVO, addressRefusal } from '../addressRefusal'

// Feature 59 — DAD-07: CEP de 8 dígitos, rua, número, bairro, cidade e UF obrigatórios;
// complemento opcional. DAD-09: a frase da gravação que falhou.

const completo = {
  cep: '90010-000',
  street: 'Rua da Praia',
  number: '100',
  complement: '',
  neighborhood: 'Centro Histórico',
  city: 'Porto Alegre',
  state: 'RS',
}

describe('addressRefusal (DAD-07)', () => {
  it('endereço completo, sem complemento, passa', () => {
    expect(addressRefusal(completo)).toBeNull()
  })

  it.each(['', '9001-000', '900100001'])('CEP %p é recusado', (cep) => {
    expect(addressRefusal({ ...completo, cep })?.cep).toBe('Informe o CEP com 8 dígitos.')
  })

  it.each([
    ['street', 'Informe a rua.'],
    ['number', 'Informe o número.'],
    ['neighborhood', 'Informe o bairro.'],
    ['city', 'Informe a cidade.'],
    ['state', 'Informe a UF.'],
  ] as const)('%s só com espaço é recusado com "%s", e só ele', (campo, frase) => {
    const recusa = addressRefusal({ ...completo, [campo]: '   ' })
    expect(recusa?.[campo]).toBe(frase)
    expect(Object.values(recusa ?? {}).filter(Boolean)).toEqual([frase])
  })

  it.each(['R', 'RSS', '1A'])('UF %p não é sigla de duas letras', (state) => {
    expect(addressRefusal({ ...completo, state })?.state).toBe(ADDRESS_FIELD_MESSAGES.state)
  })

  it('a frase da gravação que falhou', () => {
    expect(ENDERECO_NAO_SALVO).toBe('Não foi possível salvar o endereço agora.')
  })
})
