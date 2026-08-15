import { describe, expect, it } from 'vitest'
import type { Category } from '@estrelinha/supabase/types'
import { HOME_COLLECTION_ROWS, pickHomeCollections } from '../pickHomeCollections'

/**
 * Quais coleções viram fileira na home — board `7CF-0`.
 *
 * A regra existe para que **nenhuma coleção seja escolhida em código**. Cravar quatro slugs no
 * `HomePage` seria repetir o defeito que a feature 16 tirou do `Header` (`categories.slice(0, 4)` de
 * uma lista chapada): a home passaria a discordar do que a dona vê em `/admin/categorias`.
 */

const category = (over: Partial<Category> & Pick<Category, 'id' | 'name' | 'slug'>): Category => ({
  description: null,
  image_url: null,
  banner_url: null,
  color_accent: null,
  emoji: '',
  parent_id: null,
  sort_order: 0,
  active: true,
  show_in_menu: false,
  menu_promo: null,
  ...over,
})

describe('pickHomeCollections — quem vira fileira', () => {
  it('devolve vazio sem categoria', () => {
    expect(pickHomeCollections(undefined)).toEqual([])
    expect(pickHomeCollections([])).toEqual([])
  })

  it('só RAIZ: a filha não vira fileira ao lado do pai', () => {
    // `useProducts(slug)` faz roll-up da descendência, então a fileira do pai já contém a da filha.
    // As duas na mesma página mostrariam os mesmos produtos duas vezes.
    const escolhidas = pickHomeCollections([
      category({ id: 'pai', name: 'Joias', slug: 'joias' }),
      category({ id: 'filha', name: 'Colares', slug: 'colares', parent_id: 'pai' }),
    ])

    expect(escolhidas.map((c) => c.id)).toEqual(['pai'])
  })

  it('categoria inativa fica de fora — a fileira levaria a um 404', () => {
    const escolhidas = pickHomeCollections([
      category({ id: 'a', name: 'Ativa', slug: 'ativa' }),
      category({ id: 'b', name: 'Oculta', slug: 'oculta', active: false }),
    ])

    expect(escolhidas.map((c) => c.id)).toEqual(['a'])
  })
})

describe('pickHomeCollections — ordem e quantidade', () => {
  it('ordena por `sort_order` e desempata por nome', () => {
    // Sem o desempate, duas raízes em `sort_order = 0` trocariam de lugar entre dois carregamentos.
    const escolhidas = pickHomeCollections([
      category({ id: 'c', name: 'Zebra', slug: 'zebra', sort_order: 0 }),
      category({ id: 'a', name: 'Abelha', slug: 'abelha', sort_order: 0 }),
      category({ id: 'b', name: 'Primeira', slug: 'primeira', sort_order: -1 }),
    ])

    expect(escolhidas.map((c) => c.name)).toEqual(['Primeira', 'Abelha', 'Zebra'])
  })

  it('para nas quatro fileiras do board', () => {
    const muitas = Array.from({ length: 9 }, (_, i) =>
      category({ id: `c${i}`, name: `Cat ${i}`, slug: `cat-${i}`, sort_order: i }),
    )

    expect(HOME_COLLECTION_ROWS).toBe(4)
    expect(pickHomeCollections(muitas)).toHaveLength(HOME_COLLECTION_ROWS)
    expect(pickHomeCollections(muitas, 2).map((c) => c.slug)).toEqual(['cat-0', 'cat-1'])
  })
})

describe('pickHomeCollections — o que cada fileira leva', () => {
  it('a canônica da raiz tem um segmento', () => {
    const [linha] = pickHomeCollections([category({ id: 'a', name: 'Anéis', slug: 'aneis' })])

    expect(linha.href).toBe('/aneis')
  })

  it('o banner da categoria abre a fileira quando existe', () => {
    const [linha] = pickHomeCollections([
      category({ id: 'a', name: 'Anéis', slug: 'aneis', banner_url: 'https://cdn/aneis.jpg' }),
    ])

    expect(linha.bannerUrl).toBe('https://cdn/aneis.jpg')
  })

  it('banner e descrição em branco viram `null`, nunca string vazia', () => {
    // `''` passaria por um `&&` e renderizaria um <img> quebrado e um subtítulo de altura zero.
    const [linha] = pickHomeCollections([
      category({ id: 'a', name: 'Anéis', slug: 'aneis', banner_url: '   ', description: '  ' }),
    ])

    expect(linha.bannerUrl).toBeNull()
    expect(linha.description).toBeNull()
  })
})
