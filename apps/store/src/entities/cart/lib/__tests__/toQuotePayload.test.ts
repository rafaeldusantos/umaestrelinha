import { describe, expect, it } from 'vitest'
import type { Product } from '@nanapin/supabase/types'
import type { CartItem } from '../../model/cartStore'
import { toQuotePayload } from '../toQuotePayload'

// SHP-02: as dimensões e o peso enviados ao Melhor Envio vêm dos campos reais do produto;
//         quando um campo é nulo, o fallback do shipping-calc (11/2/16/0.1) entra **por item**.

const product = (overrides: Partial<Product> = {}): Product => ({
  id: 'prod-1',
  name: 'Botton Sakura',
  slug: 'botton-sakura',
  price: 12.9,
  compare_price: null,
  category_id: 'cat-1',
  category_slug: 'anime',
  description: '',
  image_url: '',
  images: [],
  options: [],
  variants: [],
  stock_policy: 'track',
  category_links: [],
  stock_total: 10,
  low_stock_threshold: 5,
  is_new: false,
  is_featured: false,
  tags: [],
  ...overrides,
})

const item = (overrides: Partial<CartItem> = {}): CartItem => ({
  product: product(),
  size: '',
  finish: '',
  quantity: 1,
  // Campos que a 07/T11 tornou obrigatórios. `toQuotePayload` só olha dimensão e quantidade, mas o
  // tipo é o mesmo do carrinho de verdade — e a fixture não deve ser mais frouxa que ele.
  variantId: null,
  variantLabel: '',
  optionValues: {},
  unitPrice: 12.9,
  ...overrides,
})

describe('toQuotePayload', () => {
  it('devolve um entry por item do carrinho, com a quantidade de cada um', () => {
    const payload = toQuotePayload([
      item({ product: product({ id: 'prod-1' }), quantity: 2 }),
      item({ product: product({ id: 'prod-2' }), quantity: 3 }),
    ])

    expect(payload).toHaveLength(2)
    expect(payload[0].id).toBe('prod-1')
    expect(payload[0].quantity).toBe(2)
    expect(payload[1].id).toBe('prod-2')
    expect(payload[1].quantity).toBe(3)
  })

  it('envia as dimensões e o peso REAIS do produto quando eles existem', () => {
    const payload = toQuotePayload([
      item({
        product: product({ width_cm: 25, height_cm: 7, length_cm: 30, weight_kg: 0.85 }),
      }),
    ])

    expect(payload[0].width).toBe(25)
    expect(payload[0].height).toBe(7)
    expect(payload[0].length).toBe(30)
    expect(payload[0].weight).toBe(0.85)
  })

  it('width_cm ausente cai no fallback 11', () => {
    const payload = toQuotePayload([
      item({ product: product({ height_cm: 7, length_cm: 30, weight_kg: 0.85 }) }),
    ])

    expect(payload[0].width).toBe(11)
    expect(payload[0].height).toBe(7)
  })

  it('height_cm ausente cai no fallback 2', () => {
    const payload = toQuotePayload([item({ product: product({ width_cm: 25 }) })])

    expect(payload[0].height).toBe(2)
  })

  it('length_cm ausente cai no fallback 16', () => {
    const payload = toQuotePayload([item({ product: product({ width_cm: 25 }) })])

    expect(payload[0].length).toBe(16)
  })

  it('weight_kg ausente cai no fallback 0.1', () => {
    const payload = toQuotePayload([item({ product: product({ width_cm: 25 }) })])

    expect(payload[0].weight).toBe(0.1)
  })

  it('o fallback é aplicado POR ITEM: o item com dimensões mantém as suas', () => {
    const payload = toQuotePayload([
      item({ product: product({ id: 'com-dim', width_cm: 25, weight_kg: 0.85 }) }),
      item({ product: product({ id: 'sem-dim' }) }),
    ])

    expect(payload[0]).toMatchObject({ id: 'com-dim', width: 25, weight: 0.85 })
    expect(payload[1]).toMatchObject({ id: 'sem-dim', width: 11, weight: 0.1 })
  })

  it('insurance_value é o preço do produto', () => {
    const payload = toQuotePayload([item({ product: product({ price: 34.5 }) })])

    expect(payload[0].insurance_value).toBe(34.5)
  })

  it('carrinho vazio devolve lista vazia', () => {
    expect(toQuotePayload([])).toEqual([])
  })
})
