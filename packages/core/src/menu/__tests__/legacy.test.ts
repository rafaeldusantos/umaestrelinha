import { describe, expect, it } from 'vitest'
import { legacyMenuDocument, type MenuCategory, type MenuLink } from '../index.ts'

/**
 * Feature 86, T03 — o menu de hoje como documento v2 (`MNM-34`, `MNM-40`, Success Criterion 3).
 *
 * É o que deixa a feature nascer sem migration: enquanto não há `version: 2` gravado, a loja e o
 * painel montam o menu a partir disto. A régua é a da `39` — as duas superfícies deduzidas por
 * `legacyMenuItems` —, e o documento tem de conter exatamente a mesma informação, unida.
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

const BANNERS = { desktop: [{ target: { kind: 'category', id: 'aneis' } }], mobile: [] }

const ARVORE: MenuCategory[] = [
  cat('joias', 'Joias', { sort_order: 0, menu_desktop: true, menu_mobile: true, icon: 'corrente', menu_banners: BANNERS }),
  cat('correntes', 'Correntes', { parent_id: 'joias', sort_order: 1, menu_desktop: true }),
  cat('pingentes', 'Pingentes', { parent_id: 'joias', sort_order: 2, menu_mobile: true }),
  cat('aneis', 'Anéis', { parent_id: 'joias', sort_order: 3, menu_desktop: true, menu_mobile: true }),
  cat('afetivas', 'Coleção Afetivas', { sort_order: 1, menu_desktop: true }),
  cat('chaveiros', 'Chaveiros', { sort_order: 2, menu_mobile: true }),
  cat('inativa', 'Inativa', { sort_order: 3, menu_desktop: true, menu_mobile: true, active: false }),
  cat('fora', 'Fora do menu', { sort_order: 4 }),
]

const LINKS: MenuLink[] = [
  link('sobre', 'Sobre', { sort_order: 100, icon: 'estrela' }),
  link('blog', 'Blog', { sort_order: 50, href: 'https://exemplo.com/blog', mobile: false }),
]

describe('legacyMenuDocument — a união das duas superfícies', () => {
  const doc = legacyMenuDocument(ARVORE, LINKS)
  const porId = (id: string) => doc.items.find(i => i.id === id)!

  it('é versão 2', () => {
    expect(doc.version).toBe(2)
  })

  it('a ordem é a de hoje: sort_order, depois nome — categorias e links juntos', () => {
    expect(doc.items.map(i => i.id)).toEqual([
      'cat:joias',
      'cat:afetivas',
      'cat:chaveiros',
      'link:blog',
      'link:sobre',
    ])
  })

  it('item só no computador ⇒ desktop true, mobile false — e o inverso', () => {
    expect(porId('cat:afetivas')).toMatchObject({ desktop: true, mobile: false })
    expect(porId('cat:chaveiros')).toMatchObject({ desktop: false, mobile: true })
    expect(porId('cat:joias')).toMatchObject({ desktop: true, mobile: true })
    expect(porId('link:blog')).toMatchObject({ desktop: true, mobile: false })
  })

  it('inativa e desligada não entram', () => {
    expect(doc.items.map(i => i.id)).not.toContain('cat:inativa')
    expect(doc.items.map(i => i.id)).not.toContain('cat:fora')
  })

  it('os filhos levam as chaves de CADA superfície, na ordem da árvore', () => {
    expect(porId('cat:joias').children).toEqual([
      { id: 'cat:correntes', target: { kind: 'category', category_id: 'correntes' }, label: null, desktop: true, mobile: false },
      { id: 'cat:pingentes', target: { kind: 'category', category_id: 'pingentes' }, label: null, desktop: false, mobile: true },
      { id: 'cat:aneis', target: { kind: 'category', category_id: 'aneis' }, label: null, desktop: true, mobile: true },
    ])
  })

  it('categoria: label null (usa o nome ao vivo), ícone da categoria, banners copiados', () => {
    expect(porId('cat:joias')).toMatchObject({
      target: { kind: 'category', category_id: 'joias' },
      label: null,
      icon: 'corrente',
      banners: BANNERS,
    })
  })

  it('link: vira nó de link com rótulo, endereço e ícone; sem banners e sem submenu', () => {
    expect(porId('link:sobre')).toEqual({
      id: 'link:sobre',
      target: { kind: 'link', href: '/sobre' },
      label: 'Sobre',
      desktop: true,
      mobile: true,
      icon: 'estrela',
      banners: null,
      children: [],
    })
    expect(porId('link:blog').target).toEqual({ kind: 'link', href: 'https://exemplo.com/blog' })
  })

  it('categoria sem banners ⇒ banners null', () => {
    expect(porId('cat:afetivas').banners).toBeNull()
  })
})

describe('legacyMenuDocument — o papel muda por superfície, e a união guarda os dois', () => {
  // "Correntes" é raiz no computador (o pai está desligado lá) e filha no celular (o pai está ligado).
  const arvore = [
    cat('joias', 'Joias', { menu_mobile: true }),
    cat('correntes', 'Correntes', { parent_id: 'joias', sort_order: 1, menu_desktop: true, menu_mobile: true }),
  ]
  const doc = legacyMenuDocument(arvore, [])

  it('vira raiz só no computador, e filha só no celular', () => {
    const correntes = doc.items.find(i => i.id === 'cat:correntes')!
    expect(correntes).toMatchObject({ desktop: true, mobile: false })
    const joias = doc.items.find(i => i.id === 'cat:joias')!
    expect(joias).toMatchObject({ desktop: false, mobile: true })
    expect(joias.children).toEqual([
      expect.objectContaining({ id: 'cat:correntes', desktop: false, mobile: true }),
    ])
  })
})

describe('legacyMenuDocument — determinística (MNM-40)', () => {
  it('duas chamadas com a mesma entrada devolvem documentos iguais', () => {
    expect(legacyMenuDocument(ARVORE, LINKS)).toEqual(legacyMenuDocument(ARVORE, LINKS))
  })

  it('a ordem da ENTRADA não muda o documento', () => {
    expect(legacyMenuDocument([...ARVORE].reverse(), [...LINKS].reverse())).toEqual(
      legacyMenuDocument(ARVORE, LINKS),
    )
  })

  it('ids derivados do alvo, sem repetição', () => {
    const ids = legacyMenuDocument(ARVORE, LINKS).items.map(i => i.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every(id => /^(cat|link):/.test(id))).toBe(true)
  })

  it('sem nada ligado ⇒ documento vazio; entradas nulas não quebram', () => {
    expect(legacyMenuDocument([cat('x', 'X')], [])).toEqual({ version: 2, items: [] })
    expect(legacyMenuDocument(null as never, undefined)).toEqual({ version: 2, items: [] })
  })
})
