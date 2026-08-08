import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Header from '../Header'

/* eslint-disable @typescript-eslint/no-explicit-any */

const { openSpy, openMenuSpy, menuState, authState } = vi.hoisted(() => ({
  openSpy: vi.fn(),
  openMenuSpy: vi.fn(),
  menuState: { entries: [] as any[] },
  authState: { user: null as any, customer: null as any },
}))

vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => authState }))
vi.mock('@/features/auth', () => ({ useAuthUiStore: (sel: any) => sel({ open: openSpy }) }))
vi.mock('@/entities/cart/model/cartStore', () => ({ useCartStore: (sel: any) => sel({ uniqueItemsCount: () => 0 }) }))
vi.mock('@/entities/wishlist/model/wishlistStore', () => ({ useWishlistStore: (sel: any) => sel({ count: () => 0 }) }))
vi.mock('@/entities/category', () => ({
  useMenu: () => menuState,
  useMenuUiStore: (sel: any) => sel({ open: false, openMenu: openMenuSpy }),
}))
vi.mock('@/widgets/cart-drawer/ui/CartButton', () => ({ default: () => <div data-testid="cart-button" /> }))
vi.mock('@/features/search/ui/SearchDropdown', () => ({ default: () => <div data-testid="search" /> }))
// O painel do mega menu tem teste próprio (`MegaMenu.test.tsx`); aqui interessa só que o header o
// alimenta com o que `useMenu` devolveu.
vi.mock('../MegaMenu', () => ({
  default: ({ entries }: { entries: { name: string }[] }) => (
    <div data-testid="mega-menu">{entries.map(e => e.name).join(',')}</div>
  ),
}))

const renderHeader = () => render(<MemoryRouter><Header /></MemoryRouter>)

/** O `<header>` — a asserção do recolhimento é sobre a classe dele. */
const bar = (container: HTMLElement) => container.querySelector('header')!

/** jsdom não rola: mexe-se no `scrollY` e dispara-se o evento, como o browser faria. */
const scrollTo = (y: number) => {
  act(() => {
    Object.defineProperty(window, 'scrollY', { writable: true, configurable: true, value: y })
    window.dispatchEvent(new Event('scroll'))
  })
}

beforeEach(() => {
  vi.clearAllMocks()
  authState.user = null
  authState.customer = null
  menuState.entries = []
  // rAF síncrono: o `useScrollDirection` agenda a medição num frame, e sem isso nada acontece
  // dentro de um `act` do teste.
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(0)
    return 1
  })
  vi.stubGlobal('cancelAnimationFrame', () => {})
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    writable: true,
    configurable: true,
    value: 4000,
  })
  Object.defineProperty(document.documentElement, 'clientHeight', {
    writable: true,
    configurable: true,
    value: 667,
  })
  Object.defineProperty(window, 'scrollY', { writable: true, configurable: true, value: 0 })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('Header account entry (AUTH-01)', () => {
  it('opens the auth overlay when the account icon is clicked while logged out', () => {
    renderHeader()
    fireEvent.click(screen.getByLabelText('Entrar'))
    expect(openSpy).toHaveBeenCalled()
  })

  it('links to /conta when logged in (no overlay)', () => {
    authState.user = { id: 'u1', email: 'ana@x.com' }
    authState.customer = { name: 'Ana' }
    renderHeader()
    expect(screen.getByLabelText('Minha conta')).toHaveAttribute('href', '/conta')
    expect(screen.queryByLabelText('Entrar')).not.toBeInTheDocument()
  })
})

describe('Header sem os duplicados do MobileNav', () => {
  it('não tem mais o botão de busca no topo — quem abre a busca é a aba do rodapé', () => {
    renderHeader()
    expect(screen.queryByLabelText('Buscar')).not.toBeInTheDocument()
  })

  it('esconde o carrinho no celular, onde a aba do rodapé é o gatilho', () => {
    renderHeader()
    const wrapper = screen.getByTestId('cart-button').parentElement!
    expect(wrapper.className).toContain('hidden')
    expect(wrapper.className).toContain('md:block')
  })
})

// Feature 16 — MENU-04 e MENU-16. O acordeão inline saiu do header: a lista de categorias agora é o
// `MegaMenu` (desktop) e a folha `mobile-menu` (celular). O teste que provava "o menu mobile abre a
// busca em tela cheia" mudou de casa para `MobileMenu.test.tsx`, com a mesma asserção.
describe('Header — as duas superfícies de menu (MENU-16)', () => {
  it('a barra do topo é alimentada por useMenu, não por um slice de categorias', () => {
    menuState.entries = [
      { id: 'anime', name: 'Anime', slug: 'anime', href: '/colecao/anime', path: 'Bottons › Anime', children: [], promo: null },
      { id: 'kpop', name: 'K-Pop', slug: 'kpop', href: '/colecao/kpop', path: 'Bottons › K-Pop', children: [], promo: null },
    ]
    renderHeader()
    expect(screen.getByTestId('mega-menu')).toHaveTextContent('Anime,K-Pop')
  })

  it('o botão de menu do celular ABRE a folha — não alterna', () => {
    renderHeader()
    const trigger = screen.getByLabelText('Abrir menu')
    expect(trigger).toHaveAttribute('aria-haspopup', 'dialog')
    fireEvent.click(trigger)
    expect(openMenuSpy).toHaveBeenCalledTimes(1)
    // O acordeão inline não existe mais: nenhum campo de busca aparece dentro do header.
    expect(screen.queryByText(/Buscar bottons/)).not.toBeInTheDocument()
  })

  it('sem entradas (falha de consulta) a barra fica só com o item fixo — sem quebrar (MENU-04)', () => {
    menuState.entries = []
    renderHeader()
    // "Crie o seu" saiu com a página de kit de pins (PIN-04); sobra "Sobre".
    expect(screen.queryByText('Crie o seu')).not.toBeInTheDocument()
    expect(screen.getByText('Sobre')).toBeInTheDocument()
    expect(screen.getByTestId('mega-menu')).toHaveTextContent('')
  })
})

// ── Recolhimento no scroll ────────────────────────────────────────────────────
// Com a barra de compra da página do produto, a moldura fixa somava 197px — 30% de um iPhone SE.
// O header devolve 64px deles enquanto a cliente lê. A regra pura está em
// `shared/lib/__tests__/useScrollDirection.test.tsx`; aqui se prova que o header obedece.
describe('Header — se recolhe no scroll (mobile)', () => {
  it('no topo, aparece', () => {
    const { container } = renderHeader()

    expect(bar(container).className).toContain('translate-y-0')
    expect(bar(container).className).not.toContain('-translate-y-full')
  })

  it('rolando para baixo, se recolhe', () => {
    const { container } = renderHeader()

    scrollTo(400)

    expect(bar(container).className).toContain('-translate-y-full')
  })

  it('rolando de volta para cima, reaparece', () => {
    const { container } = renderHeader()
    scrollTo(400)
    expect(bar(container).className).toContain('-translate-y-full')

    scrollTo(340)

    expect(bar(container).className).not.toContain('-translate-y-full')
  })

  it('dentro dos 64px do topo NÃO se recolhe, mesmo já descendo', () => {
    // Senão a primeira rolagem esconderia o cabeçalho antes de a pessoa ter visto que ele existe.
    const { container } = renderHeader()

    scrollTo(60)

    expect(bar(container).className).not.toContain('-translate-y-full')
  })

  it('segue `sticky`, e não `fixed` — esconder não pode causar reflow', () => {
    // `sticky` + `transform` mantém os 64px no fluxo. Trocar para `fixed` faria a página inteira
    // pular a cada troca de direção de rolagem.
    const { container } = renderHeader()

    expect(bar(container).className).toContain('sticky')
    expect(bar(container).className).not.toContain('fixed')
  })

  it('no desktop nunca se move', () => {
    const { container } = renderHeader()
    scrollTo(400)

    // A trava é CSS (`md:translate-y-0` vence o `-translate-y-full` na media query), então o que se
    // afirma em jsdom é a presença da classe.
    expect(bar(container).className).toContain('md:translate-y-0')
  })

  it('o teclado revela um header recolhido', () => {
    // Traduzido para fora da tela, os links seguem focáveis: sem `focus-within`, o `Tab` levaria o
    // foco para controles invisíveis.
    const { container } = renderHeader()
    scrollTo(400)

    expect(bar(container).className).toContain('focus-within:translate-y-0')
  })

  it('respeita quem pediu menos movimento', () => {
    const { container } = renderHeader()

    expect(bar(container).className).toContain('motion-reduce:transition-none')
  })
})
