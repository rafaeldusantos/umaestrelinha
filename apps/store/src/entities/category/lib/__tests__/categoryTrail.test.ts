import { describe, it, expect } from 'vitest'
import { categoryTrail, categoryTrailLabel } from '../categoryTrail'
import type { Category } from '@estrelinha/supabase/types'

const cat = (id: string, name: string, parent_id: string | null = null): Category =>
  ({ id, name, slug: id, description: null, image_url: null, color_accent: null, emoji: '', parent_id, sort_order: 0 }) as Category

const anime = cat('anime', 'Anime')
const naruto = cat('naruto', 'Naruto', 'anime')
const all = [anime, naruto]

describe('categoryTrail', () => {
  it('monta a trilha da raiz até a categoria', () => {
    expect(categoryTrail(naruto, all).map((c) => c.id)).toEqual(['anime', 'naruto'])
    expect(categoryTrailLabel(naruto, all)).toBe('Anime · Naruto')
  })

  it('categoria raiz é a trilha inteira', () => {
    expect(categoryTrailLabel(anime, all)).toBe('Anime')
  })

  it('sem categoria devolve vazio', () => {
    expect(categoryTrail(null, all)).toEqual([])
    expect(categoryTrailLabel(undefined, all)).toBe('')
  })

  it('pai ausente na lista para a trilha em vez de quebrar', () => {
    expect(categoryTrailLabel(naruto, [naruto])).toBe('Naruto')
    expect(categoryTrailLabel(naruto, undefined)).toBe('Naruto')
  })

  it('ciclo em parent_id não trava a renderização', () => {
    const a = cat('a', 'A', 'b')
    const b = cat('b', 'B', 'a')
    expect(categoryTrailLabel(a, [a, b])).toBe('B · A')
  })
})
