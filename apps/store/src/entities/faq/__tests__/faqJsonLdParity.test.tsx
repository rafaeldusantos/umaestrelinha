import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { faqPageJsonLd, type FaqPageGroup } from '@estrelinha/core/faq'
import FaqAnswer from '../ui/FaqAnswer'

/**
 * `FAQL-14` — o que o buscador lê é o que a cliente lê.
 *
 * **Medido pelas DUAS serializações reais**: de um lado o `acceptedAnswer.text` que
 * `faqPageJsonLd` produz, do outro o texto que o `FaqAnswer` **renderiza no DOM**. Nenhum dos dois
 * é reimplementado aqui — uma reimplementação provaria que o teste sabe fazer a conta, não que as
 * duas superfícies concordam. É o molde de `shoppingParity.test.ts`, que existe porque o Merchant
 * Center reprova oferta cujo preço do feed discorda da landing page.
 *
 * A família de defeito é a mesma, com uma diferença que a torna pior: ninguém reprova. O buscador
 * simplesmente passa a citar um texto que a loja não mostra — e quem cita com mais avidez é
 * justamente o buscador de IA, que esta página existe para atender.
 */

/** O que um leitor humano lê na tela, com os blocos separados por quebra — como a prosa do JSON-LD. */
const textoRenderizado = (answer: string): string => {
  const { container } = render(<FaqAnswer answer={answer} />)
  return [...container.querySelectorAll('p, li')]
    .map(no => no.textContent?.trim() ?? '')
    .filter(t => t !== '')
    .join('\n')
}

/** O texto que o dado estruturado declara, achatado da mesma forma. */
const textoDoJsonLd = (answer: string): string => {
  const grupo: FaqPageGroup = {
    category: 'sobre',
    label: 'Sobre',
    items: [{ id: 'x', question: 'Uma pergunta?', answer, overridden: false }],
  }
  return faqPageJsonLd([grupo]).mainEntity[0].acceptedAnswer.text.replace(/\n+/g, '\n').trim()
}

/** As formas reais que as 26 respostas da dona usam. */
const RESPOSTAS: [string, string][] = [
  ['um parágrafo', 'Joias afetivas são peças criadas para eternizar histórias.'],
  [
    'vários parágrafos',
    'O prazo depende do modelo escolhido.\n\nPara a maioria, são 15 dias.\n\nO prazo de cada produto fica na página da peça.',
  ],
  [
    'lista depois de parágrafo',
    'Para facilitar:\n- Cinzas de cremação: cerca de 50 ml\n- Leite materno: 10 ml\n- Cabelos e pelos: uma pequena mecha',
  ],
  [
    'lista entre parágrafos — a resposta de acabamentos, a maior das 26',
    'Os materiais da parte metálica variam.\n\nVocê pode escolher a moldura:\n- Moldura folheada: metal de alta fusão, sem níquel\n- Prata 925: prata, banho de ouro, ródio ou ouro rosé\n- Aço inoxidável: resistente e prático\n\nConsulte a descrição da joia escolhida.',
  ],
  ['frase com hífen no meio, que não é lista', 'Prata 925 - banho de ouro é uma das opções.'],
]

describe('paridade entre o JSON-LD e a tela', () => {
  it.each(RESPOSTAS)('%s', (_nome, resposta) => {
    expect(textoDoJsonLd(resposta)).toBe(textoRenderizado(resposta))
  })

  // A régua é o marcador NO COMEÇO DA LINHA, não a sequência "- " em qualquer lugar: o hífen de
  // "Prata 925 - banho de ouro" é prosa da dona e **tem** de sobreviver. Foi essa distinção que a
  // primeira escrita deste caso errou, acusando a resposta de acabamentos.
  it('nenhuma delas leva o MARCADOR de lista para o dado estruturado', () => {
    for (const [nome, resposta] of RESPOSTAS) {
      expect(textoDoJsonLd(resposta), nome).not.toMatch(/^-\s/m)
    }
  })

  it('mas o hífen no meio da frase sobrevive nos dois lados', () => {
    const [, comHifen] = RESPOSTAS[4]
    expect(textoDoJsonLd(comHifen)).toContain('Prata 925 - banho de ouro')
    expect(textoRenderizado(comHifen)).toContain('Prata 925 - banho de ouro')
  })

  // ⚠️ SENSOR. Sem ele, os casos acima passariam com QUALQUER implementação que por acaso
  // coincidisse nas cinco formas medidas. O serializador ingênuo — trocar quebra por espaço no
  // texto cru — é exatamente o que uma segunda escrita produziria, e ele reprova aqui.
  it('um serializador ingênuo REPROVA na mesma régua', () => {
    const [, comLista] = RESPOSTAS[2]
    const ingenuo = comLista.replace(/\n+/g, ' ')

    expect(ingenuo).not.toBe(textoRenderizado(comLista))
    // E o ingênuo carrega o marcador que o dono único consome.
    expect(ingenuo).toContain('- Cinzas')
  })

  // A âncora: sem ela, um seletor errado devolveria string vazia dos dois lados e a paridade
  // passaria sobre nada — a falha silenciosa que toda varredura precisa recusar.
  it('as duas leituras têm conteúdo de verdade', () => {
    const [, comLista] = RESPOSTAS[2]
    expect(textoRenderizado(comLista).length).toBeGreaterThan(80)
    expect(textoDoJsonLd(comLista).length).toBeGreaterThan(80)
    expect(textoRenderizado(comLista).split('\n')).toHaveLength(4)
  })
})
