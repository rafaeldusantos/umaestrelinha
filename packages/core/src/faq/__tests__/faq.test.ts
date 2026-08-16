import { describe, expect, it } from 'vitest'
import {
  FAQ_ANSWER_MAX,
  FAQ_QUESTION_MAX,
  LATIN1_ENTITY_NAMES,
  decodeHtmlEntities,
  faqQuestionKey,
  faqRefusal,
  normalizeFaqText,
} from '../faq'

/**
 * `FAQ-11`, `FAQ-12`, `FAQ-23` — a chave, os limites e a decodificação.
 *
 * As entradas dos testes de entidade são **cópias literais do catálogo real**: as 15 entidades que
 * aparecem no corpus foram medidas no banco em 2026-08-16, com contagem
 * (`&ccedil;` 8.301 · `&atilde;` 6.357 · `&eacute;` 3.751 · … · `&Aacute;` 1).
 */

describe('decodeHtmlEntities', () => {
  // As 15 medidas no corpus, com a contagem de cada uma ao lado — se uma parar de decodificar, a
  // cliente lê `&ccedil;` na resposta.
  const MEDIDAS: readonly [string, string][] = [
    ['&ccedil;', 'ç'],
    ['&atilde;', 'ã'],
    ['&eacute;', 'é'],
    ['&otilde;', 'õ'],
    ['&ecirc;', 'ê'],
    ['&agrave;', 'à'],
    ['&oacute;', 'ó'],
    ['&mdash;', '—'],
    ['&uacute;', 'ú'],
    ['&aacute;', 'á'],
    ['&iacute;', 'í'],
    ['&Eacute;', 'É'],
    ['&nbsp;', ' '],
    ['&acirc;', 'â'],
    ['&Aacute;', 'Á'],
  ]

  it('decodifica as 15 entidades medidas no catálogo real', () => {
    expect(MEDIDAS).toHaveLength(15)
    for (const [entidade, caractere] of MEDIDAS) {
      expect(decodeHtmlEntities(entidade)).toBe(caractere)
    }
  })

  it('decodifica uma resposta real inteira', () => {
    expect(
      decodeHtmlEntities(
        'Essa pe&ccedil;a aceita cinzas de crema&ccedil;&atilde;o (humana ou pet), leite materno.',
      ),
    ).toBe('Essa peça aceita cinzas de cremação (humana ou pet), leite materno.')
  })

  it('a tabela Latin-1 cobre os 96 codepoints da faixa, na ordem', () => {
    expect(LATIN1_ENTITY_NAMES).toHaveLength(96)
    expect(LATIN1_ENTITY_NAMES[0]).toBe('nbsp')
    expect(LATIN1_ENTITY_NAMES[95]).toBe('yuml')
    expect(decodeHtmlEntities('&yuml;')).toBe('ÿ')
    expect(decodeHtmlEntities('&Ccedil;')).toBe('Ç')
  })

  it('decodifica os cinco básicos', () => {
    expect(decodeHtmlEntities('&amp;&lt;&gt;&quot;&apos;')).toBe('&<>"\'')
  })

  // O caso que um decodificador de dois passes erra: `&amp;` primeiro e varredura de novo faria
  // `&amp;lt;` virar `<`, apagando o literal que a dona escreveu.
  it('é passe único: `&amp;lt;` sai como o literal `&lt;`, não como `<`', () => {
    expect(decodeHtmlEntities('&amp;lt;')).toBe('&lt;')
    expect(decodeHtmlEntities('a &amp;amp; b')).toBe('a &amp; b')
  })

  it('decodifica numérica decimal e hexadecimal', () => {
    expect(decodeHtmlEntities('&#233;')).toBe('é')
    expect(decodeHtmlEntities('&#xE9;')).toBe('é')
    expect(decodeHtmlEntities('&#X2014;')).toBe('—')
  })

  it('deixa intacta a entidade que não conhece, e não lança', () => {
    expect(decodeHtmlEntities('&naoexiste;')).toBe('&naoexiste;')
    expect(decodeHtmlEntities('&#0;')).toBe('&#0;')
    expect(decodeHtmlEntities('&#99999999;')).toBe('&#99999999;')
    expect(decodeHtmlEntities('& isolado')).toBe('& isolado')
  })

  it('trata entrada nula como texto vazio', () => {
    expect(decodeHtmlEntities(null as unknown as string)).toBe('')
    expect(decodeHtmlEntities(undefined as unknown as string)).toBe('')
  })
})

describe('normalizeFaqText', () => {
  it('colapsa espaço e corta as pontas', () => {
    expect(normalizeFaqText('  a   b \n c  ')).toBe('a b c')
  })

  // `\s` do JavaScript cobre U+00A0 — é o que permite decodificar `&nbsp;` fielmente.
  it('colapsa o espaço não separável que veio de `&nbsp;`', () => {
    expect(normalizeFaqText('a  b')).toBe('a b')
  })

  it('vazio e nulo devolvem string vazia', () => {
    expect(normalizeFaqText('   ')).toBe('')
    expect(normalizeFaqText(null)).toBe('')
    expect(normalizeFaqText(undefined)).toBe('')
  })
})

describe('faqQuestionKey', () => {
  it('decodifica, tira acento, minusculiza e colapsa espaço', () => {
    expect(faqQuestionKey('As joias s&atilde;o realmente feitas &agrave; m&atilde;o?')).toBe(
      'as joias sao realmente feitas a mao',
    )
  })

  // O caso real: a mesma pergunta aparece no catálogo nas duas grafias (380 usos codificada, 37
  // já decodificada). Sem a chave, viravam duas entradas na biblioteca.
  it('dá a MESMA chave para as duas grafias da mesma pergunta do catálogo', () => {
    expect(faqQuestionKey('As joias s&atilde;o realmente feitas &agrave; m&atilde;o?')).toBe(
      faqQuestionKey('As joias são realmente feitas à mão?'),
    )
  })

  it('corta a pontuação final', () => {
    expect(faqQuestionKey('O anel é ajustável?')).toBe('o anel e ajustavel')
    expect(faqQuestionKey('O anel é ajustável')).toBe('o anel e ajustavel')
    expect(faqQuestionKey('O anel é ajustável?!')).toBe('o anel e ajustavel')
    expect(faqQuestionKey('O anel é ajustável...')).toBe('o anel e ajustavel')
  })

  it('não corta pontuação do meio', () => {
    expect(faqQuestionKey('Chega em 10 dias. E depois?')).toBe('chega em 10 dias. e depois')
  })

  it('remove tag e preserva o texto dela', () => {
    expect(faqQuestionKey('<strong>Como envio meu material de DNA?</strong>')).toBe(
      'como envio meu material de dna',
    )
  })

  it('vazio e nulo devolvem string vazia', () => {
    expect(faqQuestionKey('')).toBe('')
    expect(faqQuestionKey('   ')).toBe('')
    expect(faqQuestionKey(null)).toBe('')
  })
})

describe('faqRefusal', () => {
  it('aceita um par válido', () => {
    expect(faqRefusal('O anel é ajustável?', 'Sim, dentro de dois números.')).toBeNull()
  })

  it('os limites são 160 e 600 — os máximos medidos (94 e 370) com folga', () => {
    expect(FAQ_QUESTION_MAX).toBe(160)
    expect(FAQ_ANSWER_MAX).toBe(600)
  })

  it('recusa pergunta vazia', () => {
    expect(faqRefusal('   ', 'resposta')).toBe('A pergunta não pode ficar vazia.')
  })

  it('recusa resposta vazia', () => {
    expect(faqRefusal('pergunta', '  ')).toBe('A resposta não pode ficar vazia.')
  })

  it('recusa pergunta acima de 160, dizendo o tamanho', () => {
    expect(faqRefusal('a'.repeat(161), 'resposta')).toBe(
      'A pergunta tem 161 caracteres e o limite é 160.',
    )
    expect(faqRefusal('a'.repeat(160), 'resposta')).toBeNull()
  })

  it('recusa resposta acima de 600, dizendo o tamanho', () => {
    expect(faqRefusal('pergunta', 'a'.repeat(601))).toBe(
      'A resposta tem 601 caracteres e o limite é 600.',
    )
    expect(faqRefusal('pergunta', 'a'.repeat(600))).toBeNull()
  })

  // O limite é medido DEPOIS de colapsar o espaço — senão um texto colado com quebras contaria
  // caracteres que a tela não mostra.
  it('mede o limite sobre o texto normalizado', () => {
    expect(faqRefusal(`   ${'a'.repeat(160)}   `, 'resposta')).toBeNull()
  })

  it('devolve string ou null, nunca objeto — o formato que `strictNullChecks: false` exige', () => {
    const recusa = faqRefusal('', '')
    expect(typeof recusa === 'string' || recusa === null).toBe(true)
  })
})
