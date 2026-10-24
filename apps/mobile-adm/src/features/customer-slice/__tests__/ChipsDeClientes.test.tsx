// Feature `76` · T22 — os chips dos recortes de clientes (`MAC-07`, `MAC-31`). A ordem, os rótulos e os
// ids vêm ESCRITOS POR EXTENSO: derivá-los de `CUSTOMER_SLICES` provaria só que o componente itera a
// constante.
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import ChipsDeClientes from '../ui/ChipsDeClientes'

const tokens = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

const ROTULOS = ['Todas', 'Compraram mais de uma vez', 'Com pedido em aberto']
const IDS = ['todas', 'recorrentes', 'em-aberto'] as const

const chips = () => screen.getAllByRole('button')
const pressionados = () => chips().filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.textContent)

describe('os três chips (MAC-07)', () => {
  it('três, na ordem do protótipo e com os rótulos de `core`', () => {
    render(<ChipsDeClientes recorte="todas" aoTrocar={() => {}} />)
    expect(chips().map((c) => c.textContent)).toEqual(ROTULOS)
  })

  it('a faixa rola DENTRO de si e os chips não encolhem nem quebram (MAC-31)', () => {
    render(<ChipsDeClientes recorte="todas" aoTrocar={() => {}} />)
    const faixa = screen.getByTestId('faixa-de-chips')
    expect(tokens(faixa)).toEqual(expect.arrayContaining(['overflow-x-auto', 'min-w-0', 'flex']))
    expect(tokens(faixa)).not.toContain('flex-wrap')
    for (const c of chips()) expect(tokens(c)).toEqual(expect.arrayContaining(['shrink-0', 'whitespace-nowrap', 'min-h-11']))
  })

  it('o alvo de toque é de 44 px, nunca os 38 do protótipo', () => {
    render(<ChipsDeClientes recorte="todas" aoTrocar={() => {}} />)
    for (const c of chips()) {
      expect(tokens(c)).toContain('min-h-11')
      expect(tokens(c)).not.toContain('h-[38px]')
    }
  })

  it('a afordância de que há mais: uma camada decorativa, sem captar toque', () => {
    render(<ChipsDeClientes recorte="todas" aoTrocar={() => {}} />)
    const camada = screen.getByTestId('afordancia-dos-chips')
    expect(camada.getAttribute('aria-hidden')).toBe('true')
    expect(tokens(camada)).toEqual(expect.arrayContaining(['pointer-events-none', 'absolute', 'right-0']))
    expect(tokens(camada)).toContain('motion-reduce:transition-none')
    // jsdom não mede layout: sem conteúdo além da dobra, a camada está apagada (a medida real é da T32).
    expect(camada.getAttribute('data-visivel')).toBe('false')
    expect(tokens(camada)).toContain('opacity-0')
  })

  it('toda transição tem o par `motion-reduce:`', () => {
    render(<ChipsDeClientes recorte="todas" aoTrocar={() => {}} />)
    for (const c of chips()) {
      const t = tokens(c)
      expect(t.some((x) => x.startsWith('transition'))).toBe(true)
      expect(t).toContain('motion-reduce:transition-none')
    }
  })
})

describe('só o chip do recorte atual está pressionado', () => {
  it.each(IDS.map((id, i) => [id, ROTULOS[i]]))('recorte %s ⇒ só "%s" pressionado', (id, rotulo) => {
    render(<ChipsDeClientes recorte={id as (typeof IDS)[number]} aoTrocar={() => {}} />)
    expect(pressionados()).toEqual([rotulo])
    expect(chips().filter((c) => c.getAttribute('aria-pressed') === 'false')).toHaveLength(2)
  })
})

describe('o toque emite só o id, e quem navega é a página', () => {
  it.each(IDS.map((id, i) => [ROTULOS[i], id]))('"%s" ⇒ %s', (rotulo, id) => {
    const aoTrocar = vi.fn()
    render(<ChipsDeClientes recorte="todas" aoTrocar={aoTrocar} />)
    fireEvent.click(screen.getByRole('button', { name: rotulo }))
    expect(aoTrocar.mock.calls).toEqual([[id]])
  })
})
