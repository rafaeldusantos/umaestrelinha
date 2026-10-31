import { describe, expect, it } from 'vitest'
import * as core from '@estrelinha/core/hooks/useCepLookup'
import * as entidade from '@/entities/address/api/useCepLookup'
import * as barril from '@/entities/address'
import * as checkout from '@/features/checkout/api/useCepLookup'

// Mora em `app/` porque é a camada que pode ler `entities` e `features` juntas (a fronteira FSD
// recusaria `entities` lendo `features`).
// Feature 89 (`MON-04`): a consulta de CEP subiu para `core` porque o painel passa a usá-la. A loja
// reexporta por REFERÊNCIA — `toBe`, nunca `toEqual`: uma cópia com o mesmo comportamento passaria
// num teste estrutural e voltaria a ser um segundo dono da regra.
describe('useCepLookup tem dono único em core', () => {
  it('a entidade da loja reexporta o hook e a chave de core por referência', () => {
    expect(entidade.useCepLookup).toBe(core.useCepLookup)
    expect(entidade.CEP_LOOKUP_KEY).toBe(core.CEP_LOOKUP_KEY)
  })

  it('o barril da entidade e o endereço antigo do checkout chegam ao mesmo hook', () => {
    expect(barril.useCepLookup).toBe(core.useCepLookup)
    expect(checkout.useCepLookup).toBe(core.useCepLookup)
  })

  it('âncora: o hook de core é uma função de verdade (o import não resolveu para undefined)', () => {
    expect(typeof core.useCepLookup).toBe('function')
    expect(core.CEP_LOOKUP_KEY).toBe('cep-lookup')
  })
})
