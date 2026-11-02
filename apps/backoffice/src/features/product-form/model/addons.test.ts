import { describe, expect, it } from 'vitest'
import {
  addAddon,
  addonsChanged,
  chooseList,
  chooseProduct,
  clearTarget,
  emptyAddon,
  incompleteNote,
  moveAddon,
  removeAddon,
  setKind,
  toggleHiddenOn,
  toggleTargetVariant,
  targetsOutside,
  type AddonDraft,
} from './addons'

const tres = (): AddonDraft[] => [emptyAddon(), emptyAddon(), emptyAddon()]

describe('addAddon', () => {
  it('o padrão ao acrescentar é "uma peça de uma lista"', () => {
    const r = addAddon([])
    expect(r.refusal).toBeNull()
    expect(r.addons).toHaveLength(1)
    expect(r.addons[0].kind).toBe('list')
  })

  it('a 4ª tentativa é recusada com o motivo escrito, e a lista não muda', () => {
    const antes = tres()
    const r = addAddon(antes)
    expect(r.refusal).toBe('Uma joia leva até 3 adicionais. Tire um para acrescentar outro.')
    expect(r.addons).toEqual(antes)
  })

  it('tirar um libera o seguinte', () => {
    const antes = tres()
    const sem = removeAddon(antes, antes[0].key)
    expect(addAddon(sem).refusal).toBeNull()
  })
})

describe('chooseProduct', () => {
  it('o produto principal não pode ser escolhido como adicional', () => {
    const a = [emptyAddon('product')]
    const r = chooseProduct(a, a[0].key, 'principal', 'principal')
    expect(r.refusal).toBe('Uma joia não pode ser adicional dela mesma.')
    expect(r.addons[0].targetProductId).toBeNull()
  })

  it('a peça já escolhida em outro adicional é recusada com o motivo; no mesmo adicional, não', () => {
    const [a, b] = [emptyAddon('product'), emptyAddon('product')]
    const um = chooseProduct([a, b], a.key, 'p', 'x').addons
    expect(chooseProduct(um, b.key, 'p', 'x').refusal).toBe('Esta peça já é outro adicional desta joia.')
    expect(chooseProduct(um, a.key, 'p', 'x').refusal).toBeNull()
    expect(targetsOutside(um, b.key)).toEqual(['x'])
    expect(targetsOutside(um, a.key)).toEqual([])
  })

  it('escolher zera as variações liberadas; "Trocar" desfaz a escolha e zera as variações', () => {
    const a = emptyAddon('product')
    let s = chooseProduct([a], a.key, 'p', 'x').addons
    s = toggleTargetVariant(s, a.key, 'v1')
    expect(s[0].targetVariantIds).toEqual(['v1'])
    s = clearTarget(s, a.key)
    expect(s[0]).toMatchObject({ targetProductId: null, targetVariantIds: [] })
  })
})

describe('o resto das contas', () => {
  it('ordena: move e ignora o que está fora do intervalo', () => {
    const a = tres()
    expect(moveAddon(a, 0, 1).map(x => x.key)).toEqual([a[1].key, a[0].key, a[2].key])
    expect(moveAddon(a, 0, 3)).toEqual(a)
    expect(moveAddon(a, 2, -1)).toEqual(a)
  })

  it('"some quando" alterna, e o tipo lista zera o que era do tipo produto', () => {
    const a = emptyAddon('product')
    let s = toggleHiddenOn([a], a.key, 'chaveiro')
    expect(s[0].hiddenOnVariantIds).toEqual(['chaveiro'])
    s = toggleHiddenOn(s, a.key, 'chaveiro')
    expect(s[0].hiddenOnVariantIds).toEqual([])
    s = chooseProduct(s, a.key, 'p', 'x').addons
    s = toggleTargetVariant(s, a.key, 'v')
    s = setKind(s, a.key, 'list')
    expect(s[0]).toMatchObject({ kind: 'list', targetProductId: null, targetVariantIds: [] })
    expect(chooseList(s, a.key, 'L')[0].listId).toBe('L')
  })

  it('a barra diz quantos adicionais estão sem lista ou peça', () => {
    const [a, b] = [emptyAddon(), emptyAddon()]
    expect(incompleteNote([])).toBeNull()
    expect(incompleteNote([a])).toBe('1 adicional está sem lista ou peça.')
    expect(incompleteNote([a, b])).toBe('2 adicionais estão sem lista ou peça.')
    expect(incompleteNote(chooseList([a], a.key, 'L'))).toBeNull()
  })

  it('mudou? a ordem e o tipo contam; o adicional incompleto, não', () => {
    const a = chooseList([emptyAddon()], emptyAddon().key, 'L')
    const [x, y] = [emptyAddon(), emptyAddon()]
    const dois = chooseList(chooseList([x, y], x.key, 'L1'), y.key, 'L2')
    expect(addonsChanged(dois, dois)).toBe(false)
    expect(addonsChanged([dois[1], dois[0]], dois)).toBe(true)
    expect(addonsChanged([...dois, emptyAddon()], dois)).toBe(false)
    expect(a).toBeDefined()
  })
})
