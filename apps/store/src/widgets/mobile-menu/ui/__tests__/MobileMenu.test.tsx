import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { MenuEntry } from '@estrelinha/core/menu'
import MobileMenu from '../MobileMenu'

// Feature 16 / T18 — board "Mobile Menu Open - v3".
// MENU-16 (a folha inteira), MENU-17 (um acordeão por vez), MENU-18 (busca fecha e abre o overlay),
// MENU-19 (Conta deslogada abre auth, não navega), MENU-20 (alvos ≥ 44px), MENU-27 (promo condicional).

/* eslint-disable @typescript-eslint/no-explicit-any */

const { openSearchSpy, openAuthSpy, closeMenuSpy, menuState, authState } = vi.hoisted(() => ({
  openSearchSpy: vi.fn(),
  openAuthSpy: vi.fn(),
  closeMenuSpy: vi.fn(),
  menuState: { entries: [] as any[] },
  authState: { user: null as any },
}))

vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => authState }))
vi.mock('@/features/search', () => ({ useSearchUiStore: (sel: any) => sel({ openSearch: openSearchSpy }) }))
vi.mock('@/features/auth', () => ({ useAuthUiStore: (sel: any) => sel({ open: openAuthSpy }) }))
vi.mock('@/entities/category', () => ({
  useMenu: () => menuState,
  useMenuUiStore: (sel: any) =>
    sel({ open: true, closeMenu: closeMenuSpy, setMenuOpen: vi.fn() }),
}))

const child = (id: string, name: string) => ({ id, name, slug: id })

const entry = (over: Record<string, unknown> & { id: string; name: string }): MenuEntry =>
  ({
    slug: over.id,
    href: `/colecao/${over.id}`,
    path: `Bottons › ${over.name}`,
    children: [],
    promo: null,
    ...over,
  }) as MenuEntry

const ANIME = entry({ id: 'anime', name: 'Anime', children: [child('naruto', 'Naruto')] })
const KPOP = entry({ id: 'kpop', name: 'K-Pop', children: [child('bts', 'BTS')] })
const GAMES = entry({ id: 'games', name: 'Games' })

const renderSheet = (entries: MenuEntry[] = [ANIME, KPOP, GAMES]) => {
  menuState.entries = entries
  return render(
    <MemoryRouter>
      <MobileMenu />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  authState.user = null
})

describe('MENU-16 — a folha inteira', () => {
  it('tem logo, fechar, busca, universos, o fixo e os três atalhos', () => {
    renderSheet()
    expect(screen.getByLabelText('Uma Estrelinha — página inicial')).toBeInTheDocument()
    expect(screen.getByLabelText('Fechar menu')).toBeInTheDocument()
    expect(screen.getByText(/O que você está procurando/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Anime' })).toBeInTheDocument()
    // "Crie o Seu" saiu com a página de kit de pins (PIN-04): a rota não existe mais.
    expect(screen.queryByRole('link', { name: 'Crie o Seu' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Sobre' })).toHaveAttribute('href', '/sobre')
    expect(screen.getByRole('button', { name: /Conta/ })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Wishlist/ })).toHaveAttribute('href', '/favoritos')
    expect(screen.getByRole('button', { name: /Pedidos/ })).toBeInTheDocument()
  })

  it('o X fecha a folha — e há APENAS UM botão de fechar', () => {
    renderSheet()
    fireEvent.click(screen.getByLabelText('Fechar menu'))
    expect(closeMenuSpy).toHaveBeenCalled()
    // O `SheetContent` traz um X próprio de 16px no canto, que ficava empilhado com o do board.
    // `hideClose` o suprime; sem esta asserção o defeito volta silenciosamente num upgrade do shadcn.
    expect(screen.queryByRole('button', { name: 'Close' })).toBeNull()
  })

  it('navegar por um universo fecha a folha — não deixa duas camadas abertas', () => {
    renderSheet()
    fireEvent.click(screen.getByRole('link', { name: 'Games' }))
    expect(closeMenuSpy).toHaveBeenCalled()
  })
})

describe('MENU-17 — um acordeão por vez', () => {
  it('abrir um universo mostra as filhas e o "Ver todos"', () => {
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Anime' }))
    expect(screen.getByRole('link', { name: 'Naruto' })).toHaveAttribute('href', '/colecao/naruto')
    expect(screen.getByRole('link', { name: 'Ver todos →' })).toHaveAttribute('href', '/colecao/anime')
  })

  it('abrir o segundo RECOLHE o primeiro', () => {
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Anime' }))
    fireEvent.click(screen.getByRole('button', { name: 'K-Pop' }))
    // Com dois abertos, os atalhos e a promo cairiam abaixo de duas telas de scroll.
    expect(screen.queryByRole('link', { name: 'Naruto' })).toBeNull()
    expect(screen.getByRole('link', { name: 'BTS' })).toBeInTheDocument()
  })

  it('clicar de novo no mesmo recolhe', () => {
    renderSheet()
    const anime = screen.getByRole('button', { name: 'Anime' })
    fireEvent.click(anime)
    expect(anime).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(anime)
    expect(anime).toHaveAttribute('aria-expanded', 'false')
  })

  it('universo sem filhas é link direto, não acordeão (MENU-14)', () => {
    renderSheet()
    expect(screen.getByRole('link', { name: 'Games' })).toHaveAttribute('href', '/colecao/games')
    expect(screen.queryByRole('button', { name: 'Games' })).toBeNull()
  })
})

describe('MENU-18 — a busca', () => {
  it('fecha a folha e abre o overlay — nunca um segundo campo de busca', () => {
    renderSheet()
    fireEvent.click(screen.getByText(/O que você está procurando/))
    expect(closeMenuSpy).toHaveBeenCalled()
    expect(openSearchSpy).toHaveBeenCalledTimes(1)
    // A folha não tem input: o gatilho é um `<button>`.
    expect(screen.queryByRole('textbox')).toBeNull()
  })
})

describe('MENU-19 — Conta e Pedidos', () => {
  it('deslogada, "Conta" abre o overlay de auth e NÃO navega', () => {
    renderSheet()
    const conta = screen.getByRole('button', { name: /Conta/ })
    fireEvent.click(conta)
    expect(openAuthSpy).toHaveBeenCalledWith({ returnTo: '/conta' })
    // `/conta` sem sessão renderiza `null`: quem fechasse o overlay ficaria numa tela branca.
    expect(conta.tagName).toBe('BUTTON')
  })

  it('deslogada, "Pedidos" também abre o overlay', () => {
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: /Pedidos/ }))
    expect(openAuthSpy).toHaveBeenCalledWith({ returnTo: '/conta' })
  })

  it('logada, os dois viram link para /conta', () => {
    authState.user = { id: 'u1' }
    renderSheet()
    expect(screen.getByRole('link', { name: /Conta/ })).toHaveAttribute('href', '/conta')
    expect(screen.getByRole('link', { name: /Pedidos/ })).toHaveAttribute('href', '/conta')
    expect(screen.queryByRole('button', { name: /Conta/ })).toBeNull()
  })
})

describe('MENU-20 — alvos de toque', () => {
  it('a linha do universo, as filhas e os atalhos têm ao menos 44px', () => {
    renderSheet()
    // `min-h-11` é 44px na escala do Tailwind — o piso de toque do projeto.
    expect(screen.getByRole('button', { name: 'Anime' }).className).toContain('min-h-11')
    fireEvent.click(screen.getByRole('button', { name: 'Anime' }))
    expect(screen.getByRole('link', { name: 'Naruto' }).className).toContain('min-h-11')
    expect(screen.getByRole('link', { name: /Wishlist/ }).className).toContain('h-11')
    expect(screen.getByText(/O que você está procurando/).className).toContain('h-11')
  })
})

describe('MENU-27 — a faixa promocional', () => {
  const promo = {
    badge: 'NOVIDADE',
    title: 'Drop da semana: Anime Villains',
    subtitle: '12 pins novos — confira antes que acabe!',
    href: '/colecao/villains',
    productCount: 12,
  }

  it('renderiza título, texto e leva ao destino', () => {
    renderSheet([entry({ ...ANIME, promo }), KPOP])
    const faixa = screen.getByTestId('mobile-menu-promo')
    expect(faixa).toHaveAttribute('href', '/colecao/villains')
    expect(faixa).toHaveTextContent('Drop da semana')
    expect(faixa).toHaveTextContent('12 pins novos')
  })

  it('sem promo nenhuma, a folha termina nos atalhos — sem espaço reservado', () => {
    renderSheet()
    expect(screen.queryByTestId('mobile-menu-promo')).toBeNull()
  })

  it('tocar na faixa fecha a folha', () => {
    renderSheet([entry({ ...ANIME, promo })])
    fireEvent.click(screen.getByTestId('mobile-menu-promo'))
    expect(closeMenuSpy).toHaveBeenCalled()
  })
})
