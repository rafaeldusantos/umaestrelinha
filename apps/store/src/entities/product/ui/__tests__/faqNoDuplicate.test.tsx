import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { extractFaqPairs, resolveProductFaqs, type ProductFaqLink } from '@estrelinha/core/faq'
import ProductDescription from '../ProductDescription'
import ProductFaq from '../ProductFaq'

/**
 * `FAQ-05`, `FAQ-06`, `FAQ-07` — **a mesma pergunta não aparece duas vezes na página.**
 *
 * É a razão de a feature existir na loja: as 3.476 perguntas do catálogo estavam dentro de
 * `products.description`, e a `28` as move para o cadastro. Se a descrição continuasse a exibi-las,
 * a cliente leria tudo duas vezes — uma em "Detalhes do Produto" e outra em "Perguntas Frequentes".
 *
 * O teste usa uma descrição **real** do catálogo (arranjo B, o de seis pares num `<p>` só) e cruza
 * as duas superfícies: o que a descrição desenha e o que a seção de FAQ desenha.
 */

const DESCRICAO_REAL = [
  '<h2>Joia Afetiva Sol com Leite Materno em Prata 925 &mdash; uma forma delicada de eternizar o v&iacute;nculo</h2>',
  '<p>A Joia Afetiva Sol em Prata 925 guarda leite materno.</p>',
  '<h3>Especifica&ccedil;&otilde;es</h3>',
  '<ul><li>Tipo: Joia afetiva</li><li>Material base: Prata 925</li></ul>',
  '<h3>Perguntas frequentes</h3>',
  '<p><strong>Como envio meu material de DNA?</strong><br />Ap&oacute;s a compra, voc&ecirc; recebe as instru&ccedil;&otilde;es para enviar seu material com seguran&ccedil;a.' +
    '<br /><strong>A prata pode escurecer ou perder o brilho?</strong><br />&Eacute; normal que a Prata 925 oxide levemente com o tempo e o uso.' +
    '<br /><strong>Quais materiais posso usar nessa joia?</strong><br />Essa pe&ccedil;a aceita cinzas de crema&ccedil;&atilde;o, leite materno, cabelo, pelo ou coto umbilical.</p>',
  '<h3>Observa&ccedil;&otilde;es importantes</h3>',
  '<ul><li>A joia exibida nas fotos &eacute; ilustrativa.</li></ul>',
].join('\n')

/** As perguntas que o importador teria extraído desta descrição, já como cadastro. */
const links: ProductFaqLink[] = extractFaqPairs(DESCRICAO_REAL).map((par, i) => ({
  faq_id: `f${i}`,
  position: i,
  answer_override: null,
  faq: { id: `f${i}`, question: par.question, answer: par.answer, is_active: true },
}))

const FAQS = resolveProductFaqs(links)

describe('a descrição real produz três perguntas', () => {
  it('a fixture tem o bloco e ele rende 3 pares', () => {
    expect(FAQS).toHaveLength(3)
    expect(FAQS[0].question).toBe('Como envio meu material de DNA?')
  })
})

describe('a descrição renderizada não repete o que virou cadastro', () => {
  it('nenhuma das perguntas do cadastro aparece na descrição', () => {
    const { container } = render(<ProductDescription html={DESCRICAO_REAL} />)

    for (const faq of FAQS) {
      expect(container.textContent).not.toContain(faq.question)
    }
  })

  it('nenhuma das respostas do cadastro aparece na descrição', () => {
    const { container } = render(<ProductDescription html={DESCRICAO_REAL} />)

    for (const faq of FAQS) {
      expect(container.textContent).not.toContain(faq.answer)
    }
  })

  it('o título do bloco também some', () => {
    const { container } = render(<ProductDescription html={DESCRICAO_REAL} />)
    expect(container.textContent).not.toMatch(/Perguntas frequentes/i)
  })

  it('mas o resto da descrição continua inteiro', () => {
    render(<ProductDescription html={DESCRICAO_REAL} />)

    expect(screen.getByText(/A Joia Afetiva Sol em Prata 925 guarda leite materno/)).toBeInTheDocument()
    expect(screen.getByText('Especificações')).toBeInTheDocument()
    expect(screen.getByText('Material base: Prata 925')).toBeInTheDocument()
    expect(screen.getByText('Observações importantes')).toBeInTheDocument()
    expect(screen.getByText('A joia exibida nas fotos é ilustrativa.')).toBeInTheDocument()
  })

  it('as entidades continuam decodificadas no que sobrou', () => {
    const { container } = render(<ProductDescription html={DESCRICAO_REAL} />)

    expect(container.textContent).not.toContain('&ccedil;')
    expect(container.textContent).toContain('Especificações')
  })
})

describe('a seção de FAQ desenha exatamente o que a descrição deixou de desenhar', () => {
  it('as três perguntas estão na seção', () => {
    render(<ProductFaq items={FAQS} />)

    expect(screen.getByText('Como envio meu material de DNA?')).toBeInTheDocument()
    expect(screen.getByText('A prata pode escurecer ou perder o brilho?')).toBeInTheDocument()
    expect(screen.getByText('Quais materiais posso usar nessa joia?')).toBeInTheDocument()
  })

  it('as duas superfícies juntas mostram cada pergunta UMA vez', () => {
    const descricao = render(<ProductDescription html={DESCRICAO_REAL} />).container.textContent ?? ''
    const secao = render(<ProductFaq items={FAQS} />).container.textContent ?? ''
    const pagina = descricao + secao

    for (const faq of FAQS) {
      expect(pagina.split(faq.question).length - 1).toBe(1)
    }
  })
})

// `FAQ-06`/`FAQ-07` — os dois desfechos que a remoção não pode estragar.
describe('a remoção é conservadora', () => {
  it('heading de FAQ sem par extraível continua na tela', () => {
    const html = '<h2>Peça</h2><h3>Perguntas frequentes</h3><p>Fale com a gente pelo WhatsApp.</p>'
    render(<ProductDescription html={html} />)

    expect(screen.getByText('Fale com a gente pelo WhatsApp.')).toBeInTheDocument()
  })

  it('descrição que fica vazia depois da remoção não desenha nada (encadeia com PDP-10)', () => {
    const html =
      '<h3>Perguntas frequentes</h3><p><strong>Só isto?</strong><br />Só isto mesmo.</p>'
    const { container } = render(<ProductDescription html={html} />)

    expect(container.firstChild).toBeNull()
  })

  it('descrição sem bloco de FAQ é renderizada como sempre foi', () => {
    render(<ProductDescription html="<h2>Peça</h2><p>Um pingente para compor.</p>" />)

    expect(screen.getByText('Um pingente para compor.')).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 4, name: 'Peça' })).toBeInTheDocument()
  })
})
