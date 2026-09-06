import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import RouteFallback from '../RouteFallback'

/**
 * `PRF-10` AC 1: o fallback do `Suspense` **não pode causar deslocamento de layout**.
 *
 * jsdom devolve 0 para toda medida — então o que se prova aqui é a DECLARAÇÃO de altura, não a
 * altura resultante. A prova de que a página não pula é de navegador, em 390 e 1440.
 */

describe('RouteFallback — o vazio que não desloca (PRF-10)', () => {
  it('reserva altura em vez de encolher para zero', () => {
    // Sem reserva, o rodapé sobe até o topo e desce de volta quando o chunk chega: no celular isso
    // é a página inteira pulando a cada navegação.
    const { container } = render(<RouteFallback />)

    expect(container.firstElementChild!.className).toContain('min-h-[60vh]')
  })

  it('anuncia que está ocupado, e não que está vazio', () => {
    const { container } = render(<RouteFallback />)

    expect(container.firstElementChild!.getAttribute('aria-busy')).toBe('true')
  })

  it('não escreve nada: "carregando" apareceria e sumiria em 40 ms', () => {
    const { container } = render(<RouteFallback />)

    expect(container.textContent).toBe('')
  })
})
