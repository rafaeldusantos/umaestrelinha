import { describe, expect, it } from 'vitest'
import {
  faqLinkKey,
  faqLinkKeyFromSegment,
  faqQuestionPath,
  faqQuestionSegment,
  faqQuestionSlug,
  findFaqBySegment,
} from '../link'

/**
 * O endereço próprio de cada pergunta. Dois consumidores o escrevem — a página (canonical e o link
 * de compartilhar) e o sitemap —, e é por isso que ele mora aqui.
 */

const CINZAS = { id: '3f9a1c2e-0000-4000-8000-000000000001', question: 'Quanto de cinzas preciso enviar?' }

describe('faqQuestionSlug — o texto do endereço', () => {
  it('minúsculas, sem acento, palavras por hífen, sem pontuação nas pontas', () => {
    expect(faqQuestionSlug('Não uso joias. Posso fazer outra peça?')).toBe(
      'nao-uso-joias-posso-fazer-outra-peca',
    )
    expect(faqQuestionSlug('  ¿Cuidados — com a joia?! ')).toBe('cuidados-com-a-joia')
  })

  it('corta no limite de palavra, nunca no meio dela', () => {
    const longa = 'Quanto tempo leva para a minha joia ficar pronta depois que o material chega ao ateliê?'
    const slug = faqQuestionSlug(longa)
    expect(slug.length).toBeLessThanOrEqual(60)
    expect(longa.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()).toContain(
      slug.split('-').at(-1)!,
    )
    expect(slug).not.toMatch(/-$/)
    expect(slug).toBe('quanto-tempo-leva-para-a-minha-joia-ficar-pronta-depois-que')
  })

  it('texto vazio vira vazio', () => {
    expect(faqQuestionSlug('')).toBe('')
    expect(faqQuestionSlug(null)).toBe('')
    expect(faqQuestionSlug('?!')).toBe('')
  })
})

describe('faqQuestionPath — o endereço canônico', () => {
  it('é a página de perguntas + texto + os 8 primeiros caracteres do id', () => {
    expect(faqQuestionPath(CINZAS)).toBe('/perguntas-frequentes/quanto-de-cinzas-preciso-enviar-3f9a1c2e')
  })

  it('pergunta sem texto aproveitável vira só a chave — nunca um hífen solto', () => {
    expect(faqQuestionSegment({ id: CINZAS.id, question: '?' })).toBe('3f9a1c2e')
  })

  it('a chave sai do id sem hífen e em minúsculas', () => {
    expect(faqLinkKey('3F9A-1C2E-AAAA')).toBe('3f9a1c2e')
  })
})

describe('findFaqBySegment — a pergunta que o endereço pede', () => {
  const OUTRA = { id: '7b2d4e6f-0000-4000-8000-000000000002', question: 'Como envio o leite?' }

  it('acha pela chave, e o texto não importa — corrigir a pergunta não quebra o link enviado', () => {
    expect(findFaqBySegment([OUTRA, CINZAS], 'quanto-de-cinzas-preciso-enviar-3f9a1c2e')).toBe(CINZAS)
    expect(findFaqBySegment([OUTRA, CINZAS], 'texto-antigo-qualquer-3f9a1c2e')).toBe(CINZAS)
    expect(findFaqBySegment([OUTRA, CINZAS], '3f9a1c2e')).toBe(CINZAS)
  })

  it('aceita o segmento como o navegador o entrega, codificado e em maiúsculas', () => {
    expect(findFaqBySegment([CINZAS], 'Quanto%20de-3F9A1C2E')).toBe(CINZAS)
  })

  it('sem chave válida no fim, não acha nada', () => {
    expect(faqLinkKeyFromSegment('quanto-de-cinzas')).toBeNull()
    expect(faqLinkKeyFromSegment('quanto-3f9a1c2')).toBeNull()
    expect(faqLinkKeyFromSegment('quanto-3f9a1c2z')).toBeNull()
    expect(findFaqBySegment([CINZAS], 'quanto-de-cinzas')).toBeNull()
    expect(findFaqBySegment([CINZAS], null)).toBeNull()
  })

  it('chave que não existe não acha nada', () => {
    expect(findFaqBySegment([CINZAS], 'apagada-deadbeef')).toBeNull()
  })

  it('duas perguntas com a mesma chave: nenhuma — abrir a errada é pior que abrir nenhuma', () => {
    const gemea = { id: '3f9a1c2e-ffff-4000-8000-000000000009', question: 'Outra' }
    expect(findFaqBySegment([CINZAS, gemea], '3f9a1c2e')).toBeNull()
  })

  it('o endereço que `faqQuestionPath` escreve é o que `findFaqBySegment` lê', () => {
    const segmento = faqQuestionPath(CINZAS).split('/').at(-1)
    expect(findFaqBySegment([OUTRA, CINZAS], segmento)).toBe(CINZAS)
  })
})
