import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import MobileNav from '../MobileNav'

/* eslint-disable @typescript-eslint/no-explicit-any */

const { openCart, openSearch, openAuth, authState, cartUi, searchUi } = vi.hoisted(() => ({
  openCart: vi.fn(),
  openSearch: vi.fn(),
  openAuth: vi.fn(),
  authState: { user: null as any },
  cartUi: { open: false },
  searchUi: { open: false },
}))

vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => authState }))
vi.mock('@/entities/cart/model/cartStore', () => ({
  useCartStore: (sel: any) => sel({ uniqueItemsCount: () => 2 }),
}))
vi.mock('@/entities/cart/model/cartUiStore', () => ({
  useCartUiStore: (sel: any) => sel({ ...cartUi, openCart }),
}))
vi.mock('@/features/search', () => ({
  useSearchUiStore: (sel: any) => sel({ ...searchUi, openSearch }),
}))
vi.mock('@/features/auth', () => ({ useAuthUiStore: (sel: any) => sel({ open: openAuth }) }))

const renderNav = (path = '/') =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <MobileNav />
    </MemoryRouter>,
  )

beforeEach(() => {
  vi.clearAllMocks()
  authState.user = null
  cartUi.open = false
  searchUi.open = false
})

describe('MobileNav — comportamento das abas', () => {
  it('Busca abre o overlay em vez de navegar para /busca', () => {
    renderNav()
    const tab = screen.getByText('Busca').closest('button')!
    expect(tab).toHaveAttribute('aria-haspopup', 'dialog')
    fireEvent.click(tab)
    expect(openSearch).toHaveBeenCalledTimes(1)
  })

  it('Carrinho abre a gaveta e anuncia a quantidade', () => {
    renderNav()
    const tab = screen.getByLabelText('Carrinho, 2 itens')
    fireEvent.click(tab)
    expect(openCart).toHaveBeenCalledTimes(1)
  })

  it('Conta deslogada abre o overlay de auth, sem sair da página', () => {
    renderNav('/joias-afetivas')
    const tab = screen.getByLabelText('Entrar')
    expect(tab.tagName).toBe('BUTTON')
    fireEvent.click(tab)
    expect(openAuth).toHaveBeenCalledWith({ returnTo: '/conta' })
  })

  it('Conta logada navega para /conta', () => {
    authState.user = { id: 'u1' }
    renderNav()
    expect(screen.getByLabelText('Minha conta')).toHaveAttribute('href', '/conta')
    expect(screen.queryByLabelText('Entrar')).not.toBeInTheDocument()
  })

  it('marca a aba da rota atual com aria-current', () => {
    renderNav('/')
    expect(screen.getByText('Início').closest('a')).toHaveAttribute('aria-current', 'page')

    authState.user = { id: 'u1' }
    renderNav('/conta')
    expect(screen.getByLabelText('Minha conta')).toHaveAttribute('aria-current', 'page')
  })

  it('a barra reserva a safe area do rodapé do iPhone', () => {
    renderNav()
    const nav = screen.getByLabelText('Navegação principal')
    expect(nav.className).toContain('pb-[env(safe-area-inset-bottom)]')
  })
})
