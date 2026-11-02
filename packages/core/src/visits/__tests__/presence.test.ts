/**
 * O contrato do corpo do pulso de presença — a loja o monta com `presenceBody`, a function `visit`
 * o recusa com `presenceBodyRefusal`. As duas pontas leem o MESMO arquivo.
 *
 * O corpo é exatamente `{ id, page, product, cart, source }`: nenhuma chave a mais (uma `url`, um
 * `referrer` ou um `ua` seriam a forma de o cliente mandar o que o banco não pode guardar).
 */
import { describe, expect, it } from 'vitest'

import {
  PRESENCE_CART_MAX,
  PRESENCE_DEVICES,
  PRESENCE_PAGE_KINDS,
  PRESENCE_SOURCES,
  isPresenceSlug,
  presenceBody,
  presenceBodyRefusal,
} from '../presence.ts'

const ID = '3f2b8c1e-9a4d-4e6f-8b2a-1c3d5e7f9a0b'
const BOM = { id: ID, page: 'joia', product: 'pingente-estrela-de-prata', cart: 2, source: 'instagram' }

describe('os vocabulários da presença', () => {
  it('são as seis páginas, as cinco faixas de origem e os três aparelhos — escritos por extenso', () => {
    expect([...PRESENCE_PAGE_KINDS]).toEqual(['joia', 'lista', 'sacola', 'checkout', 'guia', 'outra'])
    expect([...PRESENCE_SOURCES]).toEqual(['instagram', 'google', 'whatsapp', 'direto', 'outros'])
    expect([...PRESENCE_DEVICES]).toEqual(['celular', 'computador', 'tablet'])
    expect(PRESENCE_CART_MAX).toBe(99)
  })
})

describe('presenceBody', () => {
  it('monta exatamente as cinco chaves', () => {
    expect(presenceBody({ id: ID, page: 'lista', product: null, cart: 0, source: 'direto' })).toEqual({
      id: ID,
      page: 'lista',
      product: null,
      cart: 0,
      source: 'direto',
    })
  })
})

describe('presenceBodyRefusal', () => {
  it('aceita o corpo completo de uma joia', () => {
    expect(presenceBodyRefusal(BOM)).toBeNull()
  })

  it('aceita uma joia sem slug (a página não resolveu um)', () => {
    expect(presenceBodyRefusal({ ...BOM, product: null })).toBeNull()
  })

  it.each(PRESENCE_PAGE_KINDS.filter((k) => k !== 'joia'))('aceita a página %s sem joia', (page) => {
    expect(presenceBodyRefusal({ ...BOM, page, product: null })).toBeNull()
  })

  it('o que não é objeto é `json`', () => {
    for (const v of [null, undefined, 'x', 3, [BOM]]) expect(presenceBodyRefusal(v)).toBe('json')
  })

  it.each(['url', 'referrer', 'ua', 'visitor'])('uma chave a mais (%s) é `chave`', (extra) => {
    expect(presenceBodyRefusal({ ...BOM, [extra]: 'x' })).toBe('chave')
  })

  it('o id fora do UUID v4 é `id`', () => {
    expect(presenceBodyRefusal({ ...BOM, id: 'abc' })).toBe('id')
    expect(presenceBodyRefusal({ ...BOM, id: undefined })).toBe('id')
  })

  it('o tipo de página fora do vocabulário é `pagina`', () => {
    expect(presenceBodyRefusal({ ...BOM, page: 'produto' })).toBe('pagina')
    expect(presenceBodyRefusal({ ...BOM, page: 'JOIA' })).toBe('pagina')
    expect(presenceBodyRefusal({ ...BOM, page: undefined })).toBe('pagina')
  })

  it('o slug inválido é `joia`', () => {
    for (const product of ['/produtos/x', 'Com Espaço', 'a'.repeat(201), '', 42, 'ção']) {
      expect(presenceBodyRefusal({ ...BOM, product })).toBe('joia')
    }
  })

  it('um slug fora da página de joia é `joia`', () => {
    expect(presenceBodyRefusal({ ...BOM, page: 'lista' })).toBe('joia')
  })

  it('a chave `product` ausente é `joia` (o corpo tem as cinco)', () => {
    const { product: _p, ...semJoia } = BOM
    expect(presenceBodyRefusal(semJoia)).toBe('joia')
  })

  it('itens acima do teto, negativos ou fracionários são `sacola`', () => {
    for (const cart of [PRESENCE_CART_MAX + 1, -1, 1.5, '2', null]) {
      expect(presenceBodyRefusal({ ...BOM, cart })).toBe('sacola')
    }
    expect(presenceBodyRefusal({ ...BOM, cart: PRESENCE_CART_MAX })).toBeNull()
  })

  it('a faixa de origem fora do vocabulário é `origem`', () => {
    for (const source of ['facebook', 'Instagram', '', null, undefined]) {
      expect(presenceBodyRefusal({ ...BOM, source })).toBe('origem')
    }
  })
})

describe('isPresenceSlug', () => {
  it('aceita o formato dos slugs do catálogo e recusa o resto', () => {
    expect(isPresenceSlug('colar-de-cinzas-2')).toBe(true)
    expect(isPresenceSlug('a'.repeat(200))).toBe(true)
    expect(isPresenceSlug('Colar')).toBe(false)
    expect(isPresenceSlug('a/b')).toBe(false)
  })
})
