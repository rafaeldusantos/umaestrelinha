import { describe, expect, it } from 'vitest'
import {
  addItem,
  dropItem,
  moveItem,
  releaseAll,
  removeItem,
  sameDraft,
  toRows,
  toggleVariant,
  type DraftItem,
} from '../draft'

const lista = (...ids: string[]): DraftItem[] => ids.map(productId => ({ productId, variantIds: [] }))

describe('addItem', () => {
  it('acrescenta no fim, sem variações liberadas', () => {
    expect(addItem(lista('a'), 'b')).toEqual({ items: lista('a', 'b'), refusal: null })
  })

  it('a peça repetida não entra duas vezes', () => {
    expect(addItem(lista('a'), 'a').items).toEqual(lista('a'))
  })

  it('a 13ª peça é recusada com o motivo, e a lista fica como estava', () => {
    const doze = lista(...Array.from({ length: 12 }, (_, i) => `p${i}`))
    const r = addItem(doze, 'outra')
    expect(r.refusal).toBe('Uma lista leva até 12 peças. Tire uma para acrescentar outra, ou crie uma segunda lista.')
    expect(r.items).toEqual(doze)
  })
})

describe('moveItem e dropItem', () => {
  it('sobe e desce uma posição', () => {
    expect(moveItem(lista('a', 'b', 'c'), 2, 1).map(i => i.productId)).toEqual(['a', 'c', 'b'])
    expect(moveItem(lista('a', 'b', 'c'), 0, 1).map(i => i.productId)).toEqual(['b', 'a', 'c'])
  })

  it('fora do intervalo não mexe', () => {
    expect(moveItem(lista('a', 'b'), 0, -1).map(i => i.productId)).toEqual(['a', 'b'])
    expect(moveItem(lista('a', 'b'), 1, 2).map(i => i.productId)).toEqual(['a', 'b'])
  })

  it('arrastar uma peça para o lugar de outra', () => {
    expect(dropItem(lista('a', 'b', 'c'), 'a', 'c').map(i => i.productId)).toEqual(['b', 'c', 'a'])
  })
})

describe('removeItem', () => {
  it('tira a peça', () => {
    expect(removeItem(lista('a', 'b'), 'a')).toEqual(lista('b'))
  })
})

describe('variações liberadas', () => {
  it('marca e desmarca; nenhuma marcada é a lista vazia', () => {
    const marcada = toggleVariant(lista('a'), 'a', 'v1')
    expect(marcada[0].variantIds).toEqual(['v1'])
    expect(toggleVariant(marcada, 'a', 'v1')[0].variantIds).toEqual([])
  })

  it('só a peça pedida muda', () => {
    const r = toggleVariant(lista('a', 'b'), 'b', 'v9')
    expect(r[0].variantIds).toEqual([])
    expect(r[1].variantIds).toEqual(['v9'])
  })

  it('"oferecer todas" zera a liberação', () => {
    expect(releaseAll([{ productId: 'a', variantIds: ['v1', 'v2'] }], 'a')[0].variantIds).toEqual([])
  })
})

describe('toRows', () => {
  it('a posição sai da ordem do array', () => {
    expect(toRows('L', [{ productId: 'b', variantIds: ['v'] }, ...lista('a')])).toEqual([
      { list_id: 'L', product_id: 'b', position: 0, variant_ids: ['v'] },
      { list_id: 'L', product_id: 'a', position: 1, variant_ids: [] },
    ])
  })
})

describe('sameDraft', () => {
  it('compara nome, ordem e variações', () => {
    const base = { name: 'X', items: [{ productId: 'a', variantIds: ['1'] }] }
    expect(sameDraft(base, { name: 'X', items: [{ productId: 'a', variantIds: ['1'] }] })).toBe(true)
    expect(sameDraft(base, { name: 'Y', items: base.items })).toBe(false)
    expect(sameDraft(base, { name: 'X', items: [{ productId: 'a', variantIds: [] }] })).toBe(false)
    expect(sameDraft(base, { name: 'X', items: [] })).toBe(false)
  })
})
