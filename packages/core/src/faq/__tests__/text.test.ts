import { describe, expect, it } from 'vitest'
import { faqAnswerBlocks, faqAnswerPlainText } from '../text.ts'

/**
 * `FAQL-30` e `FAQL-17` — o formato da resposta, e a prosa que o JSON-LD entrega.
 *
 * O caso que este arquivo existe para travar é o último: `faqAnswerPlainText` **é uma dobra sobre
 * `faqAnswerBlocks`**. Se um dia alguém a reescrever como um segundo interpretador, a loja e o
 * Google passam a ler coisas diferentes — e nada quebra, porque as duas continuam devolvendo
 * string.
 */

describe('faqAnswerBlocks', () => {
  it('linha em branco separa parágrafo', () => {
    expect(faqAnswerBlocks('Primeiro.\n\nSegundo.')).toEqual([
      { kind: 'paragraph', text: 'Primeiro.' },
      { kind: 'paragraph', text: 'Segundo.' },
    ])
  })

  it('linhas seguidas sem linha em branco são UM parágrafo', () => {
    expect(faqAnswerBlocks('Uma frase\nque continua.')).toEqual([
      { kind: 'paragraph', text: 'Uma frase que continua.' },
    ])
  })

  it('linha com `- ` vira item, e itens seguidos colapsam num bloco', () => {
    expect(faqAnswerBlocks('- Leite materno\n- Cabelos\n- Cinzas')).toEqual([
      { kind: 'list', items: ['Leite materno', 'Cabelos', 'Cinzas'] },
    ])
  })

  it('lista entre parágrafos — a forma da resposta de quantidade', () => {
    const resposta = 'A quantidade depende do material.\n\nPara facilitar:\n- Cinzas: 50 ml\n- Leite: 10 ml\n\nCada material tem suas necessidades.'
    expect(faqAnswerBlocks(resposta)).toEqual([
      { kind: 'paragraph', text: 'A quantidade depende do material.' },
      { kind: 'paragraph', text: 'Para facilitar:' },
      { kind: 'list', items: ['Cinzas: 50 ml', 'Leite: 10 ml'] },
      { kind: 'paragraph', text: 'Cada material tem suas necessidades.' },
    ])
  })

  it('o item encerra o parágrafo mesmo sem linha em branco entre os dois', () => {
    expect(faqAnswerBlocks('Para facilitar:\n- Cinzas: 50 ml')).toEqual([
      { kind: 'paragraph', text: 'Para facilitar:' },
      { kind: 'list', items: ['Cinzas: 50 ml'] },
    ])
  })

  it('um item sozinho continua sendo uma lista', () => {
    expect(faqAnswerBlocks('- Único')).toEqual([{ kind: 'list', items: ['Único'] }])
  })

  // A frase de acabamento do catálogo: "Prata 925 - banho de ouro". Tratá-la como item quebraria a
  // resposta sobre molduras, que é a maior das 26.
  it('hífen NO MEIO da linha não é item', () => {
    expect(faqAnswerBlocks('Prata 925 - banho de ouro')).toEqual([
      { kind: 'paragraph', text: 'Prata 925 - banho de ouro' },
    ])
  })

  it('hífen sem espaço depois não é item', () => {
    expect(faqAnswerBlocks('-sem espaço')).toEqual([
      { kind: 'paragraph', text: '-sem espaço' },
    ])
  })

  it('CRLF é lido igual a LF — o checkout no Windows não muda o resultado', () => {
    expect(faqAnswerBlocks('Um.\r\n\r\n- A\r\n- B')).toEqual(faqAnswerBlocks('Um.\n\n- A\n- B'))
  })

  it('texto vazio, só espaço, null e undefined devolvem lista vazia', () => {
    expect(faqAnswerBlocks('')).toEqual([])
    expect(faqAnswerBlocks('   \n\n  ')).toEqual([])
    expect(faqAnswerBlocks(null)).toEqual([])
    expect(faqAnswerBlocks(undefined)).toEqual([])
  })

  it('linhas em branco repetidas não produzem parágrafo vazio', () => {
    expect(faqAnswerBlocks('A.\n\n\n\nB.')).toEqual([
      { kind: 'paragraph', text: 'A.' },
      { kind: 'paragraph', text: 'B.' },
    ])
  })
})

describe('faqAnswerPlainText', () => {
  it('junta parágrafos com linha em branco', () => {
    expect(faqAnswerPlainText('Primeiro.\n\nSegundo.')).toBe('Primeiro.\n\nSegundo.')
  })

  it('o marcador `- ` NÃO sobrevive — ele é a nossa notação, não o texto da dona', () => {
    expect(faqAnswerPlainText('- Leite\n- Cabelos')).toBe('Leite\nCabelos')
    expect(faqAnswerPlainText('- Leite\n- Cabelos')).not.toContain('- ')
  })

  it('mantém a ordem de parágrafos e listas misturados', () => {
    const resposta = 'Para facilitar:\n- Cinzas: 50 ml\n- Leite: 10 ml\n\nCada material tem suas necessidades.'
    expect(faqAnswerPlainText(resposta)).toBe(
      'Para facilitar:\n\nCinzas: 50 ml\nLeite: 10 ml\n\nCada material tem suas necessidades.',
    )
  })

  it('texto vazio devolve string vazia', () => {
    expect(faqAnswerPlainText('')).toBe('')
    expect(faqAnswerPlainText(null)).toBe('')
  })

  // ⚠️ O caso que sustenta o `FAQL-14`. `faqAnswerPlainText` é uma DOBRA sobre `faqAnswerBlocks`:
  // toda palavra que a tela desenha aparece na prosa, e nenhuma outra. Um segundo interpretador
  // passaria nos casos acima e falharia aqui na primeira resposta real.
  it('a prosa contém exatamente o texto dos blocos, sem acrescentar nem perder palavra', () => {
    const resposta = 'Trabalhamos com:\n- Leite materno\n- Cabelos\n\nCada um tem sua técnica.'
    const dosBlocos = faqAnswerBlocks(resposta)
      .flatMap(b => (b.kind === 'paragraph' ? [b.text] : [...b.items]))
      .join(' ')
    const daProsa = faqAnswerPlainText(resposta).split(/\s*\n+\s*/).join(' ')
    expect(daProsa).toBe(dosBlocos)
  })

  // SENSOR: o interpretador ingênuo — trocar quebra por espaço no texto cru — passa a devolver o
  // marcador e cola a lista numa linha só. É exatamente o que uma segunda escrita produziria.
  it('um serializador ingênuo diverge, e é por isso que a dobra existe', () => {
    const resposta = 'Trabalhamos com:\n- Leite materno\n- Cabelos'
    const ingenuo = resposta.replace(/\n/g, ' ')
    expect(ingenuo).toContain('- ')
    expect(faqAnswerPlainText(resposta)).not.toBe(ingenuo)
  })
})
