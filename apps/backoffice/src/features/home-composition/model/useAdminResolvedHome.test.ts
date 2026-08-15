// A derivação vista do painel — a metade de `HOME-09` que ninguém vê.
//
// A linha da lista diz "não vai aparecer **e por quê**", e a prévia desenha o que a Home vai
// mostrar. As duas só são verdade se o painel derivar as mesmas listas que a loja: se aqui a grade
// de banners achasse uma categoria que lá não entra, o painel diria "3 banners" e a cliente veria 2.
//
// Este arquivo é o par do `SPEC_DEVIATION` declarado em `useAdminResolvedHome.ts`: enquanto
// `pickHomeBanners` / `pickHomeCollections` / `pickTrendingCategories` viverem em `apps/store`, o
// que impede as duas cópias de divergirem em silêncio é uma suíte que cobra cada regra pelo nome.

import { renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { DEFAULT_HOME_COMPOSITION, type HomeSection } from '@estrelinha/core/home'
import type { AdminCategory } from '@/entities/category/api/useAdminCategories'
import { useAdminResolvedHome } from './useAdminResolvedHome'

const cat = (over: Partial<AdminCategory> & { id: string; name: string }): AdminCategory =>
  ({
    slug: over.slug ?? over.id,
    description: null,
    image_url: null,
    banner_url: null,
    color_accent: null,
    active: true,
    sort_order: 0,
    parent_id: null,
    product_count: 0,
    show_in_menu: false,
    menu_promo: null,
    ...over,
  }) as AdminCategory

/** A árvore real tem guarda-chuva: é ela que mostra a diferença entre "raiz" e "folha". */
const CATALOGO = [
  cat({ id: 'joias', name: 'Joias afetivas', sort_order: 0, banner_url: 'joias.webp' }),
  cat({ id: 'leite', name: 'Leite materno', parent_id: 'joias', sort_order: 1, banner_url: 'leite.webp' }),
  cat({ id: 'cinzas', name: 'Cinzas', parent_id: 'joias', sort_order: 2, banner_url: 'cinzas.webp' }),
  cat({ id: 'pet', name: 'Pelo de pet', parent_id: 'joias', sort_order: 3 }),
  cat({ id: 'oculta', name: 'Black Friday', parent_id: 'joias', sort_order: 4, active: false, banner_url: 'bf.webp' }),
]

const resolver = (
  sections: readonly HomeSection[] = DEFAULT_HOME_COMPOSITION,
  categories: AdminCategory[] = CATALOGO,
) => renderHook(() => useAdminResolvedHome(sections, categories)).result.current

const de = (type: HomeSection['type'], sections = DEFAULT_HOME_COMPOSITION, categories = CATALOGO) =>
  resolver(sections, categories).find(e => e.section.type === type)!

describe('useAdminResolvedHome — fileiras de coleção', () => {
  it('só RAIZ vira fileira: pai e filha juntos mostrariam os mesmos produtos duas vezes', () => {
    expect(de('collection_rows').items.map(i => i.label)).toEqual(['Joias afetivas'])
  })

  it('categoria inativa nunca entra — a fileira levaria a uma página 404', () => {
    const soInativa = [cat({ id: 'x', name: 'X', active: false })]
    expect(de('collection_rows', DEFAULT_HOME_COMPOSITION, soInativa).items).toEqual([])
  })

  it('catálogo vazio ⇒ a seção não renderiza, com o motivo (HOME-09)', () => {
    const entry = de('collection_rows', DEFAULT_HOME_COMPOSITION, [])
    expect(entry.renders).toBe(false)
    expect(entry.hiddenReason).toBe('Não vai aparecer: o catálogo ainda não tem coleção para mostrar.')
  })
})

describe('useAdminResolvedHome — grade de banners', () => {
  it('a curadoria é a IMAGEM: só quem tem `banner_url` entra', () => {
    const labels = de('banner_grid').items.map(i => i.label)
    expect(labels).not.toContain('Pelo de pet')
  })

  it('quem já abre uma fileira sai da grade — a mesma arte não aparece duas vezes', () => {
    // "Joias afetivas" é a única raiz, então é ela que vira fileira; mesmo tendo banner, some daqui.
    expect(de('banner_grid').items.map(i => i.label)).toEqual(['Leite materno', 'Cinzas'])
  })

  it('categoria inativa não entra, mesmo com banner', () => {
    expect(de('banner_grid').items.map(i => i.label)).not.toContain('Black Friday')
  })
})

describe('useAdminResolvedHome — chips de tema', () => {
  it('chip é FOLHA, não raiz: ninguém busca a categoria que contém tudo', () => {
    expect(de('trending_tags').items.map(i => i.label)).toEqual([
      'Leite materno',
      'Cinzas',
      'Pelo de pet',
      'Black Friday',
    ])
  })
})

describe('useAdminResolvedHome — curadoria por cima da derivação', () => {
  const curada = (categoryId: string): HomeSection[] =>
    DEFAULT_HOME_COMPOSITION.map(s =>
      s.type === 'collection_rows'
        ? {
            ...s,
            items: [
              {
                id: 'i1',
                section_id: s.id,
                position: 1,
                category_id: categoryId,
                product_id: null,
                href: null,
                image_url: null,
                alt: null,
                label_snapshot: 'guardado',
              },
            ],
          }
        : s,
    )

  it('com itens, a lista é a da dona — e uma folha vale, mesmo não sendo raiz', () => {
    const entry = de('collection_rows', curada('leite'))
    expect(entry.items.map(i => i.label)).toEqual(['Leite materno'])
    expect(entry.items[0].curated).toBe(true)
  })

  it('escolhido que saiu do ar é pulado e contado (HOME-34)', () => {
    const entry = de('collection_rows', curada('oculta'))
    expect(entry.items).toEqual([])
    expect(entry.droppedCount).toBe(1)
    expect(entry.hiddenReason).toBe('Não vai aparecer: o item escolhido saiu do ar.')
  })
})

describe('useAdminResolvedHome — destino de PRODUTO (emenda E5)', () => {
  const comProduto = (product_slug: string | null): HomeSection[] =>
    DEFAULT_HOME_COMPOSITION.map(s =>
      s.type === 'banner_grid'
        ? {
            ...s,
            items: [
              {
                id: 'i1',
                section_id: s.id,
                position: 1,
                category_id: null,
                product_id: 'prod-1',
                product_slug,
                href: null,
                image_url: 'https://cdn/campanha.webp',
                alt: 'Pingente com leite materno',
                label_snapshot: 'Pingente Gota',
              },
            ],
          }
        : s,
    )

  it('com o slug embutido, o painel resolve o banner e monta o caminho canônico', () => {
    // O painel tem de dizer a MESMA coisa que a Home desenha. Enquanto o produto era tratado como
    // "fora do ar", a linha da lista prometia uma ausência que a loja não teria.
    const entry = de('banner_grid', comProduto('pingente-gota'))

    expect(entry.renders).toBe(true)
    expect(entry.droppedCount).toBe(0)
    expect(entry.items[0]).toMatchObject({
      productId: 'prod-1',
      href: '/produtos/pingente-gota',
      curated: true,
    })
  })

  it('sem slug (produto despublicado ou apagado) o banner sai de cena e é contado', () => {
    const entry = de('banner_grid', comProduto(null))

    expect(entry.renders).toBe(false)
    expect(entry.droppedCount).toBe(1)
    expect(entry.hiddenReason).toBe('Não vai aparecer: o item escolhido saiu do ar.')
  })
})
