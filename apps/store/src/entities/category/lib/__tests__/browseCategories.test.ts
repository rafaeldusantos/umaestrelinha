import { describe, expect, it } from 'vitest'
import { browseCategories } from '../browseCategories'
import type { Category } from '@nanapin/supabase/types'

// MENU-01 / MENU-02 — a grade "Coleções" da home e a coluna "Categorias" do rodapé.

const cat = (id: string, name: string, over: Partial<Category> = {}): Category =>
  ({
    id,
    name,
    slug: id,
    description: null,
    image_url: null,
    color_accent: null,
    emoji: '',
    parent_id: null,
    sort_order: 0,
    active: true,
    show_in_menu: false,
    menu_promo: null,
    ...over,
  }) as Category

/** A árvore que o banco tinha quando a feature 16 começou — guarda-chuva "Bottons" com tudo dentro. */
const UMBRELLA: Category[] = [
  cat('bottons', 'Bottons', { sort_order: 0 }),
  cat('academia', 'Academia', { parent_id: 'bottons', sort_order: 0 }),
  cat('anime', 'Anime', { parent_id: 'bottons', sort_order: 1 }),
  cat('kpop', 'K-Pop', { parent_id: 'bottons', sort_order: 2 }),
  cat('naruto', 'Naruto', { parent_id: 'anime', sort_order: 1 }),
]

/** A árvore do seed: oito raízes, nenhuma hierarquia. */
const FLAT: Category[] = [
  cat('anime', 'Anime', { sort_order: 1 }),
  cat('kpop', 'K-Pop', { sort_order: 2 }),
  cat('filmes', 'Filmes', { sort_order: 3 }),
]

describe('browseCategories', () => {
  it('árvore plana devolve as raízes, na ordem editorial', () => {
    expect(browseCategories(FLAT).map((c) => c.name)).toEqual(['Anime', 'K-Pop', 'Filmes'])
  })

  it('guarda-chuva único é pulado: a navegação começa nas filhas dele', () => {
    // Este é o caso real. Filtrar por `parent_id === null` devolveria só ["Bottons"] — uma grade de
    // um tile, escrita com o nome do que a loja vende.
    expect(browseCategories(UMBRELLA).map((c) => c.name)).toEqual(['Academia', 'Anime', 'K-Pop'])
  })

  it('NÃO desce até a folha — Anime continua sendo a escolha, não Naruto', () => {
    // A diferença de propósito em relação ao `pickTrendingCategories`, que é sobre o que está em alta.
    expect(browseCategories(UMBRELLA).map((c) => c.name)).not.toContain('Naruto')
  })

  it('duas raízes ou mais são escolhas de verdade e ficam como estão', () => {
    const duas = [...UMBRELLA, cat('brindes', 'Brindes', { sort_order: 9 })]
    expect(browseCategories(duas).map((c) => c.name)).toEqual(['Bottons', 'Brindes'])
  })

  it('desempata por nome — é o empate que levava "Academia" ao topo do header', () => {
    // Bottons(0) e Academia(0) empatavam; sem desempate a ordem era a que o Postgres devolvesse.
    const invertida = [...UMBRELLA].reverse()
    expect(browseCategories(invertida).map((c) => c.name)).toEqual(
      browseCategories(UMBRELLA).map((c) => c.name),
    )
  })

  it('categoria inativa não aparece, mesmo com a RLS permitindo (admin logado na loja)', () => {
    const comOculta = UMBRELLA.map((c) => (c.id === 'anime' ? { ...c, active: false } : c))
    expect(browseCategories(comOculta).map((c) => c.name)).toEqual(['Academia', 'K-Pop'])
  })

  it('guarda-chuva cujas filhas estão todas inativas volta a ser ele próprio', () => {
    const soRaiz = UMBRELLA.map((c) => (c.parent_id ? { ...c, active: false } : c))
    expect(browseCategories(soRaiz).map((c) => c.name)).toEqual(['Bottons'])
  })

  it('lista vazia e undefined devolvem vazio em vez de quebrar', () => {
    expect(browseCategories([])).toEqual([])
    expect(browseCategories(undefined)).toEqual([])
  })

  it('árvore só de órfãs (pai inexistente) não devolve nada — nenhuma é raiz', () => {
    const orfas = [cat('naruto', 'Naruto', { parent_id: 'fantasma' })]
    expect(browseCategories(orfas)).toEqual([])
  })
})
