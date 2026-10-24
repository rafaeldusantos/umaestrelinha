// Feature `76` · T13 — `CampoDeBusca`, o campo de busca que a lista de pedidos (`74`) e a de clientes
// (`76`) compartilham. O debounce de `BuscaDePedidos` segue provado, sem uma asserção tocada, pelo teste
// dele; aqui entram o que é do campo genérico: as props, o `inicial` e o único comportamento novo
// (`MAC-34`): Enter tira o foco.
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import CampoDeBusca from '../CampoDeBusca'

beforeEach(() => vi.useFakeTimers())
afterEach(() => vi.useRealTimers())

const montar = (extra: { inicial?: string } = {}) => {
  const aoBuscar = vi.fn()
  render(<CampoDeBusca id="busca-x" rotulo="Buscar x" placeholder="Nome ou e-mail" atraso={300} aoBuscar={aoBuscar} {...extra} />)
  const campo = screen.getByRole('searchbox', { name: 'Buscar x' })
  const andar = (ms: number) => act(() => vi.advanceTimersByTime(ms))
  return { aoBuscar, campo, andar }
}

describe('as props viram o campo', () => {
  it('id, rótulo acessível (sr-only), placeholder, role search e 48 px', () => {
    const { campo } = montar()
    expect(campo).toHaveAttribute('id', 'busca-x')
    expect(campo).toHaveAttribute('placeholder', 'Nome ou e-mail')
    expect(screen.getByRole('search')).toBeInTheDocument()
    expect(screen.getByText('Buscar x')).toHaveClass('sr-only')
    expect((campo.getAttribute('class') ?? '').split(/\s+/)).toContain('h-12')
  })
})

describe('o debounce é o `atraso` da prop', () => {
  it('a montagem não emite; nada aos 299 ms; uma emissão aos 300', () => {
    const { aoBuscar, campo, andar } = montar()
    andar(1000)
    expect(aoBuscar).not.toHaveBeenCalled()
    fireEvent.change(campo, { target: { value: 'ana' } })
    andar(299)
    expect(aoBuscar).not.toHaveBeenCalled()
    andar(1)
    expect(aoBuscar).toHaveBeenCalledTimes(1)
    expect(aoBuscar).toHaveBeenCalledWith('ana')
  })

  it('o `inicial` aparece no campo e NÃO é reemitido', () => {
    const { aoBuscar, campo, andar } = montar({ inicial: 'maria' })
    expect(campo).toHaveValue('maria')
    andar(1000)
    expect(aoBuscar).not.toHaveBeenCalled()
  })

  it('apagar o termo emite o vazio (a lista volta ao recorte)', () => {
    const { aoBuscar, campo, andar } = montar({ inicial: 'maria' })
    fireEvent.change(campo, { target: { value: '' } })
    andar(300)
    expect(aoBuscar).toHaveBeenCalledWith('')
  })
})

describe('Enter tira o foco (MAC-34)', () => {
  it('Enter com o campo focado: o campo perde o foco', () => {
    const { campo } = montar()
    campo.focus()
    expect(document.activeElement).toBe(campo)
    fireEvent.keyDown(campo, { key: 'Enter' })
    expect(document.activeElement).not.toBe(campo)
  })

  it('outra tecla não tira o foco', () => {
    const { campo } = montar()
    campo.focus()
    fireEvent.keyDown(campo, { key: 'a' })
    expect(document.activeElement).toBe(campo)
  })

  it('Enter não emite o termo na hora: quem emite é o debounce', () => {
    const { aoBuscar, campo, andar } = montar()
    fireEvent.change(campo, { target: { value: 'ana' } })
    fireEvent.keyDown(campo, { key: 'Enter' })
    expect(aoBuscar).not.toHaveBeenCalled()
    andar(300)
    expect(aoBuscar).toHaveBeenCalledTimes(1)
  })
})

describe('a subida ao topo depois do teclado', () => {
  it('se o foco sai do campo antes da subida, o campo não sobe', () => {
    const { campo, andar } = montar()
    const rolar = vi.fn()
    campo.scrollIntoView = rolar
    act(() => campo.focus())
    act(() => campo.blur())
    andar(400)
    expect(rolar).not.toHaveBeenCalled()
  })

  it('com o foco no campo ele sobe uma vez, aos 300 ms', () => {
    const { campo, andar } = montar()
    const rolar = vi.fn()
    campo.scrollIntoView = rolar
    act(() => campo.focus())
    andar(299)
    expect(rolar).not.toHaveBeenCalled()
    andar(1)
    expect(rolar).toHaveBeenCalledTimes(1)
    expect(rolar).toHaveBeenCalledWith({ block: 'start' })
  })

  it('dois focos seguidos geram UMA subida só', () => {
    const { campo, andar } = montar()
    const rolar = vi.fn()
    campo.scrollIntoView = rolar
    act(() => campo.focus())
    andar(100)
    fireEvent.focus(campo)
    andar(1000)
    expect(rolar).toHaveBeenCalledTimes(1)
  })
})
