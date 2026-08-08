import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  EstrelinhaLockup,
  EstrelinhaSignature,
  EstrelinhaSymbol,
  LOCKUP_FLOOR,
  SIGNATURE_FLOOR,
  SYMBOL_FLOOR,
} from '..'
import { LOCKUP, SIGNATURE, SYMBOL, SYMBOL_TINY } from '../paths'

/**
 * A marca em vetor, contra `IDN-05`.
 *
 * O que estes testes guardam é a **escada de redução**. Ela é invisível num
 * code review: uma assinatura pedida a 120px renderiza sem erro nenhum e sai
 * com 0,64px de traço — uma linha cinza de antialias onde deveria estar a cor
 * da marca. O componente não tem como avisar; o teste tem.
 */

const marca = () => screen.getByRole('img', { name: 'Uma Estrelinha' })

describe('EstrelinhaSignature — o degrau do chrome', () => {
  it('é SVG inline com nome acessível', () => {
    // Inline e não `<img src>`: a marca do header não pode ter estado de
    // carregamento nem 404 possível, e `currentColor` só funciona inline.
    render(<EstrelinhaSignature width={202} />)
    const svg = marca()
    expect(svg.tagName.toLowerCase()).toBe('svg')
    expect(svg).toHaveAttribute('viewBox', SIGNATURE.viewBox)
  })

  it('a altura sai da largura pela proporção 4,61:1', () => {
    render(<EstrelinhaSignature width={202} />)
    // 202 / (450.06/97.64) = 43,82
    expect(Number(marca().getAttribute('height'))).toBeCloseTo(43.82, 1)
  })

  it('emite um `<path>` por papel de traço, com a espessura do desenho', () => {
    // A espessura é geometria nesta marca. Um `<path>` a menos apaga um pedaço
    // inteiro do logo sem erro nenhum.
    render(<EstrelinhaSignature width={202} />)
    const paths = [...marca().querySelectorAll('path')]
    expect(paths).toHaveLength(SIGNATURE.strokes.length)
    expect(paths.map((p) => Number(p.getAttribute('stroke-width')))).toEqual(
      SIGNATURE.strokes.map((s) => s.width),
    )
  })

  it('todo traço é traço — `fill="none"`, nunca preenchimento', () => {
    render(<EstrelinhaSignature width={202} />)
    for (const path of marca().querySelectorAll('path')) {
      expect(path).toHaveAttribute('fill', 'none')
    }
  })

  it.each([
    ['brand', '#283A4A'],
    ['onInk', '#F7F3EC'],
    ['accent', '#B8945F'],
    ['mono', 'currentColor'],
  ] as const)('o tom `%s` pinta o traço em %s', (tone, stroke) => {
    render(<EstrelinhaSignature width={202} tone={tone} />)
    for (const path of marca().querySelectorAll('path')) {
      expect(path).toHaveAttribute('stroke', stroke)
    }
  })

  it(`em ${SIGNATURE_FLOOR}px ainda renderiza a assinatura`, () => {
    render(<EstrelinhaSignature width={SIGNATURE_FLOOR} />)
    expect(marca()).toHaveAttribute('viewBox', SIGNATURE.viewBox)
  })

  it(`abaixo de ${SIGNATURE_FLOOR}px cai para o símbolo`, () => {
    // A 150px o traço da marca teria 0,80px e a linha viraria cinza. É o
    // tamanho que o header do celular pede.
    render(<EstrelinhaSignature width={150} />)
    expect(marca()).toHaveAttribute('viewBox', SYMBOL.viewBox)
  })

  it('a queda preserva a ALTURA, não a largura', () => {
    // Passar a largura adiante devolveria um símbolo 4,6x mais alto que a
    // assinatura que ele substitui, e o header pularia de altura.
    render(<EstrelinhaSignature width={150} />)
    // 150 / 4,61 = 32,54 — o símbolo é quadrado, então largura = altura.
    expect(Number(marca().getAttribute('width'))).toBeCloseTo(32.54, 1)
  })
})

describe('EstrelinhaLockup — o degrau de e-mail e embalagem', () => {
  const lockup = () => screen.getByRole('img', { name: 'Uma Estrelinha — Eternizando suas lembranças' })

  it('tem nome acessível próprio, que diz a assinatura', () => {
    render(<EstrelinhaLockup width={LOCKUP_FLOOR} />)
    expect(lockup()).toHaveAttribute('viewBox', LOCKUP.viewBox)
    expect(lockup().querySelectorAll('path')).toHaveLength(LOCKUP.strokes.length)
  })

  it(`abaixo de ${LOCKUP_FLOOR}px cai para a assinatura, sem a linha de baixo`, () => {
    // A assinatura tem traço 1,5 em 900 de largura: a 400px ela rende 0,67px e
    // vira uma sombra cinza sob a tipografia.
    render(<EstrelinhaLockup width={400} />)
    expect(marca()).toHaveAttribute('viewBox', SIGNATURE.viewBox)
  })

  it('a queda é encadeada: pedir 150px chega no símbolo', () => {
    render(<EstrelinhaLockup width={150} />)
    expect(marca()).toHaveAttribute('viewBox', SYMBOL.viewBox)
  })
})

describe('EstrelinhaSymbol — o degrau que troca de arte', () => {
  it('a largura é o lado, e o viewBox é o do símbolo', () => {
    render(<EstrelinhaSymbol size={64} />)
    const svg = marca()
    expect(svg).toHaveAttribute('viewBox', SYMBOL.viewBox)
    expect(Number(svg.getAttribute('width'))).toBe(64)
    expect(Number(svg.getAttribute('height'))).toBe(64)
  })

  it(`em ${SYMBOL_FLOOR}px ainda usa o símbolo completo`, () => {
    // "Use de 48px para cima" — a nota da prancha `734-0`. A 48px o traço de
    // 2,46% rende 1,18px, que é o piso de legibilidade desta identidade.
    render(<EstrelinhaSymbol size={SYMBOL_FLOOR} />)
    expect(marca().querySelectorAll('path')).toHaveLength(SYMBOL.strokes.length)
  })

  it(`abaixo de ${SYMBOL_FLOOR}px TROCA de arte, em vez de encolher`, () => {
    // "Abaixo de 32px o símbolo completo vira mancha: as pétalas e as fagulhas
    // fecham." A redução guarda lua e estrela, com traço 8,0.
    render(<EstrelinhaSymbol size={30} />)
    const paths = marca().querySelectorAll('path')
    expect(paths).toHaveLength(SYMBOL_TINY.strokes.length)
    expect(paths[0]).toHaveAttribute('d', SYMBOL_TINY.strokes[0].d)
    expect(paths[0]).toHaveAttribute('stroke-width', String(SYMBOL_TINY.strokes[0].width))
  })

  it('a arte pequena não é a grande encolhida', () => {
    render(<EstrelinhaSymbol size={30} />)
    expect(marca().querySelector('path')).not.toHaveAttribute('d', SYMBOL.strokes[0].d)
  })

  it('herda a cor do contexto no tom `mono`', () => {
    render(<EstrelinhaSymbol size={64} tone="mono" />)
    expect(marca().querySelector('path')).toHaveAttribute('stroke', 'currentColor')
  })
})

describe('a escada é a razão de header e rodapé mostrarem marcas diferentes', () => {
  it('a MESMA chamada, em duas larguras, rende dois desenhos', () => {
    // É o comportamento esperado, não inconsistência: o header do celular pede
    // 150px e o do desktop 202px, e só o segundo está acima do piso de 190.
    const { unmount } = render(<EstrelinhaSignature width={150} />)
    expect(marca()).toHaveAttribute('viewBox', SYMBOL.viewBox)
    unmount()

    render(<EstrelinhaSignature width={202} />)
    expect(marca()).toHaveAttribute('viewBox', SIGNATURE.viewBox)
  })

  it('nenhum degrau renderiza a marca abaixo de 1px de traço', () => {
    // A conta que define os três pisos, escrita uma vez: espessura sobre a
    // largura do viewBox, vezes o piso, tem de dar pelo menos 1px.
    const magro = (art: typeof LOCKUP) => Math.min(...art.strokes.map((s) => s.width))
    const largura = (art: typeof LOCKUP) => Number(art.viewBox.split(/\s+/)[2])

    // O lockup é medido pelo traço ESTRUTURAL mais fino, que é a assinatura.
    expect((magro(LOCKUP) / largura(LOCKUP)) * LOCKUP_FLOOR).toBeGreaterThanOrEqual(1)
    // Na assinatura os losangos são ornamento e o board os aceita sub-pixel; o
    // que manda é a marca — o segundo traço mais fino.
    expect((SIGNATURE.strokes[0].width / largura(SIGNATURE)) * SIGNATURE_FLOOR).toBeGreaterThanOrEqual(1)
    expect((SYMBOL.strokes[0].width / largura(SYMBOL)) * SYMBOL_FLOOR).toBeGreaterThanOrEqual(1)
  })
})
