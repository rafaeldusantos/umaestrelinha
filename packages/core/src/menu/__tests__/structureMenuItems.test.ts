import { describe, expect, it } from 'vitest'
import { categoryPath } from '../../routes/index.ts'
import {
  legacyMenuItems,
  menuItems,
  menuPanelColumns,
  type LegacyMenuItem,
  type MenuCategory,
  type MenuDocument,
  type MenuLink,
  type MenuNode,
  type MenuRootNode,
  type MenuSurface,
} from '../index.ts'

/**
 * Feature 86, T04 — a porta `menuItems` lê o documento.
 *
 * **A prova central é a primeira**: sem documento, a saída da porta nova é a de antes, item a item,
 * nas duas superfícies. A comparação é contra `legacyMenuItems` — o motor da `39` — e o `href` de cada
 * filho é comparado com o que o `MegaMenu` e o `MobileMenu` montavam até aqui
 * (`categoryPath(filha.slug, item.slug)`), que é o endereço que a cliente clicava.
 */

const cat = (id: string, name: string, over: Partial<MenuCategory> = {}): MenuCategory => ({
  id,
  name,
  slug: id,
  description: null,
  parent_id: null,
  sort_order: 0,
  active: true,
  menu_desktop: false,
  menu_mobile: false,
  ...over,
})

const link = (id: string, label: string, over: Partial<MenuLink> = {}): MenuLink => ({
  id,
  label,
  href: `/${id}`,
  desktop: true,
  mobile: true,
  sort_order: 0,
  ...over,
})

/** A árvore real da feature 16/39 (`menu.test.ts`), com a curadoria por dispositivo da `39`. */
const REAL_TREE: MenuCategory[] = [
  cat('bottons', 'Bottons', { sort_order: 0, menu_mobile: true }),
  cat('academia', 'Academia', { parent_id: 'bottons', sort_order: 0 }),
  cat('anime', 'Anime', { parent_id: 'bottons', sort_order: 1, menu_desktop: true, menu_mobile: true }),
  cat('kpop', 'K-Pop', { parent_id: 'bottons', sort_order: 2, menu_desktop: true, icon: 'estrela' }),
  cat('filmes', 'Filmes', { parent_id: 'bottons', sort_order: 3, menu_desktop: true, menu_mobile: true }),
  cat('games', 'Games', { parent_id: 'bottons', sort_order: 5, menu_desktop: true }),
  cat('bandas', 'Bandas', { parent_id: 'bottons', sort_order: 4, menu_mobile: true }),
  cat('naruto', 'Naruto', { parent_id: 'anime', sort_order: 1, menu_desktop: true }),
  cat('villains', 'Villains', { parent_id: 'anime', sort_order: 2, menu_desktop: true, menu_mobile: true }),
  cat('joias', 'Joias', {
    sort_order: 1,
    menu_desktop: true,
    menu_mobile: true,
    icon: 'corrente',
    menu_banners: { desktop: [{ target: { kind: 'url', href: '/sobre' } }], mobile: [] },
  }),
  cat('aneis', 'Anéis', { parent_id: 'joias', sort_order: 0, menu_desktop: true }),
  cat('so-banner', 'Só banner', {
    sort_order: 2,
    menu_desktop: true,
    menu_mobile: true,
    menu_banners: { desktop: [], mobile: [{ target: { kind: 'url', href: '/sobre' } }] },
  }),
  cat('pai-inativo', 'Pai inativo', { sort_order: 3, active: false, menu_desktop: true }),
  cat('orfa', 'Órfã', { parent_id: 'pai-inativo', sort_order: 0, menu_desktop: true, menu_mobile: true }),
  cat('inativa', 'Inativa', { sort_order: 4, active: false, menu_desktop: true, menu_mobile: true }),
]

const LINKS: MenuLink[] = [
  link('sobre', 'Sobre', { sort_order: 100, icon: 'estrela' }),
  link('blog', ' Blog ', { sort_order: 1, href: 'https://exemplo.com/blog', mobile: false }),
  link('meio', 'Meio', { sort_order: 1, href: 'sobre/' }),
  link('vazio', '   ', { sort_order: 2 }),
]

/** O que a loja desenhava a partir de um item legado — sem o id, que agora é o do nó. */
const comoAntes = (item: LegacyMenuItem, categorias: readonly MenuCategory[]) => ({
  id: item.kind === 'category' ? `cat:${item.id}` : `link:${item.id}`,
  kind: item.kind,
  categoryId: item.kind === 'category' ? item.id : null,
  name: item.name,
  href: item.href,
  external: item.kind === 'link' ? item.external : false,
  icon: item.icon,
  children:
    item.kind === 'category'
      ? item.children.map(f => ({
          id: `cat:${f.id}`,
          name: f.name,
          href: categoryPath(f.slug, item.slug),
          external: false,
        }))
      : [],
  banners:
    item.kind === 'category' ? (categorias.find(c => c.id === item.id)?.menu_banners ?? null) : null,
  hasPanel: item.kind === 'category' ? item.hasPanel : false,
})

describe('sem documento, a loja fica idêntica à de antes (Success Criterion 3)', () => {
  describe.each(['desktop', 'mobile'] as MenuSurface[])('%s', surface => {
    const antes = legacyMenuItems({ categories: REAL_TREE, links: LINKS }, surface)
    const agora = menuItems({ categories: REAL_TREE, links: LINKS }, surface)

    it('âncora: a fixture produz itens, com painel, link e externo', () => {
      expect(antes.length).toBeGreaterThanOrEqual(5)
      expect(antes.some(i => i.kind === 'link')).toBe(true)
      expect(antes.some(i => i.kind === 'category' && i.children.length > 0)).toBe(true)
    })

    it('mesmo número de itens, na mesma ordem', () => {
      expect(agora.map(i => i.name)).toEqual(antes.map(i => i.name))
    })

    it('item a item igual — nome, endereço, ícone, filhos, banners e painel', () => {
      expect(agora).toEqual(antes.map(i => comoAntes(i, REAL_TREE)))
    })
  })

  it('document: null é o mesmo que ausente', () => {
    expect(menuItems({ categories: REAL_TREE, links: LINKS, document: null }, 'desktop')).toEqual(
      menuItems({ categories: REAL_TREE, links: LINKS }, 'desktop'),
    )
  })

  it('sensor: um documento VAZIO não é "ausente" — a régua acima distingue os dois', () => {
    expect(
      menuItems({ categories: REAL_TREE, links: LINKS, document: { version: 2, items: [] } }, 'desktop'),
    ).toEqual([])
  })
})

// ---------------------------------------------------------------------------
// Com documento
// ---------------------------------------------------------------------------

const CATS: MenuCategory[] = [
  cat('joias', 'Joias'),
  cat('aneis', 'Anéis', { parent_id: 'joias' }),
  cat('colares', 'Colares', { parent_id: 'joias' }),
  cat('chaveiros', 'Chaveiros'),
  cat('velha', 'Velha', { active: false }),
]

const filho = (id: string, target: MenuNode['target'], over: Partial<MenuNode> = {}): MenuNode => ({
  id,
  target,
  label: null,
  desktop: true,
  mobile: true,
  ...over,
})

const raiz = (
  id: string,
  target: MenuNode['target'],
  over: Partial<MenuRootNode> = {},
): MenuRootNode => ({
  ...filho(id, target),
  icon: null,
  banners: null,
  children: [],
  ...over,
})

const C = (category_id: string) => ({ kind: 'category' as const, category_id })
const L = (href: string) => ({ kind: 'link' as const, href })
const doc = (...items: MenuRootNode[]): MenuDocument => ({ version: 2, items })
const ler = (d: MenuDocument, surface: MenuSurface = 'desktop', categories = CATS) =>
  menuItems({ categories, document: d }, surface)

describe('com documento — a ordem e o nome são da dona', () => {
  it('a ordem é a gravada, não a sort_order da árvore', () => {
    const d = doc(raiz('b', C('chaveiros')), raiz('a', C('joias')))
    expect(ler(d).map(i => i.name)).toEqual(['Chaveiros', 'Joias'])
  })

  it('label null usa o nome atual; renomear a categoria muda o nome (MNM-15)', () => {
    const d = doc(raiz('a', C('joias')))
    expect(ler(d)[0].name).toBe('Joias')
    expect(ler(d, 'desktop', CATS.map(c => (c.id === 'joias' ? { ...c, name: 'Joias finas' } : c)))[0].name).toBe('Joias finas')
  })

  it('nome próprio vence o da categoria', () => {
    expect(ler(doc(raiz('a', C('joias'), { label: 'Presentes' })))[0].name).toBe('Presentes')
  })

  it('o id do item é o do NÓ; categoryId é o da categoria; link tem categoryId null', () => {
    const [a, b] = ler(doc(raiz('n1', C('joias')), raiz('n2', L('/sobre'), { label: 'Sobre' })))
    expect(a).toMatchObject({ id: 'n1', kind: 'category', categoryId: 'joias', href: '/joias' })
    expect(b).toMatchObject({ id: 'n2', kind: 'link', categoryId: null, href: '/sobre', external: false })
  })

  it('sem teto: 20 itens devolvem 20 (MNM-39)', () => {
    const vinte = Array.from({ length: 20 }, (_, i) => raiz(`n${i}`, L('/sobre'), { label: `Item ${i}` }))
    expect(ler(doc(...vinte))).toHaveLength(20)
  })
})

describe('com documento — dispositivos (MNM-28..30)', () => {
  it('item desligado no celular some só do celular', () => {
    const d = doc(raiz('a', C('joias'), { mobile: false }))
    expect(ler(d, 'desktop')).toHaveLength(1)
    expect(ler(d, 'mobile')).toHaveLength(0)
  })

  it('desligado nos dois não sai em lugar nenhum', () => {
    const d = doc(raiz('a', C('joias'), { desktop: false, mobile: false }))
    expect([...ler(d, 'desktop'), ...ler(d, 'mobile')]).toEqual([])
  })

  it('filho desligado num dispositivo some só do painel daquele dispositivo', () => {
    const d = doc(raiz('a', C('joias'), { children: [filho('f', C('aneis'), { desktop: false })] }))
    expect(ler(d, 'desktop')[0].children).toEqual([])
    expect(ler(d, 'mobile')[0].children.map(c => c.name)).toEqual(['Anéis'])
  })
})

describe('com documento — o que deixou de existir (MNM-35, MNM-36)', () => {
  it('raiz de categoria inativa some com o submenu inteiro', () => {
    const d = doc(raiz('a', C('velha'), { children: [filho('f', C('aneis'))] }), raiz('b', C('chaveiros')))
    expect(ler(d).map(i => i.name)).toEqual(['Chaveiros'])
  })

  it('raiz de categoria apagada some', () => {
    expect(ler(doc(raiz('a', C('sumiu'), { label: 'Sumiu' })))).toEqual([])
  })

  it('filho inativo ou apagado some sozinho', () => {
    const d = doc(
      raiz('a', C('joias'), {
        children: [filho('f1', C('velha')), filho('f2', C('sumiu')), filho('f3', C('aneis'))],
      }),
    )
    expect(ler(d)[0].children.map(c => c.id)).toEqual(['f3'])
  })
})

describe('com documento — submenu e painel (MNM-27)', () => {
  it('o submenu pode ter categoria de outra árvore e link — cada um leva ao href DELE', () => {
    const d = doc(
      raiz('a', C('joias'), {
        children: [filho('f1', C('chaveiros')), filho('f2', L('https://x.com'), { label: 'Fora' }), filho('f3', C('colares'), { label: 'Colar' })],
      }),
    )
    expect(ler(d)[0].children).toEqual([
      { id: 'f1', name: 'Chaveiros', href: '/chaveiros', external: false },
      { id: 'f2', name: 'Fora', href: 'https://x.com', external: true },
      { id: 'f3', name: 'Colar', href: '/joias/colares', external: false },
    ])
  })

  it('link de submenu sem rótulo sai', () => {
    const d = doc(raiz('a', C('joias'), { children: [filho('f', L('/sobre'))] }))
    expect(ler(d)[0].children).toEqual([])
  })

  it('link COM submenu tem painel — o "Presentes" que abre categorias', () => {
    const d = doc(raiz('a', L('/sobre'), { label: 'Presentes', children: [filho('f', C('aneis'))] }))
    expect(ler(d)[0]).toMatchObject({ kind: 'link', hasPanel: true })
  })

  it('banner na superfície abre painel, sem filho; na outra superfície, não', () => {
    const banners = { desktop: [{ target: { kind: 'url' as const, href: '/sobre' } }], mobile: [] }
    const d = doc(raiz('a', L('/sobre'), { label: 'Presentes', banners }))
    expect(ler(d, 'desktop')[0].hasPanel).toBe(true)
    expect(ler(d, 'mobile')[0].hasPanel).toBe(false)
    expect(ler(d, 'desktop')[0].banners).toBe(banners)
  })

  it('sem filho visível e sem banner é link direto', () => {
    const d = doc(raiz('a', C('joias'), { children: [filho('f', C('aneis'), { desktop: false })] }))
    expect(ler(d, 'desktop')[0].hasPanel).toBe(false)
  })

  it('o ícone passa por menuIconKey: chave desconhecida vira null', () => {
    const d = doc(raiz('a', C('joias'), { icon: 'corrente' }), raiz('b', C('chaveiros'), { icon: 'emoji' }))
    expect(ler(d).map(i => i.icon)).toEqual(['corrente', null])
  })

  it('externo de raiz é marcado; endereço interno é normalizado', () => {
    const d = doc(raiz('a', L('https://x.com/a'), { label: 'Fora' }), raiz('b', L('sobre/'), { label: 'Sobre' }))
    expect(ler(d).map(i => [i.href, i.external])).toEqual([
      ['https://x.com/a', true],
      ['/sobre', false],
    ])
  })
})

describe('menuPanelColumns é genérico', () => {
  it('distribui MenuChild em colunas de até 8', () => {
    const filhos = Array.from({ length: 9 }, (_, i) => ({ id: `${i}`, name: `${i}`, href: '/', external: false }))
    const colunas = menuPanelColumns(filhos)
    expect(colunas.map(c => c.length)).toEqual([8, 1])
    expect(colunas[1][0]).toBe(filhos[8])
  })
})
