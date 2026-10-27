import { describe, expect, it } from 'vitest'
import { catalogProductIds, itemPhoto } from '../itemPhoto.ts'

const A = '3f1c2a10-0000-4000-8000-000000000001'
const B = '3f1c2a10-0000-4000-8000-000000000002'

describe('catalogProductIds', () => {
  it('só uuid, sem repetição — o órfão do import não chega ao `in(id)`', () => {
    expect(catalogProductIds([{ product_id: A }, { product_id: 'nuvemshop:Anel' }, { product_id: A }, { product_id: B }])).toEqual([A, B])
  })
  it('lista vazia ⇒ nada a procurar', () => {
    expect(catalogProductIds([{ product_id: 'nuvemshop:x' }])).toEqual([])
  })
})

describe('itemPhoto', () => {
  it('o snapshot do pedido vence a capa do catálogo', () => {
    expect(itemPhoto('https://x/pedido.webp', 'https://x/catalogo.webp')).toBe('https://x/pedido.webp')
  })
  it('sem snapshot, a capa do catálogo', () => {
    expect(itemPhoto(null, 'https://x/catalogo.webp')).toBe('https://x/catalogo.webp')
    expect(itemPhoto(undefined, 'https://x/catalogo.webp')).toBe('https://x/catalogo.webp')
  })
  it('espaço em branco não é foto, nas duas pontas', () => {
    expect(itemPhoto('   ', 'https://x/catalogo.webp')).toBe('https://x/catalogo.webp')
    expect(itemPhoto('   ', '  ')).toBeNull()
    expect(itemPhoto(null, null)).toBeNull()
  })
})
