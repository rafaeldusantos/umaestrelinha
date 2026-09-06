import { beforeEach, describe, expect, it, vi } from 'vitest'
import { renderHook } from '@testing-library/react'

/**
 * `useMenu(surface)` — a porta da loja para o menu, feature 39.
 *
 * Três coisas se provam aqui, e nenhuma é alcançável por teste de componente:
 *
 * 1. **A superfície é pedida por nome, não adivinhada por largura** (`NAV-01`). A mesma loja devolve
 *    listas diferentes para `'desktop'` e `'mobile'`, com o mesmo dado.
 * 2. **As duas fontes se fundem numa lista só** (`NAV-14`) — categorias e itens de link, ordenados
 *    juntos. É isso que permite não haver item de menu escrito em JSX.
 * 3. **Falha de leitura devolve `[]`**, dos dois lados, e a loja continua de pé.
 */

const { categoriesState, settingsState, previewState } = vi.hoisted(() => ({
  categoriesState: { data: undefined as unknown },
  settingsState: { data: undefined as unknown },
  previewState: { preview: false, draft: null as unknown, openId: null as string | null },
}))

vi.mock('../useCategories', () => ({ useCategories: () => categoriesState }))
vi.mock('@estrelinha/core/hooks/useStoreSettings', () => ({
  useStoreSettings: () => settingsState,
}))
vi.mock('@/entities/menu/model/useMenuPreview', () => ({
  useMenuPreview: () => previewState,
}))

import { useMenu } from '../useMenu'

const categoria = (over: Record<string, unknown> & { id: string; name: string }) => ({
  slug: over.id,
  description: null,
  parent_id: null,
  sort_order: 0,
  active: true,
  icon: null,
  menu_desktop: false,
  menu_mobile: false,
  menu_banners: null,
  ...over,
})

const link = (over: Record<string, unknown> & { id: string; label: string }) => ({
  href: `/${over.id}`,
  icon: null,
  desktop: false,
  mobile: false,
  sort_order: 0,
  ...over,
})

const menu = (surface: 'desktop' | 'mobile') => renderHook(() => useMenu(surface)).result.current

beforeEach(() => {
  categoriesState.data = []
  settingsState.data = { menu: { links: [] } }
  previewState.preview = false
  previewState.draft = null
  previewState.openId = null
})

describe('useMenu — duas curadorias, um dado (NAV-01)', () => {
  it('a mesma categoria entra numa superfície e não na outra', () => {
    categoriesState.data = [
      categoria({ id: 'correntes', name: 'Correntes', menu_mobile: true }),
      categoria({ id: 'personalizados', name: 'Personalizados', menu_desktop: true }),
    ]

    expect(menu('desktop').items.map(i => i.name)).toEqual(['Personalizados'])
    expect(menu('mobile').items.map(i => i.name)).toEqual(['Correntes'])
  })

  it('a filha marcada junto com o pai vira item do painel, e não entrada da barra (NAV-06)', () => {
    categoriesState.data = [
      categoria({ id: 'joias', name: 'Joias', menu_desktop: true, sort_order: 0 }),
      categoria({
        id: 'cinzas',
        name: 'Cinzas',
        parent_id: 'joias',
        menu_desktop: true,
        sort_order: 1,
      }),
    ]

    const items = menu('desktop').items
    expect(items.map(i => i.name)).toEqual(['Joias'])
    expect(items[0].kind === 'category' && items[0].children.map(c => c.name)).toEqual(['Cinzas'])
  })
})

describe('useMenu — as duas fontes numa lista só (NAV-14)', () => {
  it('categoria e link saem ordenados JUNTOS, pela mesma regra', () => {
    // Se cada fonte fosse ordenada por conta e depois concatenada, o link cairia sempre no fim —
    // e a Adri não teria como pôr o "Sobre" entre duas coleções.
    categoriesState.data = [
      categoria({ id: 'correntes', name: 'Correntes', menu_desktop: true, sort_order: 10 }),
      categoria({ id: 'pingentes', name: 'Pingentes', menu_desktop: true, sort_order: 30 }),
    ]
    settingsState.data = {
      menu: { links: [link({ id: 'sobre', label: 'Sobre', desktop: true, sort_order: 20 })] },
    }

    expect(menu('desktop').items.map(i => i.name)).toEqual(['Correntes', 'Sobre', 'Pingentes'])
  })

  it('o link ligado só no celular não aparece no computador', () => {
    settingsState.data = {
      menu: { links: [link({ id: 'guia', label: 'Como enviar', mobile: true })] },
    }

    expect(menu('desktop').items).toEqual([])
    expect(menu('mobile').items.map(i => i.name)).toEqual(['Como enviar'])
  })

  it('sem link nenhum, a barra é só categorias — sem sobra (NAV-15)', () => {
    categoriesState.data = [categoria({ id: 'correntes', name: 'Correntes', menu_desktop: true })]
    settingsState.data = { menu: { links: [] } }

    expect(menu('desktop').items.map(i => i.kind)).toEqual(['category'])
  })

  it('sem categoria nenhuma, sobram só os links', () => {
    settingsState.data = {
      menu: { links: [link({ id: 'sobre', label: 'Sobre', desktop: true })] },
    }

    expect(menu('desktop').items.map(i => i.kind)).toEqual(['link'])
  })
})

describe('NAV-44 — em modo prévia o rascunho SUBSTITUI o banco', () => {
  it('a barra passa a ser a do painel, e a leitura do banco é ignorada', () => {
    categoriesState.data = [categoria({ id: 'salva', name: 'Salva no banco', menu_desktop: true })]
    previewState.draft = {
      categories: [categoria({ id: 'rascunho', name: 'Do rascunho', menu_desktop: true })],
      links: [link({ id: 'sobre', label: 'Sobre', desktop: true, sort_order: 100 })],
    }

    expect(menu('desktop').items.map(i => i.name)).toEqual(['Do rascunho', 'Sobre'])
  })

  it('a substituição vale para as DUAS superfícies, com a mesma função', () => {
    // O quadro do celular mede 390 e a folha pede `'mobile'`: se o rascunho só chegasse ao desktop, a
    // prévia da superfície que responde por ~90% dos acessos mostraria o banco.
    previewState.draft = {
      categories: [
        categoria({ id: 'so-celular', name: 'Só no celular', menu_mobile: true }),
        categoria({ id: 'so-pc', name: 'Só no computador', menu_desktop: true }),
      ],
      links: [],
    }

    expect(menu('mobile').items.map(i => i.name)).toEqual(['Só no celular'])
    expect(menu('desktop').items.map(i => i.name)).toEqual(['Só no computador'])
  })

  it('rascunho VAZIO é menu vazio, e não o do banco — é como a dona vê o que desligou', () => {
    // A diferença que o hook da ponte guarda: `null` é "ainda não chegou" e cai no banco; `[]` é
    // "a dona desligou tudo". Confundir os dois faria a prévia nunca ficar vazia.
    categoriesState.data = [categoria({ id: 'salva', name: 'Salva no banco', menu_desktop: true })]
    previewState.draft = { categories: [], links: [] }

    expect(menu('desktop').items).toEqual([])
  })

  it('sem rascunho (`null`), a loja lê o banco como sempre', () => {
    categoriesState.data = [categoria({ id: 'salva', name: 'Salva no banco', menu_desktop: true })]
    previewState.draft = null

    expect(menu('desktop').items.map(i => i.name)).toEqual(['Salva no banco'])
  })
})

describe('useMenu — falha de leitura não quebra a loja', () => {
  it('categorias ainda carregando devolve lista vazia, não `undefined`', () => {
    // `items.length === 0` é o que faz a faixa não renderizar. `undefined` aqui derrubaria o header
    // inteiro no primeiro `.map`.
    categoriesState.data = undefined
    settingsState.data = undefined

    expect(menu('desktop').items).toEqual([])
  })

  it('settings sem a chave `menu` (linha ainda não gravada) devolve só as categorias', () => {
    categoriesState.data = [categoria({ id: 'correntes', name: 'Correntes', menu_desktop: true })]
    settingsState.data = {}

    expect(menu('desktop').items.map(i => i.name)).toEqual(['Correntes'])
  })
})
