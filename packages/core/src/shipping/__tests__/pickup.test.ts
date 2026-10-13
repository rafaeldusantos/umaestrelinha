import { describe, expect, it } from 'vitest'
import {
  PICKUP_CARRIER,
  PICKUP_METHOD_NAME,
  PICKUP_SERVICE_ID,
  isPickupOrder,
  isRsCep,
  pickupAvailable,
  pickupLocation,
  pickupRefusal,
} from '../pickup.ts'

// Feature 63 — retirada no escritório. Este arquivo é o dono das perguntas "o CEP é do RS?",
// "a retirada está disponível?" e "este pedido é de retirada?" (RET-13). A loja, a function
// `checkout` e o pós-compra chamam as mesmas funções.

/**
 * Endereço do Material com número e complemento DISTINTOS e reconhecíveis (`455`, `Sala 3`): é o
 * que permite asserir a AUSÊNCIA deles na linha (RET-03). Com número vazio, "não aparece" seria
 * verdade nos dois mundos.
 */
const MATERIAL = {
  street: 'Rua Dona Laura',
  number: '455',
  complement: 'Sala 3',
  neighborhood: 'Rio Branco',
  city: 'Porto Alegre',
  state: 'RS',
}

const LINHA = 'Escritório - Uma Estrelinha - Rua Dona Laura, Rio Branco, Porto Alegre/RS'

describe('constantes da retirada', () => {
  it('o id do serviço, o nome do método e o "transportador" são os literais da spec', () => {
    expect(PICKUP_SERVICE_ID).toBe('retirada')
    expect(PICKUP_METHOD_NAME).toBe('Retirada no escritório')
    expect(PICKUP_CARRIER).toBe('Uma Estrelinha')
  })
})

describe('isRsCep — a faixa do RS é 90000-000 a 99999-999', () => {
  it('89999-999 fica FORA (a borda de baixo)', () => {
    expect(isRsCep('89999999')).toBe(false)
    expect(isRsCep('89999-999')).toBe(false)
  })

  it('90000-000 fica DENTRO (a primeira do RS)', () => {
    expect(isRsCep('90000000')).toBe(true)
  })

  it('99999-999 fica DENTRO (a última)', () => {
    expect(isRsCep('99999999')).toBe(true)
  })

  it('aceita a máscara da tela', () => {
    expect(isRsCep('91240-010')).toBe(true)
  })

  it('CEP com menos de 8 dígitos não é do RS (edge case da spec)', () => {
    expect(isRsCep('9124001')).toBe(false)
    expect(isRsCep('91240-01')).toBe(false)
  })

  it('CEP com mais de 8 dígitos também não', () => {
    expect(isRsCep('912400100')).toBe(false)
  })

  it('CEP de São Paulo não é do RS', () => {
    expect(isRsCep('01310-100')).toBe(false)
  })

  it('null, undefined e vazio não são do RS', () => {
    expect(isRsCep(null)).toBe(false)
    expect(isRsCep(undefined)).toBe(false)
    expect(isRsCep('')).toBe(false)
  })
})

describe('pickupLocation — a linha do endereço (RET-01, RET-03)', () => {
  it('monta a linha inteira: Escritório - Uma Estrelinha - {rua}, {bairro}, {cidade}/{UF}', () => {
    expect(pickupLocation(MATERIAL)).toBe(LINHA)
  })

  it('NÃO contém o número nem o complemento, mesmo com os dois preenchidos (RET-03)', () => {
    const linha = pickupLocation(MATERIAL)
    expect(linha).not.toContain('455')
    expect(linha).not.toContain('Sala 3')
  })

  it('apara espaço das partes', () => {
    expect(
      pickupLocation({
        street: '  Rua Dona Laura ',
        neighborhood: ' Rio Branco',
        city: 'Porto Alegre  ',
        state: ' RS ',
      }),
    ).toBe(LINHA)
  })

  it('sem UF, sai sem a barra', () => {
    expect(pickupLocation({ ...MATERIAL, state: '' })).toBe(
      'Escritório - Uma Estrelinha - Rua Dona Laura, Rio Branco, Porto Alegre',
    )
  })

  it('rua em branco ⇒ null', () => {
    expect(pickupLocation({ ...MATERIAL, street: '   ' })).toBeNull()
  })

  it('bairro em branco ⇒ null', () => {
    expect(pickupLocation({ ...MATERIAL, neighborhood: '' })).toBeNull()
  })

  it('cidade em branco ⇒ null', () => {
    expect(pickupLocation({ ...MATERIAL, city: '' })).toBeNull()
  })

  it('material ausente ⇒ null', () => {
    expect(pickupLocation(null)).toBeNull()
    expect(pickupLocation(undefined)).toBeNull()
  })
})

describe('pickupAvailable — ligada, endereço completo e CEP do RS (RET-02, RET-05)', () => {
  it('tudo certo ⇒ disponível', () => {
    expect(pickupAvailable({ enabled: true, material: MATERIAL, cep: '91240-010' })).toBe(true)
  })

  it('desligada ⇒ indisponível', () => {
    expect(pickupAvailable({ enabled: false, material: MATERIAL, cep: '91240-010' })).toBe(false)
  })

  it('endereço sem rua ⇒ indisponível', () => {
    expect(
      pickupAvailable({ enabled: true, material: { ...MATERIAL, street: '' }, cep: '91240-010' }),
    ).toBe(false)
  })

  it('CEP fora do RS ⇒ indisponível', () => {
    expect(pickupAvailable({ enabled: true, material: MATERIAL, cep: '01310-100' })).toBe(false)
  })
})

describe('pickupRefusal — cada ramo recusa sozinho (RET-12)', () => {
  const certo = { enabled: true, material: MATERIAL, zip: '91240010', cost: 0 }

  it('tudo certo ⇒ null', () => {
    expect(pickupRefusal(certo)).toBeNull()
  })

  it('retirada desligada ⇒ pickup_unavailable', () => {
    expect(pickupRefusal({ ...certo, enabled: false })).toBe('pickup_unavailable')
  })

  it('endereço do Material sem rua ⇒ pickup_unavailable', () => {
    expect(pickupRefusal({ ...certo, material: { ...MATERIAL, street: '' } })).toBe(
      'pickup_unavailable',
    )
  })

  it('CEP fora do RS ⇒ pickup_unavailable', () => {
    expect(pickupRefusal({ ...certo, zip: '01310100' })).toBe('pickup_unavailable')
  })

  it('custo diferente de zero ⇒ pickup_unavailable', () => {
    expect(pickupRefusal({ ...certo, cost: 9.9 })).toBe('pickup_unavailable')
  })

  it('custo que não é número ⇒ pickup_unavailable', () => {
    expect(pickupRefusal({ ...certo, cost: Number('abc') })).toBe('pickup_unavailable')
  })
})

/**
 * O contrato é ESTRITO: `enabled` só liga com `true`. Quem lê o jsonb cru (a function `checkout`)
 * resolve o default antes de chamar; um consumidor novo que esqueça o default tem de ver a retirada
 * DESLIGADA, nunca ligada por omissão (mutante C09 da verificação: `enabled !== false`).
 */
describe('o interruptor é estrito — ausente ou nulo não liga', () => {
  it('pickupAvailable com enabled undefined ou null ⇒ indisponível', () => {
    expect(pickupAvailable({ enabled: undefined, material: MATERIAL, cep: '91240-010' })).toBe(false)
    expect(pickupAvailable({ enabled: null, material: MATERIAL, cep: '91240-010' })).toBe(false)
  })

  it('pickupRefusal com enabled undefined ou null ⇒ pickup_unavailable', () => {
    const resto = { material: MATERIAL, zip: '91240010', cost: 0 }
    expect(pickupRefusal({ ...resto, enabled: undefined })).toBe('pickup_unavailable')
    expect(pickupRefusal({ ...resto, enabled: null })).toBe('pickup_unavailable')
  })
})

describe('isPickupOrder — o pedido é de retirada pela coluna shipping_service_id', () => {
  it("'retirada' ⇒ true", () => {
    expect(isPickupOrder({ shipping_service_id: 'retirada' })).toBe(true)
  })

  it('id do Melhor Envio ⇒ false', () => {
    expect(isPickupOrder({ shipping_service_id: '1' })).toBe(false)
  })

  it('coluna vazia ou pedido ausente ⇒ false', () => {
    expect(isPickupOrder({ shipping_service_id: null })).toBe(false)
    expect(isPickupOrder({})).toBe(false)
    expect(isPickupOrder(null)).toBe(false)
  })
})
