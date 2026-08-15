import { describe, it, expect } from 'vitest'
import { orderSections, reorderSections } from '../order'
import type { HomeSection } from '../types'

/**
 * Ordem e reordenação — `HOME-11` e `HOME-12`.
 *
 * As duas ACs existem por causa da mesma cena: duas admins mexendo na Home ao mesmo tempo. Uma pede
 * que a ordem exibida seja **determinística** mesmo com empate de `position`; a outra, que a gravação
 * seja **absoluta e mínima**, para repetir a chamada não empurrar nada e não sobrescrever o que a
 * outra acabou de salvar.
 */

const secao = (id: string, position: number): HomeSection => ({
  id,
  type: 'banner_grid',
  position,
  active: true,
  config: {},
})

/** Aplica o que `reorderSections` devolveu, como o banco aplicaria. */
const aplicar = (
  sections: readonly HomeSection[],
  patch: { id: string; position: number }[],
): HomeSection[] =>
  sections.map(s => {
    const alvo = patch.find(p => p.id === s.id)
    return alvo ? { ...s, position: alvo.position } : s
  })

describe('orderSections — a ordem exibida (HOME-12)', () => {
  it('ordena por `position`', () => {
    const lista = [secao('c', 3), secao('a', 1), secao('b', 2)]
    expect(orderSections(lista).map(s => s.id)).toEqual(['a', 'b', 'c'])
  })

  it('empate de `position` desempata por `id`', () => {
    const lista = [secao('z', 5), secao('a', 5)]
    expect(orderSections(lista).map(s => s.id)).toEqual(['a', 'z'])
  })

  it('dois carregamentos com a mesma lista embaralhada dão a MESMA ordem', () => {
    // É a AC literal: sem desempate, quem decide entre duas empatadas é o que o banco devolver, e a
    // Home muda de forma entre dois F5.
    const empatadas = [secao('m', 2), secao('d', 2), secao('t', 2), secao('a', 1)]
    const primeiro = orderSections(empatadas).map(s => s.id)
    const segundo = orderSections([...empatadas].reverse()).map(s => s.id)

    expect(primeiro).toEqual(['a', 'd', 'm', 't'])
    expect(segundo).toEqual(primeiro)
  })

  it('não muta a lista recebida', () => {
    const lista = [secao('c', 3), secao('a', 1)]
    orderSections(lista)
    expect(lista.map(s => s.id)).toEqual(['c', 'a'])
  })
})

describe('reorderSections — o que o arraste grava (HOME-11)', () => {
  const lista = [secao('a', 1), secao('b', 2), secao('c', 3), secao('d', 4)]

  it('devolve SÓ as linhas que mudaram de lugar', () => {
    // `d` sobre `b`: `a` fica onde estava e não pode ser reescrita.
    expect(reorderSections(lista, 'd', 'b')).toEqual([
      { id: 'd', position: 2 },
      { id: 'b', position: 3 },
      { id: 'c', position: 4 },
    ])
  })

  it('as posições são absolutas, e produzem a ordem esperada', () => {
    const patch = reorderSections(lista, 'd', 'b')!
    expect(orderSections(aplicar(lista, patch)).map(s => s.id)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('arrastar para baixo também devolve só o intervalo afetado', () => {
    expect(reorderSections(lista, 'a', 'c')).toEqual([
      { id: 'b', position: 1 },
      { id: 'c', position: 2 },
      { id: 'a', position: 3 },
    ])
  })

  it('aplicar o MESMO conjunto duas vezes deixa a Home no mesmo estado', () => {
    // É o que "posições absolutas" compra. Com incremento relativo, a segunda aplicação empurraria a
    // seção de novo — e é o caso de duas admins clicando ao mesmo tempo.
    const patch = reorderSections(lista, 'd', 'b')!
    const umaVez = aplicar(lista, patch)
    const duasVezes = aplicar(umaVez, patch)

    expect(duasVezes).toEqual(umaVez)
    expect(orderSections(duasVezes).map(s => s.id)).toEqual(['a', 'd', 'b', 'c'])
  })

  it('a mesma chamada sobre a mesma lista devolve o mesmo conjunto', () => {
    expect(reorderSections(lista, 'd', 'b')).toEqual(reorderSections(lista, 'd', 'b'))
  })

  it('soltar a seção sobre ela mesma não grava nada', () => {
    expect(reorderSections(lista, 'b', 'b')).toEqual([])
  })

  it('id fora da lista devolve `null`, não uma renumeração sobre dado incompleto', () => {
    expect(reorderSections(lista, 'fantasma', 'b')).toBeNull()
    expect(reorderSections(lista, 'b', 'fantasma')).toBeNull()
  })

  it('não muta a lista recebida', () => {
    reorderSections(lista, 'd', 'b')
    expect(lista.map(s => s.position)).toEqual([1, 2, 3, 4])
  })

  it('lista com `position` esburacada é renumerada de 1 em diante', () => {
    // Estado real depois de apagar uma seção. A gravação absoluta é a que fecha o buraco.
    const esburacada = [secao('a', 10), secao('b', 20), secao('c', 30)]
    expect(reorderSections(esburacada, 'c', 'a')).toEqual([
      { id: 'c', position: 1 },
      { id: 'a', position: 2 },
      { id: 'b', position: 3 },
    ])
  })
})
