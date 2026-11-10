import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

import { SIGNATURE } from '@estrelinha/ui/brand/paths'
import CheckoutHeader from '../CheckoutHeader'

/**
 * O header do fechamento de compra, agora com DOIS consumidores (`CHK-10`, feature `58`).
 *
 * Enquanto ele morava dentro do `CheckoutPage`, quem o provava eram duas asserções da suíte da
 * página — e elas continuam lá, de propósito: a fiação ("a página monta este header") é outra
 * afirmação, e é a página que tem de montá-la. O que este arquivo prova é o **componente**, para
 * a segunda página não herdar um header sem prova própria.
 */
const montar = () =>
  render(
    <MemoryRouter>
      <CheckoutHeader />
    </MemoryRouter>,
  )

describe('CheckoutHeader — a marca', () => {
  it('a assinatura é um link para a home, rotulado pela marca', () => {
    montar()

    expect(screen.getByRole('link', { name: 'Uma Estrelinha' })).toHaveAttribute('href', '/')
  })

  it('a marca é SVG inline, nunca `<img src>` — o header não tem estado de carregamento', () => {
    const { container } = montar()

    expect(container.querySelector('a[aria-label="Uma Estrelinha"] svg')).toBeInTheDocument()
    expect(container.querySelector('img')).toBeNull()
  })

  it('no celular a assinatura sai a 180px, e continua sendo a ASSINATURA, não o símbolo', () => {
    // Exceção declarada ao piso de 190px (2026-10-04). A largura menor vem do CSS; o componente
    // recebe 200 justamente para a escada não trocar o desenho pelo símbolo da estrela.
    const { container } = montar()
    const svg = container.querySelector('a[aria-label="Uma Estrelinha"] svg')!
    const classes = (svg.getAttribute('class') ?? '').split(/\s+/)

    expect(svg).toHaveAttribute('viewBox', SIGNATURE.viewBox)
    expect(classes).toContain('w-[180px]')
    expect(classes).toContain('sm:w-[200px]')
    // Sem `h-auto` o atributo `height` do SVG (de 200px) ficaria valendo e a marca distorceria.
    expect(classes).toContain('h-auto')
  })
})

describe('CheckoutHeader — o que ele diz e o que ele NÃO diz', () => {
  it('afirma "Ambiente seguro"', () => {
    montar()

    expect(screen.getByText('Ambiente seguro')).toBeInTheDocument()
  })

  it('oferece a ajuda pelo WhatsApp', () => {
    montar()

    expect(screen.getByText('Ajuda no WhatsApp')).toBeInTheDocument()
  })

  it('não traz navegação de categorias — é o que o distingue do header da loja', () => {
    // `CHK-10`: sair do fechamento de compra é decisão, não tropeço. Um `<nav>` aqui devolveria a
    // barra de departamentos para cima da tela onde a cliente paga.
    montar()

    expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
    expect(screen.getAllByRole('link')).toHaveLength(1)
  })
})

describe('CheckoutHeader — a linha cede sem empurrar a página de lado', () => {
  // Em 320 px com a fonte a 200 % a marca (180 px fixos) e "Ambiente seguro" não cabem na mesma
  // linha: sem quebra, o bloco passava da borda e o corpo rolava de lado. Quem cede é o texto —
  // ele desce para baixo da marca —, e a marca não encolhe. jsdom não mede layout: a régua é o
  // token exato das classes que permitem isso; a medida é do navegador.
  const tokens = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/)

  it('a linha do cabeçalho quebra quando não cabe', () => {
    montar()
    const linha = screen.getByRole('link', { name: 'Uma Estrelinha' }).parentElement

    expect(tokens(linha)).toContain('flex-wrap')
    expect(tokens(linha)).not.toContain('flex-nowrap')
  })

  it('a marca não encolhe para abrir espaço ao texto', () => {
    montar()

    expect(tokens(screen.getByRole('link', { name: 'Uma Estrelinha' }))).toContain('shrink-0')
  })

  it('o bloco de "Ambiente seguro" pode encolher abaixo do próprio conteúdo', () => {
    montar()
    const bloco = screen.getByText('Ambiente seguro').parentElement

    expect(tokens(bloco)).toContain('min-w-0')
  })
})
