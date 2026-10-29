import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MENU_PREVIEW_SOURCE } from '@estrelinha/core/menu'
import Header from '../Header'
import MobileMenu from '@/widgets/mobile-menu/ui/MobileMenu'
import { useMenuUiStore } from '@/entities/category'

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Feature 86, T07–T10 — o documento da dona chegando à loja pela fiação REAL.
 *
 * Só o **client do Supabase** é dublado. `useCategories`, `useStoreSettings`, `useMenu`,
 * `useMenuBanners`, `useMenuPreview`, a porta `menuItems`, o `Header`, o `MegaMenu` e o
 * `MobileMenu` são os de produção. `HeaderMenuDocumento.test.tsx` dubla `useMenu` e prova o
 * desenho; este prova que `store_settings.menu` (v2) vira o menu desenhado — inclusive o banner de
 * um item de LINK, que não tem categoria onde morar.
 *
 * O dublê **registra** cada tabela lida e devolve só o que a tabela tem: um `select` em outra tabela
 * ou um filtro inesperado fica visível em `leituras`.
 */

const { db, leituras } = vi.hoisted(() => ({
  db: { categories: [] as any[], store_settings: [] as any[], products: [] as any[] },
  leituras: [] as Array<{ tabela: string; select?: string; filtros: unknown[][] }>,
}))

vi.mock('@estrelinha/supabase/client', () => {
  const from = (tabela: string) => {
    const registro = { tabela, select: undefined as string | undefined, filtros: [] as unknown[][] }
    leituras.push(registro)
    const resposta = () => Promise.resolve({ data: (db as any)[tabela] ?? [], error: null })
    const builder: any = {
      select: (cols: string) => {
        registro.select = cols
        return builder
      },
      order: (...args: unknown[]) => {
        registro.filtros.push(['order', ...args])
        return builder
      },
      in: (...args: unknown[]) => {
        registro.filtros.push(['in', ...args])
        return builder
      },
      eq: (...args: unknown[]) => {
        registro.filtros.push(['eq', ...args])
        return builder
      },
      then: (ok: any, erro: any) => resposta().then(ok, erro),
    }
    return builder
  }
  return { supabase: { from } }
})

vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => ({ user: null, customer: null }) }))
vi.mock('@/features/auth', () => ({ useAuthUiStore: (sel: any) => sel({ open: vi.fn() }) }))
vi.mock('@/features/search', () => ({ useSearchUiStore: (sel: any) => sel({ openSearch: vi.fn() }) }))
vi.mock('@/entities/cart/model/cartStore', () => ({
  useCartStore: (sel: any) => sel({ uniqueItemsCount: () => 0 }),
}))
vi.mock('@/entities/wishlist/model/wishlistStore', () => ({
  useWishlistStore: (sel: any) => sel({ count: () => 0 }),
}))
vi.mock('@/widgets/cart-drawer/ui/CartButton', () => ({ default: () => <div /> }))
vi.mock('@/features/search/ui/SearchDropdown', () => ({ default: () => <div /> }))

const linha = (id: string, name: string, over: Record<string, unknown> = {}) => ({
  id,
  name,
  slug: id,
  description: null,
  parent_id: null,
  sort_order: 0,
  active: true,
  icon: null,
  image_url: null,
  banner_url: null,
  menu_desktop: false,
  menu_mobile: false,
  menu_banners: null,
  category_hidden_filter_groups: [],
  ...over,
})

const no = (id: string, target: any, over: Record<string, unknown> = {}) => ({
  id,
  target,
  label: null,
  desktop: true,
  mobile: true,
  ...over,
})

const raiz = (id: string, target: any, over: Record<string, unknown> = {}) => ({
  ...no(id, target),
  icon: null,
  banners: null,
  children: [],
  ...over,
})

const bannerDeChaveiros = {
  desktop: [{ target: { kind: 'category', id: 'chaveiros' }, title: 'Chaveiros afetivos' }],
  mobile: [{ target: { kind: 'category', id: 'chaveiros' }, title: 'Chaveiros afetivos' }],
}

const DOCUMENTO = {
  version: 2,
  items: [
    // link com BANNER e sem filho: abre painel pelo banner (MNM-27, MNM-33)
    raiz('n-sobre', { kind: 'link', href: '/sobre' }, { label: 'Sobre nós', banners: bannerDeChaveiros }),
    // link com SUBMENU
    raiz(
      'n-guia',
      { kind: 'link', href: '/como-enviar-seu-material-de-dna' },
      {
        label: 'Guia',
        children: [no('f-aneis', { kind: 'category', category_id: 'aneis' })],
      },
    ),
    // link sem filho e sem banner: link direto
    raiz('n-duvidas', { kind: 'link', href: '/perguntas-frequentes' }, { label: 'Dúvidas' }),
  ],
}

const semear = (menu: unknown) => {
  db.categories = [
    // colunas legadas LIGADAS: com v2 elas não podem ser lidas
    linha('joias', 'Joias', { menu_desktop: true, menu_mobile: true, menu_banners: bannerDeChaveiros }),
    linha('aneis', 'Anéis', { parent_id: 'joias', sort_order: 1 }),
    linha('chaveiros', 'Chaveiros', { sort_order: 2 }),
  ]
  db.store_settings = [{ key: 'menu', value: menu }]
  db.products = []
}

const comCliente = (ui: React.ReactNode) =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>,
  )

beforeEach(() => {
  leituras.length = 0
  semear(DOCUMENTO)
  useMenuUiStore.setState({ open: false })
})

describe('T07/T08 — a barra do computador desenha o documento v2', () => {
  it('os itens são os do documento, e a categoria ligada só na coluna NÃO aparece', async () => {
    comCliente(<Header />)
    await screen.findByRole('link', { name: /Sobre nós/ })
    expect(screen.getByRole('link', { name: /Guia/ })).toHaveAttribute('href', '/como-enviar-seu-material-de-dna')
    expect(screen.queryByRole('link', { name: /^Joias/ })).not.toBeInTheDocument()
    // nenhuma tabela além das duas fontes do menu
    expect(new Set(leituras.map(l => l.tabela))).toEqual(new Set(['categories', 'store_settings']))
  })

  it('o banner de um item de LINK aparece no painel dele (MNM-33)', async () => {
    comCliente(<Header />)
    const sobre = await screen.findByRole('link', { name: /Sobre nós/ })
    expect(sobre).toHaveAttribute('aria-expanded', 'false')
    fireEvent.focus(sobre)
    const banners = within(screen.getByTestId('mega-menu-painel')).getByTestId('mega-menu-banners')
    expect(within(banners).getByText('Chaveiros afetivos')).toBeInTheDocument()
    expect(within(banners).getByRole('link')).toHaveAttribute('href', '/chaveiros')
  })

  it('link com submenu abre o painel, com o filho e o "ver tudo" no endereço do item', async () => {
    comCliente(<Header />)
    fireEvent.focus(await screen.findByRole('link', { name: /Guia/ }))
    const painel = screen.getByTestId('mega-menu-painel')
    expect(within(painel).getByRole('link', { name: 'Anéis' })).toHaveAttribute('href', '/joias/aneis')
    expect(within(painel).getByRole('link', { name: /ver tudo em Guia/ })).toHaveAttribute(
      'href',
      '/como-enviar-seu-material-de-dna',
    )
  })

  it('item sem banner nem filho é link direto, sem seta e sem painel', async () => {
    comCliente(<Header />)
    const duvidas = await screen.findByRole('link', { name: 'Dúvidas' })
    expect(duvidas).not.toHaveAttribute('aria-expanded')
    expect(duvidas.querySelector('svg')).toBeNull()
    fireEvent.focus(duvidas)
    expect(screen.queryByTestId('mega-menu-painel')).not.toBeInTheDocument()
  })

  it('sem v2 no banco, a barra é a de hoje — inclusive o banner lido da coluna (Success Criterion 3)', async () => {
    semear({ links: [] })
    comCliente(<Header />)
    const joias = await screen.findByRole('link', { name: /Joias/ })
    expect(screen.queryByRole('link', { name: /Sobre nós/ })).not.toBeInTheDocument()
    fireEvent.focus(joias)
    expect(within(screen.getByTestId('mega-menu-banners')).getByText('Chaveiros afetivos')).toBeInTheDocument()
  })
})

describe('T09 — a folha do celular abre acordeão para qualquer item com painel', () => {
  const abrirFolha = async () => {
    comCliente(<MobileMenu />)
    act(() => useMenuUiStore.setState({ open: true }))
    return screen.findByRole('button', { name: /Guia/ })
  }

  it('link com filhos abre; o filho e o "ver tudo" levam aos endereços certos, com alvo de 44', async () => {
    const guia = await abrirFolha()
    expect(guia).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(guia)
    expect(guia).toHaveAttribute('aria-expanded', 'true')

    const filho = screen.getByRole('link', { name: 'Anéis' })
    expect(filho).toHaveAttribute('href', '/joias/aneis')
    const verTudo = screen.getByRole('link', { name: /ver tudo em Guia/ })
    expect(verTudo).toHaveAttribute('href', '/como-enviar-seu-material-de-dna')
    for (const alvo of [filho, verTudo]) expect(alvo.className.split(/\s+/)).toContain('min-h-11')
  })

  it('link com só banner abre o acordeão e mostra o banner dele', async () => {
    await abrirFolha()
    fireEvent.click(screen.getByRole('button', { name: /Sobre nós/ }))
    const banner = screen.getByTestId('mobile-menu-banner')
    expect(banner).toHaveAttribute('href', '/chaveiros')
    // abriu pelo banner: sem filho, sem "ver tudo"
    expect(screen.queryByRole('link', { name: /ver tudo em Sobre/ })).not.toBeInTheDocument()
  })

  it('link sem painel continua link direto', async () => {
    await abrirFolha()
    expect(screen.getByRole('link', { name: 'Dúvidas' })).toHaveAttribute('href', '/perguntas-frequentes')
    expect(screen.queryByRole('button', { name: 'Dúvidas' })).not.toBeInTheDocument()
  })
})

describe('T10 — a prévia: o rascunho novo redesenha o Header real', () => {
  const pai = { postMessage: vi.fn() }
  const parentOriginal = Object.getOwnPropertyDescriptor(window, 'parent')

  beforeEach(() => {
    window.history.replaceState({}, '', '/?preview=1')
    Object.defineProperty(window, 'parent', { value: pai, configurable: true })
  })
  afterEach(() => {
    if (parentOriginal) Object.defineProperty(window, 'parent', parentOriginal)
    else Object.defineProperty(window, 'parent', { value: window, configurable: true })
    window.history.replaceState({}, '', '/')
  })

  const receber = (data: unknown) => {
    const evento = new MessageEvent('message', { data })
    Object.defineProperty(evento, 'source', { value: pai })
    act(() => {
      window.dispatchEvent(evento)
    })
  }

  const rascunho = (document: unknown, extra: Record<string, unknown> = {}) => ({
    source: MENU_PREVIEW_SOURCE,
    type: 'draft',
    draft: { categories: db.categories, document, ...extra },
  })

  it('o rascunho troca a barra sem recarregar, e `open` abre o painel do NÓ pedido', async () => {
    comCliente(<Header />)
    await screen.findByRole('link', { name: /Sobre nós/ })

    receber(
      rascunho({
        version: 2,
        items: [raiz('n-rascunho', { kind: 'link', href: '/sobre' }, { label: 'Do rascunho', banners: bannerDeChaveiros })],
      }),
    )
    await waitFor(() => expect(screen.getByRole('link', { name: /Do rascunho/ })).toBeInTheDocument())
    expect(screen.queryByRole('link', { name: /Sobre nós/ })).not.toBeInTheDocument()

    receber({ source: MENU_PREVIEW_SOURCE, type: 'open', itemId: 'n-rascunho' })
    expect(within(screen.getByTestId('mega-menu-banners')).getByText('Chaveiros afetivos')).toBeInTheDocument()
  })

  it('a forma antiga `{ categories, links }` é ignorada: a barra segue a do banco', async () => {
    comCliente(<Header />)
    await screen.findByRole('link', { name: /Sobre nós/ })

    receber({
      source: MENU_PREVIEW_SOURCE,
      type: 'draft',
      draft: { categories: db.categories, links: [{ id: 'x', label: 'Forma antiga', href: '/x', desktop: true }] },
    })
    expect(screen.queryByRole('link', { name: /Forma antiga/ })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Sobre nós/ })).toBeInTheDocument()
  })
})
