import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { LIVE_CHART_FROM, LIVE_CHART_TO, LIVE_WINDOW_LINE } from '@estrelinha/core/live'
import { presenca } from '@/test/presenca'
import AgoraNaLoja from '../ui/AgoraNaLoja'
import NoCelular from '../ui/NoCelular'

/**
 * Os rótulos de bloco e o tom do bloco escuro, pelo protótipo da Loja ao vivo. jsdom não calcula
 * fonte nem cor: a régua é o token exato da classe (`text-white/80` não casa `text-white/80x`).
 */
const tokens = (el: Element) => (el.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)
const temToken = (el: Element, t: string) => tokens(el).includes(t)

const leitura = { dado: presenca(), falhou: false, tentarDeNovo: () => {} }

describe('os rótulos de bloco na fonte do corpo', () => {
  it('"Agora na loja" é h2 em font-body 11/600, caixa alta, .1em', () => {
    render(<AgoraNaLoja leitura={leitura} />)
    const h2 = screen.getByRole('heading', { level: 2, name: 'Agora na loja' })
    for (const t of ['font-body', 'text-[11px]', 'font-semibold', 'uppercase', 'tracking-[.1em]']) {
      expect(temToken(h2, t), t).toBe(true)
    }
    expect(tokens(h2).some((t) => t === 'font-display')).toBe(false)
  })

  it('"No celular" é h2 em font-body 11/600, caixa alta, .1em', () => {
    render(<NoCelular leitura={leitura} />)
    const h2 = screen.getByRole('heading', { level: 2, name: 'No celular' })
    for (const t of ['font-body', 'text-[11px]', 'font-semibold', 'uppercase', 'tracking-[.1em]']) {
      expect(temToken(h2, t), t).toBe(true)
    }
  })
})

describe('o tom do bloco escuro', () => {
  it('rótulo e frase em branco a 80 %, legendas a 62 %, barras antigas a 12 %, o de agora em accent', () => {
    render(<AgoraNaLoja leitura={leitura} />)
    const bloco = screen.getByTestId('bloco-agora-na-loja')

    const h2 = within(bloco).getByRole('heading', { level: 2 })
    expect(temToken(h2, 'text-white/80')).toBe(true)

    const frase = within(bloco).getByText((_, el) => el?.tagName === 'SPAN' && (el.textContent ?? '').endsWith(LIVE_WINDOW_LINE))
    expect(temToken(frase, 'text-white/80')).toBe(true)

    const legendaDe = within(bloco).getByText(LIVE_CHART_FROM)
    expect(legendaDe.textContent).toBe(LIVE_CHART_FROM)
    expect(temToken(within(bloco).getByText(LIVE_CHART_TO).parentElement!, 'text-white/[.62]')).toBe(true)
    expect(temToken(legendaDe.parentElement!, 'text-white/[.62]')).toBe(true)

    const barras = Array.from(within(bloco).getByTestId('grafico-30-min').children)
    expect(barras).toHaveLength(30)
    const antigas = barras.slice(0, -1)
    for (const b of antigas) {
      expect(temToken(b, 'bg-white/[.12]')).toBe(true)
      expect(temToken(b, 'bg-estrelinha-accent')).toBe(false)
    }
    expect(temToken(barras[29], 'bg-estrelinha-accent')).toBe(true)
    expect(temToken(barras[29], 'bg-white/[.12]')).toBe(false)

    expect(temToken(screen.getByTestId('numero-ao-vivo'), 'text-estrelinha-accent')).toBe(true)
  })

  it('nenhum resto do creme translúcido de antes no bloco', () => {
    const { container } = render(<AgoraNaLoja leitura={leitura} />)
    const todas = Array.from(container.querySelectorAll('[class]')).flatMap(tokens)
    expect(todas.filter((t) => /^(text|bg)-estrelinha-on-primary\/\d+$/.test(t))).toEqual([])
  })
})
