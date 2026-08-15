import { describe, it, expect } from 'vitest'
import { pickTrendingCategories } from '../derive'
import type { MenuCategory } from '../../menu'

/**
 * **Veio inteiro de `apps/store` na T35**, com os cinco casos intactos. A fixture era anotada com
 * `Category` de `@estrelinha/supabase/types`; `core` não importa Supabase, e a função passou a ser
 * genérica sobre o que recebe — então o tipo local é o bastante e o retorno continua sendo o próprio
 * tipo de entrada.
 */

type Category = MenuCategory & { image_url?: string | null; color_accent?: string | null; emoji?: string }

const cat = (id: string, parent_id: string | null = null): Category =>
  ({ id, name: id, slug: id, description: null, image_url: null, color_accent: null, emoji: '', parent_id, sort_order: 0 }) as Category

describe('pickTrendingCategories', () => {
  it('mostra as folhas, não a raiz guarda-chuva — é a árvore real da loja', () => {
    const tree = [cat('bottons'), cat('anime', 'bottons'), cat('kpop', 'bottons')]
    expect(pickTrendingCategories(tree, 8).map((c) => c.id)).toEqual(['anime', 'kpop'])
  })

  it('árvore plana: toda categoria é folha', () => {
    const flat = [cat('anime'), cat('kpop'), cat('games')]
    expect(pickTrendingCategories(flat, 8).map((c) => c.id)).toEqual(['anime', 'kpop', 'games'])
  })

  it('respeita o limite e a ordem que chega (sort_order)', () => {
    const tree = [cat('raiz'), cat('a', 'raiz'), cat('b', 'raiz'), cat('c', 'raiz')]
    expect(pickTrendingCategories(tree, 2).map((c) => c.id)).toEqual(['a', 'b'])
  })

  it('lista vazia ou ausente não quebra', () => {
    expect(pickTrendingCategories([], 8)).toEqual([])
    expect(pickTrendingCategories(undefined, 8)).toEqual([])
  })

  it('nível intermediário não vira pílula', () => {
    const deep = [cat('raiz'), cat('anime', 'raiz'), cat('naruto', 'anime')]
    expect(pickTrendingCategories(deep, 8).map((c) => c.id)).toEqual(['naruto'])
  })
})
