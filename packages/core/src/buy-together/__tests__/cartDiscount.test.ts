import { describe, expect, it } from 'vitest'
import {
  allocateBuyTogetherDiscount,
  buyTogetherOfferPercent,
  type BuyTogetherDiscountAddon,
  type BuyTogetherDiscountConfig,
} from '../cartDiscount'

const addon = (overrides: Partial<BuyTogetherDiscountAddon> = {}): BuyTogetherDiscountAddon => ({
  id: 'a1',
  mainProductId: 'joia',
  position: 0,
  kind: 'product',
  targetProductId: 'corrente',
  listId: null,
  targetVariantIds: [],
  hiddenOnVariantIds: [],
  discountPercent: 10,
  ...overrides,
})

const cfg = (addons: BuyTogetherDiscountAddon[]): BuyTogetherDiscountConfig => ({ addons, lists: [] })

describe('o percentual que a joia daria à peça (a frase de quando ela volta)', () => {
  it('é o do adicional que oferece a peça, mesmo com a variação da joia que o esconderia', () => {
    const c = cfg([addon({ discountPercent: 15, hiddenOnVariantIds: ['v-curta'] })])
    expect(buyTogetherOfferPercent('corrente', null, 'joia', c)).toBe(15)
  })

  it('é nulo quando a joia não oferece a peça, não tem desconto ou não liberou a variação', () => {
    expect(buyTogetherOfferPercent('brinco', null, 'joia', cfg([addon()]))).toBeNull()
    expect(buyTogetherOfferPercent('corrente', null, 'joia', cfg([addon({ discountPercent: null })]))).toBeNull()
    expect(
      buyTogetherOfferPercent('corrente', 'v-ouro', 'joia', cfg([addon({ targetVariantIds: ['v-prata'] })])),
    ).toBeNull()
    expect(
      buyTogetherOfferPercent('corrente', 'v-prata', 'joia', cfg([addon({ targetVariantIds: ['v-prata'] })])),
    ).toBe(10)
  })
})

describe('a repartição por linha', () => {
  it('a peça sem desconto não sai na lista; a com desconto diz a joia que deu', () => {
    const out = allocateBuyTogetherDiscount(
      [
        { product_id: 'joia', unit_price: 300, quantity: 1 },
        { product_id: 'brinco', unit_price: 40, quantity: 1 },
        { product_id: 'corrente', unit_price: 79, quantity: 3 },
      ],
      cfg([addon()]),
    )
    expect(out).toEqual([
      {
        index: 2,
        discountedUnits: 1,
        segments: [{ units: 1, percent: 10, unitPrice: 71.1, mainProductId: 'joia' }],
      },
    ])
  })
})
