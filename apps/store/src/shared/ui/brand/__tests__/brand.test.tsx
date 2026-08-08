import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { NanitaWordmark, NanitaLockup, NanitaMonogram, WORDMARK_FLOOR, LOCKUP_FLOOR } from '..'

/**
 * A marca em vetor, contra as ACs de `PAP-05`.
 *
 * O que estes testes guardam é a **escada de redução** (prancha 21) e a cor do
 * descritor sobre Grafite. As duas coisas são invisíveis num code review: um
 * lockup a 90px renderiza sem erro nenhum e sai borrado, e um descritor em
 * Carbono sobre Grafite renderiza sem erro nenhum e sai invisível.
 */

const svgOf = (label: string) => screen.getByRole('img', { name: label })

describe('NanitaWordmark', () => {
  it('é SVG inline com papel e nome acessível', () => {
    // Inline e não `<img src>`: o wordmark do header não pode ter estado de
    // carregamento nem 404 possível, e `currentColor` só funciona inline.
    render(<NanitaWordmark width={128} />)
    const svg = svgOf('Nanita')
    expect(svg.tagName.toLowerCase()).toBe('svg')
    expect(svg).toHaveAttribute('viewBox', '0 0 690.06 172.04')
  })

  it('a altura sai da largura pela proporção 4,01:1', () => {
    render(<NanitaWordmark width={160} />)
    // 160 / (690.06/172.04) = 39,89
    expect(Number(svgOf('Nanita').getAttribute('height'))).toBeCloseTo(39.89, 1)
  })

  it.each([
    ['brand', '#F1678D'],
    ['ink', '#2E2028'],
    ['paper', '#F9F1EE'],
    ['onInk', '#F1678D'],
    ['mono', 'currentColor'],
  ] as const)('o tom `%s` pinta o traço em %s', (tone, fill) => {
    render(<NanitaWordmark width={128} tone={tone} />)
    expect(svgOf('Nanita').querySelector('path')).toHaveAttribute('fill', fill)
  })

  it(`abaixo de ${WORDMARK_FLOOR}px cai para o monograma`, () => {
    // Prancha 21: quem quebra primeiro é a fileira de marcas, não a haste. A
    // 90px as barras saem com 3,78px e os losangos viram manchas.
    render(<NanitaWordmark width={90} />)
    expect(svgOf('Nanita')).toHaveAttribute('viewBox', '0 0 126.87 160.18')
  })

  it(`em ${WORDMARK_FLOOR}px ainda renderiza o wordmark`, () => {
    render(<NanitaWordmark width={WORDMARK_FLOOR} />)
    expect(svgOf('Nanita')).toHaveAttribute('viewBox', '0 0 690.06 172.04')
  })
})

describe('NanitaLockup', () => {
  it('tem wordmark E descritor, com nome acessível próprio', () => {
    render(<NanitaLockup width={150} />)
    const svg = svgOf('Nanita Personalizados')
    expect(svg).toHaveAttribute('viewBox', '0 0 690.06 237.8')
    expect(svg.querySelectorAll('path')).toHaveLength(2)
  })

  it('sobre Papel o descritor é Carbono', () => {
    render(<NanitaLockup width={150} tone="brand" />)
    const paths = svgOf('Nanita Personalizados').querySelectorAll('path')
    expect(paths[0]).toHaveAttribute('fill', '#F1678D')
    expect(paths[1]).toHaveAttribute('fill', '#7E5769')
  })

  it('sobre Grafite o descritor vira Dobra — nunca Carbono', () => {
    // Carbono sobre Grafite dá 2,55:1 e o descritor desaparece. Dobra, 11,72:1.
    render(<NanitaLockup width={150} tone="onInk" />)
    const paths = svgOf('Nanita Personalizados').querySelectorAll('path')
    expect(paths[1]).toHaveAttribute('fill', '#EBDDD7')
    expect(paths[1]).not.toHaveAttribute('fill', '#7E5769')
  })

  it('sobre Grafite o WORDMARK é Carimbo — nunca o próprio Grafite', () => {
    // O defeito que este teste congela: o rodapé pedia `tone="ink"` lendo o nome
    // como "sobre Grafite", e recebia a marca EM Grafite sobre fundo Grafite —
    // 1,00:1. A loja mostrava "PERSONALIZADOS" com um vazio em cima, e a suíte
    // passava porque só o descritor era verificado.
    render(<NanitaLockup width={150} tone="onInk" />)
    const paths = svgOf('Nanita Personalizados').querySelectorAll('path')
    expect(paths[0]).toHaveAttribute('fill', '#F1678D')
    expect(paths[0]).not.toHaveAttribute('fill', '#2E2028')
  })

  it('`ink` é superfície CLARA nos DOIS paths, não meio a meio', () => {
    // A origem do bug era um tom que dizia tinta no wordmark e superfície no
    // descritor. Um tom, um eixo.
    render(<NanitaLockup width={150} tone="ink" />)
    const paths = svgOf('Nanita Personalizados').querySelectorAll('path')
    expect(paths[0]).toHaveAttribute('fill', '#2E2028')
    expect(paths[1]).toHaveAttribute('fill', '#7E5769')
  })

  it(`abaixo de ${LOCKUP_FLOOR}px cai para o wordmark, sem descritor`, () => {
    // O descritor tem 45 unidades de caixa alta em 690: abaixo de 140px ele cai
    // para 9px e deixa de ser texto — vira textura.
    render(<NanitaLockup width={120} />)
    expect(svgOf('Nanita')).toHaveAttribute('viewBox', '0 0 690.06 172.04')
  })

  it('a queda é encadeada: pedir 60px chega no monograma', () => {
    render(<NanitaLockup width={60} />)
    expect(svgOf('Nanita')).toHaveAttribute('viewBox', '0 0 126.87 160.18')
  })
})

describe('nenhuma cor sai partida em vários `<path>`', () => {
  /**
   * O sintoma de subpath separado em elemento próprio é **dois `<path>` com o
   * mesmo `fill` dentro do mesmo `<svg>`**. Aí o contador é pintado por cima do
   * corpo, na mesma cor, e a letra sai maciça — com a geometria intacta.
   *
   * Vale sobre o RENDERIZADO e não sobre o fonte: `NanitaWordmark` tem dois
   * `<path>` no arquivo, em ramos de retorno diferentes, que nunca aparecem
   * juntos na tela.
   */
  const oneElementPerFill = (svg: Element) => {
    const fills = [...svg.querySelectorAll('path')].map((p) => p.getAttribute('fill'))
    expect(new Set(fills).size).toBe(fills.length)
  }

  it('no wordmark', () => {
    render(<NanitaWordmark width={128} />)
    oneElementPerFill(svgOf('Nanita'))
  })

  it('no lockup — duas cores, dois elementos', () => {
    render(<NanitaLockup width={150} />)
    const svg = svgOf('Nanita Personalizados')
    expect(svg.querySelectorAll('path')).toHaveLength(2)
    oneElementPerFill(svg)
  })

  it('no monograma', () => {
    render(<NanitaMonogram height={32} />)
    oneElementPerFill(svgOf('Nanita'))
  })
})

describe('NanitaMonogram', () => {
  it('a largura sai da altura, e o viewBox é o do N', () => {
    render(<NanitaMonogram height={32} />)
    const svg = svgOf('Nanita')
    expect(svg).toHaveAttribute('viewBox', '0 0 126.87 160.18')
    // 32 * (126.87/160.18) = 25,35
    expect(Number(svg.getAttribute('width'))).toBeCloseTo(25.35, 1)
  })

  it('herda a cor do contexto no tom `mono`', () => {
    render(<NanitaMonogram height={32} tone="mono" />)
    expect(svgOf('Nanita').querySelector('path')).toHaveAttribute('fill', 'currentColor')
  })
})
