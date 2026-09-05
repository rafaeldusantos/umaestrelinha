import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { MenuItem, ResolvedMenuBanner } from '@estrelinha/core/menu'
import MegaMenu from '../MegaMenu'

/**
 * A barra de departamentos e o painel — boards "Desktop Mega Menu Open - v3" e `DDR-0`.
 *
 * Feature 16: MENU-11 (hover abre com filhas), MENU-12 (teclado), MENU-14 (sem painel = link
 * direto), MENU-15 (sair fecha).
 * Feature 39: NAV-12 (link é link direto), NAV-17/18 (ícone, e sem ícone não reserva vaga),
 * NAV-22/24 (filhas curadas em colunas de até 8), NAV-25, NAV-26 ("ver tudo em X"), NAV-28/35
 * (banners, e sem banner o painel encolhe), NAV-11 (externo em nova aba).
 *
 * **Duas quedas declaradas nesta reescrita**, e as duas são superfícies que deixaram de existir:
 *
 * - os 3 casos de `MENU-13` (a faixa "Em destaque" de 3 produtos automáticos), removida por decisão
 *   do usuário — eram peças que a Adri não escolhia nem via;
 * - os 3 casos de `MENU-27/28` (o card `menu_promo`, um retângulo de cor sem imagem), substituído
 *   pelos banners com arte, que têm cobertura própria aqui e em `useMenuTargets.test.tsx`.
 */

const { bannersState } = vi.hoisted(() => ({ bannersState: { lista: [] as ResolvedMenuBanner[] } }))

// O painel resolve os banners por hook, e o que ele resolve tem teste próprio
// (`entities/menu/api/__tests__/useMenuTargets.test.tsx`). Aqui interessa o DESENHO.
vi.mock('@/entities/menu', () => ({ useMenuBanners: () => bannersState.lista }))

const filha = (id: string, name: string) => ({ id, name, slug: id }) as never

const categoria = (over: Partial<MenuItem> & { id: string; name: string }): MenuItem =>
  ({
    kind: 'category',
    slug: over.id,
    // `AD-018`: o href da entrada é a canônica que `menuItems` monta — raiz, um segmento.
    href: `/${over.id}`,
    path: over.name,
    icon: null,
    sortOrder: 0,
    children: [],
    hasPanel: false,
    ...over,
  }) as MenuItem

const link = (over: Partial<MenuItem> & { id: string; name: string }): MenuItem =>
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
  children: [filha('cinzas', 'Cinzas de cremação'), filha('leite', 'Leite materno')],
  hasPanel: true,
})
const CORRENTES = categoria({ id: 'correntes', name: 'Correntes' })

const renderMenu = (items: MenuItem[] = [AFETIVAS, CORRENTES]) =>
  render(
    <MemoryRouter>
      <MegaMenu items={items} />
    </MemoryRouter>,
  )

/** O painel abre com espera de intenção — os timers precisam avançar. */
const hover = (name: string) => {
  fireEvent.pointerEnter(screen.getByRole('link', { name }))
  act(() => vi.advanceTimersByTime(200))
}

beforeEach(() => {
  vi.useFakeTimers()
  bannersState.lista = []
})

// Obrigatório: o `afterAll` de `src/test/setup.ts` espera 100ms **reais** (drenar os timers do
// `input-otp`). Com os fake timers ainda instalados, aquele `setTimeout` nunca dispara e o hook
// estoura em 10s — a suíte fica verde e o ARQUIVO falha.
afterEach(() => {
  vi.useRealTimers()
})

describe('MENU-11 — hover abre o painel', () => {
  it('mostra as subcategorias curadas e o "ver tudo em X" (NAV-22, NAV-26)', () => {
    renderMenu()
    expect(screen.queryByTestId('mega-menu-painel')).toBeNull()

    hover('Coleção Afetivas')
    const painel = screen.getByTestId('mega-menu-painel')
    expect(painel).toHaveTextContent('Cinzas de cremação')
    expect(painel).toHaveTextContent('Leite materno')
    // O rótulo nomeia o destino: "ver tudo" sozinho não diz para onde vai.
    expect(screen.getByRole('link', { name: 'ver tudo em Coleção Afetivas' })).toHaveAttribute(
      'href',
      '/afetivas',
    )
  })

  it('as subcategorias levam à própria página de coleção, com o pai na frente (AD-018)', () => {
    // A canônica de uma subcategoria tem DOIS segmentos, e o pai é a própria entrada do painel.
    // Com um segmento só o link resolveria, mas apontaria para a forma secundária.
    renderMenu()
    hover('Coleção Afetivas')
    expect(screen.getByRole('link', { name: 'Cinzas de cremação' })).toHaveAttribute(
      'href',
      '/afetivas/cinzas',
    )
  })

  it('não abre no primeiro pixel: a espera de intenção evita um painel por item ao atravessar', () => {
    renderMenu()
    fireEvent.pointerEnter(screen.getByRole('link', { name: 'Coleção Afetivas' }))
    expect(screen.queryByTestId('mega-menu-painel')).toBeNull()
    act(() => vi.advanceTimersByTime(200))
    expect(screen.getByTestId('mega-menu-painel')).toBeInTheDocument()
  })
})

describe('MENU-12 — teclado', () => {
  it('foco abre o painel', () => {
    renderMenu()
    fireEvent.focus(screen.getByRole('link', { name: 'Coleção Afetivas' }))
    expect(screen.getByTestId('mega-menu-painel')).toBeInTheDocument()
  })

  it('Esc fecha E devolve o foco à entrada', () => {
    renderMenu()
    const trigger = screen.getByRole('link', { name: 'Coleção Afetivas' })
    fireEvent.focus(trigger)
    fireEvent.keyDown(trigger, { key: 'Escape' })

    expect(screen.queryByTestId('mega-menu-painel')).toBeNull()
    // Sem devolver o foco, o teclado voltaria ao começo do documento a cada painel fechado.
    expect(document.activeElement).toBe(trigger)
  })

  it('a trava do foco é de UM evento: o Tab seguinte volta a abrir', () => {
    // Sem a trava o `.focus()` de dentro do handler dispara o `onFocus` da entrada, o painel reabre
    // no mesmo tique e o `Esc` fica inútil no teclado. Este garante que a trava não fica presa.
    renderMenu()
    const trigger = screen.getByRole('link', { name: 'Coleção Afetivas' })
    fireEvent.focus(trigger)
    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(screen.queryByTestId('mega-menu-painel')).toBeNull()

    fireEvent.focus(trigger)
    expect(screen.getByTestId('mega-menu-painel')).toBeInTheDocument()
  })

  it('aria-expanded acompanha o painel', () => {
    renderMenu()
    const trigger = screen.getByRole('link', { name: 'Coleção Afetivas' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.focus(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('NAV-25 — entrada sem painel é link direto', () => {
  it('sem filha curada e sem banner, o hover não abre nada', () => {
    renderMenu()
    hover('Correntes')
    expect(screen.queryByTestId('mega-menu-painel')).toBeNull()
  })

  it('e a entrada não anuncia painel nenhum para o leitor de tela', () => {
    renderMenu()
    const trigger = screen.getByRole('link', { name: 'Correntes' })
    expect(trigger).not.toHaveAttribute('aria-expanded')
    expect(trigger).toHaveAttribute('href', '/correntes')
  })

  it('só com banner (sem filha) o painel ABRE — o anúncio é conteúdo suficiente', () => {
    bannersState.lista = [banner()]
    renderMenu([categoria({ id: 'joias', name: 'Joias', hasPanel: true })])
    hover('Joias')
    expect(screen.getByTestId('mega-menu-painel')).toBeInTheDocument()
    // Sem filha, não há coluna de subcategorias nem "ver tudo em X".
    expect(screen.queryByRole('link', { name: /^ver tudo em/ })).toBeNull()
    expect(screen.getByTestId('mega-menu-banners')).toBeInTheDocument()
  })
})

describe('MENU-15 — sair fecha', () => {
  it('pointerleave do conjunto fecha o painel', () => {
    const { container } = renderMenu()
    hover('Coleção Afetivas')
    fireEvent.pointerLeave(container.firstChild!)
    act(() => vi.advanceTimersByTime(300))
    expect(screen.queryByTestId('mega-menu-painel')).toBeNull()
  })

  it('entrar no painel cancela o fechamento — o salto de 1px não pode fechá-lo', () => {
    const { container } = renderMenu()
    hover('Coleção Afetivas')
    fireEvent.pointerLeave(container.firstChild!)
    fireEvent.pointerEnter(screen.getByTestId('mega-menu-painel'))
    act(() => vi.advanceTimersByTime(300))
    expect(screen.getByTestId('mega-menu-painel')).toBeInTheDocument()
  })
})

describe('NAV-17 / NAV-18 — o ícone da entrada', () => {
  it('o item com ícone desenha o glifo do catálogo à esquerda do nome', () => {
    const { container } = renderMenu([categoria({ id: 'correntes', name: 'Correntes', icon: 'corrente' })])
    const entrada = screen.getByRole('link', { name: 'Correntes' })

    const svg = entrada.querySelector('svg')!
    expect(svg).toBeTruthy()
    // O ícone vem de `@estrelinha/ui/icons`, o MESMO conjunto que o seletor do painel desenha:
    // grade 0 0 24 24, contorno em `currentColor`.
    expect(svg.getAttribute('viewBox')).toBe('0 0 24 24')
    expect(container.querySelector('svg')!.querySelector('path')!.getAttribute('stroke')).toBe(
      'currentColor',
    )
  })

  it('o ícone sai em `accent` — a régua de 3:1 de objeto gráfico sobre a faixa `primary` (NAV-20)', () => {
    // Ouro como TEXTO ali mediria 3,26:1 e reprovaria os 4,5:1. O rótulo continua em `on-primary`,
    // e quem marca o item aberto é a régua de 2px — duas pistas, nenhuma delas só de cor.
    renderMenu([categoria({ id: 'correntes', name: 'Correntes', icon: 'corrente' })])
    const svg = screen.getByRole('link', { name: 'Correntes' }).querySelector('svg')!
    expect(svg.getAttribute('class')).toContain('text-estrelinha-accent')
  })

  it('item SEM ícone não reserva vaga vazia', () => {
    renderMenu([categoria({ id: 'correntes', name: 'Correntes' })])
    expect(screen.getByRole('link', { name: 'Correntes' }).querySelector('svg')).toBeNull()
  })

  it('chave de ícone que o catálogo não conhece já chegou como `null` — a barra não quebra', () => {
    // `menuIconKey` degrada em silêncio dentro de `menuItems` (`NAV-19`), então o que chega aqui é
    // sempre desenhável. Este caso prova que o componente não tenta desenhar o indesenhável.
    renderMenu([categoria({ id: 'correntes', name: 'Correntes', icon: null })])
    expect(screen.getByRole('link', { name: 'Correntes' }).querySelector('svg')).toBeNull()
  })

  it('a seta só aparece em quem abre painel', () => {
    renderMenu()
    // "Coleção Afetivas" tem painel: leva ícone de seta (um `svg` de chevron).
    expect(screen.getByRole('link', { name: 'Coleção Afetivas' }).querySelectorAll('svg')).toHaveLength(1)
    // "Correntes" não tem: nenhum `svg` — nem ícone, nem seta.
    expect(screen.getByRole('link', { name: 'Correntes' }).querySelectorAll('svg')).toHaveLength(0)
  })
})

describe('NAV-12 — item de link é link direto', () => {
  it('interno vira `<a href>` de rota, sem painel, sem seta e sem aria-expanded', () => {
    renderMenu([link({ id: 'sobre', name: 'Sobre' })])
    const item = screen.getByRole('link', { name: 'Sobre' })

    expect(item).toHaveAttribute('href', '/sobre')
    expect(item).not.toHaveAttribute('aria-expanded')
    expect(item.querySelectorAll('svg')).toHaveLength(0)

    hover('Sobre')
    expect(screen.queryByTestId('mega-menu-painel')).toBeNull()
  })

  it('externo abre em nova aba com `noopener noreferrer` (NAV-11)', () => {
    renderMenu([
      link({ id: 'blog', name: 'Blog', href: 'https://exemplo.com/blog', external: true }),
    ])
    const item = screen.getByRole('link', { name: 'Blog' })

    expect(item).toHaveAttribute('href', 'https://exemplo.com/blog')
    expect(item).toHaveAttribute('target', '_blank')
    expect(item).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('o link também pode ter ícone — é o mesmo conjunto da categoria (NAV-17)', () => {
    renderMenu([link({ id: 'sobre', name: 'Sobre', icon: 'estrela' })])
    expect(screen.getByRole('link', { name: 'Sobre' }).querySelector('svg')).toBeTruthy()
  })
})

describe('NAV-24 — as colunas do painel', () => {
  const muitas = (quantas: number) =>
    Array.from({ length: quantas }, (_, i) => filha(`f${i}`, `Filha ${i}`))

  it('até 8 filhas cabem numa coluna só', () => {
    renderMenu([categoria({ id: 'joias', name: 'Joias', children: muitas(8), hasPanel: true })])
    hover('Joias')
    expect(screen.getByTestId('mega-menu-painel').querySelectorAll('.w-\\[220px\\]')).toHaveLength(1)
  })

  it('a nona abre a segunda coluna, e a ordem da árvore é preservada', () => {
    renderMenu([categoria({ id: 'joias', name: 'Joias', children: muitas(9), hasPanel: true })])
    hover('Joias')
    const colunas = screen.getByTestId('mega-menu-painel').querySelectorAll('.w-\\[220px\\]')

    expect(colunas).toHaveLength(2)
    // Enche a primeira antes de abrir a segunda: distribuir "equilibrado" faria a nona filha mudar
    // a décima de coluna sem nada ter mudado nela.
    expect(colunas[0].textContent).toContain('Filha 7')
    expect(colunas[1].textContent).toBe('Filha 8')
  })
})

describe('NAV-28 / NAV-35 — os banners do painel', () => {
  it('renderiza selo, título, texto e leva ao destino', () => {
    bannersState.lista = [
      banner({
        badge: 'NOVIDADE',
        title: 'Árvore da Vida',
        subtitle: 'Com cinzas, mecha ou leite.',
        href: '/joias/arvore',
      }),
    ]
    renderMenu()
    hover('Coleção Afetivas')

    const card = screen.getByRole('link', { name: /Árvore da Vida/ })
    expect(card).toHaveAttribute('href', '/joias/arvore')
    expect(card).toHaveTextContent('NOVIDADE')
    expect(card).toHaveTextContent('Com cinzas, mecha ou leite.')
  })

  it('desenha os DOIS quando há dois', () => {
    bannersState.lista = [banner({ title: 'Um' }), banner({ title: 'Dois', href: '/dois' })]
    renderMenu()
    hover('Coleção Afetivas')
    expect(screen.getByTestId('mega-menu-banners').children).toHaveLength(2)
  })

  it('com arte, sai um `<img>` preguiçoso; sem arte, nenhum quadro vazio (NAV-32)', () => {
    bannersState.lista = [banner({ image: 'https://cdn.test/arvore.webp' })]
    renderMenu()
    hover('Coleção Afetivas')
    const img = screen.getByTestId('mega-menu-banners').querySelector('img')!
    expect(img).toHaveAttribute('src', 'https://cdn.test/arvore.webp')
    expect(img).toHaveAttribute('loading', 'lazy')
    // `alt` vazio: o card inteiro é o link e o título já o nomeia.
    expect(img).toHaveAttribute('alt', '')
  })

  it('sem arte o card fica só com o texto', () => {
    bannersState.lista = [banner({ image: null })]
    renderMenu()
    hover('Coleção Afetivas')
    expect(screen.getByTestId('mega-menu-banners').querySelector('img')).toBeNull()
    expect(screen.getByTestId('mega-menu-banners')).toHaveTextContent('Árvore da Vida')
  })

  it('banner externo sai com `target` e `rel` (NAV-11)', () => {
    bannersState.lista = [
      banner({ href: 'https://exemplo.com/campanha', external: true, title: 'Campanha' }),
    ]
    renderMenu()
    hover('Coleção Afetivas')

    const card = screen.getByRole('link', { name: /Campanha/ })
    expect(card).toHaveAttribute('target', '_blank')
    expect(card).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('sem banner nenhum, o painel ENCOLHE — nenhum nó reservado (NAV-35)', () => {
    bannersState.lista = []
    renderMenu()
    hover('Coleção Afetivas')
    expect(screen.queryByTestId('mega-menu-banners')).toBeNull()
    // …e o painel continua útil, com as colunas.
    expect(screen.getByTestId('mega-menu-painel')).toHaveTextContent('Cinzas de cremação')
  })

  it('selo ausente não renderiza pílula vazia', () => {
    bannersState.lista = [banner({ badge: null })]
    renderMenu()
    hover('Coleção Afetivas')
    expect(screen.getByTestId('mega-menu-banners').textContent).toBe('Árvore da Vida')
  })
})

describe('barra vazia', () => {
  it('sem item nenhum não renderiza nada — nem o contêiner vazio (NAV-15)', () => {
    const { container } = renderMenu([])
    expect(container).toBeEmptyDOMElement()
  })
})

describe('NAV-04 — a forma que produz a rolagem', () => {
  it('a fila de itens é `min-w-max` e NUNCA `flex-wrap`', () => {
    // jsdom não mede largura, então o que se prova é a forma: `min-w-max` impede a fila de encolher
    // dentro do `overflow-x-auto` do `<nav>`, e `flex-wrap` esconderia o estouro em duas linhas.
    const { container } = renderMenu()
    const fila = container.firstElementChild!

    expect(fila.className).toContain('min-w-max')
    expect(fila.className).not.toContain('flex-wrap')
  })
})
