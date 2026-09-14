// A derivação vista do painel — a metade de `HOME-09` que ninguém vê.
//
// A linha da lista diz "não vai aparecer **e por quê**", e a prévia desenha o que a Home vai
// mostrar. As duas só são verdade se o painel derivar as mesmas listas que a loja: se aqui a grade
// de banners achasse uma categoria que lá não entra, o painel diria "3 banners" e a cliente veria 2.
//
// Este arquivo nasceu como o par de um `SPEC_DEVIATION`: o painel tinha uma **segunda escrita** das
// três derivações da loja, e uma suíte cobrando cada regra pelo nome era o que impedia as cópias de
// divergirem em silêncio. A T35 tirou a causa — `pickHomeBanners` / `pickHomeCollections` /
// `pickTrendingCategories` moram em `@estrelinha/core/home` e as duas pontas leem a mesma função.
// A suíte **fica**: agora ela prova que o painel usa a derivação certa em cada tipo de seção, que é
// a metade que continua sendo escolha deste arquivo.

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

/** Uma peça, como o painel a enxerga. O campo é `is_active` — produto, não categoria. */
const peca = (id: string, over: { slug?: string; is_active?: boolean } = {}) => ({
  id,
  slug: over.slug ?? id,
  is_active: over.is_active ?? true,
})

/** O catálogo de peças, com uma despublicada — é ela que mostra a diferença que a `50` conserta. */
const PECAS = [
  peca('prod-1', { slug: 'pingente-gota' }),
  peca('prod-2', { slug: 'colar-de-cinzas' }),
  peca('prod-3', { slug: 'anel-oculto', is_active: false }),
]

const resolver = (
  sections: readonly HomeSection[] = DEFAULT_HOME_COMPOSITION,
  categories: AdminCategory[] = CATALOGO,
  products: typeof PECAS = PECAS,
) => renderHook(() => useAdminResolvedHome(sections, categories, products)).result.current

const de = (
  type: HomeSection['type'],
  sections = DEFAULT_HOME_COMPOSITION,
  categories = CATALOGO,
  products = PECAS,
) => resolver(sections, categories, products).find(e => e.section.type === type)!

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

  it('sem slug E sem catálogo o banner sai de cena e é contado', () => {
    const entry = de('banner_grid', comProduto(null), CATALOGO, [])

    expect(entry.renders).toBe(false)
    expect(entry.droppedCount).toBe(1)
    expect(entry.hiddenReason).toBe('Não vai aparecer: o item escolhido saiu do ar.')
  })
})

// ───────────────────────────────────────────────────────────────────────────
// DST-16, DST-20 — quem responde "está no ar?" é o CATÁLOGO, não o slug embutido
// ───────────────────────────────────────────────────────────────────────────
//
// Feature 50, `R-02`. O painel lê `products` como **admin**, e admin enxerga produto despublicado:
// o embed devolvia o slug de uma peça que a cliente, sob a RLS, nunca receberia. O painel dizia
// "tudo certo" sobre um bloco que a Home desenhava pela metade — que é exatamente o que `AD-024`
// proíbe: "saiu do ar" tem de significar a mesma coisa nas duas telas.

describe('useAdminResolvedHome — produto DESPUBLICADO (DST-16)', () => {
  const comProdutoId = (product_id: string | null, product_slug: string | null): HomeSection[] =>
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
                product_id,
                product_slug,
                href: null,
                image_url: 'https://cdn/campanha.webp',
                alt: null,
                label_snapshot: 'Pingente Gota',
              },
            ],
          }
        : s,
    )

  it('`is_active: false` sai de cena e entra em `droppedCount`', () => {
    // O caso que motivou a mudança: o slug CHEGA (admin o enxerga), e mesmo assim a peça não
    // aparece na loja. Antes da `50` esta seção era dada como "vai aparecer".
    const entry = de('banner_grid', comProdutoId('prod-3', 'anel-oculto'))

    expect(entry.renders).toBe(false)
    expect(entry.droppedCount).toBe(1)
    expect(entry.hiddenReason).toBe('Não vai aparecer: o item escolhido saiu do ar.')
  })

  it('produto ATIVO resolve — a régua não é "recusa tudo"', () => {
    const entry = de('banner_grid', comProdutoId('prod-1', 'pingente-gota'))

    expect(entry.renders).toBe(true)
    expect(entry.droppedCount).toBe(0)
    expect(entry.items[0]).toMatchObject({
      productId: 'prod-1',
      href: '/produtos/pingente-gota',
      curated: true,
    })
  })

  it('produto AUSENTE do catálogo (apagado) sai de cena, e o rótulo congelado sobrevive', () => {
    const entry = de('banner_grid', comProdutoId('prod-99', 'peca-fantasma'))

    expect(entry.renders).toBe(false)
    expect(entry.droppedCount).toBe(1)
    // O snapshot continua no item gravado — é o que o EDITOR lê para dizer qual peça se perdeu.
    const secao = comProdutoId('prod-99', 'peca-fantasma').find(s => s.type === 'banner_grid')!
    expect(secao.items![0].label_snapshot).toBe('Pingente Gota')
  })

  it('o SLUG vem do catálogo vivo — renomear o produto muda o endereço', () => {
    // O slug embutido é o do momento da leitura; o do catálogo é o de agora. Deixar o embutido
    // vencer faria o painel montar um `/produtos/:slug` que já responde 404.
    const entry = de('banner_grid', comProdutoId('prod-2', 'slug-velho'))
    expect(entry.items[0].href).toBe('/produtos/colar-de-cinzas')
  })

  it('sem slug no catálogo, o do RASCUNHO vale — é o que faz a prévia mostrar a peça (DST-24)', () => {
    // A peça recém-escolhida no editor chega com o slug congelado pela escolha. Sem este recuo, o
    // bloco em edição apareceria vazio justamente enquanto a dona o monta.
    const entry = de('banner_grid', comProdutoId('prod-1', 'slug-do-rascunho'), CATALOGO, [
      { id: 'prod-1', slug: '', is_active: true },
    ])

    expect(entry.renders).toBe(true)
    expect(entry.items[0].href).toBe('/produtos/slug-do-rascunho')
  })

  it('o rótulo sai de `alt`, do `label_snapshot` e do slug — nessa ordem', () => {
    const comAlt = comProdutoId('prod-1', 'pingente-gota').map(s =>
      s.type === 'banner_grid'
        ? { ...s, items: [{ ...s.items![0], alt: 'A joia da campanha' }] }
        : s,
    )
    expect(de('banner_grid', comAlt).items[0].label).toBe('A joia da campanha')

    // Sem `alt`, o congelado.
    expect(de('banner_grid', comProdutoId('prod-1', 'pingente-gota')).items[0].label).toBe(
      'Pingente Gota',
    )

    // Sem os dois, o slug — nunca um retângulo vazio.
    const semNada = comProdutoId('prod-1', 'pingente-gota').map(s =>
      s.type === 'banner_grid'
        ? { ...s, items: [{ ...s.items![0], alt: null, label_snapshot: null }] }
        : s,
    )
    expect(de('banner_grid', semNada).items[0].label).toBe('pingente-gota')
  })
})

describe('useAdminResolvedHome — o ramo de CATEGORIA não mudou de comportamento', () => {
  // Sensor de vizinhança: a `50` mexeu no ramo de produto, que fica três linhas abaixo do de
  // categoria e lê um campo de nome PARECIDO (`is_active` × `active`). Trocar um pelo outro não é
  // erro de tipo em nenhum dos dois sentidos — `categoria.is_active` seria `undefined`, e toda
  // categoria desativada voltaria a ser dada como no ar.
  const curada = (categoryId: string): HomeSection[] =>
    DEFAULT_HOME_COMPOSITION.map(s =>
      s.type === 'collection_rows'
        ? {
            ...s,
            items: [
              {
                id: 'c1',
                section_id: s.id,
                position: 1,
                category_id: categoryId,
                product_id: null,
                href: null,
                image_url: null,
                image_mobile_url: null,
                alt: null,
                label_snapshot: 'Black Friday',
              },
            ],
          }
        : s,
    )

  it('categoria DESATIVADA continua saindo de cena e sendo contada', () => {
    const entry = de('collection_rows', curada('oculta'))
    expect(entry.items).toEqual([])
    expect(entry.droppedCount).toBe(1)
  })

  it('categoria ATIVA continua resolvendo', () => {
    const entry = de('collection_rows', curada('leite'))
    expect(entry.items.map(i => i.label)).toEqual(['Leite materno'])
  })

  it('o catálogo de PEÇAS não interfere no ramo de categoria', () => {
    // Uma lista de peças vazia não pode apagar coleção nenhuma: são dois pools diferentes.
    const entry = de('collection_rows', curada('leite'), CATALOGO, [])
    expect(entry.items.map(i => i.label)).toEqual(['Leite materno'])
  })
})
