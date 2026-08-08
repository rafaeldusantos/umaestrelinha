import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Footer from '../Footer'

/**
 * **A marca do rodapé, contra o fundo do rodapé.**
 *
 * O defeito que esta suíte existe para não voltar não estava no componente da
 * marca — estava aqui, na escolha do tom. O rodapé pedia o tom da tinta escura
 * lendo o nome como "sobre escuro", e a marca recebia a mesma cor do próprio
 * fundo: **1,00:1**, um rodapé com um vazio no lugar do logo.
 *
 * Nenhum teste de componente pega isso: a marca renderiza sem erro nenhum com
 * qualquer tom. A asserção precisa ser esta — a cor do traço comparada com o
 * `background` da superfície que o monta.
 */

vi.mock('@/entities/category', () => ({
  useCategories: () => ({ data: [] }),
  browseCategories: () => [],
}))

/** `--estrelinha-ink`, que é a superfície do rodapé. */
const INK = '#23303A'
/** `--estrelinha-primary-strong` — o tom `brand`, que é para superfície CLARA. */
const PRIMARY_STRONG = '#283A4A'

const renderFooter = () => render(<MemoryRouter><Footer /></MemoryRouter>)
const marca = () => screen.getByRole('img', { name: 'Uma Estrelinha' })

describe('Footer — a marca sobre superfície escura', () => {
  it('o rodapé é superfície `ink`', () => {
    // A premissa das asserções abaixo. Se o fundo do rodapé mudar, o tom da
    // marca tem de ser reavaliado junto — e é este teste que obriga.
    const { container } = renderFooter()
    expect(container.querySelector('footer')).toHaveClass('bg-estrelinha-ink')
  })

  it('mostra a ASSINATURA, não o lockup completo', () => {
    // O piso do lockup é 600px e a coluna tem 320px: pedir o lockup aqui só
    // renderizaria a assinatura com um passo a mais. O nome acessível separa os
    // dois — o do lockup carrega a linha "Eternizando suas lembranças".
    renderFooter()
    expect(marca()).toBeInTheDocument()
    expect(
      screen.queryByRole('img', { name: 'Uma Estrelinha — Eternizando suas lembranças' }),
    ).not.toBeInTheDocument()
  })

  it('a assinatura sai com os três papéis de traço', () => {
    // Marca, losangos e tipografia. Se um sumir, o logo perde uma parte inteira
    // sem erro nenhum.
    renderFooter()
    expect(marca().querySelectorAll('path')).toHaveLength(3)
  })

  it('nenhum traço da marca sai na cor do próprio fundo', () => {
    renderFooter()
    const paths = marca().querySelectorAll('path')
    expect(paths.length).toBeGreaterThan(0)
    for (const path of paths) expect(path.getAttribute('stroke')).not.toBe(INK)
  })

  it('o traço é `on-primary`, e nunca o tom de superfície clara', () => {
    // `primary-strong` #283A4A sobre `ink` #23303A lê a 1,15:1 — é o mesmo
    // defeito da marca anterior, com outros valores.
    renderFooter()
    for (const path of marca().querySelectorAll('path')) {
      expect(path).toHaveAttribute('stroke', '#F7F3EC')
      expect(path.getAttribute('stroke')).not.toBe(PRIMARY_STRONG)
    }
  })
})
