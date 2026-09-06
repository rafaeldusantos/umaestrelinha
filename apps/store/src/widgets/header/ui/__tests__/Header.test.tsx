import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Header from '../Header'
import { EstrelinhaSignature, SIGNATURE_FLOOR } from '@/shared/ui/brand'

/* eslint-disable @typescript-eslint/no-explicit-any */

const { openSpy, openMenuSpy, surfaceSpy, menuState, authState } = vi.hoisted(() => ({
  openSpy: vi.fn(),
  openMenuSpy: vi.fn(),
  surfaceSpy: vi.fn(),
  menuState: { items: [] as any[] },
  authState: { user: null as any, customer: null as any },
}))

vi.mock('@estrelinha/auth', () => ({ useAuthContext: () => authState }))
vi.mock('@/features/auth', () => ({ useAuthUiStore: (sel: any) => sel({ open: openSpy }) }))
vi.mock('@/entities/cart/model/cartStore', () => ({ useCartStore: (sel: any) => sel({ uniqueItemsCount: () => 0 }) }))
vi.mock('@/entities/wishlist/model/wishlistStore', () => ({ useWishlistStore: (sel: any) => sel({ count: () => 0 }) }))
vi.mock('@/entities/category', () => ({
  useMenu: (surface: string) => {
    surfaceSpy(surface)
    return menuState
  },
  useMenuUiStore: (sel: any) => sel({ open: false, openMenu: openMenuSpy }),
}))
vi.mock('@/widgets/cart-drawer/ui/CartButton', () => ({ default: () => <div data-testid="cart-button" /> }))
vi.mock('@/features/search/ui/SearchDropdown', () => ({ default: () => <div data-testid="search" /> }))
// O painel do mega menu tem teste próprio (`MegaMenu.test.tsx`); aqui interessa só que o header o
// alimenta com o que `useMenu` devolveu.
vi.mock('../MegaMenu', () => ({
  default: ({ items }: { items: { name: string }[] }) => (
    <div data-testid="mega-menu">{items.map(i => i.name).join(',')}</div>
  ),
}))

const renderHeader = () => render(<MemoryRouter><Header /></MemoryRouter>)

/** Um `MenuItem` de categoria, na forma exata em que `menuItems` o devolve. */
const item = (id: string, name: string) => ({
  kind: 'category',
  id,
  name,
  slug: id,
  href: `/${id}`,
  path: name,
  icon: null,
  sortOrder: 0,
  children: [],
  hasPanel: false,
})

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
  menuState.items = []
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
    menuState.items = [item('anime', 'Anime'), item('kpop', 'K-Pop')]
    renderHeader()
    expect(screen.getByTestId('mega-menu')).toHaveTextContent('Anime,K-Pop')
  })

  it('pede o menu do COMPUTADOR por nome — a faixa é `hidden md:block` (NAV-01)', () => {
    // Escolher a superfície por largura de tela faria o hook responder uma coisa na prévia do
    // painel e outra no navegador da cliente. A faixa só existe no desktop, então o que ela
    // desenha é sempre a curadoria do computador — e ela é pedida por nome.
    menuState.items = [item('anime', 'Anime')]
    renderHeader()
    expect(surfaceSpy).toHaveBeenCalledWith('desktop')
    expect(surfaceSpy).not.toHaveBeenCalledWith('mobile')
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

  it('sem item nenhum, a faixa de departamentos NÃO está no DOM (NAV-15)', () => {
    // Antes da 39 ela sobrevivia porque tinha o "Sobre" escrito em JSX: uma faixa escura de 52px
    // com um item só, aparecendo mesmo quando a consulta morria. Sem item de código, faixa vazia
    // é faixa que não renderiza — o header fica com marca, busca e ações.
    menuState.items = []
    const { container } = renderHeader()
    expect(container.querySelector('[aria-label="Departamentos"]')).toBeNull()
    expect(screen.queryByTestId('mega-menu')).toBeNull()
  })
})

// ── Feature 39 — nada do menu mora no código, e a faixa rola em vez de embrulhar ────────────
describe('Header — nenhum item de menu escrito em código (NAV-14)', () => {
  it('o link "Sobre" saiu do JSX — quem o põe no menu agora é a Adri', () => {
    // Ele não sumiu da loja: virou item de LINK em `store_settings.menu`, semeado pela migration.
    // O que sumiu é a impossibilidade de tirá-lo, movê-lo ou trocar o destino sem mexer em código.
    menuState.items = [item('anime', 'Anime')]
    const { container } = renderHeader()

    const faixa = container.querySelector('[aria-label="Departamentos"]')!
    expect(faixa.querySelector('a[href="/sobre"]')).toBeNull()
    // E o único filho da faixa é o mega menu: nenhum item solto ao lado dele.
    expect(screen.getByTestId('mega-menu').parentElement).toBe(faixa)
  })

  it('a faixa mostra EXATAMENTE o que `useMenu` devolveu, sem acrescentar nada', () => {
    menuState.items = [item('anime', 'Anime'), item('sobre', 'Sobre')]
    renderHeader()
    expect(screen.getByTestId('mega-menu')).toHaveTextContent('Anime,Sobre')
  })
})

describe('Header — a faixa rola em vez de embrulhar (NAV-04)', () => {
  // jsdom devolve 0 para toda medida de layout, então o estouro NÃO é provável aqui: o que se
  // assere é a **forma** que produz a rolagem, e a medida fica para o navegador real no UAT.
  const faixa = () => {
    menuState.items = [item('anime', 'Anime')]
    const { container } = renderHeader()
    return container.querySelector('[aria-label="Departamentos"]')!
  }

  it('a faixa é um container de rolagem horizontal', () => {
    expect(faixa().className).toContain('overflow-x-auto')
  })

  it('e NÃO embrulha em duas linhas — embrulhar ESCONDE o estouro', () => {
    // É a decisão que este repositório já tomou duas vezes: a prévia do painel usa `overflow-x-auto`
    // "porque embrulhar em duas linhas ESCONDERIA o estouro", e a regra de mobile do `CLAUDE.md`
    // manda conteúdo largo rolar dentro do próprio container — o `body` nunca.
    expect(faixa().className).not.toContain('flex-wrap')
  })

  it('a faixa não é posicionada — se fosse, o painel do mega menu seria cortado por ela', () => {
    // O painel é `absolute` e o bloco que o contém é o `<header>` (que é `sticky`). Um abspos cujo
    // containing block é ancestral do container de rolagem escapa do clip. Pôr `relative` aqui
    // mudaria o containing block e o mega menu viraria uma tira de 52px — sem erro nenhum.
    expect(faixa().className).not.toMatch(/(^|\s)(relative|absolute|fixed|sticky)(\s|$)/)
  })

  it('nem o invólucro dela — a camada de afordância se ancora no `<header>`, não na faixa', () => {
    // A tentação ao acrescentar a afordância é pôr `relative` no `div` que embrulha o `<nav>`,
    // porque é o jeito curto de posicionar seta e degradê. Custaria o mesmo que a asserção acima:
    // o `div` é ancestral do painel, e o painel passaria a se medir por uma caixa de 52px.
    expect(faixa().parentElement!.className).not.toMatch(
      /(^|\s)(relative|absolute|fixed|sticky)(\s|$)/,
    )
  })
})

// ── BL-028 — a barra cheia mostra que tem mais coisa ─────────────────────────
//
// **A medida que motiva isto é do UAT em navegador, NÃO do jsdom** (2026-09-06, Chromium, 1440×900,
// 17 itens): `nav.scrollWidth` **2619** contra `clientWidth` **1280**, último item alcançável em
// `scrollLeft` **1339**. Lá também se mediu por que a rolagem não se anuncia — a barra é em
// sobreposição (`offsetHeight` = `clientHeight` = 52, não ocupa layout e não aparece parada) e a
// roda vertical do mouse sobre a faixa rola a PÁGINA (`window.scrollY` 300, `nav.scrollLeft` 0).
//
// jsdom devolve **0** para toda medida de layout, então nada disso é observável aqui. O que estes
// casos provam é o ESTADO: as três medidas são fixadas à mão no nó e o `scroll` é disparado, que é
// a forma honesta de exercitar a lógica sem fingir que há layout.
describe('Header — a faixa cheia mostra que tem mais coisa (BL-028)', () => {
  /** Os números do UAT, para o teste medir a mesma faixa que o navegador mediu. */
  const LARGURA_TOTAL = 2619
  const LARGURA_VISIVEL = 1280
  const FIM = LARGURA_TOTAL - LARGURA_VISIVEL // 1339, conferido no navegador

  const montar = () => {
    menuState.items = [item('anime', 'Anime'), item('kpop', 'K-Pop')]
    const { container } = renderHeader()
    return container.querySelector('[aria-label="Departamentos"]') as HTMLElement
  }

  /**
   * Fixa as três medidas no nó e avisa o componente, como o navegador faria.
   *
   * `scrollLeft` entra como par get/set de verdade — o clique da seta ESCREVE nele, e um valor
   * fixo esconderia justamente o que o último caso mede.
   */
  const medir = (nav: HTMLElement, scrollLeft: number, total = LARGURA_TOTAL) => {
    let atual = scrollLeft
    Object.defineProperty(nav, 'scrollWidth', { configurable: true, get: () => total })
    Object.defineProperty(nav, 'clientWidth', { configurable: true, get: () => LARGURA_VISIVEL })
    Object.defineProperty(nav, 'scrollLeft', {
      configurable: true,
      get: () => atual,
      set: (valor: number) => {
        atual = valor
      },
    })
    act(() => {
      nav.dispatchEvent(new Event('scroll'))
    })
  }

  const esquerda = () => screen.queryByLabelText('Ver os departamentos anteriores')
  const direita = () => screen.queryByLabelText('Ver mais departamentos')

  it('quando CABE, não há afordância nenhuma — e este é o caso normal da loja', () => {
    // A loja tem 3 itens hoje. Uma seta parada numa barra que não rola é um botão que não faz nada,
    // e um degradê permanente seria sujeira sobre uma faixa chapada.
    const nav = montar()
    medir(nav, 0, LARGURA_VISIVEL)

    expect(screen.queryByTestId('faixa-afordancia')).toBeNull()
    expect(esquerda()).toBeNull()
    expect(direita()).toBeNull()
  })

  it('no COMEÇO, só à direita', () => {
    const nav = montar()
    medir(nav, 0)

    expect(screen.getByTestId('afordancia-direita')).toBeInTheDocument()
    expect(screen.queryByTestId('afordancia-esquerda')).toBeNull()
    expect(direita()).toBeInTheDocument()
    expect(esquerda()).toBeNull()
  })

  it('no MEIO, dos dois lados', () => {
    const nav = montar()
    medir(nav, 600)

    expect(screen.getByTestId('afordancia-esquerda')).toBeInTheDocument()
    expect(screen.getByTestId('afordancia-direita')).toBeInTheDocument()
    expect(esquerda()).toBeInTheDocument()
    expect(direita()).toBeInTheDocument()
  })

  it('no FIM, só à esquerda', () => {
    // `FIM` é `scrollWidth − clientWidth`, o mesmo 1339 que o navegador reportou ao levar a faixa
    // até o último item.
    const nav = montar()
    medir(nav, FIM)

    expect(screen.getByTestId('afordancia-esquerda')).toBeInTheDocument()
    expect(screen.queryByTestId('afordancia-direita')).toBeNull()
    expect(esquerda()).toBeInTheDocument()
    expect(direita()).toBeNull()
  })

  it('o fim tolera fração — o navegador não devolve o máximo exato', () => {
    // Com zoom ou densidade não inteira as três medidas voltam fracionárias, e a rolagem para a
    // décimos do máximo. Sem folga, a seta da direita ficaria acesa para sempre num fim já
    // alcançado — e clicá-la não moveria nada.
    const nav = montar()
    medir(nav, FIM - 0.4)

    expect(direita()).toBeNull()
  })

  it('clicar na seta da direita rola PARA a direita, ~uma janela', () => {
    const nav = montar()
    medir(nav, 0)

    fireEvent.click(direita()!)

    // 80% da janela visível: uma janela cheia deixaria a cliente sem referência do que passou.
    expect(nav.scrollLeft).toBeCloseTo(LARGURA_VISIVEL * 0.8)
    // E o estado acompanha na hora: agora há conteúdo escondido dos dois lados.
    expect(esquerda()).toBeInTheDocument()
    expect(direita()).toBeInTheDocument()
  })

  it('clicar na seta da esquerda rola PARA a esquerda', () => {
    const nav = montar()
    medir(nav, FIM)

    fireEvent.click(esquerda()!)

    expect(nav.scrollLeft).toBeCloseTo(FIM - LARGURA_VISIVEL * 0.8)
  })

  it('as duas setas têm rótulo em português, e o degradê não tem — ele é pista, não controle', () => {
    const nav = montar()
    medir(nav, 600)

    expect(esquerda()).toHaveAttribute('aria-label', 'Ver os departamentos anteriores')
    expect(direita()).toHaveAttribute('aria-label', 'Ver mais departamentos')
    expect(screen.getByTestId('afordancia-esquerda')).toHaveAttribute('aria-hidden')
    expect(screen.getByTestId('afordancia-direita')).toHaveAttribute('aria-hidden')
  })

  it('o alvo da seta é 44px, e ela não rouba clique do item que o degradê cobre', () => {
    // 44 vem do `CLAUDE.md`. `h-11 w-11` JÁ é o alvo, então nada de `TAP_44` — o auxiliar existe
    // para desenho menor que 44, e `touchTarget.test.ts` só o cobra de `h-8`/`h-9`/`h-10`/`38px`.
    const nav = montar()
    medir(nav, 600)

    for (const seta of [esquerda()!, direita()!]) {
      expect(seta.className).toContain('h-11')
      expect(seta.className).toContain('w-11')
      expect(seta.className).toContain('pointer-events-auto')
    }
    // A camada inteira é transparente ao ponteiro: o degradê cobre o primeiro/último item, e sem
    // isto ele engoliria o clique de um link de departamento.
    expect(screen.getByTestId('faixa-afordancia').className).toContain('pointer-events-none')
  })

  it('a camada NÃO vive dentro do `<nav>` — senão ela rolaria junto com o conteúdo', () => {
    // Uma seta dentro do container de rolagem sairia da tela junto com os itens: ela precisa ficar
    // parada na ponta. Por isso é irmã do `<nav>`, ancorada no `<header>`.
    const nav = montar()
    medir(nav, 600)

    const camada = screen.getByTestId('faixa-afordancia')
    expect(nav.contains(camada)).toBe(false)
    expect(camada.className).toContain('absolute')
    expect(camada.className).toContain('bottom-0')
  })

  it('a rolagem por teclado continua sendo do navegador — nada aqui a intercepta', () => {
    // O UAT provou que `focus()` no último item leva a faixa a `scrollLeft` 1339 sozinho. Um
    // `onWheel`/`onKeyDown` no `<nav>` seria a forma de quebrar isso sem ninguém notar.
    const nav = montar()
    medir(nav, 0)

    expect(nav.getAttribute('onwheel')).toBeNull()
    // E a suavização é do CSS, com o par de movimento reduzido ao lado.
    expect(nav.className).toContain('scroll-smooth')
    expect(nav.className).toContain('motion-reduce:scroll-auto')
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
    //
    // Com item nenhum a faixa deixou de renderizar (`NAV-15`), então o caso tem de ter menu:
    // o que se mede aqui é a COR e o breakpoint dela, não a presença.
    menuState.items = [item('anime', 'Anime')]
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
