import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Header from '../Header'
import { EstrelinhaSignature, SIGNATURE_FLOOR } from '@/shared/ui/brand'

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
      { id: 'anime', name: 'Anime', slug: 'anime', href: '/anime', path: 'Bottons › Anime', children: [], promo: null },
      { id: 'kpop', name: 'K-Pop', slug: 'kpop', href: '/kpop', path: 'Bottons › K-Pop', children: [], promo: null },
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
    // O acordeão inline não existe mais: nenhum campo próprio dentro do header — o único que
    // existe é o `SearchDropdown`, que é `hidden md:block` e está dublado aqui.
    const { container } = renderHeader()
    expect(bar(container).querySelectorAll('input')).toHaveLength(0)
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

// ── O chrome das boards `5MC-0` / `6AU-0` — `IDN-09` ──────────────────────────
// A moldura do topo deixou de ser branca. Os dois boards põem o header em
// `primary-strong`, e o desktop acrescenta uma segunda faixa em `primary`.
describe('Header — a moldura escura da identidade nova (IDN-09)', () => {
  /** `--estrelinha-primary-strong`, que é a superfície do header. */
  const PRIMARY_STRONG = '#283A4A'

  it('a faixa do topo é `primary-strong`, e não mais branca', () => {
    // Premissa das asserções abaixo: se a superfície mudar, o tom da marca e a
    // cor dos ícones têm de ser reavaliados junto — e é este teste que obriga.
    const { container } = renderHeader()
    expect(bar(container)).toHaveClass('bg-estrelinha-primary-strong')
    expect(bar(container).className).not.toContain('bg-white')
  })

  it('nenhum traço da marca sai na cor do próprio fundo', () => {
    // O mesmo defeito que `Footer.test.tsx` congelou, do outro lado da página:
    // pedir o tom `brand` (#283A4A) sobre `primary-strong` (#283A4A) dá 1,00:1
    // — um header com um vazio no lugar do logo, sem erro em lugar nenhum.
    renderHeader()
    const marcas = screen.getAllByRole('img', { name: 'Uma Estrelinha' })
    expect(marcas.length).toBeGreaterThan(0)
    for (const marca of marcas) {
      for (const path of marca.querySelectorAll('path')) {
        expect(path).toHaveAttribute('stroke', '#F7F3EC')
        expect(path.getAttribute('stroke')).not.toBe(PRIMARY_STRONG)
      }
    }
  })

  it('a marca do topo é UMA só, a assinatura, e igual no celular e no desktop', () => {
    // Decisão de produto: a marca da loja é a mesma em toda superfície de tela.
    //
    // **A forma de quebrar isto é silenciosa**, e é por isso que o teste existe.
    // `EstrelinhaSignature` cai para o símbolo abaixo do piso de 190px — de
    // propósito, para nunca renderizar uma marca apagada. Logo, baixar a largura
    // para 150 (como era antes) devolve o símbolo: nenhum erro, nenhum warning,
    // nenhum teste vermelho, e o nome da loja some do topo no celular.
    //
    // Duas asserções, e as duas são necessárias: a contagem pega a volta da
    // variante por breakpoint (que renderizava dois elementos, um escondido por
    // CSS que o jsdom não aplica), e o `viewBox` pega a queda para o símbolo —
    // o papel é diferente, então a caixa é diferente.
    renderHeader()

    const marcas = screen.getAllByRole('img', { name: 'Uma Estrelinha' })
    expect(marcas).toHaveLength(1)

    const [marca] = marcas
    expect(marca).toHaveAttribute('width', '202')
    expect(Number(marca.getAttribute('width'))).toBeGreaterThanOrEqual(SIGNATURE_FLOOR)
    expect(marca.getAttribute('viewBox')).toBe(
      render(<EstrelinhaSignature width={202} />).container.querySelector('svg')!.getAttribute('viewBox'),
    )
  })

  it('a segunda faixa é `primary` e só existe no desktop', () => {
    // No celular a moldura continua com 64px de uma faixa só: a board mobile
    // desenha 112px porque põe a busca no header, e aqui a busca é a aba do
    // `MobileNav`. Empilhar as duas coisas comeria 48px do orçamento que a
    // regra de barra única existe para proteger.
    const { container } = renderHeader()
    const faixa = container.querySelector('[aria-label="Departamentos"]')!.parentElement!
    expect(faixa).toHaveClass('bg-estrelinha-primary')
    expect(faixa).toHaveClass('hidden')
    expect(faixa).toHaveClass('md:block')
  })

  it('nada dentro do `<header>` é `position: fixed`', () => {
    // O header carrega `transform`, que cria containing block: um `fixed` aqui
    // dentro passaria a se medir pelo header, não pela viewport. É por isso que
    // o `MobileMenu` mora no `StoreLayout`.
    const { container } = renderHeader()
    for (const node of bar(container).querySelectorAll('*')) {
      expect(node.className.toString()).not.toMatch(/(^|[\s:])fixed(\s|$)/)
    }
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
