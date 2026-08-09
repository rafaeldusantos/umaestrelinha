import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import CategoryGrid from '../CategoryGrid'

/**
 * O ritmo de cor do card de coleção (`PAP-08`).
 *
 * **É regra de POSIÇÃO, não de categoria** — 1º Carimbo, 2º Grafite, demais
 * Mata-borrão. Foi assim que a v1 substituiu os seis gradientes coloridos em
 * que cada categoria escolhia a própria cor e nenhuma delas virava marca; a v2
 * mantém a regra e troca os três valores.
 *
 * O que este teste protege é o acoplamento entre o fundo e o que vai por cima:
 * sobre Grafite o título precisa virar Carimbo e a contagem precisa virar
 * Dobra. Errar isso não quebra nada — só apaga o texto.
 */

vi.mock('@/entities/category', async () => {
  const actual = await vi.importActual<typeof import('@/entities/category')>('@/entities/category')
  return {
    ...actual,
    useCategories: () => ({
      data: [
        { id: '1', name: 'Anime', slug: 'anime', parent_id: null, sort_order: 0, active: true },
        { id: '2', name: 'K-Pop', slug: 'k-pop', parent_id: null, sort_order: 1, active: true },
        { id: '3', name: 'Games', slug: 'games', parent_id: null, sort_order: 2, active: true },
        { id: '4', name: 'Filmes', slug: 'filmes', parent_id: null, sort_order: 3, active: true },
      ],
    }),
  }
})

vi.mock('@/entities/product/api/useProducts', () => ({
  useProducts: () => ({ data: [] }),
}))

const renderGrid = () =>
  render(
    <MemoryRouter>
      <CategoryGrid />
    </MemoryRouter>,
  )

const cardOf = (name: string) =>
  screen.getByRole('link', { name: new RegExp(name, 'i') })

describe('card de coleção — ritmo por posição', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('o primeiro card é Carimbo', () => {
    renderGrid()
    expect(cardOf('Anime')).toHaveClass('bg-estrelinha-accent')
  })

  it('o segundo card é Grafite', () => {
    renderGrid()
    expect(cardOf('K-Pop')).toHaveClass('bg-estrelinha-ink')
  })

  it('do terceiro em diante é Mata-borrão', () => {
    renderGrid()
    expect(cardOf('Games')).toHaveClass('bg-estrelinha-ground-deep')
    expect(cardOf('Filmes')).toHaveClass('bg-estrelinha-ground-deep')
  })

  it('o ritmo é de posição, não de categoria — a ordem é que decide a cor', () => {
    // Sem esta asserção, um mapa `{ anime: rosa, kpop: grafite }` passaria nos
    // três testes acima e reintroduziria a cor-por-categoria que a v1 matou.
    //
    // As quatro categorias da fixture são RAIZ, então cada card sai com a canônica de um
    // segmento (`AD-018`). Filtrar por essa lista também tira o "Ver todas" do cabeçalho, que
    // aponta para `/busca` e também é `<a>`.
    renderGrid()
    const HREFS = ['/anime', '/k-pop', '/games', '/filmes']
    const cards = screen
      .getAllByRole('link')
      .filter((a) => HREFS.includes(a.getAttribute('href') ?? ''))

    expect(cards).toHaveLength(4)
    expect(cards[0]).toHaveClass('bg-estrelinha-accent')
    expect(cards[1]).toHaveClass('bg-estrelinha-ink')
    expect(cards[2]).not.toHaveClass('bg-estrelinha-accent', 'bg-estrelinha-ink')
    expect(cards[3]).not.toHaveClass('bg-estrelinha-accent', 'bg-estrelinha-ink')
  })
})

describe('card de coleção — o texto acompanha o fundo', () => {
  it('sobre Grafite o título é Carimbo e a contagem é Dobra', () => {
    // Carbono sobre Grafite dá 2,55:1. Dobra, 11,72:1.
    renderGrid()
    const card = cardOf('K-Pop')
    expect(card.querySelector('.text-estrelinha-accent')).not.toBeNull()
    expect(card.querySelector('.text-estrelinha-line')).not.toBeNull()
  })

  it('sobre Mata-borrão o título é Grafite e a contagem é Carbono', () => {
    renderGrid()
    const card = cardOf('Games')
    expect(card.querySelector('.text-estrelinha-ink')).not.toBeNull()
    expect(card.querySelector('.text-estrelinha-ink-soft')).not.toBeNull()
  })

  it('a inicial marca-d’água sai na família de display, não em fonte de logo', () => {
    // Não existe fonte de logotipo nesta loja: a marca é traço vetorial em
    // `shared/ui/brand`. A inicial usa a mesma família dos títulos.
    renderGrid()
    const initial = cardOf('Anime').querySelector('[aria-hidden]')
    expect(initial).toHaveClass('font-display', 'font-bold')
  })
})
