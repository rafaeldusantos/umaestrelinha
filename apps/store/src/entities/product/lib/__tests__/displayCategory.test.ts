import { describe, expect, it } from 'vitest'
import { displayCategory } from '../displayCategory'
import type { Category } from '@estrelinha/supabase/types'

// PST-06 AC 3: "a loja SHALL usar a de menor `categories.sort_order` entre as do produto; em
// empate, a de menor `product_categories.position`".

const category = (id: string, sort_order: number, name = id): Category => ({
  id,
  name,
  slug: id,
  description: null,
  image_url: null,
  banner_url: null,
  color_accent: null,
  icon: null,
  parent_id: null,
  sort_order,
  active: true,
  menu_desktop: false,
  menu_mobile: false,
  menu_banners: null,
})

const ANIME = category('anime', 1, 'Anime')
const KPOP = category('kpop', 2, 'K-Pop')
const GAMES = category('games', 3, 'Games')
const CATEGORIES = [GAMES, KPOP, ANIME]

describe('displayCategory — categoria de exibição (PST-06 AC 3)', () => {
  it('escolhe a de menor sort_order, não a primeira do vínculo', () => {
    const product = {
      category_links: [
        { category_id: 'games', position: 0 },
        { category_id: 'anime', position: 1 },
      ],
    }
    expect(displayCategory(product, CATEGORIES)?.id).toBe('anime')
  })

  it('empate de sort_order resolve pela menor position do vínculo', () => {
    const empatadas = [category('a', 5, 'Alfa'), category('b', 5, 'Beta')]
    const product = {
      category_links: [
        { category_id: 'b', position: 0 },
        { category_id: 'a', position: 1 },
      ],
    }
    expect(displayCategory(product, empatadas)?.id).toBe('b')
  })

  it('empate nos dois critérios resolve por category_id — o resultado é determinístico', () => {
    const empatadas = [category('zeta', 5), category('alfa', 5)]
    const product = {
      category_links: [
        { category_id: 'zeta', position: 0 },
        { category_id: 'alfa', position: 0 },
      ],
    }
    expect(displayCategory(product, empatadas)?.id).toBe('alfa')
  })

  it('produto em 3 categorias: o selo é uma só, a de menor sort_order', () => {
    const product = {
      category_links: [
        { category_id: 'kpop', position: 0 },
        { category_id: 'games', position: 1 },
        { category_id: 'anime', position: 2 },
      ],
    }
    expect(displayCategory(product, CATEGORIES)).toEqual(ANIME)
  })

  it('produto sem categoria devolve null — o card esconde o selo em vez de quebrar', () => {
    expect(displayCategory({ category_links: [] }, CATEGORIES)).toBeNull()
  })

  it('vínculo apontando para categoria desconhecida é ignorado', () => {
    const product = {
      category_links: [
        { category_id: 'apagada', position: 0 },
        { category_id: 'kpop', position: 1 },
      ],
    }
    expect(displayCategory(product, CATEGORIES)?.id).toBe('kpop')
  })

  it('sem vínculo N:N cai na coluna legada category_id — insert direto no banco não perde o selo', () => {
    expect(displayCategory({ category_links: [], category_id: 'kpop' }, CATEGORIES)?.id).toBe('kpop')
  })

  it('categorias ainda não carregadas devolvem null, sem throw', () => {
    expect(displayCategory({ category_links: [{ category_id: 'anime', position: 0 }] }, undefined)).toBeNull()
  })
})
