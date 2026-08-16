import { describe, expect, it } from 'vitest'
import { faqOverrideOf, resolveProductFaqs } from '../faq'
import type { FaqEntry, ProductFaqLink } from '../types'

/**
 * `FAQ-01`, `FAQ-03`, `FAQ-04` — a resolução, que é o **leitor único** de `answer_override`.
 *
 * As três regras que esta função concentra existem separadas em nenhum lugar de propósito: cada tela
 * que as reimplementasse teria a chance de esquecer uma, e a que some primeiro é sempre a terceira
 * ("a vaga que sobra fica vazia").
 */

const entrada = (over: Partial<FaqEntry> = {}): FaqEntry => ({
  id: 'f1',
  question: 'O anel é ajustável?',
  answer: 'Sim, dentro de dois números.',
  is_active: true,
  ...over,
})

const vinculo = (over: Partial<ProductFaqLink> = {}): ProductFaqLink => ({
  faq_id: 'f1',
  position: 0,
  answer_override: null,
  ...over,
})

describe('resolveProductFaqs — ordem', () => {
  it('ordena por `position` ascendente, não pela ordem de chegada', () => {
    const links = [
      vinculo({ faq_id: 'c', position: 2 }),
      vinculo({ faq_id: 'a', position: 0 }),
      vinculo({ faq_id: 'b', position: 1 }),
    ]
    const entries = ['a', 'b', 'c'].map(id => entrada({ id, question: `P ${id}`, answer: `R ${id}` }))

    expect(resolveProductFaqs(links, entries).map(f => f.id)).toEqual(['a', 'b', 'c'])
  })

  // Sem desempate, duas leituras da mesma página poderiam trocar duas perguntas de lugar.
  it('desempata por `faq_id` quando o `position` empata', () => {
    const links = [vinculo({ faq_id: 'z', position: 0 }), vinculo({ faq_id: 'a', position: 0 })]
    const entries = ['a', 'z'].map(id => entrada({ id, question: `P ${id}`, answer: `R ${id}` }))

    expect(resolveProductFaqs(links, entries).map(f => f.id)).toEqual(['a', 'z'])
    expect(resolveProductFaqs([...links].reverse(), entries).map(f => f.id)).toEqual(['a', 'z'])
  })
})

describe('resolveProductFaqs — a vaga que sobra fica vazia', () => {
  it('pula o vínculo cujo embed veio `null` (entrada inativa pela RLS)', () => {
    const links = [
      vinculo({ faq_id: 'a', position: 0, faq: entrada({ id: 'a', question: 'P a', answer: 'R a' }) }),
      vinculo({ faq_id: 'b', position: 1, faq: null }),
      vinculo({ faq_id: 'c', position: 2, faq: entrada({ id: 'c', question: 'P c', answer: 'R c' }) }),
    ]

    expect(resolveProductFaqs(links).map(f => f.id)).toEqual(['a', 'c'])
  })

  it('pula o vínculo cuja entrada não está no mapa', () => {
    const links = [vinculo({ faq_id: 'a' }), vinculo({ faq_id: 'sumiu', position: 1 })]
    expect(resolveProductFaqs(links, [entrada({ id: 'a' })]).map(f => f.id)).toEqual(['a'])
  })

  it('pula o vínculo cuja entrada está `is_active: false`', () => {
    const links = [vinculo({ faq_id: 'a', faq: entrada({ id: 'a', is_active: false }) })]
    expect(resolveProductFaqs(links)).toEqual([])
  })

  // A regra da feature 24 aplicada aqui: pular NÃO é substituir.
  it('não preenche a vaga com outra pergunta', () => {
    const links = [
      vinculo({ faq_id: 'a', position: 0, faq: null }),
      vinculo({ faq_id: 'b', position: 1, faq: entrada({ id: 'b', question: 'P b', answer: 'R b' }) }),
    ]
    const resolvidas = resolveProductFaqs(links)

    expect(resolvidas).toHaveLength(1)
    expect(resolvidas[0].id).toBe('b')
  })

  it('pula entrada sem pergunta e entrada sem resposta nenhuma', () => {
    const links = [
      vinculo({ faq_id: 'a', position: 0, faq: entrada({ id: 'a', question: '   ' }) }),
      vinculo({ faq_id: 'b', position: 1, faq: entrada({ id: 'b', answer: '  ' }) }),
    ]
    expect(resolveProductFaqs(links)).toEqual([])
  })

  it('entrada sem resposta padrão mas COM resposta própria sobrevive', () => {
    const links = [
      vinculo({ faq_id: 'b', faq: entrada({ id: 'b', answer: '' }), answer_override: 'A resposta desta peça.' }),
    ]
    expect(resolveProductFaqs(links)).toEqual([
      { id: 'b', question: 'O anel é ajustável?', answer: 'A resposta desta peça.', overridden: true },
    ])
  })
})

describe('resolveProductFaqs — a resposta', () => {
  it('usa a resposta da biblioteca quando não há resposta própria', () => {
    expect(resolveProductFaqs([vinculo()], [entrada()])).toEqual([
      {
        id: 'f1',
        question: 'O anel é ajustável?',
        answer: 'Sim, dentro de dois números.',
        overridden: false,
      },
    ])
  })

  it('usa a resposta própria quando ela existe', () => {
    const resolvidas = resolveProductFaqs(
      [vinculo({ answer_override: 'Esta peça é de tamanho fixo.' })],
      [entrada()],
    )
    expect(resolvidas[0].answer).toBe('Esta peça é de tamanho fixo.')
    expect(resolvidas[0].overridden).toBe(true)
  })

  it('resposta própria só de espaço cai no padrão', () => {
    const resolvidas = resolveProductFaqs([vinculo({ answer_override: '   ' })], [entrada()])
    expect(resolvidas[0].answer).toBe('Sim, dentro de dois números.')
    expect(resolvidas[0].overridden).toBe(false)
  })

  it('resposta própria idêntica ao padrão não se marca como própria', () => {
    const resolvidas = resolveProductFaqs(
      [vinculo({ answer_override: '  Sim, dentro de dois números.  ' })],
      [entrada()],
    )
    expect(resolvidas[0].overridden).toBe(false)
  })

  it('normaliza o espaço da pergunta e da resposta', () => {
    const resolvidas = resolveProductFaqs(
      [vinculo()],
      [entrada({ question: '  O anel   é ajustável?  ', answer: 'Sim,\n  dentro de dois números.' })],
    )
    expect(resolvidas[0].question).toBe('O anel é ajustável?')
    expect(resolvidas[0].answer).toBe('Sim, dentro de dois números.')
  })
})

describe('resolveProductFaqs — entradas de borda', () => {
  it('aceita as entradas como Map ou como lista', () => {
    const mapa = new Map([['f1', entrada()]])
    expect(resolveProductFaqs([vinculo()], mapa)).toEqual(resolveProductFaqs([vinculo()], [entrada()]))
  })

  it('lista vazia, nula e indefinida devolvem []', () => {
    expect(resolveProductFaqs([])).toEqual([])
    expect(resolveProductFaqs(null)).toEqual([])
    expect(resolveProductFaqs(undefined)).toEqual([])
  })

  it('não muta a lista recebida', () => {
    const links = [vinculo({ faq_id: 'b', position: 1 }), vinculo({ faq_id: 'a', position: 0 })]
    resolveProductFaqs(links, [entrada({ id: 'a' }), entrada({ id: 'b' })])
    expect(links.map(l => l.faq_id)).toEqual(['b', 'a'])
  })
})

describe('faqOverrideOf', () => {
  it('devolve null para resposta própria vazia', () => {
    expect(faqOverrideOf('', 'padrão')).toBeNull()
    expect(faqOverrideOf('   ', 'padrão')).toBeNull()
    expect(faqOverrideOf(null, 'padrão')).toBeNull()
  })

  // Gravar o idêntico daria DOIS donos do mesmo texto: editar a biblioteca deixaria de alcançar
  // aquele produto, e nada na tela diria por quê.
  it('devolve null quando a resposta própria é igual ao padrão', () => {
    expect(faqOverrideOf('padrão', 'padrão')).toBeNull()
    expect(faqOverrideOf('  padrão  ', 'padrão')).toBeNull()
  })

  it('devolve o texto normalizado quando ele difere do padrão', () => {
    expect(faqOverrideOf('  outra   resposta ', 'padrão')).toBe('outra resposta')
  })
})
