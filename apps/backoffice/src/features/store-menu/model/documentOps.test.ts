// Feature 86, T11 — as operações puras sobre o documento do menu.
//
// O que se prova aqui é o que nenhuma tela mostra sozinha: a ordem em que o item novo entra, quais
// filhas uma categoria leva, que as pontas não mexem em nada, que remover a raiz leva o submenu, que
// ligar um dispositivo não liga o outro — e o contrato de identidade (op que muda devolve documento
// novo; op que não muda devolve o MESMO, para `useStoreMenu` não ir à rede à toa).

import { describe, expect, it } from 'vitest'
import { menuDocumentRefusal, type MenuCategory, type MenuDocument, type MenuNode, type MenuRootNode } from '@estrelinha/core/menu'
import {
  addChildNode,
  addRootNode,
  moveNode,
  removeNode,
  toggleSurface,
  updateNode,
} from './documentOps'

const cat = (id: string, over: Partial<MenuCategory> = {}): MenuCategory => ({
  id,
  name: id,
  slug: id,
  parent_id: null,
  sort_order: 0,
  active: true,
  ...over,
})

const ids = () => {
  let n = 0
  return () => `id-${++n}`
}

const filho = (id: string, over: Partial<MenuNode> = {}): MenuNode => ({
  id,
  target: { kind: 'category', category_id: id },
  label: null,
  desktop: true,
  mobile: true,
  ...over,
})

const raiz = (id: string, over: Partial<MenuRootNode> = {}): MenuRootNode => ({
  ...filho(id),
  icon: null,
  banners: null,
  children: [],
  ...over,
})

const DOC: MenuDocument = {
  version: 2,
  items: [
    raiz('a', { children: [filho('a1'), filho('a2'), filho('a3')] }),
    raiz('b'),
    raiz('c'),
  ],
}

describe('addRootNode (MNM-08, MNM-09)', () => {
  it('entra no FIM, sem ícone, sem banner, nos dois dispositivos, com o nome da categoria', () => {
    const doc = addRootNode(DOC, { target: { kind: 'category', category_id: 'z' } }, [cat('z')], ids())
    expect(doc.items.map(i => i.id)).toEqual(['a', 'b', 'c', 'id-1'])
    expect(doc.items[3]).toEqual({
      id: 'id-1',
      target: { kind: 'category', category_id: 'z' },
      label: null,
      desktop: true,
      mobile: true,
      icon: null,
      banners: null,
      children: [],
    })
  })

  it('categoria com filhas ATIVAS leva as filhas, na ordem da árvore; inativas e netas não', () => {
    const categories = [
      cat('joias'),
      // sort_order invertido em relação à ordem do array: a régua é a da árvore, não a de chegada
      cat('colares', { parent_id: 'joias', sort_order: 2 }),
      cat('aneis', { parent_id: 'joias', sort_order: 1 }),
      cat('brincos', { parent_id: 'joias', sort_order: 1, name: 'Brincos' }),
      cat('velha', { parent_id: 'joias', sort_order: 0, active: false }),
      cat('outra-raiz'),
      cat('neta', { parent_id: 'aneis' }),
    ]
    const doc = addRootNode(
      { version: 2, items: [] },
      { target: { kind: 'category', category_id: 'joias' } },
      categories,
      ids(),
    )
    const [item] = doc.items
    expect(item.children.map(c => (c.target as { category_id: string }).category_id)).toEqual([
      'aneis',
      'brincos',
      'colares',
    ])
    // cada filho é um nó novo, com id próprio, nos dois dispositivos e com o nome da categoria
    expect(item.children.map(c => c.id)).toEqual(['id-2', 'id-3', 'id-4'])
    expect(item.children.every(c => c.desktop && c.mobile && c.label === null)).toBe(true)
  })

  it('com mais de 24 filhas ativas, leva as 24 PRIMEIRAS da árvore (MNM-09 × MNM-24, revisto)', () => {
    // 30 filhas em ordem inversa no array: a régua do corte é a da árvore (`sort_order`).
    const categories = [
      cat('joias'),
      ...Array.from({ length: 30 }, (_, i) => cat(`f${String(29 - i).padStart(2, '0')}`, { parent_id: 'joias', sort_order: 29 - i })),
      cat('inativa', { parent_id: 'joias', sort_order: -1, active: false }),
    ]
    const doc = addRootNode(
      { version: 2, items: [] },
      { target: { kind: 'category', category_id: 'joias' } },
      categories,
      ids(),
    )
    const filhas = doc.items[0].children.map(c => (c.target as { category_id: string }).category_id)
    expect(filhas).toHaveLength(24)
    expect(filhas).toEqual(Array.from({ length: 24 }, (_, i) => `f${String(i).padStart(2, '0')}`))
    // E o documento resultante grava: o corte não cria um submenu que a régua recusaria.
    expect(menuDocumentRefusal(doc, { version: 2, items: [] })).toBeNull()
  })

  it('com 24 filhas ativas, leva as 24 (o corte não come a última)', () => {
    const categories = [cat('joias'), ...Array.from({ length: 24 }, (_, i) => cat(`f${i}`, { parent_id: 'joias', sort_order: i }))]
    const doc = addRootNode({ version: 2, items: [] }, { target: { kind: 'category', category_id: 'joias' } }, categories, ids())
    expect(doc.items[0].children).toHaveLength(24)
  })

  it('link entra com o nome digitado (aparado) e sem filhos', () => {
    const doc = addRootNode(
      { version: 2, items: [] },
      { target: { kind: 'link', href: '/sobre' }, label: '  Sobre nós ' },
      [cat('sobre')],
      ids(),
    )
    expect(doc.items[0].label).toBe('Sobre nós')
    expect(doc.items[0].children).toEqual([])
  })

  it('não toca no documento de entrada', () => {
    const antes = JSON.stringify(DOC)
    addRootNode(DOC, { target: { kind: 'category', category_id: 'z' } }, [cat('z')], ids())
    expect(JSON.stringify(DOC)).toBe(antes)
  })

  it('usa `crypto.randomUUID` quando não recebe gerador', () => {
    const doc = addRootNode(DOC, { target: { kind: 'category', category_id: 'z' } }, [])
    expect(doc.items[3].id).toMatch(/^[0-9a-f-]{36}$/)
  })
})

describe('addChildNode', () => {
  it('entra no fim do submenu do pai, nos dois dispositivos', () => {
    const doc = addChildNode(DOC, 'a', { target: { kind: 'link', href: '/sobre' }, label: 'Sobre' }, ids())
    expect(doc.items[0].children.map(c => c.id)).toEqual(['a1', 'a2', 'a3', 'id-1'])
    expect(doc.items[0].children[3]).toEqual({
      id: 'id-1',
      target: { kind: 'link', href: '/sobre' },
      label: 'Sobre',
      desktop: true,
      mobile: true,
    })
    // os outros itens são os mesmos objetos
    expect(doc.items[1]).toBe(DOC.items[1])
  })

  it('pai inexistente ⇒ o MESMO documento', () => {
    expect(addChildNode(DOC, 'nao-existe', { target: { kind: 'link', href: '/x' }, label: 'X' }, ids())).toBe(DOC)
  })
})

describe('moveNode (MNM-18, MNM-19)', () => {
  it('reordena o menu principal', () => {
    expect(moveNode(DOC, null, 0, 2).items.map(i => i.id)).toEqual(['b', 'c', 'a'])
    expect(moveNode(DOC, null, 2, 1).items.map(i => i.id)).toEqual(['a', 'c', 'b'])
  })

  it('reordena um submenu sem mexer no menu principal', () => {
    const doc = moveNode(DOC, 'a', 2, 0)
    expect(doc.items[0].children.map(c => c.id)).toEqual(['a3', 'a1', 'a2'])
    expect(doc.items.map(i => i.id)).toEqual(['a', 'b', 'c'])
    expect(doc.items[1]).toBe(DOC.items[1])
  })

  it.each([
    ['para cima do primeiro', null, 0, -1],
    ['para baixo do último', null, 2, 3],
    ['para o mesmo lugar', null, 1, 1],
    ['submenu: para cima do primeiro', 'a', 0, -1],
    ['submenu: para baixo do último', 'a', 2, 3],
    ['submenu de pai inexistente', 'nao-existe', 0, 1],
    ['origem fora da faixa', null, 9, 0],
  ] as const)('%s ⇒ o MESMO documento', (_n, pai, de, para) => {
    expect(moveNode(DOC, pai, de, para)).toBe(DOC)
  })
})

describe('removeNode (MNM-20)', () => {
  it('a raiz sai COM o submenu', () => {
    const doc = removeNode(DOC, 'a')
    expect(doc.items.map(i => i.id)).toEqual(['b', 'c'])
    expect(JSON.stringify(doc)).not.toContain('a1')
  })

  it('um filho sai sozinho; o pai e os irmãos ficam', () => {
    const doc = removeNode(DOC, 'a2')
    expect(doc.items[0].children.map(c => c.id)).toEqual(['a1', 'a3'])
    expect(doc.items[0].id).toBe('a')
  })

  it('nó inexistente ⇒ o MESMO documento', () => {
    expect(removeNode(DOC, 'nao-existe')).toBe(DOC)
  })
})

describe('updateNode (MNM-14..17)', () => {
  it('muda o nome de uma raiz; `null` volta ao nome da categoria', () => {
    const proprio = updateNode(DOC, 'b', { label: 'Presentes' })
    expect(proprio.items[1].label).toBe('Presentes')
    expect(updateNode(proprio, 'b', { label: null }).items[1].label).toBeNull()
  })

  it('ícone e banners só na raiz; no filho são ignorados', () => {
    const banners = { desktop: [], mobile: [] }
    const doc = updateNode(DOC, 'a', { icon: 'estrela', banners })
    expect(doc.items[0].icon).toBe('estrela')
    expect(doc.items[0].banners).toBe(banners)

    const noFilho = updateNode(DOC, 'a1', { icon: 'estrela', banners })
    expect(noFilho).toBe(DOC)
    expect(Object.keys(updateNode(DOC, 'a1', { label: 'X', icon: 'estrela' }).items[0].children[0])).not.toContain('icon')
  })

  it('o nome de um filho muda só nele', () => {
    const doc = updateNode(DOC, 'a2', { label: 'Anéis afetivos' })
    expect(doc.items[0].children.map(c => c.label)).toEqual([null, 'Anéis afetivos', null])
    expect(doc.items[0].children[0]).toBe(DOC.items[0].children[0])
  })

  it('valor igual ou nó inexistente ⇒ o MESMO documento', () => {
    expect(updateNode(DOC, 'b', { label: null })).toBe(DOC)
    expect(updateNode(DOC, 'nao-existe', { label: 'X' })).toBe(DOC)
  })
})

describe('toggleSurface (MNM-28, MNM-29)', () => {
  it('desligar o celular de uma raiz não mexe no computador nem no submenu', () => {
    const doc = toggleSurface(DOC, 'a', 'mobile', false)
    expect(doc.items[0].mobile).toBe(false)
    expect(doc.items[0].desktop).toBe(true)
    expect(doc.items[0].children).toBe(DOC.items[0].children)
  })

  it('ligar no computador não liga no celular, num filho', () => {
    const base = toggleSurface(toggleSurface(DOC, 'a1', 'desktop', false), 'a1', 'mobile', false)
    const doc = toggleSurface(base, 'a1', 'desktop', true)
    expect(doc.items[0].children[0]).toMatchObject({ desktop: true, mobile: false })
  })

  it('valor igual ou nó inexistente ⇒ o MESMO documento', () => {
    expect(toggleSurface(DOC, 'a', 'desktop', true)).toBe(DOC)
    expect(toggleSurface(DOC, 'nao-existe', 'desktop', false)).toBe(DOC)
  })
})
