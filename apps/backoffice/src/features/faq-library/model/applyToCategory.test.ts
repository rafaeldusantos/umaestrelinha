import { describe, expect, it } from 'vitest'
import type { MenuCategory } from '@estrelinha/core/menu'
import { planFaqBatch, type ProductInCategory } from './applyToCategory'

/**
 * `FAQ-35`, `FAQ-36` — o plano do lote.
 *
 * Puro de propósito: é a **mesma** conta que produz a prévia e a gravação. Duas contas fariam o
 * número que a dona confirma divergir do que acontece, e a diferença só apareceria depois de gravado.
 */

const cat = (id: string, parent_id: string | null = null): MenuCategory =>
  ({ id, parent_id, name: id, slug: id, active: true, sort_order: 0 }) as unknown as MenuCategory

/** Árvore real: uma raiz com duas filhas, uma delas com neta. */
const ARVORE = [
  cat('joias'),
  cat('pingentes', 'joias'),
  cat('aneis', 'joias'),
  cat('pingentes-prata', 'pingentes'),
  cat('outra-raiz'),
]

const vinculo = (product_id: string, category_id: string): ProductInCategory => ({
  product_id,
  category_id,
})

describe('planFaqBatch — alcance', () => {
  it('alcança a categoria e TODA a descendência', () => {
    const plano = planFaqBatch(
      ARVORE,
      'joias',
      [
        vinculo('p1', 'joias'),
        vinculo('p2', 'pingentes'),
        vinculo('p3', 'pingentes-prata'),
        vinculo('p4', 'aneis'),
      ],
      new Set(),
    )

    expect(plano.paraGravar).toEqual(['p1', 'p2', 'p3', 'p4'])
    expect(plano.alcancados).toBe(4)
  })

  it('não alcança produto de outra raiz', () => {
    const plano = planFaqBatch(
      ARVORE,
      'joias',
      [vinculo('p1', 'joias'), vinculo('fora', 'outra-raiz')],
      new Set(),
    )

    expect(plano.paraGravar).toEqual(['p1'])
  })

  it('produto em duas categorias do alcance entra UMA vez', () => {
    const plano = planFaqBatch(
      ARVORE,
      'joias',
      [vinculo('p1', 'joias'), vinculo('p1', 'pingentes')],
      new Set(),
    )

    expect(plano.paraGravar).toEqual(['p1'])
    expect(plano.alcancados).toBe(1)
  })

  it('categoria folha alcança só ela', () => {
    const plano = planFaqBatch(
      ARVORE,
      'aneis',
      [vinculo('p1', 'joias'), vinculo('p4', 'aneis')],
      new Set(),
    )

    expect(plano.paraGravar).toEqual(['p4'])
  })
})

describe('planFaqBatch — quem já tem é pulado', () => {
  // Regravar mexeria em `position` e apagaria `answer_override`, que é curadoria da dona.
  it('separa quem recebe de quem já tinha', () => {
    const plano = planFaqBatch(
      ARVORE,
      'joias',
      [vinculo('p1', 'joias'), vinculo('p2', 'pingentes'), vinculo('p3', 'aneis')],
      new Set(['p2']),
    )

    expect(plano.paraGravar).toEqual(['p1', 'p3'])
    expect(plano.jaTinham).toBe(1)
    expect(plano.alcancados).toBe(3)
  })

  it('todos já tendo, a lista de gravação fica vazia', () => {
    const plano = planFaqBatch(
      ARVORE,
      'joias',
      [vinculo('p1', 'joias')],
      new Set(['p1']),
    )

    expect(plano.paraGravar).toEqual([])
    expect(plano.jaTinham).toBe(1)
  })
})

describe('planFaqBatch — bordas', () => {
  it('sem categoria escolhida, plano vazio', () => {
    const plano = planFaqBatch(ARVORE, '', [vinculo('p1', 'joias')], new Set())
    expect(plano).toEqual({ paraGravar: [], jaTinham: 0, alcancados: 0 })
  })

  it('categoria sem produto devolve alcance zero', () => {
    const plano = planFaqBatch(ARVORE, 'outra-raiz', [vinculo('p1', 'joias')], new Set())
    expect(plano.alcancados).toBe(0)
    expect(plano.paraGravar).toEqual([])
  })

  // A prévia e a gravação precisam falar da mesma lista em duas execuções.
  it('a ordem da lista é estável, independente da ordem dos vínculos', () => {
    const a = planFaqBatch(ARVORE, 'joias', [vinculo('pz', 'joias'), vinculo('pa', 'joias')], new Set())
    const b = planFaqBatch(ARVORE, 'joias', [vinculo('pa', 'joias'), vinculo('pz', 'joias')], new Set())

    expect(a.paraGravar).toEqual(['pa', 'pz'])
    expect(b.paraGravar).toEqual(a.paraGravar)
  })
})
