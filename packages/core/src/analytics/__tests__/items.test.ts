import { describe, expect, it } from 'vitest'
import { ANALYTICS_ITEM_KEYS, itemsValue, toAnalyticsItem } from '../items.ts'

// EVT-13 — o item de todo evento. EVT-14 — nenhum dado pessoal.

const PEÇA = {
  id: '6f1c2a9e-0000-4000-8000-000000000001',
  nuvemshop_id: 281745761,
  name: 'Pingente Coração com Cinzas',
  category: 'Pingentes',
  variant: 'Aço Inoxidável / 45cm',
  price: 189.9,
  quantity: 2,
  index: 3,
}

describe('toAnalyticsItem — EVT-13', () => {
  it('item_id é o identificador público do PRODUTO (o item_group_id do feed)', () => {
    expect(toAnalyticsItem(PEÇA).item_id).toBe('281745761')
  })

  it('sem nuvemshop_id, item_id cai no UUID do produto', () => {
    expect(toAnalyticsItem({ ...PEÇA, nuvemshop_id: null }).item_id).toBe(PEÇA.id)
    expect(toAnalyticsItem({ ...PEÇA, nuvemshop_id: undefined }).item_id).toBe(PEÇA.id)
  })

  it('o item completo, campo a campo', () => {
    expect(toAnalyticsItem(PEÇA)).toEqual({
      item_id: '281745761',
      item_name: 'Pingente Coração com Cinzas',
      item_brand: 'Uma Estrelinha',
      item_category: 'Pingentes',
      item_variant: 'Aço Inoxidável / 45cm',
      price: 189.9,
      quantity: 2,
      index: 3,
    })
  })

  it('price é o unitário em duas casas, sem ruído de ponto flutuante', () => {
    expect(toAnalyticsItem({ ...PEÇA, price: 0.1 + 0.2 }).price).toBe(0.3)
    expect(toAnalyticsItem({ ...PEÇA, price: 42.006 }).price).toBe(42.01)
  })

  it('quantity ausente, zero ou negativa vira 1; fracionária é truncada', () => {
    expect(toAnalyticsItem({ ...PEÇA, quantity: undefined }).quantity).toBe(1)
    expect(toAnalyticsItem({ ...PEÇA, quantity: 0 }).quantity).toBe(1)
    expect(toAnalyticsItem({ ...PEÇA, quantity: -2 }).quantity).toBe(1)
    expect(toAnalyticsItem({ ...PEÇA, quantity: 3.7 }).quantity).toBe(3)
  })

  it('categoria, variação e índice ausentes NÃO aparecem como chave vazia', () => {
    const item = toAnalyticsItem({ id: 'x', name: 'Peça', price: 10, category: '  ', variant: null })
    expect(Object.keys(item).sort()).toEqual(['item_brand', 'item_id', 'item_name', 'price', 'quantity'])
  })
})

describe('toAnalyticsItem — EVT-14, nenhum dado pessoal', () => {
  it('as chaves do item são EXATAMENTE a allowlist (igualdade, não "contém")', () => {
    // Com a entrada completa o item usa toda a allowlist — e nada além dela. Uma chave a mais no
    // builder reprova aqui; uma régua de "contém" a deixaria passar.
    expect(Object.keys(toAnalyticsItem(PEÇA)).sort()).toEqual([...ANALYTICS_ITEM_KEYS].sort())
  })

  it('sensor: um objeto de domínio passado INTEIRO não vaza gravação, nome, e-mail nem endereço', () => {
    const contaminado = {
      ...PEÇA,
      engravingText: 'Para sempre, Ana',
      engraving_text: 'Para sempre, Ana',
      customer_name: 'Maria da Silva',
      customer_email: 'maria@exemplo.invalid',
      customer_phone: '51999990000',
      customer_document: '11111111111',
      address_street: 'Rua das Flores',
    }
    const item = toAnalyticsItem(contaminado as unknown as Parameters<typeof toAnalyticsItem>[0])
    expect(Object.keys(item).sort()).toEqual([...ANALYTICS_ITEM_KEYS].sort())
    const serializado = JSON.stringify(item)
    for (const proibido of ['Para sempre', 'Maria', 'maria@', '51999990000', '11111111111', 'Flores']) {
      expect(serializado).not.toContain(proibido)
    }
  })
})

describe('itemsValue', () => {
  it('soma preço × quantidade em duas casas', () => {
    const a = toAnalyticsItem({ ...PEÇA, price: 10.1, quantity: 3 })
    const b = toAnalyticsItem({ ...PEÇA, price: 0.2, quantity: 1 })
    expect(itemsValue([a, b])).toBe(30.5)
  })

  it('lista vazia vale zero', () => {
    expect(itemsValue([])).toBe(0)
  })
})
