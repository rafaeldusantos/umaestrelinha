import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import Footer from '../Footer'

/**
 * **A marca do rodapé, contra o fundo do rodapé.**
 *
 * O defeito que esta suíte existe para não voltar não está no componente da
 * marca — está aqui, na escolha do tom. Um rodapé que pede o tom errado recebe
 * a cor do próprio fundo e fica **com um vazio no lugar do logo**, sem erro em
 * lugar nenhum: nenhum teste de componente pega isso, porque a marca renderiza
 * sem reclamar com qualquer tom.
 *
 * **A `IDN-09` inverteu os dois lados.** O rodapé passou de `ink` a `ground`
 * (board `68V-0`), e com ele o tom da marca passou de `onInk` a `brand`. O
 * defeito continua sendo o mesmo, com os valores trocados: `onInk` (#F7F3EC)
 * sobre `ground` (#FAF8F4) mede **1,03:1**. Por isso a asserção não é "usa
 * `brand`" e ponto — é a cor do traço comparada com a superfície que o monta,
 * nas duas direções.
 */

vi.mock('@/entities/category', () => ({
  useCategories: () => ({ data: [] }),
  browseCategories: () => [],
}))

/** `--estrelinha-ground`, que é a superfície do rodapé. */
const GROUND = '#FAF8F4'
/** `--estrelinha-primary-strong` — o tom `brand`, que é o correto sobre claro. */
const PRIMARY_STRONG = '#283A4A'
/** `--estrelinha-on-primary` — o tom `onInk`, que sobre `ground` some. */
const ON_PRIMARY = '#F7F3EC'

const renderFooter = () => render(<MemoryRouter><Footer /></MemoryRouter>)
const marca = () => screen.getByRole('img', { name: 'Uma Estrelinha' })

describe('Footer — a marca sobre a superfície do rodapé', () => {
  it('o rodapé é superfície `ground`', () => {
    // A premissa das asserções abaixo. Se o fundo do rodapé mudar, o tom da
    // marca tem de ser reavaliado junto — e é este teste que obriga.
    const { container } = renderFooter()
    expect(container.querySelector('footer')).toHaveClass('bg-estrelinha-ground')
    expect(container.querySelector('footer')!.className).not.toContain('bg-estrelinha-ink')
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
    for (const path of paths) expect(path.getAttribute('stroke')).not.toBe(GROUND)
  })

  it('o traço é `brand`, e nunca o tom de superfície escura', () => {
    // `on-primary` #F7F3EC sobre `ground` #FAF8F4 lê a 1,03:1 — é o defeito
    // antigo do rodapé, de cabeça para baixo.
    renderFooter()
    for (const path of marca().querySelectorAll('path')) {
      expect(path).toHaveAttribute('stroke', PRIMARY_STRONG)
      expect(path.getAttribute('stroke')).not.toBe(ON_PRIMARY)
    }
  })
})

describe('Footer — a faixa do Instagram (COP-07)', () => {
  it('leva ao perfil da Adri, e o arroba está escrito na tela', () => {
    renderFooter()
    const faixa = screen.getByTestId('instagram-strip')
    expect(faixa).toHaveAttribute('href', 'https://instagram.com/umaestrelinha.adri')
    expect(faixa).toHaveTextContent('@umaestrelinha.adri')
  })

  it('a faixa é `ink` — a banda escura que fecha a página antes do rodapé claro', () => {
    renderFooter()
    expect(screen.getByTestId('instagram-strip')).toHaveClass('bg-estrelinha-ink')
  })

  it('nenhum texto da faixa é ouro', () => {
    // `accent` sobre `ink` até passaria (4,78:1), mas aqui o texto é o arroba e
    // a chamada, e os dois vão em `on-primary` (11,89:1). O ouro fica no ponto
    // do ícone, que é objeto gráfico.
    const { container } = renderFooter()
    const faixa = container.querySelector('[data-testid="instagram-strip"]')!
    for (const node of faixa.querySelectorAll('span')) {
      expect(node.className).not.toContain('text-estrelinha-accent')
    }
  })
})

describe('Footer — a persona da loja anterior não sobreviveu (COP-07)', () => {
  it('nenhuma rede social aponta para o perfil antigo', () => {
    // Eram três perfis da loja anterior e sobrou um: inventar um arroba de
    // TikTok ou Twitter para preencher a fileira publicaria um link quebrado
    // com cara de oficial.
    const { container } = renderFooter()
    for (const link of container.querySelectorAll('a[href^="http"]')) {
      expect(link.getAttribute('href')).toContain('umaestrelinha')
    }
  })

  it('a assinatura do rodapé é a da loja, e não a de uma persona', () => {
    // A varredura de marca (`brandScan.test.ts`) é quem prova, no repositório
    // inteiro, que os nomes antigos não voltam — com caminho e linha. Aqui o
    // que se afirma é o positivo: o rodapé assina com a marca e o ano.
    const { container } = renderFooter()
    expect(container.textContent).toMatch(
      new RegExp(`© ${new Date().getFullYear()} Uma Estrelinha`),
    )
  })
})
