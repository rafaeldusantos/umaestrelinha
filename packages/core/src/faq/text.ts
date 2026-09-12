// Feature 46 — como um texto puro vira leitura, num lugar só.
//
// A resposta da biblioteca é `text` no banco e **assim continua**. Isto aqui não a transforma em
// HTML: transforma em uma lista de blocos que a loja desenha e que o JSON-LD serializa. As duas
// superfícies leem daqui, e é isso que torna a paridade entre elas estrutural em vez de vigiada —
// `faqAnswerPlainText` é uma **dobra sobre `faqAnswerBlocks`**, não um segundo interpretador.
//
// Dois interpretadores independentes divergiriam no primeiro ajuste, e o teste de paridade só
// pegaria os casos que alguém tivesse imaginado. É o "defeito 01" na escala de uma função.

import type { FaqBlock } from './types.ts'

/** A marca de item: hífen e espaço, **no começo da linha**. */
const ITEM = /^-\s+/

/**
 * Os blocos de uma resposta.
 *
 * A gramática é a menor que o conteúdo da dona pede, e nada além disso:
 *
 * - **linha em branco separa parágrafo** — é como ela já escreve, no WhatsApp e no documento que
 *   originou as 26 perguntas;
 * - **linha começando por `- ` é item de lista**, e itens seguidos colapsam num bloco só.
 *
 * Tudo o mais é parágrafo. Em particular, um hífen **no meio** da linha não é item: `"Prata 925 -
 * banho de ouro"` é uma frase, e tratá-la como lista quebraria a resposta de acabamentos.
 *
 * CRLF é normalizado antes de qualquer coisa. Num checkout Windows o texto chega com `\r`, e uma
 * régua de `\n` deixaria o `\r` colado no fim de cada linha — invisível na tela e visível no
 * JSON-LD, que é onde ninguém olha.
 */
export const faqAnswerBlocks = (answer: string | null | undefined): readonly FaqBlock[] => {
  const linhas = String(answer ?? '')
    .replace(/\r\n?/g, '\n')
    .split('\n')

  const blocos: FaqBlock[] = []
  let paragrafo: string[] = []
  let itens: string[] = []

  const fecharParagrafo = () => {
    const texto = paragrafo.join(' ').trim()
    if (texto !== '') blocos.push({ kind: 'paragraph', text: texto })
    paragrafo = []
  }

  const fecharLista = () => {
    if (itens.length > 0) blocos.push({ kind: 'list', items: itens })
    itens = []
  }

  for (const linha of linhas) {
    const corpo = linha.trim()

    if (corpo === '') {
      fecharParagrafo()
      fecharLista()
      continue
    }

    if (ITEM.test(corpo)) {
      // Um item encerra o parágrafo que vinha antes, mesmo sem linha em branco entre os dois — é a
      // forma que o texto de origem usa ("Para facilitar:" seguido direto dos três materiais).
      fecharParagrafo()
      const texto = corpo.replace(ITEM, '').trim()
      if (texto !== '') itens.push(texto)
      continue
    }

    fecharLista()
    paragrafo.push(corpo)
  }

  fecharParagrafo()
  fecharLista()

  return blocos
}

/**
 * A mesma resposta como prosa contínua — o que o `FAQPage` do schema.org recebe.
 *
 * **Derivada dos blocos, nunca do texto cru**, e é essa definição que o `FAQL-14` compra: o que o
 * Google lê não tem como divergir do que a cliente lê, porque um é função do outro.
 *
 * O marcador `- ` **não** sobrevive: ele é a nossa notação, não o conteúdo da dona, e um `-` solto
 * no meio de um `acceptedAnswer` é ruído para quem consome o dado estruturado. O item vira uma
 * linha, que é como ele é lido em voz alta.
 */
export const faqAnswerPlainText = (answer: string | null | undefined): string =>
  faqAnswerBlocks(answer)
    .map(bloco => (bloco.kind === 'paragraph' ? bloco.text : bloco.items.join('\n')))
    .join('\n\n')
