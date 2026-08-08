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
    expect(cardOf('Anime')).toHaveClass('bg-nanita-glaze')
  })

  it('o segundo card é Grafite', () => {
    renderGrid()
    expect(cardOf('K-Pop')).toHaveClass('bg-nanita-ink')
  })

  it('do terceiro em diante é Mata-borrão', () => {
    renderGrid()
    expect(cardOf('Games')).toHaveClass('bg-nanita-sugar')
    expect(cardOf('Filmes')).toHaveClass('bg-nanita-sugar')
  })

  it('o ritmo é de posição, não de categoria — a ordem é que decide a cor', () => {
    // Sem esta asserção, um mapa `{ anime: rosa, kpop: grafite }` passaria nos
    // três testes acima e reintroduziria a cor-por-categoria que a v1 matou.
    //
    // `/colecao/` filtra o "Ver todas" do cabeçalho, que também é `<a>`.
    renderGrid()
    const cards = screen
      .getAllByRole('link')
      .filter((a) => a.getAttribute('href')?.startsWith('/colecao/'))

    expect(cards).toHaveLength(4)
    expect(cards[0]).toHaveClass('bg-nanita-glaze')
    expect(cards[1]).toHaveClass('bg-nanita-ink')
    expect(cards[2]).not.toHaveClass('bg-nanita-glaze', 'bg-nanita-ink')
    expect(cards[3]).not.toHaveClass('bg-nanita-glaze', 'bg-nanita-ink')
  })
})

describe('card de coleção — o texto acompanha o fundo', () => {
  it('sobre Grafite o título é Carimbo e a contagem é Dobra', () => {
    // Carbono sobre Grafite dá 2,55:1. Dobra, 11,72:1.
    renderGrid()
    const card = cardOf('K-Pop')
    expect(card.querySelector('.text-nanita-glaze')).not.toBeNull()
    expect(card.querySelector('.text-nanita-border')).not.toBeNull()
  })

  it('sobre Mata-borrão o título é Grafite e a contagem é Carbono', () => {
    renderGrid()
    const card = cardOf('Games')
    expect(card.querySelector('.text-nanita-ink')).not.toBeNull()
    expect(card.querySelector('.text-nanita-plum')).not.toBeNull()
  })

  it('a inicial marca-d’água sai em Fredoka 700, não em fonte de logo', () => {
    // Berkshire Swash saiu da loja na v2 — o wordmark virou SVG e esta inicial
    // é o único outro lugar onde ela existia.
    renderGrid()
    const initial = cardOf('Anime').querySelector('[aria-hidden]')
    expect(initial).toHaveClass('font-display', 'font-bold')
  })
})
