import { describe, expect, it } from 'vitest'
import * as eventos from '../events.ts'
import {
  addPaymentInfoEvent,
  addShippingInfoEvent,
  addToCartEvent,
  addToWishlistEvent,
  beginCheckoutEvent,
  loginEvent,
  pageViewEvent,
  removeFromCartEvent,
  searchEvent,
  selectItemEvent,
  signUpEvent,
  viewCartEvent,
  viewItemEvent,
  viewItemListEvent,
} from '../events.ts'

// EVT-01..12 e EVT-16..17 — nome e parâmetros EXATOS de cada evento (toEqual, nunca toMatchObject:
// um parâmetro a mais também é divergência).

const A = { id: 'uuid-a', nuvemshop_id: 111, name: 'Pingente A', category: 'Pingentes', variant: 'Prata', price: 100, quantity: 1 }
const B = { id: 'uuid-b', nuvemshop_id: null, name: 'Anel B', price: 50.5, quantity: 2 }

const itemA = { item_id: '111', item_name: 'Pingente A', item_brand: 'Uma Estrelinha', item_category: 'Pingentes', item_variant: 'Prata', price: 100, quantity: 1 }
const itemB = { item_id: 'uuid-b', item_name: 'Anel B', item_brand: 'Uma Estrelinha', price: 50.5, quantity: 2 }

describe('eventos do navegador — nome e parâmetros exatos', () => {
  it('EVT-01 page_view', () => {
    expect(pageViewEvent({ location: 'https://umaestrelinha.com.br/sobre', title: 'Sobre' })).toEqual({
      name: 'page_view',
      params: { page_location: 'https://umaestrelinha.com.br/sobre', page_title: 'Sobre' },
    })
  })

  it('EVT-02 view_item_list — itens com index a partir de 0', () => {
    expect(viewItemListEvent({ listId: 'categoria:pingentes', listName: 'Pingentes', items: [A, B] })).toEqual({
      name: 'view_item_list',
      params: {
        item_list_id: 'categoria:pingentes',
        item_list_name: 'Pingentes',
        items: [{ ...itemA, index: 0 }, { ...itemB, index: 1 }],
      },
    })
  })

  it('EVT-02 — o index que a entrada já traz é respeitado (página 2 começa no 24)', () => {
    const ev = viewItemListEvent({ listId: 'l', listName: 'L', items: [{ ...A, index: 24 }, { ...B, index: 25 }] })
    expect((ev.params.items as { index: number }[]).map((i) => i.index)).toEqual([24, 25])
  })

  it('EVT-03 select_item — a lista de origem e a posição do card', () => {
    expect(selectItemEvent({ listId: 'busca', listName: 'Busca', item: { ...A, index: 4 } })).toEqual({
      name: 'select_item',
      params: { item_list_id: 'busca', item_list_name: 'Busca', items: [{ ...itemA, index: 4 }] },
    })
  })

  it('EVT-04 view_item — currency BRL, value e o item', () => {
    expect(viewItemEvent({ item: A })).toEqual({
      name: 'view_item',
      params: { currency: 'BRL', value: 100, items: [itemA] },
    })
  })

  it('EVT-05 add_to_cart — UMA chamada com quantity = qty, e value = preço × qty', () => {
    expect(addToCartEvent({ item: { ...A, quantity: 3 } })).toEqual({
      name: 'add_to_cart',
      params: { currency: 'BRL', value: 300, items: [{ ...itemA, quantity: 3 }] },
    })
  })

  it('EVT-06 remove_from_cart — a quantidade RETIRADA', () => {
    expect(removeFromCartEvent({ item: { ...B, quantity: 1 } })).toEqual({
      name: 'remove_from_cart',
      params: { currency: 'BRL', value: 50.5, items: [{ ...itemB, quantity: 1 }] },
    })
  })

  it('EVT-07 view_cart — value é a soma dos itens', () => {
    expect(viewCartEvent({ items: [A, B] })).toEqual({
      name: 'view_cart',
      params: { currency: 'BRL', value: 201, items: [itemA, itemB] },
    })
  })

  it('EVT-08 add_to_wishlist', () => {
    expect(addToWishlistEvent({ item: A })).toEqual({
      name: 'add_to_wishlist',
      params: { currency: 'BRL', value: 100, items: [itemA] },
    })
  })

  it('EVT-09 search — termo aparado', () => {
    expect(searchEvent({ term: '  pingente coração ' })).toEqual({
      name: 'search',
      params: { search_term: 'pingente coração' },
    })
  })

  it('EVT-09 — termo vazio não é busca', () => {
    expect(searchEvent({ term: '   ' })).toBeNull()
    expect(searchEvent({ term: '' })).toBeNull()
  })

  it('EVT-10 begin_checkout — sem cupom, sem a chave coupon', () => {
    expect(beginCheckoutEvent({ items: [A, B] })).toEqual({
      name: 'begin_checkout',
      params: { currency: 'BRL', value: 201, items: [itemA, itemB] },
    })
    expect(beginCheckoutEvent({ items: [A], coupon: '  ' }).params).not.toHaveProperty('coupon')
  })

  it('EVT-10 — com cupom', () => {
    expect(beginCheckoutEvent({ items: [A], coupon: 'AMOR10' }).params.coupon).toBe('AMOR10')
  })

  it('EVT-11 add_shipping_info — shipping_tier', () => {
    expect(addShippingInfoEvent({ items: [A], shippingTier: 'SEDEX' })).toEqual({
      name: 'add_shipping_info',
      params: { currency: 'BRL', value: 100, items: [itemA], shipping_tier: 'SEDEX' },
    })
  })

  it('EVT-12 add_payment_info — payment_type do PIX e do cartão', () => {
    expect(addPaymentInfoEvent({ items: [A], paymentType: 'pix' })).toEqual({
      name: 'add_payment_info',
      params: { currency: 'BRL', value: 100, items: [itemA], payment_type: 'PIX' },
    })
    expect(addPaymentInfoEvent({ items: [A], paymentType: 'card', coupon: 'X' }).params).toEqual({
      currency: 'BRL',
      value: 100,
      items: [itemA],
      payment_type: 'Cartão de crédito',
      coupon: 'X',
    })
  })

  it('EVT-16 login e EVT-17 sign_up — com method', () => {
    expect(loginEvent({ method: 'código' })).toEqual({ name: 'login', params: { method: 'código' } })
    expect(signUpEvent({ method: 'Google' })).toEqual({ name: 'sign_up', params: { method: 'Google' } })
  })
})

describe('CMP-09 — o navegador não tem como montar a compra', () => {
  it('nenhum builder deste módulo produz `purchase`', () => {
    // A compra é do servidor (`purchase.ts`). Um builder de `purchase` aqui seria a porta para a
    // contagem em dobro. A régua é sobre os NOMES exportados, não sobre uma lista escrita à mão.
    const nomes = Object.keys(eventos)
    expect(nomes.length).toBeGreaterThanOrEqual(14)
    expect(nomes.filter((n) => /purchase/i.test(n))).toEqual([])
  })
})
