import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import TrendingTags from '../TrendingTags'

/**
 * Chips de tema — `IDN-04`.
 *
 * A lista era **doze fandoms cravados no fonte** (`NarutoClassic`, `BTS`,
 * `StudioGhibli`…) apontando para `/busca?q=<texto>`. Numa loja de joia
 * afetiva os doze devolvem zero resultado, e nada acusa: o link existe, a
 * página abre, e a cliente lê "nada encontrado" doze vezes.
 *
 * Agora a fonte é `pickTrendingCategories` — a mesma regra das pílulas "Em alta
 * agora" da busca — e cada chip leva à PÁGINA da coleção.
 */

/* eslint-disable @typescript-eslint/no-explicit-any */
const { categorias } = vi.hoisted(() => ({ categorias: { data: [] as any[] } }))

vi.mock('@/entities/category', () => ({ useCategories: () => categorias }))

const cat = (id: string, name: string, parent_id: string | null = null) =>
  ({ id, name, slug: id, parent_id }) as any

const renderTags = () => render(<MemoryRouter><TrendingTags /></MemoryRouter>)

describe('TrendingTags — a lista vem do catálogo', () => {
  it('mostra as categorias reais, e cada chip leva à coleção', () => {
    categorias.data = [cat('leite-materno', 'Leite Materno'), cat('pet', 'Pet')]
    renderTags()

    expect(screen.getByRole('link', { name: 'Leite Materno' })).toHaveAttribute(
      'href',
      '/colecao/leite-materno',
    )
    expect(screen.getByRole('link', { name: 'Pet' })).toHaveAttribute('href', '/colecao/pet')
  })

  it('pula o guarda-chuva: só folhas da árvore viram chip', () => {
    // Mesma regra de `pickTrendingCategories`. Sem isso o primeiro chip seria
    // "Joias afetivas", que é o contêiner de tudo e não é escolha nenhuma.
    categorias.data = [
      cat('joias-afetivas', 'Joias afetivas'),
      cat('pet', 'Pet', 'joias-afetivas'),
    ]
    renderTags()

    expect(screen.queryByRole('link', { name: 'Joias afetivas' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Pet' })).toBeInTheDocument()
  })

  it('sem categoria nenhuma a seção não renderiza título órfão', () => {
    categorias.data = []
    const { container } = renderTags()
    expect(container).toBeEmptyDOMElement()
  })

  it('nenhum fandom da loja anterior sobreviveu', () => {
    categorias.data = [cat('pet', 'Pet')]
    const { container } = renderTags()
    expect(container.textContent).not.toMatch(/Naruto|BTS|Ghibli|Pokémon|fandom/i)
  })
})

describe('TrendingTags — a forma e a cor', () => {
  it('os dois primeiros vêm preenchidos, com texto `ink` sobre o ouro', () => {
    // `ink` sobre `accent` é 4,78:1 — o único uso de texto que o acento tem.
    categorias.data = ['a', 'b', 'c'].map((s) => cat(s, s.toUpperCase()))
    renderTags()

    const chips = ['A', 'B', 'C'].map((n) => screen.getByRole('link', { name: n }))
    expect(chips[0].className).toContain('bg-estrelinha-accent')
    expect(chips[0].className).toContain('text-estrelinha-ink')
    expect(chips[1].className).toContain('bg-estrelinha-accent')
    expect(chips[2].className).not.toContain('bg-estrelinha-accent')
  })

  it('cada chip tem alvo de toque de 44px', () => {
    categorias.data = [cat('pet', 'Pet')]
    renderTags()
    expect(screen.getByRole('link', { name: 'Pet' }).className).toContain('min-h-11')
  })
})
