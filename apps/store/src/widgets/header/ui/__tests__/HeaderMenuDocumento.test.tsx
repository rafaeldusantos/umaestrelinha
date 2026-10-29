import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import {
  legacyMenuItems,
  menuItems,
  type MenuCategory,
  type MenuDocument,
  type MenuSurface,
} from '@estrelinha/core/menu'
import Header from '../Header'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Feature 86, T04 — a fiação pelo `Header` REAL, com o `MegaMenu` REAL e a porta `menuItems` REAL.
 *
 * `Header.test.tsx` dubla o `MegaMenu` e `MegaMenu.test.tsx` monta itens à mão: nenhum dos dois prova
 * que um filho de submenu que NÃO é filha da árvore (outra categoria, um link) chega à barra com o
 * endereço dele. Aqui só os dados são dublados — a porta, o header e o painel são os de produção.
 */

const { menuSource, authState } = vi.hoisted(() => ({
  menuSource: {
    categories: [] as any[],
    document: null as any,
  },
  authState: { user: null as any, customer: null as any },
}))

vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => authState }))
vi.mock('@/features/auth', () => ({ useAuthUiStore: (sel: any) => sel({ open: vi.fn() }) }))
vi.mock('@/entities/cart/model/cartStore', () => ({ useCartStore: (sel: any) => sel({ uniqueItemsCount: () => 0 }) }))
vi.mock('@/entities/wishlist/model/wishlistStore', () => ({ useWishlistStore: (sel: any) => sel({ count: () => 0 }) }))
vi.mock('@/entities/category', async () => {
  const core = await vi.importActual<typeof import('@estrelinha/core/menu')>('@estrelinha/core/menu')
  return {
    // A porta de verdade, com a fonte controlada pelo teste.
    useMenu: (surface: MenuSurface) => ({
      items: core.menuItems(
        { categories: menuSource.categories, document: menuSource.document },
        surface,
      ),
    }),
    useMenuUiStore: (sel: any) => sel({ open: false, openMenu: vi.fn() }),
  }
})
vi.mock('@/entities/menu', () => ({
  useMenuBanners: () => [],
  useMenuPreview: () => ({ preview: false, draft: null, openId: null }),
}))
vi.mock('@/widgets/cart-drawer/ui/CartButton', () => ({ default: () => <div /> }))
vi.mock('@/features/search/ui/SearchDropdown', () => ({ default: () => <div /> }))

const cat = (id: string, name: string, over: Partial<MenuCategory> = {}): MenuCategory => ({
  id,
  name,
  slug: id,
  parent_id: null,
  sort_order: 0,
  active: true,
  ...over,
})

const CATS: MenuCategory[] = [
  cat('joias', 'Joias'),
  cat('aneis', 'Anéis', { parent_id: 'joias' }),
  cat('chaveiros', 'Chaveiros'),
]

const no = (id: string, target: any, over: Record<string, unknown> = {}) => ({
  id,
  target,
  label: null,
  desktop: true,
  mobile: true,
  ...over,
})

const DOC: MenuDocument = {
  version: 2,
  items: [
    {
      ...no('n-joias', { kind: 'category', category_id: 'joias' }),
      icon: null,
      banners: null,
      children: [
        no('f-aneis', { kind: 'category', category_id: 'aneis' }),
        no('f-chaveiros', { kind: 'category', category_id: 'chaveiros' }),
        no('f-sobre', { kind: 'link', href: '/sobre' }, { label: 'Nossa história' }),
        no('f-fora', { kind: 'link', href: 'https://exemplo.com/guia' }, { label: 'Guia externo' }),
      ],
    },
  ],
}

const renderHeader = () =>
  render(
    <MemoryRouter>
      <Header />
    </MemoryRouter>,
  )

beforeEach(() => {
  menuSource.categories = CATS
  menuSource.document = DOC
})

describe('o painel do mega menu leva cada filho ao endereço DELE (MNM-22, MNM-27)', () => {
  it('outra categoria, link interno e link externo, cada um com o seu href', () => {
    renderHeader()
    fireEvent.focus(screen.getByRole('link', { name: 'Joias' }))
    const painel = screen.getByTestId('mega-menu-painel')

    expect(within(painel).getByRole('link', { name: 'Anéis' })).toHaveAttribute('href', '/joias/aneis')
    // Não é filha de "Joias" na árvore: leva à canônica DELA, não a `/joias/chaveiros`.
    expect(within(painel).getByRole('link', { name: 'Chaveiros' })).toHaveAttribute('href', '/chaveiros')
    expect(within(painel).getByRole('link', { name: 'Nossa história' })).toHaveAttribute('href', '/sobre')

    const fora = within(painel).getByRole('link', { name: 'Guia externo' })
    expect(fora).toHaveAttribute('href', 'https://exemplo.com/guia')
    expect(fora).toHaveAttribute('target', '_blank')
    expect(fora).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('a ordem do submenu é a gravada', () => {
    renderHeader()
    fireEvent.focus(screen.getByRole('link', { name: 'Joias' }))
    const nomes = within(screen.getByTestId('mega-menu-painel'))
      .getAllByRole('link')
      .map(a => a.textContent)
      .filter(t => t && !t.startsWith('ver tudo'))
    expect(nomes).toEqual(['Anéis', 'Chaveiros', 'Nossa história', 'Guia externo'])
  })
})

describe('sem documento, o header desenha o menu de hoje (Success Criterion 3)', () => {
  it('a barra mostra o que `legacyMenuItems` mostrava, e o painel as mesmas filhas', () => {
    const legado = [
      cat('joias', 'Joias', { menu_desktop: true }),
      cat('aneis', 'Anéis', { parent_id: 'joias', menu_desktop: true }),
      cat('chaveiros', 'Chaveiros', { sort_order: 1, menu_desktop: true }),
    ]
    menuSource.categories = legado
    menuSource.document = null

    renderHeader()
    const antes = legacyMenuItems({ categories: legado }, 'desktop')
    expect(antes.map(i => i.name)).toEqual(['Joias', 'Chaveiros'])
    for (const item of antes) expect(screen.getByRole('link', { name: item.name })).toHaveAttribute('href', item.href)

    fireEvent.focus(screen.getByRole('link', { name: 'Joias' }))
    expect(within(screen.getByTestId('mega-menu-painel')).getByRole('link', { name: 'Anéis' })).toHaveAttribute(
      'href',
      '/joias/aneis',
    )
    // sensor: a porta nova e a velha dizem o mesmo para esta fonte
    expect(menuItems({ categories: legado }, 'desktop').map(i => i.name)).toEqual(antes.map(i => i.name))
  })
})
