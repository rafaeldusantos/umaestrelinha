import { describe, expect, it } from 'vitest'
import { faqPageJsonLd } from '../jsonld.ts'
import { faqAnswerPlainText } from '../text.ts'
import type { FaqPageGroup } from '../types.ts'

/**
 * `FAQL-13` e `FAQL-17` — o `FAQPage` que o buscador (clássico ou de IA) lê.
 *
 * O caso que carrega a feature é o da paridade: o `acceptedAnswer.text` **é** `faqAnswerPlainText`
 * da mesma resposta. Não é "parecido com" nem "derivado de" — é a mesma função, e o teste compara
 * pelas duas saídas reais em vez de reimplementar a esperada.
 */

const grupo = (items: FaqPageGroup['items']): FaqPageGroup => ({
  category: 'sobre',
  label: 'Sobre as joias e a Uma Estrelinha',
  items,
})

const pergunta = (question: string, answer: string) => ({
  id: question,
  question,
  answer,
  overridden: false,
})

describe('faqPageJsonLd', () => {
  it('declara o contexto e o tipo do schema.org', () => {
    const doc = faqPageJsonLd([])
    expect(doc['@context']).toBe('https://schema.org')
    expect(doc['@type']).toBe('FAQPage')
  })

  it('cada pergunta vira Question com acceptedAnswer do tipo Answer', () => {
    const doc = faqPageJsonLd([grupo([pergunta('O que são joias afetivas?', 'São peças.')])])
    expect(doc.mainEntity).toEqual([
      {
        '@type': 'Question',
        name: 'O que são joias afetivas?',
        acceptedAnswer: { '@type': 'Answer', text: 'São peças.' },
      },
    ])
  })

  // ⚠️ O caso que sustenta o FAQL-14 no lado do dado estruturado.
  it('o texto da resposta É `faqAnswerPlainText`, medido pelas duas saídas reais', () => {
    const resposta = 'Para facilitar:\n- Cinzas: 50 ml\n- Leite: 10 ml\n\nCada material varia.'
    const doc = faqPageJsonLd([grupo([pergunta('Quanto enviar?', resposta)])])
    expect(doc.mainEntity[0].acceptedAnswer.text).toBe(faqAnswerPlainText(resposta))
  })

  it('o marcador `- ` não chega ao dado estruturado', () => {
    const doc = faqPageJsonLd([grupo([pergunta('Quais materiais?', '- Leite\n- Cabelos')])])
    expect(doc.mainEntity[0].acceptedAnswer.text).not.toContain('- ')
    expect(doc.mainEntity[0].acceptedAnswer.text).toContain('Leite')
    expect(doc.mainEntity[0].acceptedAnswer.text).toContain('Cabelos')
  })

  // O schema.org não tem nível de assunto dentro de FAQPage — mainEntity é uma lista.
  it('ACHATA os grupos, preservando a ordem da página', () => {
    const doc = faqPageJsonLd([
      grupo([pergunta('A?', 'a')]),
      { category: 'cuidados', label: 'Cuidados com a joia', items: [pergunta('B?', 'b')] },
    ])
    expect(doc.mainEntity.map(q => q.name)).toEqual(['A?', 'B?'])
  })

  it('sem perguntas devolve mainEntity vazio, nunca undefined', () => {
    expect(faqPageJsonLd([]).mainEntity).toEqual([])
    expect(faqPageJsonLd(null).mainEntity).toEqual([])
    expect(faqPageJsonLd(undefined)).toHaveProperty('mainEntity')
  })

  it('inclui a url quando ela é dada', () => {
    expect(faqPageJsonLd([], { url: 'https://x.com.br/perguntas-frequentes' }).url).toBe(
      'https://x.com.br/perguntas-frequentes',
    )
  })

  // URL relativa em dado estruturado é pior que nenhuma: o rastreador a resolve contra a base que
  // ele achar, e o sinal vai para o endereço errado.
  it('omite a url quando ela é vazia ou só espaço', () => {
    expect(faqPageJsonLd([])).not.toHaveProperty('url')
    expect(faqPageJsonLd([], { url: '   ' })).not.toHaveProperty('url')
  })
})
