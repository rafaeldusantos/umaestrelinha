import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DEFAULT_HOME_COMPOSITION, type HomeSectionConfig } from '@estrelinha/core/home'
import BrandStatement from '../BrandStatement'

/**
 * A faixa institucional — `HOME-43`.
 *
 * É a **única faixa escura** do miolo da home, e o lugar onde a loja para de vender e diz quem faz.
 * A feature 24 troca a fonte do texto (literal → prop, **sem fallback**, emenda `E1`) e não mexe na
 * marcação. O que este arquivo prova é que o texto passou a vir de fora; o contraste da faixa
 * continua sendo prendido por `contrast.test.ts` e `accentText.test.ts`, que leem o fonte do disco.
 */

const CONTEUDO_DE_HOJE = DEFAULT_HOME_COMPOSITION.find((s) => s.type === 'brand_statement')!.config

const renderFaixa = (content: HomeSectionConfig = CONTEUDO_DE_HOJE) =>
  render(
    <MemoryRouter>
      <BrandStatement content={content} />
    </MemoryRouter>,
  )

describe('BrandStatement — o texto vem do conteúdo, não do arquivo (HOME-43)', () => {
  it('desenha sobretítulo, título, parágrafo, assinatura e link de escape que a prop traz', () => {
    // Textos diferentes dos de hoje de propósito: com fallback literal dentro do widget este teste
    // passaria mostrando os antigos.
    renderFaixa({
      eyebrow: 'Outro sobretítulo',
      title: 'Outro título da faixa',
      paragraph: 'Outro parágrafo institucional, escrito no painel.',
      author_name: 'Outra pessoa',
      author_role: 'outro papel · outra cidade',
      link_label: 'Ver a oficina',
      link_href: '/sobre',
    })

    expect(screen.getByText('Outro sobretítulo')).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Outro título da faixa' })).toBeInTheDocument()
    expect(screen.getByText('Outro parágrafo institucional, escrito no painel.')).toBeInTheDocument()
    expect(screen.getByText('Outra pessoa')).toBeInTheDocument()
    expect(screen.getByText('outro papel · outra cidade')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Ver a oficina' })).toHaveAttribute('href', '/sobre')
  })

  it('sem rótulo ou sem destino, o link de escape não é desenhado e a faixa fica de pé', () => {
    // `<Link to={undefined}>` derrubaria a Home inteira; um destino inventado mandaria a cliente
    // para outro lugar em silêncio.
    renderFaixa({ title: 'Só o título', link_label: 'Sem destino' })

    expect(screen.getByRole('heading', { name: 'Só o título' })).toBeInTheDocument()
    expect(screen.queryByRole('link')).toBeNull()
  })
})
