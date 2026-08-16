import { describe, expect, it } from 'vitest'
import { extractFaqPairs, faqBlockRange, hasFaqBlock, stripFaqBlock } from '../block'
import {
  DESCRICAO_ARRANJO_A,
  DESCRICAO_ARRANJO_B,
  DESCRICAO_FAQ_NO_FIM,
  DESCRICAO_SEM_FAQ,
} from '../__fixtures__/descriptions'

/**
 * `FAQ-05`, `FAQ-06`, `FAQ-21`, `FAQ-22`, `FAQ-23` — a fronteira do bloco.
 *
 * As fixtures são descrições **reais** do catálogo, uma de cada arranjo medido. O teste que importa
 * de verdade é o do **arranjo B**: o padrão ingênuo lê 1 par onde há 6, e foi assim que a medição
 * inicial desta feature perdeu 312 pares antes de ser corrigida.
 */

describe('faqBlockRange', () => {
  it('acha o bloco e o fecha no próximo heading de mesmo nível', () => {
    const range = faqBlockRange(DESCRICAO_ARRANJO_A)

    expect(range).not.toBeNull()
    expect(DESCRICAO_ARRANJO_A.slice(range.start)).toMatch(/^<h3>Perguntas frequentes<\/h3>/)
    expect(DESCRICAO_ARRANJO_A.slice(range.end)).toMatch(/^<h3>Observações importantes<\/h3>/)
    expect(range.inner).not.toContain('Observações importantes')
  })

  // O caso dos 2 produtos do catálogo em que o FAQ é o último bloco.
  it('vai até o fim do texto quando não há heading depois', () => {
    const range = faqBlockRange(DESCRICAO_FAQ_NO_FIM)
    expect(range.end).toBe(DESCRICAO_FAQ_NO_FIM.length)
  })

  it('devolve null quando não há bloco', () => {
    expect(faqBlockRange(DESCRICAO_SEM_FAQ)).toBeNull()
    expect(faqBlockRange('')).toBeNull()
    expect(faqBlockRange(null)).toBeNull()
    expect(faqBlockRange(undefined)).toBeNull()
  })

  it('reconhece o título em qualquer caixa e com acento codificado', () => {
    expect(faqBlockRange('<h3>PERGUNTAS FREQUENTES</h3><p>x</p>')).not.toBeNull()
    expect(faqBlockRange('<h2>Perguntas Frequentes</h2><p>x</p>')).not.toBeNull()
  })

  // Estrito de propósito: errar para menos deixa o texto visível, que é o desfecho seguro.
  it('não reconhece um título diferente', () => {
    expect(faqBlockRange('<h3>Dúvidas frequentes</h3><p>x</p>')).toBeNull()
  })

  it('um heading de nível MAIOR dentro do bloco não o fecha', () => {
    const html = '<h2>Perguntas frequentes</h2><h3>Sobre envio</h3><p>x</p><h2>Outra coisa</h2>'
    const range = faqBlockRange(html)

    expect(range.inner).toContain('Sobre envio')
    expect(range.inner).not.toContain('Outra coisa')
  })

  // Chamar duas vezes tem de dar o mesmo resultado — o `lastIndex` de uma RegExp global no escopo
  // do módulo faria a segunda chamada começar do meio do texto anterior.
  it('é estável entre chamadas', () => {
    expect(faqBlockRange(DESCRICAO_ARRANJO_A)).toEqual(faqBlockRange(DESCRICAO_ARRANJO_A))
  })
})

describe('extractFaqPairs — arranjo A (um <p> por par)', () => {
  const pares = extractFaqPairs(DESCRICAO_ARRANJO_A)

  it('lê os 3 pares', () => {
    expect(pares).toHaveLength(3)
  })

  it('lê pergunta e resposta como texto', () => {
    expect(pares[0]).toEqual({
      question: 'Essa corrente combina com os pingentes afetivos da Uma Estrelinha?',
      answer:
        'Sim! Essa corrente foi pensada para usar com pingentes e joias afetivas da Uma Estrelinha, mas também pode ser usada sozinha.',
    })
  })

  it('preserva a ordem da descrição', () => {
    expect(pares.map(p => p.question)).toEqual([
      'Essa corrente combina com os pingentes afetivos da Uma Estrelinha?',
      'O pingente já vem incluso?',
      'O Aço Inoxidável escurece com o uso?',
    ])
  })

  it('não pega nada de fora do bloco', () => {
    expect(pares.some(p => /Observações|Especificações/.test(p.question + p.answer))).toBe(false)
  })
})

describe('extractFaqPairs — arranjo B (todos num <p> só)', () => {
  const pares = extractFaqPairs(DESCRICAO_ARRANJO_B)

  // A asserção central desta feature. Com o padrão `<p><strong>…</strong><br/>…</p>` isto dá 1.
  it('lê os 6 pares, e não 1', () => {
    expect(pares).toHaveLength(6)
  })

  it('decodifica as entidades da resposta', () => {
    expect(pares[0].answer).toBe(
      'Após a compra, você recebe as instruções para enviar seu material com segurança. Cada peça é feita à mão, com cuidado e respeito. Envio para todo o Brasil.',
    )
    expect(pares[0].answer).not.toContain('&')
  })

  it('a resposta de um par não invade o par seguinte', () => {
    expect(pares[1].question).toBe('A prata pode escurecer ou perder o brilho?')
    expect(pares[0].answer).not.toContain('prata pode escurecer')
  })

  it('o último par para no </p> e não engole o heading seguinte', () => {
    expect(pares[5].question).toBe('A joia acompanha corrente ou pulseira?')
    expect(pares[5].answer).toBe(
      'Não — essa peça é vendida separadamente da corrente ou pulseira, para você escolher o comprimento e o material que preferir.',
    )
  })

  it('nenhuma resposta traz tag', () => {
    expect(pares.every(p => !/[<>]/.test(p.answer))).toBe(true)
  })
})

describe('extractFaqPairs — bordas', () => {
  it('devolve [] sem bloco, com texto vazio e com nulo', () => {
    expect(extractFaqPairs(DESCRICAO_SEM_FAQ)).toEqual([])
    expect(extractFaqPairs('')).toEqual([])
    expect(extractFaqPairs(null)).toEqual([])
  })

  it('devolve [] quando o bloco tem só prosa, sem par', () => {
    expect(extractFaqPairs('<h3>Perguntas frequentes</h3><p>Fale com a gente pelo WhatsApp.</p>')).toEqual([])
  })

  it('descarta par sem pergunta ou sem resposta', () => {
    const html = '<h3>Perguntas frequentes</h3><p><strong> </strong><br />Resposta órfã.</p><p><strong>Pergunta órfã?</strong><br /> </p>'
    expect(extractFaqPairs(html)).toEqual([])
  })

  it('não lança com HTML malformado', () => {
    expect(() => extractFaqPairs('<h3>Perguntas frequentes</h3><p><strong>P?</strong><br />R')).not.toThrow()
    expect(extractFaqPairs('<h3>Perguntas frequentes</h3><p><strong>P?</strong><br />R')).toEqual([
      { question: 'P?', answer: 'R' },
    ])
  })
})

describe('hasFaqBlock', () => {
  it('é verdadeiro só quando há bloco COM par', () => {
    expect(hasFaqBlock(DESCRICAO_ARRANJO_A)).toBe(true)
    expect(hasFaqBlock(DESCRICAO_ARRANJO_B)).toBe(true)
    expect(hasFaqBlock(DESCRICAO_SEM_FAQ)).toBe(false)
    expect(hasFaqBlock('<h3>Perguntas frequentes</h3><p>Só prosa.</p>')).toBe(false)
  })
})

describe('stripFaqBlock', () => {
  it('tira o bloco inteiro do arranjo A', () => {
    const limpo = stripFaqBlock(DESCRICAO_ARRANJO_A)

    expect(limpo).not.toContain('Perguntas frequentes')
    expect(limpo).not.toContain('Essa corrente combina com os pingentes')
    expect(limpo).not.toContain('O pingente já vem incluso')
  })

  it('tira o bloco inteiro do arranjo B, com as 6 perguntas', () => {
    const limpo = stripFaqBlock(DESCRICAO_ARRANJO_B)

    expect(limpo).not.toContain('Perguntas frequentes')
    for (const par of extractFaqPairs(DESCRICAO_ARRANJO_B)) {
      expect(limpo).not.toContain(par.question)
    }
  })

  it('preserva Especificações e Observações importantes', () => {
    const limpo = stripFaqBlock(DESCRICAO_ARRANJO_A)

    expect(limpo).toContain('Especificações')
    expect(limpo).toContain('Modelo: Veneziana')
    expect(limpo).toContain('Observações importantes')
    expect(limpo).toContain('A peça exibida nas fotos é ilustrativa')
  })

  it('preserva o título e a abertura do produto', () => {
    const limpo = stripFaqBlock(DESCRICAO_ARRANJO_B)

    expect(limpo).toContain('Joia Afetiva Sol com Leite Materno')
    expect(limpo).toContain('Aceita: leite materno')
  })

  it('remove até o fim quando o FAQ é o último bloco', () => {
    const limpo = stripFaqBlock(DESCRICAO_FAQ_NO_FIM)

    expect(limpo).not.toContain('Perguntas frequentes')
    expect(limpo).toContain('Um berloque para a sua pulseira.')
  })

  // `FAQ-06`: heading sem par é texto da dona, e sai da tela sem ninguém ter pedido.
  it('NÃO remove bloco sem par extraível', () => {
    const html = '<h3>Perguntas frequentes</h3><p>Fale com a gente pelo WhatsApp.</p>'
    expect(stripFaqBlock(html)).toBe(html)
  })

  it('devolve o texto idêntico quando não há bloco', () => {
    expect(stripFaqBlock(DESCRICAO_SEM_FAQ)).toBe(DESCRICAO_SEM_FAQ)
  })

  it('vazio e nulo devolvem string vazia, sem lançar', () => {
    expect(stripFaqBlock('')).toBe('')
    expect(stripFaqBlock(null)).toBe('')
    expect(stripFaqBlock(undefined)).toBe('')
  })

  it('é idempotente — remover duas vezes dá o mesmo texto', () => {
    const uma = stripFaqBlock(DESCRICAO_ARRANJO_B)
    expect(stripFaqBlock(uma)).toBe(uma)
  })
})
