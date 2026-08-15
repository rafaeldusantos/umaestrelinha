import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DEFAULT_HOME_COMPOSITION, type HomeSectionConfig } from '@estrelinha/core/home'
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

const CONTEUDO_DE_HOJE = DEFAULT_HOME_COMPOSITION.find((s) => s.type === 'trending_tags')!.config

const renderTags = (content: HomeSectionConfig = CONTEUDO_DE_HOJE) =>
  render(
    <MemoryRouter>
      <TrendingTags content={content} />
    </MemoryRouter>,
  )

describe('TrendingTags — a lista vem do catálogo', () => {
  it('mostra as categorias reais, e cada chip leva à coleção', () => {
    categorias.data = [cat('leite-materno', 'Leite Materno'), cat('pet', 'Pet')]
    renderTags()

    // `AD-018`: as duas são raiz, então a canônica é a de um segmento.
    expect(screen.getByRole('link', { name: 'Leite Materno' })).toHaveAttribute(
      'href',
      '/leite-materno',
    )
    expect(screen.getByRole('link', { name: 'Pet' })).toHaveAttribute('href', '/pet')
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
    // E a folha sai com a canônica de DOIS segmentos, com o pai que ela acabou de pular.
    expect(screen.getByRole('link', { name: 'Pet' })).toHaveAttribute('href', '/joias-afetivas/pet')
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

describe('TrendingTags — o texto vem do conteúdo, não do arquivo (HOME-41)', () => {
  it('desenha o título, o subtítulo e o "ver todos" que a prop traz', () => {
    // Textos diferentes dos de hoje de propósito: com fallback literal dentro do widget este teste
    // passaria mostrando os antigos, que é o segundo dono que a emenda `E1` fecha.
    categorias.data = [cat('pet', 'Pet')]
    renderTags({
      title: 'Escolha pelo material',
      subtitle: 'O que mais chega ao ateliê',
      link_label: 'Ver tudo',
      link_href: '/busca',
    })

    expect(screen.getByRole('heading', { name: 'Escolha pelo material' })).toBeInTheDocument()
    expect(screen.getByText('O que mais chega ao ateliê')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ver tudo/ })).toHaveAttribute('href', '/busca')
  })

  it('o limite de chips sai do conteúdo (HOME-42)', () => {
    categorias.data = ['a', 'b', 'c', 'd'].map((s) => cat(s, s.toUpperCase()))
    renderTags({ title: 'Temas', limit: 2 })

    expect(screen.getAllByRole('link')).toHaveLength(2)
    expect(screen.queryByRole('link', { name: 'C' })).toBeNull()
  })

  it('sem rótulo ou sem destino, o "ver todos" não é desenhado e os chips ficam', () => {
    categorias.data = [cat('pet', 'Pet')]
    renderTags({ title: 'Temas', link_label: 'Ver tudo' })

    expect(screen.getByRole('link', { name: 'Pet' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: /Ver tudo/ })).toBeNull()
  })

  it('a moldura da seção mora aqui: chão `surface` e o respiro de hoje', () => {
    // Ela estava na `HomePage`; uma composição vinda do banco não tem onde guardar moldura de uma
    // seção específica. `homeComposition.test.tsx` congela o resultado disso na página.
    categorias.data = [cat('pet', 'Pet')]
    const { container } = renderTags()

    const secao = container.querySelector('section')!
    expect(secao.className).toContain('bg-estrelinha-surface')
    expect(secao.className).toContain('py-12')
  })
})
