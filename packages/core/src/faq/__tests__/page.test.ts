import { describe, expect, it } from 'vitest'
import {
  FAQ_PAGE_CATEGORIES,
  faqPageCategoryLabel,
  faqPageCategoryRefusal,
  resolveFaqPage,
} from '../page.ts'
import type { FaqEntry, FaqPageLink } from '../types.ts'

/**
 * `FAQL-02` e `FAQL-27` — a regra da página de perguntas.
 *
 * As três regras herdadas de `resolveProductFaqs` têm caso próprio aqui, e não por zelo: elas são a
 * razão de a função existir num lugar só. A que mais custa se for esquecida é a segunda — preencher
 * a vaga de uma entrada que saiu do ar poria na página uma pergunta que a dona não escolheu.
 */

const entrada = (over: Partial<FaqEntry> & { id: string }): FaqEntry => ({
  question: 'Uma pergunta?',
  answer: 'Uma resposta.',
  is_active: true,
  ...over,
})

const vinculo = (over: Partial<FaqPageLink> & { faq_id: string }): FaqPageLink => ({
  category: 'sobre',
  position: 0,
  ...over,
})

describe('FAQ_PAGE_CATEGORIES', () => {
  it('são seis assuntos, e a ordem é a da página', () => {
    expect(FAQ_PAGE_CATEGORIES.map(c => c.key)).toEqual([
      'sobre',
      'o-processo',
      'envio-do-material',
      'materiais-e-acabamentos',
      'personalizacao',
      'cuidados',
    ])
  })

  it('todo assunto tem rótulo não vazio', () => {
    for (const { key, label } of FAQ_PAGE_CATEGORIES) {
      expect(label.trim(), `assunto ${key}`).not.toBe('')
    }
  })
})

describe('faqPageCategoryLabel', () => {
  it('devolve o rótulo do assunto conhecido', () => {
    expect(faqPageCategoryLabel('cuidados')).toBe('Cuidados com a joia')
  })

  // Degrada, nunca quebra — mesmo molde de `menuIconKey`.
  it('valor desconhecido devolve o próprio valor, sem lançar', () => {
    expect(faqPageCategoryLabel('inventado')).toBe('inventado')
    expect(faqPageCategoryLabel(null)).toBe('')
  })
})

describe('faqPageCategoryRefusal', () => {
  it('aceita assunto do vocabulário', () => {
    expect(faqPageCategoryRefusal('o-processo')).toBeNull()
  })

  it('recusa assunto vazio cobrando a escolha', () => {
    expect(faqPageCategoryRefusal('  ')).toBe('Escolha um assunto para a pergunta.')
  })

  it('recusa assunto fora do vocabulário, listando os válidos', () => {
    const motivo = faqPageCategoryRefusal('promocoes')
    expect(motivo).toContain('“promocoes” não é um assunto da página')
    expect(motivo).toContain('Cuidados com a joia')
  })

  // `string | null`, nunca união por literal booleano — com strictNullChecks: false aquela não
  // estreita, e ler `.reason` no else é TS2339.
  it('o veredito é string ou null, nunca objeto', () => {
    expect(faqPageCategoryRefusal('sobre')).toBeNull()
    expect(typeof faqPageCategoryRefusal('x')).toBe('string')
  })
})

describe('resolveFaqPage', () => {
  it('agrupa por assunto, na ordem da página — não na ordem dos vínculos', () => {
    const grupos = resolveFaqPage(
      [
        vinculo({ faq_id: 'c', category: 'cuidados', faq: entrada({ id: 'c', question: 'C?' }) }),
        vinculo({ faq_id: 'a', category: 'sobre', faq: entrada({ id: 'a', question: 'A?' }) }),
      ],
    )
    expect(grupos.map(g => g.category)).toEqual(['sobre', 'cuidados'])
    expect(grupos[0].label).toBe('Sobre as joias e a Uma Estrelinha')
  })

  it('dentro do assunto, ordena por position', () => {
    const grupos = resolveFaqPage([
      vinculo({ faq_id: 'b', position: 2, faq: entrada({ id: 'b', question: 'Segunda?' }) }),
      vinculo({ faq_id: 'a', position: 1, faq: entrada({ id: 'a', question: 'Primeira?' }) }),
    ])
    expect(grupos[0].items.map(i => i.question)).toEqual(['Primeira?', 'Segunda?'])
  })

  // Sem o desempate, duas leituras da mesma página podem trocar perguntas de lugar — e "a página
  // mudou sozinha" é o defeito que ninguém consegue reproduzir.
  it('position empatada desempata por faq_id, de forma estável', () => {
    const links = [
      vinculo({ faq_id: 'zz', position: 1, faq: entrada({ id: 'zz', question: 'Z?' }) }),
      vinculo({ faq_id: 'aa', position: 1, faq: entrada({ id: 'aa', question: 'A?' }) }),
    ]
    expect(resolveFaqPage(links)[0].items.map(i => i.id)).toEqual(['aa', 'zz'])
    expect(resolveFaqPage([...links].reverse())[0].items.map(i => i.id)).toEqual(['aa', 'zz'])
  })

  it('PULA a entrada inativa, e não preenche a vaga', () => {
    const grupos = resolveFaqPage([
      vinculo({ faq_id: 'a', position: 1, faq: entrada({ id: 'a', question: 'Viva?' }) }),
      vinculo({ faq_id: 'b', position: 2, faq: entrada({ id: 'b', is_active: false }) }),
    ])
    expect(grupos[0].items).toHaveLength(1)
    expect(grupos[0].items[0].question).toBe('Viva?')
  })

  it('PULA o vínculo órfão — a entrada veio null pela RLS', () => {
    const grupos = resolveFaqPage([vinculo({ faq_id: 'sumida', faq: null })])
    expect(grupos).toEqual([])
  })

  it('assunto que ficou sem pergunta ativa SOME do resultado', () => {
    const grupos = resolveFaqPage([
      vinculo({ faq_id: 'a', category: 'sobre', faq: entrada({ id: 'a' }) }),
      vinculo({ faq_id: 'b', category: 'cuidados', faq: entrada({ id: 'b', is_active: false }) }),
    ])
    expect(grupos.map(g => g.category)).toEqual(['sobre'])
  })

  it('usa a resposta própria quando ela existe, e marca overridden', () => {
    const grupos = resolveFaqPage([
      vinculo({
        faq_id: 'a',
        answer_override: 'A resposta longa da página.',
        faq: entrada({ id: 'a', answer: 'A curta do produto.' }),
      }),
    ])
    expect(grupos[0].items[0].answer).toBe('A resposta longa da página.')
    expect(grupos[0].items[0].overridden).toBe(true)
  })

  it('resposta própria só de espaço cai no padrão da biblioteca', () => {
    const grupos = resolveFaqPage([
      vinculo({ faq_id: 'a', answer_override: '   ', faq: entrada({ id: 'a', answer: 'O padrão.' }) }),
    ])
    expect(grupos[0].items[0].answer).toBe('O padrão.')
    expect(grupos[0].items[0].overridden).toBe(false)
  })

  // ⚠️ A pergunta é normalizada; a RESPOSTA não pode ser. Colapsar espaço apagaria a linha em branco
  // que separa parágrafo, e as 26 respostas virariam um bloco só na tela.
  it('preserva as quebras de parágrafo da resposta', () => {
    const grupos = resolveFaqPage([
      vinculo({ faq_id: 'a', faq: entrada({ id: 'a', answer: 'Primeiro.\n\nSegundo.' }) }),
    ])
    expect(grupos[0].items[0].answer).toBe('Primeiro.\n\nSegundo.')
  })

  it('a entrada pode vir por mapa, e não só pelo embed', () => {
    const grupos = resolveFaqPage(
      [vinculo({ faq_id: 'a' })],
      [entrada({ id: 'a', question: 'Do mapa?' })],
    )
    expect(grupos[0].items[0].question).toBe('Do mapa?')
  })

  it('entrada sem pergunta ou sem resposta nenhuma não vira linha em branco', () => {
    expect(resolveFaqPage([vinculo({ faq_id: 'a', faq: entrada({ id: 'a', question: '  ' }) })])).toEqual([])
    expect(resolveFaqPage([vinculo({ faq_id: 'b', faq: entrada({ id: 'b', answer: '  ' }) })])).toEqual([])
  })

  it('lista vazia, null e undefined devolvem lista vazia', () => {
    expect(resolveFaqPage([])).toEqual([])
    expect(resolveFaqPage(null)).toEqual([])
    expect(resolveFaqPage(undefined)).toEqual([])
  })

  // O `check` da migration torna isto impossível pelo caminho normal; o caso existe para travar o
  // comportamento escolhido — some, em vez de aparecer sob um título que ninguém escolheu.
  it('colocação com assunto fora do vocabulário não é renderizada', () => {
    expect(resolveFaqPage([vinculo({ faq_id: 'a', category: 'inventado', faq: entrada({ id: 'a' }) })])).toEqual([])
  })
})
