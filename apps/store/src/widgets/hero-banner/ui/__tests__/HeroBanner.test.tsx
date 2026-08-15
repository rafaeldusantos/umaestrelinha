import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { DEFAULT_HOME_COMPOSITION, type HomeSectionConfig } from '@estrelinha/core/home'
import HeroBanner from '../HeroBanner'

/**
 * O hero da home — `IDN-04` AC "o hero não exibe mascote nem produto de pin".
 *
 * A arte anterior era uma **cartela de pins**: papel picotado, cinco discos e
 * um selo. Ela não tinha re-skin possível — um botton desenhado em ouro
 * continua sendo um botton —, e o remap da Fase 3 tinha justamente pintado os
 * cinco discos de `accent` sem que nada acusasse.
 *
 * Feature 24: o texto passou a vir por **prop obrigatória, sem fallback** (emenda `E1`), e a figura
 * aceita a foto da dona (`HOME-17`..`HOME-19`, `HOME-21`). As asserções de identidade abaixo
 * continuam valendo — o que mudou foi de onde o texto vem, não o que ele diz.
 */

const CONTEUDO_DE_HOJE = DEFAULT_HOME_COMPOSITION.find(s => s.type === 'hero')!.config

const renderHero = (content: HomeSectionConfig = CONTEUDO_DE_HOJE) =>
  render(
    <MemoryRouter>
      <HeroBanner content={content} />
    </MemoryRouter>,
  )

describe('Hero — a arte é a marca, não o produto antigo', () => {
  it('mostra o símbolo da marca', () => {
    renderHero()
    expect(screen.getByRole('img', { name: 'Uma Estrelinha' })).toBeInTheDocument()
  })

  it('não sobrou nenhum disco da cartela de pins', () => {
    // A cartela eram cinco `rounded-full` com preenchimento dentro da figura,
    // mais a moldura pontilhada. Se um deles voltar, volta o produto errado.
    const { container } = renderHero()
    const pontilhado = container.querySelectorAll('.border-dashed')
    expect(pontilhado).toHaveLength(0)
  })

  it('a figura aparece também no celular', () => {
    // A cartela era `hidden md:flex` porque 440px não cabiam em 390. O
    // símbolo cabe, então o hero deixa de ser só texto no tamanho que
    // responde por ~90% dos acessos.
    const { container } = renderHero()
    const figura = screen.getByRole('img', { name: 'Uma Estrelinha' }).closest('div')!
      .parentElement!
    expect(figura.className).not.toContain('hidden')
    void container
  })

  it('nenhum texto do hero é ouro', () => {
    // O único ouro é a régua de 1px do sobretítulo — objeto gráfico.
    const { container } = renderHero()
    for (const node of container.querySelectorAll('h1, p, span, a')) {
      expect(node.className.toString()).not.toMatch(/text-estrelinha-accent/)
    }
  })

  it('o CTA tem alvo de toque de 44px', () => {
    renderHero()
    expect(screen.getByRole('link', { name: /Explorar coleções/ }).className).toContain('min-h-11')
  })
})

describe('Hero — a chamada descreve o produto desta loja', () => {
  it('fala de joia, e não de coleção de bottons', () => {
    const { container } = renderHero()
    expect(container.textContent).toMatch(/joia/i)
    expect(container.textContent).not.toMatch(/botton|K-Pop|anime|colecionadora/i)
  })

  it('não anuncia calendário de lançamento', () => {
    // "Drop novo toda sexta" era promessa de agenda que esta loja não tem — a
    // mesma razão pela qual a T16 recusou semear a tabela `drops`.
    const { container } = renderHero()
    expect(container.textContent).not.toMatch(/drop/i)
  })

  it('não afirma número de clientes que ninguém conta', () => {
    const { container } = renderHero()
    expect(container.textContent).not.toMatch(/\+?\s?2\.000/)
  })
})

describe('Hero — o texto vem do conteúdo, não do arquivo (HOME-16)', () => {
  it('desenha sobretítulo, as duas linhas do título, o parágrafo e o CTA que a prop traz', () => {
    // Textos deliberadamente diferentes dos de hoje: com fallback literal dentro do widget, este
    // teste passaria mostrando a chamada antiga, que é o defeito que a emenda `E1` fecha.
    renderHero({
      eyebrow: 'Outro sobretítulo',
      title_line1: 'Primeira linha nova,',
      title_line2: 'segunda linha nova.',
      paragraph: 'Outro parágrafo, escrito no painel.',
      cta_label: 'Ver o ateliê',
      cta_href: '/sobre',
    })

    expect(screen.getByText('Outro sobretítulo')).toBeInTheDocument()
    expect(screen.getByText('Primeira linha nova,')).toBeInTheDocument()
    expect(screen.getByText('segunda linha nova.')).toBeInTheDocument()
    expect(screen.getByText('Outro parágrafo, escrito no painel.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ver o ateliê/ })).toHaveAttribute('href', '/sobre')
  })

  it('as duas linhas continuam saindo em cores diferentes: `ink` e `primary`', () => {
    renderHero({ title_line1: 'Linha um', title_line2: 'Linha dois' })

    const [linha1, linha2] = Array.from(
      screen.getByRole('heading', { level: 1 }).querySelectorAll('span'),
    )

    // `classList.contains` e não `toContain`: `text-estrelinha-ink` é prefixo de
    // `text-estrelinha-ink-soft`, e a busca por substring daria verde para a tinta errada.
    expect(linha1).toHaveTextContent('Linha um')
    expect(linha1.classList.contains('text-estrelinha-ink')).toBe(true)

    expect(linha2).toHaveTextContent('Linha dois')
    expect(linha2.classList.contains('text-estrelinha-primary')).toBe(true)
    expect(linha2.classList.contains('text-estrelinha-ink')).toBe(false)
  })

  it('sem rótulo ou sem destino de CTA, o hero continua de pé e nenhum botão é desenhado', () => {
    // Um `<Link to={undefined}>` derrubaria a Home inteira; um destino inventado mandaria a cliente
    // para outro lugar em silêncio.
    renderHero({ title_line1: 'Só o título', cta_label: 'Sem destino' })

    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Só o título')
    expect(screen.queryByRole('link')).toBeNull()
  })
})

describe('Hero — a foto da dona, e a arte da marca como piso (HOME-17..HOME-19)', () => {
  const comFoto: HomeSectionConfig = {
    ...CONTEUDO_DE_HOJE,
    image_url: 'https://cdn.test/peca.webp',
    image_alt: 'Pingente de resina com mecha de cabelo',
  }

  it('sem foto, a figura é a arte da marca', () => {
    renderHero()

    expect(screen.getByRole('img', { name: 'Uma Estrelinha' })).toBeInTheDocument()
    expect(screen.queryByRole('img', { name: /Pingente de resina/ })).toBeNull()
  })

  it('com foto, a figura é a foto — e a arte da marca sai de cena', () => {
    renderHero(comFoto)

    const foto = screen.getByRole('img', { name: 'Pingente de resina com mecha de cabelo' })
    expect(foto).toHaveAttribute('src', 'https://cdn.test/peca.webp')
    expect(screen.queryByRole('img', { name: 'Uma Estrelinha' })).toBeNull()
  })

  it('remover a foto volta à arte da marca sem deixar buraco: a vaga tem a MESMA proporção', () => {
    // `HOME-19`. A vaga reserva a proporção antes de qualquer imagem carregar, então trocar o
    // conteúdo dela não move um pixel do que vem abaixo.
    const { container: comArte } = renderHero()
    const vagaDaArte = comArte.querySelector('.aspect-\\[350\\/260\\]')

    const { container: comAFoto } = renderHero(comFoto)
    const vagaDaFoto = comAFoto.querySelector('.aspect-\\[350\\/260\\]')

    expect(vagaDaArte).not.toBeNull()
    expect(vagaDaFoto).not.toBeNull()
  })
})

describe('Hero em 390px — a foto não empurra o CTA (HOME-21)', () => {
  it('o CTA vem ANTES da figura no documento, então empilhar deixa a foto abaixo dele', () => {
    // Em 390px as duas colunas empilham na ordem do DOM (`flex-col` até `md`). Com a figura antes,
    // qualquer foto alta empurraria o CTA abaixo da dobra — e a altura da foto é da dona.
    renderHero({
      ...CONTEUDO_DE_HOJE,
      image_url: 'https://cdn.test/peca.webp',
      image_alt: 'Pingente de resina com mecha de cabelo',
    })

    const cta = screen.getByRole('link', { name: /Explorar coleções/ })
    const foto = screen.getByRole('img', { name: 'Pingente de resina com mecha de cabelo' })

    expect(cta.compareDocumentPosition(foto) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })

  it('a foto respeita a proporção reservada em vez de esticar', () => {
    const { container } = renderHero({
      image_url: 'https://cdn.test/peca.webp',
      image_alt: 'Pingente de resina com mecha de cabelo',
    })

    const vaga = container.querySelector('.aspect-\\[350\\/260\\]')!
    expect(vaga.className).toContain('overflow-hidden')
    expect(
      screen.getByRole('img', { name: 'Pingente de resina com mecha de cabelo' }).className,
    ).toContain('object-cover')
  })
})
