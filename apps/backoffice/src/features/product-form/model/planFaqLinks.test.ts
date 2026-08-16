import { describe, expect, it } from 'vitest'
import { planFaqLinks, type ProductFaqSelection } from './planFaqLinks'

/**
 * `FAQ-16`, `FAQ-17`, `FAQ-37` — o diff dos vínculos de pergunta.
 *
 * Espelho de `planCategoryLinks`, e as duas armadilhas são as mesmas: **todos** os presentes vão no
 * upsert (senão reordenar não chega ao banco) e duplicata é colapsada (senão a PK composta recusa).
 * A terceira é só desta tabela: resposta própria idêntica ao padrão vira `null`.
 */

const sel = (faq_id: string, over: Partial<ProductFaqSelection> = {}): ProductFaqSelection => ({
  faq_id,
  ...over,
})

describe('planFaqLinks — ordem e posição', () => {
  it('a posição é o índice da seleção', () => {
    const plano = planFaqLinks([sel('a'), sel('b'), sel('c')], [])

    expect(plano.toUpsert.map(l => [l.faq_id, l.position])).toEqual([
      ['a', 0],
      ['b', 1],
      ['c', 2],
    ])
  })

  // Sem regravar todos, reordenar não chegaria ao banco e a loja mostraria a ordem antiga.
  it('TODOS os presentes vão no upsert, não só os novos', () => {
    const plano = planFaqLinks([sel('b'), sel('a')], ['a', 'b'])

    expect(plano.toUpsert.map(l => l.faq_id)).toEqual(['b', 'a'])
    expect(plano.toDelete).toEqual([])
  })
})

describe('planFaqLinks — o que sai', () => {
  it('o que estava salvo e saiu da seleção vai para `toDelete`', () => {
    const plano = planFaqLinks([sel('a')], ['a', 'b', 'c'])
    expect(plano.toDelete).toEqual(['b', 'c'])
  })

  it('esvaziar a seleção apaga tudo', () => {
    const plano = planFaqLinks([], ['a', 'b'])

    expect(plano.toUpsert).toEqual([])
    expect(plano.toDelete).toEqual(['a', 'b'])
  })
})

describe('planFaqLinks — duplicata', () => {
  // A PK `(product_id, faq_id)` recusa — foi o que derrubou a primeira execução real do importador.
  it('a mesma pergunta duas vezes vira uma linha, e vence a primeira', () => {
    const plano = planFaqLinks(
      [sel('a', { answer_override: 'primeira' }), sel('b'), sel('a', { answer_override: 'segunda' })],
      [],
    )

    expect(plano.toUpsert.map(l => l.faq_id)).toEqual(['a', 'b'])
    expect(plano.toUpsert[0].answer_override).toBe('primeira')
  })

  it('faq_id vazio é descartado', () => {
    const plano = planFaqLinks([sel(''), sel('a')], [])
    expect(plano.toUpsert.map(l => l.faq_id)).toEqual(['a'])
  })
})

describe('planFaqLinks — a resposta própria', () => {
  it('sem resposta própria, grava `null`', () => {
    const plano = planFaqLinks([sel('a', { defaultAnswer: 'Padrão.' })], [])
    expect(plano.toUpsert[0].answer_override).toBeNull()
  })

  it('resposta própria diferente do padrão é gravada', () => {
    const plano = planFaqLinks(
      [sel('a', { answer_override: 'Só nesta peça.', defaultAnswer: 'Padrão.' })],
      [],
    )
    expect(plano.toUpsert[0].answer_override).toBe('Só nesta peça.')
  })

  // Gravar o idêntico daria dois donos do mesmo texto: editar a biblioteca deixaria de alcançar este
  // produto, e nada na tela diria por quê.
  it('resposta própria IGUAL ao padrão vira `null`', () => {
    const plano = planFaqLinks(
      [sel('a', { answer_override: '  Padrão.  ', defaultAnswer: 'Padrão.' })],
      [],
    )
    expect(plano.toUpsert[0].answer_override).toBeNull()
  })

  it('resposta própria só de espaço vira `null`', () => {
    const plano = planFaqLinks(
      [sel('a', { answer_override: '   ', defaultAnswer: 'Padrão.' })],
      [],
    )
    expect(plano.toUpsert[0].answer_override).toBeNull()
  })
})
