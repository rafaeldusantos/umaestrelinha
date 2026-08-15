import { describe, expect, it } from 'vitest'
import type { Category } from '@estrelinha/supabase/types'
import { HOME_BANNER_SLOTS, pickHomeBanners } from '../pickHomeBanners'

/**
 * A curadoria da grade de banners da home.
 *
 * A regra é a mesma escolha do menu (feature 16): **quem cura é o dado que já existe**, aqui o
 * `banner_url` da categoria, não uma coluna `home_banner` nova. Um segundo dono para "esta linha
 * aparece na home" divergiria do primeiro no primeiro ajuste.
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

const comBanner = (
  over: Partial<Category> & Pick<Category, 'id' | 'name' | 'slug'>,
): Category => category({ banner_url: `https://cdn/${over.slug}.jpg`, ...over })

describe('pickHomeBanners — quem entra na grade', () => {
  it('devolve vazio sem categoria nenhuma', () => {
    expect(pickHomeBanners(undefined)).toEqual([])
    expect(pickHomeBanners([])).toEqual([])
  })

  it('só entra categoria com banner: sem imagem não há vitrine', () => {
    const banners = pickHomeBanners([
      category({ id: 'a', name: 'Sem banner', slug: 'sem-banner' }),
      comBanner({ id: 'b', name: 'Com banner', slug: 'com-banner' }),
    ])

    expect(banners.map((b) => b.id)).toEqual(['b'])
  })

  it('`banner_url` só com espaço em branco não conta como imagem', () => {
    // Um `''` ou `'   '` gravado por engano renderizaria um <img> quebrado no bloco mais visível da
    // home. O filtro é por conteúdo, não por presença da chave.
    const banners = pickHomeBanners([
      category({ id: 'a', name: 'Vazia', slug: 'vazia', banner_url: '   ' }),
      category({ id: 'b', name: 'Nula', slug: 'nula', banner_url: '' }),
    ])

    expect(banners).toEqual([])
  })

  it('categoria inativa fica de fora mesmo com banner — o destino seria 404', () => {
    const banners = pickHomeBanners([
      comBanner({ id: 'a', name: 'Ativa', slug: 'ativa' }),
      comBanner({ id: 'b', name: 'Oculta', slug: 'oculta', active: false }),
    ])

    expect(banners.map((b) => b.id)).toEqual(['a'])
  })
})

describe('pickHomeBanners — ordem e vagas', () => {
  it('ordena por `sort_order` e desempata por nome', () => {
    // Sem o desempate, duas categorias em `sort_order = 0` trocariam de lugar entre dois
    // carregamentos — o mesmo defeito que a barra do topo teve antes de `bySortOrder`.
    const banners = pickHomeBanners([
      comBanner({ id: 'c', name: 'Zebra', slug: 'zebra', sort_order: 0 }),
      comBanner({ id: 'a', name: 'Abelha', slug: 'abelha', sort_order: 0 }),
      comBanner({ id: 'b', name: 'Primeira', slug: 'primeira', sort_order: -1 }),
    ])

    expect(banners.map((b) => b.name)).toEqual(['Primeira', 'Abelha', 'Zebra'])
  })

  it('para nas três vagas que a grade tem', () => {
    const muitas = Array.from({ length: 6 }, (_, i) =>
      comBanner({ id: `c${i}`, name: `Cat ${i}`, slug: `cat-${i}`, sort_order: i }),
    )

    expect(HOME_BANNER_SLOTS).toBe(3)
    expect(pickHomeBanners(muitas)).toHaveLength(HOME_BANNER_SLOTS)
    expect(pickHomeBanners(muitas, { limit: 1 })).toHaveLength(1)
  })
})

describe('pickHomeBanners — a mesma arte não aparece duas vezes na página', () => {
  it('categoria que já é fileira de coleção sai da grade', () => {
    // As fileiras também abrem com o banner da categoria. Conteúdo tem prioridade sobre campanha:
    // quem é fileira sai daqui, não o contrário.
    const banners = pickHomeBanners(
      [
        comBanner({ id: 'a', name: 'Aneis', slug: 'aneis', sort_order: 0 }),
        comBanner({ id: 'b', name: 'Berloques', slug: 'berloques', sort_order: 1 }),
      ],
      { exclude: ['a'] },
    )

    expect(banners.map((b) => b.id)).toEqual(['b'])
  })

  it('excluir tudo faz a grade sumir em vez de repetir', () => {
    const banners = pickHomeBanners([comBanner({ id: 'a', name: 'A', slug: 'a' })], {
      exclude: ['a'],
    })

    expect(banners).toEqual([])
  })
})

describe('pickHomeBanners — o destino', () => {
  it('a raiz aponta para a canônica de um segmento', () => {
    const [banner] = pickHomeBanners([comBanner({ id: 'a', name: 'Anéis', slug: 'aneis' })])

    expect(banner.href).toBe('/aneis')
  })

  it('a subcategoria aponta para a canônica de DOIS segmentos', () => {
    // `categoryHref` sobe até o pai imediato e para ali (AD-018). Cravar `/${slug}` aqui mandaria a
    // cliente para a forma que só responde 200 com canonical apontando para outro lugar.
    const banners = pickHomeBanners([
      category({ id: 'pai', name: 'Joias', slug: 'joias' }),
      comBanner({ id: 'filha', name: 'Colares', slug: 'colares', parent_id: 'pai' }),
    ])

    expect(banners.map((b) => b.href)).toEqual(['/joias/colares'])
  })
})
