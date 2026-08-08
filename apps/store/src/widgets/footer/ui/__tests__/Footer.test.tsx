import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Footer from '../Footer'

/**
 * **A marca do rodapé, contra o fundo do rodapé.**
 *
 * O defeito que esta suíte existe para não voltar não estava no componente da
 * marca — estava aqui, na escolha do tom. O rodapé pedia `tone="ink"` lendo o
 * nome como "sobre Grafite", quando `ink` quer dizer "EM Grafite". O wordmark
 * recebia o mesmo `#2E2028` do próprio fundo — **1,00:1** — e a loja mostrava um
 * rodapé com "PERSONALIZADOS" e nada em cima.
 *
 * Nenhum teste de componente pega isso: o lockup renderiza sem erro nenhum com
 * qualquer tom, e a suíte da marca só olhava o descritor, que estava certo. A
 * asserção precisa ser esta — o `fill` da marca comparado com o `background` da
 * superfície que a monta.
 */

vi.mock('@/entities/category', () => ({
  useCategories: () => ({ data: [] }),
  browseCategories: () => [],
}))

/** Grafite — o valor de `bg-estrelinha-ink`, que é a superfície do rodapé. */
const INK = '#2E2028'

const renderFooter = () => render(<MemoryRouter><Footer /></MemoryRouter>)

describe('Footer — a marca sobre Grafite', () => {
  it('o rodapé é superfície Grafite', () => {
    // A premissa das asserções abaixo. Se o fundo do rodapé mudar, o tom da
    // marca tem de ser reavaliado junto — e é este teste que obriga.
    const { container } = renderFooter()
    expect(container.querySelector('footer')).toHaveClass('bg-estrelinha-ink')
  })

  it('mostra o LOCKUP, não o wordmark sozinho', () => {
    // Em 150px está acima do piso de 140, e ali o descritor ainda cumpre a
    // única função que tem: dizer o que a loja vende.
    renderFooter()
    expect(screen.getByRole('img', { name: 'Nanita Personalizados' })).toBeInTheDocument()
  })

  it('nenhum traço da marca sai na cor do próprio fundo', () => {
    renderFooter()
    const paths = screen.getByRole('img', { name: 'Nanita Personalizados' }).querySelectorAll('path')
    expect(paths).toHaveLength(2)
    for (const path of paths) expect(path.getAttribute('fill')).not.toBe(INK)
  })

  it('wordmark em Carimbo e descritor em Dobra', () => {
    // Carimbo sobre Grafite lê a 5,22:1; Dobra, a 11,72:1. As duas outras
    // combinações plausíveis falham: Grafite dá 1,00:1 e Carbono, 2,55:1.
    renderFooter()
    const paths = screen.getByRole('img', { name: 'Nanita Personalizados' }).querySelectorAll('path')
    expect(paths[0]).toHaveAttribute('fill', '#F1678D')
    expect(paths[1]).toHaveAttribute('fill', '#EBDDD7')
  })
})
