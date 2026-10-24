// Feature `74` · T19 — a busca de pedidos (`MAP-10`, `MAP-11`, `MAP-42`, A13).
//
// O atraso vem ESCRITO (300 ms, o `SEARCH_DEBOUNCE_MS` de `core` medido no dia): importar a constante
// para medir contra ela deixaria o teste verde com qualquer valor — a lição do `PIX_SLOW_MS` da `58`.
// Um mutante na constante muda o instante da emissão e derruba os casos de 299/300.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import BuscaDePedidos, { PLACEHOLDER_DA_BUSCA } from '../ui/BuscaDePedidos'

const tokens = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const Endereco = () => <output data-testid="endereco">{useLocation().search}</output>

const montar = () => {
  const aoBuscar = vi.fn()
  render(
    <MemoryRouter initialEntries={['/pedidos?visao=tudo']}>
      <BuscaDePedidos aoBuscar={aoBuscar} />
      <Endereco />
    </MemoryRouter>,
  )
  const campo = screen.getByRole('searchbox', { name: 'Buscar pedido' })
  const digitar = (v: string) => fireEvent.change(campo, { target: { value: v } })
  const andar = (ms: number) => act(() => vi.advanceTimersByTime(ms))
  return { aoBuscar, campo, digitar, andar }
}

describe('o campo (MAP-10, MAP-42)', () => {
  it('rótulo acessível, o placeholder do protótipo e 48 px', () => {
    const { campo } = montar()
    expect(campo).toHaveAttribute('placeholder', 'Número, nome, e-mail ou rastreio')
    expect(PLACEHOLDER_DA_BUSCA).toBe('Número, nome, e-mail ou rastreio')
    expect(tokens(campo)).toContain('h-12')
    expect(tokens(campo)).toContain('w-full')
  })

  it('a montagem não emite nada', () => {
    const { aoBuscar, andar } = montar()
    andar(1000)
    expect(aoBuscar).not.toHaveBeenCalled()
  })
})

describe('o termo sai depois de 300 ms sem tecla nova (MAP-11)', () => {
  it('nada a 299 ms; uma emissão aos 300', () => {
    const { aoBuscar, digitar, andar } = montar()
    digitar('0244')
    andar(299)
    expect(aoBuscar).not.toHaveBeenCalled()
    andar(1)
    expect(aoBuscar).toHaveBeenCalledTimes(1)
    expect(aoBuscar).toHaveBeenCalledWith('0244')
  })

  it('várias teclas seguidas: UMA emissão, com o último texto, 300 ms depois da ÚLTIMA', () => {
    const { aoBuscar, digitar, andar } = montar()
    digitar('M')
    andar(200)
    digitar('Ma')
    andar(200)
    digitar('Mar')
    andar(299)
    expect(aoBuscar).not.toHaveBeenCalled()
    andar(1)
    expect(aoBuscar.mock.calls).toEqual([['Mar']])
  })

  it('apagar tudo emite o termo vazio (a lista volta a ser sem busca)', () => {
    const { aoBuscar, digitar, andar } = montar()
    digitar('Marina')
    andar(300)
    digitar('')
    andar(300)
    expect(aoBuscar.mock.calls).toEqual([['Marina'], ['']])
  })

  it('voltar ao mesmo texto antes do prazo não emite de novo', () => {
    const { aoBuscar, digitar, andar } = montar()
    digitar('Marina')
    andar(300)
    digitar('Marin')
    andar(100)
    digitar('Marina')
    andar(300)
    expect(aoBuscar.mock.calls).toEqual([['Marina']])
  })
})

describe('o termo não vai ao endereço (A13)', () => {
  it('digitar e esperar não muda o `search` da rota', () => {
    const { digitar, andar } = montar()
    digitar('Marina Duarte')
    andar(300)
    expect(screen.getByTestId('endereco').textContent).toBe('?visao=tudo')
  })
})
