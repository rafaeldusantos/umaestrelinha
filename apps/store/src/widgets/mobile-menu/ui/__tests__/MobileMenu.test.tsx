import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { MenuItem, ResolvedMenuBanner } from '@estrelinha/core/menu'
import { renditionSrcSet, renditionUrl } from '@estrelinha/core/media'
import MobileMenu from '../MobileMenu'

/**
 * A folha do celular — boards "Mobile Menu Open - v3" e `DGK-0`.
 *
 * Feature 16: MENU-16 (a folha inteira), MENU-17 (um acordeão por vez), MENU-18 (busca fecha e abre
 * o overlay), MENU-19 (Conta deslogada abre auth), MENU-20 (alvos ≥ 44px).
 * Feature 39: NAV-01 (a curadoria do CELULAR, pedida por nome), NAV-12 (link é link direto),
 * NAV-14 (nenhum item em JSX), NAV-17/18 (ícone, e sem ícone não reserva vaga),
 * NAV-27 (filhas curadas para o celular), NAV-36 (o banner mora DENTRO do acordeão).
 *
 * **Queda declarada**: os 3 casos de `MENU-27` (a faixa promocional do rodapé da folha). Ela
 * mostrava o promo da *primeira* entrada que tivesse um — a ordem da árvore decidindo o destaque,
 * sem ninguém escolher. O banner passou a viver dentro do acordeão da entrada a que pertence, e tem
 * cobertura própria em `NAV-36`, abaixo.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */

const {
  openSearchSpy,
  openAuthSpy,
  closeMenuSpy,
  setMenuOpenSpy,
  surfaceSpy,
  menuState,
  authState,
  bannersState,
  previewState,
} = vi.hoisted(() => ({
  openSearchSpy: vi.fn(),
  openAuthSpy: vi.fn(),
  closeMenuSpy: vi.fn(),
  setMenuOpenSpy: vi.fn(),
  surfaceSpy: vi.fn(),
  menuState: { items: [] as any[] },
  authState: { user: null as any },
  bannersState: { lista: [] as ResolvedMenuBanner[], pedidos: [] as unknown[] },
  previewState: { preview: false, draft: null as unknown, openId: null as string | null },
}))

vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => authState }))
vi.mock('@/features/search', () => ({ useSearchUiStore: (sel: any) => sel({ openSearch: openSearchSpy }) }))
vi.mock('@/features/auth', () => ({ useAuthUiStore: (sel: any) => sel({ open: openAuthSpy }) }))
vi.mock('@/entities/category', () => ({
  useMenu: (surface: string) => {
    surfaceSpy(surface)
    return menuState
  },
  useMenuUiStore: (sel: any) =>
    sel({ open: true, closeMenu: closeMenuSpy, setMenuOpen: setMenuOpenSpy }),
}))
// O que o hook RESOLVE tem teste próprio (`entities/menu/api/__tests__`). Aqui interessa o desenho
// — e, sobretudo, POR QUAL id ele é chamado: é o que prova que o banner é do acordeão aberto.
vi.mock('@/entities/menu', () => ({
  useMenuBanners: (id: string | null, surface: string) => {
    bannersState.pedidos.push([id, surface])
    return bannersState.lista
  },
  useMenuPreview: () => previewState,
}))

const filha = (id: string, name: string) => ({ id, name, slug: id })

const categoria = (over: Record<string, unknown> & { id: string; name: string }): MenuItem =>
  ({
    kind: 'category',
    slug: over.id,
    // `AD-018`: o href da entrada é a canônica de `menuItems` — raiz, um segmento.
    href: `/${over.id}`,
    path: over.name,
    icon: null,
    sortOrder: 0,
    children: [],
    hasPanel: false,
    ...over,
  }) as MenuItem

const link = (over: Record<string, unknown> & { id: string; name: string }): MenuItem =>
  ({
    kind: 'link',
    href: `/${over.id}`,
    icon: null,
    sortOrder: 0,
    external: false,
    ...over,
  }) as MenuItem

const banner = (over: Partial<ResolvedMenuBanner> = {}): ResolvedMenuBanner => ({
  badge: null,
  title: 'Árvore da Vida',
  subtitle: null,
  href: '/joias/arvore',
  external: false,
  image: null,
  imageReused: false,
  ...over,
})

const AFETIVAS = categoria({
  id: 'afetivas',
  name: 'Coleção Afetivas',
  children: [filha('cinzas', 'Cinzas de cremação')],
  hasPanel: true,
})
const CORRENTES = categoria({
  id: 'correntes',
  name: 'Correntes',
  children: [filha('elo', 'Elo português')],
  hasPanel: true,
})
const PINGENTES = categoria({ id: 'pingentes', name: 'Pingentes' })

const renderSheet = (items: MenuItem[] = [AFETIVAS, CORRENTES, PINGENTES]) => {
  menuState.items = items
  return render(
    <MemoryRouter>
      <MobileMenu />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  vi.clearAllMocks()
  authState.user = null
  bannersState.lista = []
  bannersState.pedidos = []
  previewState.preview = false
  previewState.draft = null
  previewState.openId = null
})

describe('MENU-16 — a folha inteira', () => {
  it('tem logo, fechar, busca, as coleções e os três atalhos', () => {
    renderSheet()
    expect(screen.getByLabelText('Uma Estrelinha — página inicial')).toBeInTheDocument()
    expect(screen.getByLabelText('Fechar menu')).toBeInTheDocument()
    expect(screen.getByText(/O que você está procurando/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Coleção Afetivas' })).toBeInTheDocument()
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

  it('navegar por uma coleção fecha a folha — não deixa duas camadas abertas', () => {
    renderSheet()
    fireEvent.click(screen.getByRole('link', { name: 'Pingentes' }))
    expect(closeMenuSpy).toHaveBeenCalled()
  })
})

describe('NAV-01 — a curadoria daqui é a do CELULAR', () => {
  it('a folha pede o menu do celular por nome, nunca o do computador', () => {
    // As duas curadorias são independentes: a mesma loja mostra "Personalizados" só no desktop e
    // 5 das 12 subcategorias aqui. Derivar por largura de tela faria a folha desenhar a barra.
    renderSheet()
    expect(surfaceSpy).toHaveBeenCalledWith('mobile')
    expect(surfaceSpy).not.toHaveBeenCalledWith('desktop')
  })

  it('sem item nenhum, a lista não fica no DOM', () => {
    const { container } = renderSheet([])
    expect(container.querySelector('[aria-label="Coleções"]')).toBeNull()
    // …e os atalhos continuam lá: a folha não fica inútil por causa de um menu vazio.
    expect(screen.getByRole('link', { name: /Wishlist/ })).toBeInTheDocument()
  })
})

describe('NAV-14 — nenhum item de menu escrito em código', () => {
  it('o "Sobre" só aparece se `useMenu` o devolver', () => {
    renderSheet([AFETIVAS])
    expect(screen.queryByRole('link', { name: 'Sobre' })).toBeNull()
  })

  it('e quando a Adri o põe no menu, ele aparece como item de link', () => {
    renderSheet([AFETIVAS, link({ id: 'sobre', name: 'Sobre' })])
    expect(screen.getByRole('link', { name: 'Sobre' })).toHaveAttribute('href', '/sobre')
  })
})

describe('MENU-17 — um acordeão por vez', () => {
  it('abrir uma coleção mostra as filhas e o "ver tudo em X"', () => {
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Coleção Afetivas' }))
    // A filha sai com o pai na frente (dois segmentos); a entrada, com um.
    expect(screen.getByRole('link', { name: 'Cinzas de cremação' })).toHaveAttribute(
      'href',
      '/afetivas/cinzas',
    )
    expect(screen.getByRole('link', { name: /ver tudo em Coleção Afetivas/ })).toHaveAttribute(
      'href',
      '/afetivas',
    )
  })

  it('abrir o segundo RECOLHE o primeiro', () => {
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Coleção Afetivas' }))
    fireEvent.click(screen.getByRole('button', { name: 'Correntes' }))
    // Com dois abertos, os atalhos cairiam abaixo de duas telas de scroll.
    expect(screen.queryByRole('link', { name: 'Cinzas de cremação' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Elo português' })).toBeInTheDocument()
  })

  it('clicar de novo no mesmo recolhe', () => {
    renderSheet()
    const entrada = screen.getByRole('button', { name: 'Coleção Afetivas' })
    fireEvent.click(entrada)
    expect(entrada).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(entrada)
    expect(entrada).toHaveAttribute('aria-expanded', 'false')
  })

  it('coleção sem painel é link direto, não acordeão (NAV-25)', () => {
    renderSheet()
    expect(screen.getByRole('link', { name: 'Pingentes' })).toHaveAttribute('href', '/pingentes')
    expect(screen.queryByRole('button', { name: 'Pingentes' })).toBeNull()
  })
})

describe('NAV-12 — item de link é link direto', () => {
  it('interno não vira acordeão, nem quando tem ícone', () => {
    renderSheet([link({ id: 'sobre', name: 'Sobre', icon: 'estrela' })])
    expect(screen.queryByRole('button', { name: 'Sobre' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Sobre' })).toHaveAttribute('href', '/sobre')
  })

  it('externo abre em nova aba com `noopener noreferrer` (NAV-11)', () => {
    renderSheet([
      link({ id: 'blog', name: 'Blog', href: 'https://exemplo.com/blog', external: true }),
    ])
    const item = screen.getByRole('link', { name: 'Blog' })

    expect(item).toHaveAttribute('target', '_blank')
    expect(item).toHaveAttribute('rel', 'noopener noreferrer')
  })
})

describe('NAV-17 / NAV-18 — o ícone da linha', () => {
  it('o item com ícone desenha o glifo do MESMO conjunto que o desktop', () => {
    renderSheet([categoria({ id: 'correntes', name: 'Correntes', icon: 'corrente' })])
    const svg = screen.getByRole('link', { name: 'Correntes' }).querySelector('svg')!

    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
    // `accent-strong` e não `accent`: a folha é BRANCA, onde `accent` mede 2,82:1 e reprova até os
    // 3:1 de objeto gráfico. Na barra escura do desktop a escolha é a inversa, pelo mesmo motivo.
    expect(svg.getAttribute('class')).toContain('text-estrelinha-accent-strong')
  })

  it('item sem ícone não reserva vaga vazia', () => {
    renderSheet([categoria({ id: 'correntes', name: 'Correntes' })])
    expect(screen.getByRole('link', { name: 'Correntes' }).querySelector('svg')).toBeNull()
  })

  it('o acordeão com ícone indenta as filhas até o rótulo do pai', () => {
    // Board `DGK-0`: 22px da vaga do ícone + 12px de respiro.
    renderSheet([categoria({ ...AFETIVAS, icon: 'gota-afetiva' } as never)])
    fireEvent.click(screen.getByRole('button', { name: 'Coleção Afetivas' }))

    const lista = screen.getByRole('link', { name: 'Cinzas de cremação' }).parentElement!
    expect(lista.className).toContain('pl-[34px]')
  })

  it('e sem ícone o recuo cai para o mínimo — a contrapartida de NAV-18 no arranjo', () => {
    // Reservar 34px de recuo numa lista cujo pai não tem ícone alinharia as filhas a um desenho que
    // não existe. O alinhamento é com o RÓTULO do pai, e ele muda de lugar.
    renderSheet([AFETIVAS])
    fireEvent.click(screen.getByRole('button', { name: 'Coleção Afetivas' }))

    const lista = screen.getByRole('link', { name: 'Cinzas de cremação' }).parentElement!
    expect(lista.className).not.toContain('pl-[34px]')
    expect(lista.className).toContain('pl-3')
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
  it('a linha da coleção, as filhas e os atalhos têm ao menos 44px', () => {
    renderSheet()
    // 56px na linha (board `DGK-0`) e 44 nas filhas — o piso de toque do projeto.
    expect(screen.getByRole('button', { name: 'Coleção Afetivas' }).className).toContain('min-h-[56px]')
    fireEvent.click(screen.getByRole('button', { name: 'Coleção Afetivas' }))
    expect(screen.getByRole('link', { name: 'Cinzas de cremação' }).className).toContain('min-h-11')
    expect(screen.getByRole('link', { name: /Wishlist/ }).className).toContain('h-11')
    expect(screen.getByText(/O que você está procurando/).className).toContain('h-11')
  })

  it('o item de link também tem a linha de 56px', () => {
    renderSheet([link({ id: 'sobre', name: 'Sobre' })])
    expect(screen.getByRole('link', { name: 'Sobre' }).className).toContain('min-h-[56px]')
  })
})

describe('NAV-36 — o banner mora DENTRO do acordeão', () => {
  it('não aparece com o acordeão fechado', () => {
    bannersState.lista = [banner()]
    renderSheet()
    expect(screen.queryByTestId('mobile-menu-banner')).toBeNull()
  })

  it('aparece quando o acordeão abre, e some quando ele fecha', () => {
    bannersState.lista = [banner({ badge: 'NOVIDADE', subtitle: 'Com cinzas, mecha ou leite.' })]
    renderSheet()
    const entrada = screen.getByRole('button', { name: 'Coleção Afetivas' })

    fireEvent.click(entrada)
    const card = screen.getByTestId('mobile-menu-banner')
    expect(card).toHaveAttribute('href', '/joias/arvore')
    expect(card).toHaveTextContent('NOVIDADE')
    expect(card).toHaveTextContent('Com cinzas, mecha ou leite.')

    fireEvent.click(entrada)
    expect(screen.queryByTestId('mobile-menu-banner')).toBeNull()
  })

  it('é o banner DAQUELA entrada, na superfície do celular', () => {
    // A prova de que o banner não é o de "a primeira entrada que tiver um", que era o defeito da
    // faixa antiga: o hook é chamado com o id do acordeão aberto.
    bannersState.lista = [banner()]
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Correntes' }))

    expect(bannersState.pedidos).toContainEqual(['correntes', 'mobile'])
    expect(bannersState.pedidos).not.toContainEqual(['afetivas', 'mobile'])
  })

  it('a arte é 1:1 e preguiçosa; sem arte, nenhum quadro vazio (NAV-32)', () => {
    bannersState.lista = [banner({ image: 'https://cdn.test/arvore.webp' })]
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Coleção Afetivas' }))

    const img = screen.getByTestId('mobile-menu-banner').querySelector('img')!
    expect(img).toHaveAttribute('loading', 'lazy')
    expect(img.className).toContain('h-[104px]')
    expect(img.className).toContain('w-[104px]')
  })

  it('a arte é pedida NO TAMANHO DA VAGA — 104px quadrados (PRF-15)', () => {
    // A vaga da folha é a menor das duas: 104px. É também a superfície onde a conexão é pior —
    // ~90% dos acessos vêm de celular —, e onde servir o original de 1024 doía mais.
    const arte =
      'https://proj.supabase.co/storage/v1/object/public/menu-images/banners/arvore.webp'
    bannersState.lista = [banner({ image: arte })]
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Coleção Afetivas' }))

    const img = screen.getByTestId('mobile-menu-banner').querySelector('img')!
    expect(img.getAttribute('src')).toBe(renditionUrl(arte, 208))
    expect(img.getAttribute('src')).toContain('/render/image/public/')
    expect(img.getAttribute('srcset')).toBe(renditionSrcSet(arte, [104, 208]))
    expect(img.getAttribute('sizes')).toBe('104px')
    expect(img.getAttribute('src')).not.toBe(arte)
  })

  it('arte de fora do Storage sai INALTERADA, e sem `srcset` inventado', () => {
    bannersState.lista = [banner({ image: 'https://cdn.test/arvore.webp' })]
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Coleção Afetivas' }))

    const img = screen.getByTestId('mobile-menu-banner').querySelector('img')!
    expect(img).toHaveAttribute('src', 'https://cdn.test/arvore.webp')
    expect(img.getAttribute('srcset')).toBeNull()
  })

  it('sem arte o card fica só com o texto', () => {
    bannersState.lista = [banner({ image: null })]
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Coleção Afetivas' }))
    expect(screen.getByTestId('mobile-menu-banner').querySelector('img')).toBeNull()
  })

  it('banner externo sai com `target` e `rel` (NAV-11)', () => {
    bannersState.lista = [banner({ href: 'https://exemplo.com/campanha', external: true })]
    renderSheet()
    fireEvent.click(screen.getByRole('button', { name: 'Coleção Afetivas' }))

    const card = screen.getByTestId('mobile-menu-banner')
    expect(card).toHaveAttribute('target', '_blank')
    expect(card).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('a folha NÃO tem mais faixa promocional no rodapé', () => {
    // Ela mostrava o promo da primeira entrada que tivesse um — a ordem da árvore decidindo o
    // destaque. Sumiu junto com `menu_promo`; o que existe agora é o banner do acordeão.
    bannersState.lista = [banner()]
    renderSheet()
    expect(screen.queryByTestId('mobile-menu-promo')).toBeNull()
  })
})

describe('NAV-43 — na prévia, a folha abre sozinha e no acordeão pedido', () => {
  it('em modo prévia a folha é aberta, sem ninguém tocar no hambúrguer', () => {
    // O quadro do celular mede 390: a faixa de departamentos é `hidden md:block` e não existe ali.
    // Sem esta abertura, a prévia da superfície que responde por ~90% dos acessos mostraria a home.
    previewState.preview = true
    renderSheet()
    expect(setMenuOpenSpy).toHaveBeenCalledWith(true)
  })

  it('o acordeão da entrada pedida já vem aberto, com as filhas e o banner dela', () => {
    previewState.preview = true
    previewState.openId = 'correntes'
    bannersState.lista = [banner()]
    renderSheet()

    expect(screen.getByRole('button', { name: 'Correntes' })).toHaveAttribute(
      'aria-expanded',
      'true',
    )
    expect(screen.getByText('Elo português')).toBeInTheDocument()
    // E o banner resolvido é o DESSA entrada — o hook foi chamado com o id dela.
    expect(bannersState.pedidos).toContainEqual(['correntes', 'mobile'])
  })

  it('FORA do modo prévia nada disso acontece', () => {
    previewState.preview = false
    previewState.openId = 'correntes'
    renderSheet()

    expect(setMenuOpenSpy).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Correntes' })).toHaveAttribute(
      'aria-expanded',
      'false',
    )
  })
})
