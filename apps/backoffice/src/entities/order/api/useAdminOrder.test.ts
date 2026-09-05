// O recorte dos `product_id` que podem ser procurados no catálogo.
//
// `order_items.product_id` é `text` e **não é sempre um uuid**: o importador da Nuvemshop grava
// `nuvemshop:<nome>` no item que não casou com o catálogo — 35 dos 59 itens do banco de hoje.
// `products.id` é `uuid`, e um `in('id', ...)` que carregue um desses valores morre com `22P02`.
//
// A falha não seria barulhenta: a consulta erra, o mapa volta vazio, e **todo** item do pedido
// perde foto e link — inclusive os que casaram. A tela continua desenhando. É por isso que a linha
// tem teste próprio.

import { describe, expect, it, vi } from 'vitest'

vi.mock('@estrelinha/supabase/client', () => ({ supabase: {} }))

import { catalogProductIds } from './useAdminOrder'

const UUID_A = '1b832ffc-689b-4b4b-a0b3-98ef03bf9600'
const UUID_B = '2b25cc5c-0111-48cd-845a-9b4d36591a78'

describe('catalogProductIds', () => {
  it('deixa passar o uuid do item que casou', () => {
    expect(catalogProductIds([{ product_id: UUID_A }, { product_id: UUID_B }])).toEqual([
      UUID_A,
      UUID_B,
    ])
  })

  it('CORTA o órfão do import — é ele que derrubaria a consulta inteira', () => {
    const itens = [
      { product_id: UUID_A },
      { product_id: 'nuvemshop:Colar Afetivo Redondo com Cinzas de Cremação' },
    ]
    expect(catalogProductIds(itens)).toEqual([UUID_A])
  })

  it('pedido só de órfãos não consulta nada', () => {
    // Lista vazia é o sinal de "nem chame a rede": um `in('id', [])` é uma ida ao banco para
    // receber zero linhas.
    expect(catalogProductIds([{ product_id: 'nuvemshop:Berloque' }])).toEqual([])
  })

  it('o mesmo produto em duas linhas do pedido vira UM id', () => {
    expect(catalogProductIds([{ product_id: UUID_A }, { product_id: UUID_A }])).toEqual([UUID_A])
  })

  it('id ausente ou lixo não passa', () => {
    const itens = [
      { product_id: null as unknown as string },
      { product_id: '' },
      { product_id: 'p1' },
      // Quase um uuid: um dígito a menos no último grupo. O recorte é a FORMA inteira, não o traço.
      { product_id: '1b832ffc-689b-4b4b-a0b3-98ef0000000' },
      { product_id: UUID_B },
    ]
    expect(catalogProductIds(itens)).toEqual([UUID_B])
  })
})
