// Feature `74` · T18 — os chips das visões e a faixa do bloco (`MAP-02`, `MAP-05`..`MAP-07`,
// `MAP-42`, `MAP-45`). A ordem e os rótulos vêm ESCRITOS POR EXTENSO (os de `MAP-07`): derivá-los de
// `ORDER_VIEWS` provaria só que o componente itera a constante.
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { OrderSlice } from '@estrelinha/core/orders'

import ChipsDeRecorte from '../ui/ChipsDeRecorte'
import FaixaDoBloco, { LIMPAR_FILTRO } from '../ui/FaixaDoBloco'

const tokens = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

const ROTULOS = ['Precisa de ação', 'Tudo', 'Fila de material', 'A separar', 'Em trânsito', 'Concluídos']
const IDS = ['precisa-acao', 'tudo', 'fila-material', 'a-separar', 'em-transito', 'concluidos']

const chips = () => screen.getAllByRole('button')
const pressionados = () => chips().filter((c) => c.getAttribute('aria-pressed') === 'true').map((c) => c.textContent)

describe('os seis chips (MAP-07)', () => {
  it('seis, na ordem e com os rótulos de MAP-07', () => {
    render(<ChipsDeRecorte recorte={{ visao: 'precisa-acao' }} aoTrocar={() => {}} />)
    expect(chips().map((c) => c.textContent)).toEqual(ROTULOS)
  })

  it('a faixa rola DENTRO de si: `overflow-x-auto` com `min-w-0`, e os chips não encolhem nem quebram', () => {
    render(<ChipsDeRecorte recorte={{ visao: 'tudo' }} aoTrocar={() => {}} />)
    const faixa = screen.getByTestId('faixa-de-chips')
    expect(tokens(faixa)).toEqual(expect.arrayContaining(['overflow-x-auto', 'min-w-0', 'flex']))
    expect(tokens(faixa)).not.toContain('flex-wrap')
    for (const c of chips()) expect(tokens(c)).toEqual(expect.arrayContaining(['shrink-0', 'min-h-11']))
  })

  it('toda transição tem o par `motion-reduce:` (MAP-45)', () => {
    render(<ChipsDeRecorte recorte={{ visao: 'tudo' }} aoTrocar={() => {}} />)
    for (const c of chips()) {
      const t = tokens(c)
      if (t.some((x) => x.startsWith('transition'))) expect(t).toContain('motion-reduce:transition-none')
    }
    expect(tokens(chips()[0]).some((x) => x.startsWith('transition'))).toBe(true)
  })
})

describe('só o chip do recorte atual está pressionado (MAP-02)', () => {
  it.each(IDS.map((id, i) => [id, ROTULOS[i]]))('visão %s ⇒ só "%s" pressionado', (id, rotulo) => {
    render(<ChipsDeRecorte recorte={{ visao: id } as OrderSlice} aoTrocar={() => {}} />)
    expect(pressionados()).toEqual([rotulo])
    expect(chips().filter((c) => c.getAttribute('aria-pressed') === 'false')).toHaveLength(5)
  })

  it('com um BLOCO no recorte, nenhum chip pressionado (MAP-05)', () => {
    render(<ChipsDeRecorte recorte={{ bloco: 'a-separar' }} aoTrocar={() => {}} />)
    expect(pressionados()).toEqual([])
    expect(chips().every((c) => c.getAttribute('aria-pressed') === 'false')).toBe(true)
  })
})

describe('o toque emite a visão, e quem navega é a página (MAP-06)', () => {
  it.each(IDS.map((id, i) => [ROTULOS[i], id]))('"%s" ⇒ { visao: %s }', (rotulo, id) => {
    const aoTrocar = vi.fn()
    render(<ChipsDeRecorte recorte={{ bloco: 'aguardando' }} aoTrocar={aoTrocar} />)
    fireEvent.click(screen.getByRole('button', { name: rotulo }))
    expect(aoTrocar).toHaveBeenCalledTimes(1)
    expect(aoTrocar).toHaveBeenCalledWith({ visao: id })
  })
})

describe('a faixa do bloco (MAP-05)', () => {
  it.each([
    ['aguardando', 'Filtro: Aguardando material'],
    ['a-separar', 'Filtro: Pago, a separar'],
    ['sem-rastreio', 'Filtro: Enviado sem rastreio'],
    ['pix-aguardando', 'Filtro: Pix aguardando'],
  ] as const)('bloco %s ⇒ "%s"', (bloco, frase) => {
    render(<FaixaDoBloco bloco={bloco} aoTrocar={() => {}} />)
    expect(screen.getByTestId('faixa-do-bloco')).toHaveTextContent(frase)
  })

  it('"Limpar filtro" tem 44 px e emite { visao: "tudo" }', () => {
    const aoTrocar = vi.fn()
    render(<FaixaDoBloco bloco="aguardando" aoTrocar={aoTrocar} />)
    const limpar = screen.getByRole('button', { name: LIMPAR_FILTRO })
    expect(LIMPAR_FILTRO).toBe('Limpar filtro')
    expect(tokens(limpar)).toContain('min-h-11')
    fireEvent.click(limpar)
    expect(aoTrocar).toHaveBeenCalledTimes(1)
    expect(aoTrocar).toHaveBeenCalledWith({ visao: 'tudo' })
  })
})
