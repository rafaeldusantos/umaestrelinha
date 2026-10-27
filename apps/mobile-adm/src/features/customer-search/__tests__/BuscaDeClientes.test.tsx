// Feature `76` · T22 — a busca de clientes (`MAC-06`, `MAC-28`, `MAC-34`).
//
// O atraso vem ESCRITO (300 ms, o `SEARCH_DEBOUNCE_MS` de `core` medido no dia): importar a constante
// para medir contra ela deixaria o teste verde com qualquer valor — a lição do `PIX_SLOW_MS` da `58`.
// Um mutante na constante muda o instante da emissão e derruba os casos de 299/300.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import BuscaDeClientes, { PLACEHOLDER_DA_BUSCA_DE_CLIENTES } from '../ui/BuscaDeClientes'

const tokens = (el: Element | null) => (el?.getAttribute('class') ?? '').split(/\s+/).filter(Boolean)

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const Endereco = () => <output data-testid="endereco">{useLocation().search}</output>

const montar = () => {
  const aoBuscar = vi.fn()
  render(
    <MemoryRouter initialEntries={['/clientes?recorte=em-aberto']}>
      <BuscaDeClientes aoBuscar={aoBuscar} />
      <Endereco />
    </MemoryRouter>,
  )
  const campo = screen.getByRole('searchbox', { name: 'Buscar cliente' })
  const digitar = (v: string) => fireEvent.change(campo, { target: { value: v } })
  const andar = (ms: number) => act(() => vi.advanceTimersByTime(ms))
  return { aoBuscar, campo, digitar, andar }
}

describe('o campo (MAC-06, MAC-31)', () => {
  it('rótulo acessível, o placeholder de MAC-06 e a pílula de 46 px do protótipo', () => {
    const { campo } = montar()
    expect(campo).toHaveAttribute('placeholder', 'Nome, e-mail ou telefone')
    expect(PLACEHOLDER_DA_BUSCA_DE_CLIENTES).toBe('Nome, e-mail ou telefone')
    expect(tokens(campo)).toEqual(expect.arrayContaining(['h-[46px]', 'rounded-pill']))
    expect(tokens(campo)).toContain('w-full')
  })

  it('a montagem não emite nada', () => {
    const { aoBuscar, andar } = montar()
    andar(1000)
    expect(aoBuscar).not.toHaveBeenCalled()
  })
})

describe('o termo sai depois de 300 ms sem tecla nova (MAC-06)', () => {
  it('nada a 299 ms; uma emissão aos 300', () => {
    const { aoBuscar, digitar, andar } = montar()
    digitar('ana')
    andar(299)
    expect(aoBuscar).not.toHaveBeenCalled()
    andar(1)
    expect(aoBuscar).toHaveBeenCalledTimes(1)
    expect(aoBuscar).toHaveBeenCalledWith('ana')
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

describe('o termo não vai ao endereço (MAC-28)', () => {
  it('digitar e esperar não muda o `search` da rota', () => {
    const { digitar, andar } = montar()
    digitar('Marina Duarte')
    andar(300)
    expect(screen.getByTestId('endereco').textContent).toBe('?recorte=em-aberto')
  })
})

describe('o campo é o de `CampoDeBusca`, com o id e a cara de clientes (MAC-06, MAC-34)', () => {
  it('id `busca-de-clientes`, tipo de busca e a pílula de 46 px do protótipo', () => {
    const { campo } = montar()
    expect(campo.id).toBe('busca-de-clientes')
    expect(campo).toHaveAttribute('type', 'search')
    expect(campo).toHaveAttribute('inputmode', 'search')
    expect(tokens(campo)).toEqual(expect.arrayContaining(['h-[46px]', 'rounded-pill']))
  })

  it('o `inicial` aparece no campo e não é reemitido', () => {
    const aoBuscar = vi.fn()
    render(
      <MemoryRouter>
        <BuscaDeClientes aoBuscar={aoBuscar} inicial="helena" />
      </MemoryRouter>,
    )
    expect(screen.getByRole('searchbox', { name: 'Buscar cliente' })).toHaveValue('helena')
    act(() => vi.advanceTimersByTime(1000))
    expect(aoBuscar).not.toHaveBeenCalled()
  })

  it('Enter tira o foco do campo (fecha o teclado) sem buscar na hora', () => {
    const { campo, aoBuscar, digitar } = montar()
    campo.focus()
    expect(document.activeElement).toBe(campo)
    digitar('ana')
    fireEvent.keyDown(campo, { key: 'Enter' })
    expect(document.activeElement).not.toBe(campo)
    expect(aoBuscar).not.toHaveBeenCalled()
  })
})
