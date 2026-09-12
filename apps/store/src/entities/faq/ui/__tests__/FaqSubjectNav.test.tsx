import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import FaqSubjectNav, { faqSubjectId } from '../FaqSubjectNav'
import type { FaqPageGroup } from '@estrelinha/core/faq'
import { TAP_ROW } from '@/shared/lib/touchTarget'

/**
 * `FAQL-06` — os assuntos em duas formas, de uma fonte só.
 *
 * As duas metades têm asserção **positiva**: uma negação desenhada para tolerar o `lg:` não prova
 * que o `lg:` existe (`L-029`). Sem isso, apagar a coluna do computador passaria.
 */

const grupo = (category: string, label: string, n: number): FaqPageGroup => ({
  category,
  label,
  items: Array.from({ length: n }, (_, i) => ({
    id: `${category}-${i}`,
    question: `Pergunta ${i}?`,
    answer: 'Resposta.',
    overridden: false,
  })),
})

const GRUPOS = [grupo('sobre', 'Sobre as joias e a Uma Estrelinha', 5), grupo('cuidados', 'Cuidados com a joia', 3)]

describe('FaqSubjectNav', () => {
  it('desenha a faixa do celular com um link por assunto', () => {
    render(<FaqSubjectNav groups={GRUPOS} />)
    const faixa = document.querySelector('.lg\\:hidden')
    expect(faixa?.querySelectorAll('a')).toHaveLength(2)
  })

  it('desenha a coluna do computador, com a contagem de cada assunto', () => {
    render(<FaqSubjectNav groups={GRUPOS} />)
    const coluna = screen.getByRole('navigation', { name: 'Assuntos' })

    expect(coluna).toHaveClass('hidden', 'lg:flex')
    expect(coluna.querySelectorAll('a')).toHaveLength(2)
    expect(coluna.textContent).toContain('5')
    expect(coluna.textContent).toContain('3')
  })

  it('os dois NAVEGAM por âncora — nenhum é botão de filtro', () => {
    render(<FaqSubjectNav groups={GRUPOS} />)
    const links = [...document.querySelectorAll('a')]

    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link.getAttribute('href')).toMatch(/^#assunto-/)
    }
  })

  it('o id do assunto é derivado da chave, não do rótulo', () => {
    expect(faqSubjectId('materiais-e-acabamentos')).toBe('assunto-materiais-e-acabamentos')
  })

  it('o rótulo vem do grupo, nas duas formas', () => {
    render(<FaqSubjectNav groups={GRUPOS} />)
    expect(screen.getAllByText('Cuidados com a joia')).toHaveLength(2)
  })

  it('sem assunto nenhum, não desenha nada', () => {
    const { container } = render(<FaqSubjectNav groups={[]} />)
    expect(container).toBeEmptyDOMElement()
  })

  // Asserido contra a CONSTANTE, nunca contra a string que ela produz hoje: `TAP_ROW` já mudou de
  // forma uma vez (hoje é pseudo-elemento), e um literal aqui viraria um teste sobre a
  // implementação do auxiliar em vez de sobre o alvo de toque do chip.
  it('o alvo de toque do chip adota TAP_ROW', () => {
    render(<FaqSubjectNav groups={GRUPOS} />)
    const chip = document.querySelector('.lg\\:hidden a')
    expect(chip?.className).toContain(TAP_ROW)
  })

  // A afordância nasce ausente: com dois assuntos cabendo, não há nada além da dobra. jsdom devolve
  // 0 para toda medida, então o que se assere é o estado inicial — a medida real é a T29.
  it('sem estouro medido, nenhuma seta aparece', () => {
    render(<FaqSubjectNav groups={GRUPOS} />)
    expect(screen.queryByLabelText('Ver mais assuntos')).toBeNull()
    expect(screen.queryByLabelText('Ver assuntos anteriores')).toBeNull()
  })
})
