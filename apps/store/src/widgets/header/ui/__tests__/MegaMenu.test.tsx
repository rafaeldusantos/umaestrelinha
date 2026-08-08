import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import type { MenuEntry } from '@estrelinha/core/menu'
import MegaMenu from '../MegaMenu'

// Feature 16 / T17 — board "Desktop Mega Menu Open - v3".
// MENU-11 (hover abre com filhas + Ver todos), MENU-12 (foco abre, Esc fecha devolvendo o foco),
// MENU-13 (até 3 em destaque), MENU-14 (sem painel = link direto), MENU-15 (sair fecha),
// MENU-27/28 (card promo condicional, levando ao destino).

const { products } = vi.hoisted(() => ({ products: { data: [] as any[] } })) // eslint-disable-line @typescript-eslint/no-explicit-any

vi.mock('@/entities/product', () => ({ useProducts: () => products }))

const child = (id: string, name: string) => ({ id, name, slug: id }) as MenuEntry['children'][number]

const entry = (over: Partial<MenuEntry> & { id: string; name: string }): MenuEntry => ({
  slug: over.id,
  href: `/colecao/${over.id}`,
  path: `Bottons › ${over.name}`,
  children: [],
  promo: null,
  ...over,
})

const ANIME = entry({
  id: 'anime',
  name: 'Anime',
  children: [child('naruto', 'Naruto'), child('villains', 'Villains')],
})
const KPOP = entry({ id: 'kpop', name: 'K-Pop' })

const product = (id: string, is_featured = true) =>
  ({ id, name: `Pin ${id}`, slug: id, price: 14.9, image_url: '', is_featured }) as never

const renderMenu = (entries: MenuEntry[] = [ANIME, KPOP]) =>
  render(
    <MemoryRouter>
      <MegaMenu entries={entries} />
    </MemoryRouter>,
  )

/** O painel abre com espera de intenção — os timers precisam avançar. */
const hover = (name: string) => {
  fireEvent.pointerEnter(screen.getByRole('link', { name }))
  act(() => vi.advanceTimersByTime(200))
}

beforeEach(() => {
  vi.useFakeTimers()
  products.data = []
})

// Obrigatório: o `afterAll` de `src/test/setup.ts` espera 100ms **reais** (drenar os timers do
// `input-otp`). Com os fake timers ainda instalados, aquele `setTimeout` nunca dispara e o hook
// estoura em 10s — a suíte fica verde e o ARQUIVO falha.
afterEach(() => {
  vi.useRealTimers()
})

describe('MENU-11 — hover abre o painel', () => {
  it('mostra as subcategorias e o "Ver todos" apontando para a categoria', () => {
    renderMenu()
    expect(screen.queryByTestId('mega-menu-painel')).toBeNull()

    hover('Anime')
    const painel = screen.getByTestId('mega-menu-painel')
    expect(painel).toHaveTextContent('Naruto')
    expect(painel).toHaveTextContent('Villains')
    expect(screen.getByRole('link', { name: 'Ver todos →' })).toHaveAttribute(
      'href',
      '/colecao/anime',
    )
  })

  it('as subcategorias levam à própria página de coleção', () => {
    renderMenu()
    hover('Anime')
    expect(screen.getByRole('link', { name: 'Naruto' })).toHaveAttribute('href', '/colecao/naruto')
  })

  it('não abre no primeiro pixel: a espera de intenção evita quatro painéis ao atravessar a barra', () => {
    renderMenu()
    fireEvent.pointerEnter(screen.getByRole('link', { name: 'Anime' }))
    // Antes da espera, nada.
    expect(screen.queryByTestId('mega-menu-painel')).toBeNull()
    act(() => vi.advanceTimersByTime(200))
    expect(screen.getByTestId('mega-menu-painel')).toBeInTheDocument()
  })
})

describe('MENU-12 — teclado', () => {
  it('foco abre o painel', () => {
    renderMenu()
    fireEvent.focus(screen.getByRole('link', { name: 'Anime' }))
    expect(screen.getByTestId('mega-menu-painel')).toBeInTheDocument()
  })

  it('Esc fecha E devolve o foco à entrada', () => {
    renderMenu()
    const trigger = screen.getByRole('link', { name: 'Anime' })
    fireEvent.focus(trigger)
    fireEvent.keyDown(trigger, { key: 'Escape' })

    expect(screen.queryByTestId('mega-menu-painel')).toBeNull()
    // Sem devolver o foco, o teclado voltaria ao começo do documento a cada painel fechado.
    expect(document.activeElement).toBe(trigger)
  })

  it('a trava do foco é de UM evento: o Tab seguinte volta a abrir', () => {
    // O teste acima é o que prova a trava — sem ela o `.focus()` de dentro do handler dispara o
    // `onFocus` da entrada e o painel reabre no mesmo tique, deixando o `Esc` inútil no teclado.
    // Este garante que a trava não fica presa: quem voltar à entrada de propósito reabre o painel.
    renderMenu()
    const trigger = screen.getByRole('link', { name: 'Anime' })
    fireEvent.focus(trigger)
    fireEvent.keyDown(trigger, { key: 'Escape' })
    expect(screen.queryByTestId('mega-menu-painel')).toBeNull()

    fireEvent.focus(trigger)
    expect(screen.getByTestId('mega-menu-painel')).toBeInTheDocument()
  })

  it('aria-expanded acompanha o painel', () => {
    renderMenu()
    const trigger = screen.getByRole('link', { name: 'Anime' })
    expect(trigger).toHaveAttribute('aria-expanded', 'false')
    fireEvent.focus(trigger)
    expect(trigger).toHaveAttribute('aria-expanded', 'true')
  })
})

describe('MENU-13 — a faixa "Em alta"', () => {
  it('mostra no máximo 3 produtos em destaque', () => {
    products.data = [product('a'), product('b'), product('c'), product('d')]
    renderMenu()
    hover('Anime')
    expect(screen.getByText('Em destaque')).toBeInTheDocument()
    expect(screen.getByText('Pin a')).toBeInTheDocument()
    expect(screen.getByText('Pin c')).toBeInTheDocument()
    expect(screen.queryByText('Pin d')).toBeNull()
  })

  it('produto sem destaque não entra', () => {
    products.data = [product('comum', false)]
    renderMenu()
    hover('Anime')
    expect(screen.queryByText('Em destaque')).toBeNull()
  })

  it('categoria sem produto em destaque não deixa a faixa vazia na tela', () => {
    products.data = []
    renderMenu()
    hover('Anime')
    expect(screen.queryByText('Em destaque')).toBeNull()
    // …e o painel continua útil, com as subcategorias.
    expect(screen.getByTestId('mega-menu-painel')).toHaveTextContent('Naruto')
  })
})

describe('MENU-14 — entrada sem painel é link direto', () => {
  it('sem filhas e sem promo, o hover não abre nada', () => {
    renderMenu()
    hover('K-Pop')
    expect(screen.queryByTestId('mega-menu-painel')).toBeNull()
  })

  it('e a entrada não anuncia painel nenhum para o leitor de tela', () => {
    renderMenu()
    const trigger = screen.getByRole('link', { name: 'K-Pop' })
    expect(trigger).not.toHaveAttribute('aria-expanded')
    expect(trigger).toHaveAttribute('href', '/colecao/kpop')
  })

  it('só com promo (sem filhas) o painel ABRE — o card é conteúdo suficiente', () => {
    const soPromo = entry({
      id: 'games',
      name: 'Games',
      promo: { badge: null, title: 'Drop', subtitle: null, href: '/colecao/x', productCount: null },
    })
    renderMenu([soPromo])
    hover('Games')
    expect(screen.getByTestId('mega-menu-painel')).toBeInTheDocument()
    // Sem filhas, não há coluna de subcategorias nem "Ver todos".
    expect(screen.queryByRole('link', { name: 'Ver todos →' })).toBeNull()
  })
})

describe('MENU-15 — sair fecha', () => {
  it('pointerleave do conjunto fecha o painel', () => {
    const { container } = renderMenu()
    hover('Anime')
    fireEvent.pointerLeave(container.firstChild!)
    act(() => vi.advanceTimersByTime(300))
    expect(screen.queryByTestId('mega-menu-painel')).toBeNull()
  })

  it('entrar no painel cancela o fechamento — o salto de 1px não pode fechá-lo', () => {
    const { container } = renderMenu()
    hover('Anime')
    fireEvent.pointerLeave(container.firstChild!)
    fireEvent.pointerEnter(screen.getByTestId('mega-menu-painel'))
    act(() => vi.advanceTimersByTime(300))
    expect(screen.getByTestId('mega-menu-painel')).toBeInTheDocument()
  })
})

describe('MENU-27 / MENU-28 — o card promocional', () => {
  const comPromo = entry({
    ...ANIME,
    promo: {
      badge: 'NOVIDADE',
      title: 'Coleção Anime Villains',
      subtitle: '12 pins exclusivos dos melhores vilões.',
      href: '/colecao/villains',
      productCount: 12,
    },
  })

  it('renderiza selo, título, texto e leva ao destino', () => {
    renderMenu([comPromo])
    hover('Anime')
    const card = screen.getByRole('link', { name: /Coleção Anime Villains/ })
    expect(card).toHaveAttribute('href', '/colecao/villains')
    expect(card).toHaveTextContent('NOVIDADE')
    expect(card).toHaveTextContent('12 pins exclusivos')
  })

  it('promo nula não deixa a quarta coluna vazia — o painel encolhe (MENU-27)', () => {
    renderMenu([ANIME])
    hover('Anime')
    expect(screen.queryByText('Explorar →')).toBeNull()
  })

  it('promo sem selo não renderiza pílula vazia', () => {
    renderMenu([entry({ ...comPromo, promo: { ...comPromo.promo!, badge: null } })])
    hover('Anime')
    expect(screen.queryByText('NOVIDADE')).toBeNull()
    expect(screen.getByText('Explorar →')).toBeInTheDocument()
  })
})

describe('barra vazia', () => {
  it('sem entradas não renderiza nada — nem a nav vazia (MENU-04)', () => {
    const { container } = renderMenu([])
    expect(container).toBeEmptyDOMElement()
  })
})
