// Feature 28 — a fronteira do bloco de FAQ dentro da descrição, com **um dono**.
//
// Três consumidores chamam daqui, em dois runtimes:
//   · o importador (Node)     — para EXTRAIR os pares e semear a biblioteca
//   · a loja (browser)        — para NÃO exibir duas vezes o que virou cadastro
//   · o painel (browser)      — para AVISAR que o bloco existe e para removê-lo a pedido da dona
//
// Três definições da mesma fronteira produziriam a divergência silenciosa que as features 24 e 25
// existiram para matar. Aqui é uma só.
//
// ---------------------------------------------------------------------------------------------
// Por que REGEX, se o projeto proíbe regex sobre HTML
// ---------------------------------------------------------------------------------------------
//
// A regra do `CLAUDE.md` — "allowlist por ÁRVORE, nunca regex sobre HTML" — é sobre **sanitizar**, e
// continua valendo inteira: `shared/lib/sanitizeHtml` não mudou e segue sendo o que decide o que a
// loja renderiza. O que este arquivo faz é outra coisa: **localizar** um heading e partir pares num
// corpus medido como extremamente regular (687 de 687 descrições usam `<h3>Perguntas frequentes</h3>`).
//
// A segurança não depende deste arquivo:
//   1. o que SOBRA da descrição continua passando por `sanitizeHtml` antes de ir para a tela;
//   2. a resposta extraída sai como **texto** (tag removida, entidade decodificada) e é renderizada
//      escapada — nunca por `dangerouslySetInnerHTML`.
//
// E há um motivo que não é de gosto: o importador roda em **Node**, onde não existe `DOMParser`.
// Uma implementação por árvore não serviria às três pontas, e duas implementações seriam duas
// fronteiras.

import { decodeHtmlEntities, faqQuestionKey } from './faq.ts'
import type { FaqPair } from './types.ts'

/**
 * O título do bloco, na forma normalizada por `faqQuestionKey`.
 *
 * Deliberadamente **estrito**: só esta forma (em qualquer caixa e com ou sem acento, que a chave já
 * resolve). Aceitar variações como "Dúvidas frequentes" faria a loja esconder texto que a dona
 * escreveu sem que ela tivesse pedido. Errar para menos aqui deixa o texto visível, que é o desfecho
 * seguro — e o aviso do painel (`FAQ-27`) torna o caso visível quando acontece.
 */
export const FAQ_HEADING_KEY = 'perguntas frequentes'

/**
 * Tag some, entidade vira caractere, espaço colapsa. **Nesta ordem.**
 *
 * Exportado na feature 30 (`GSH-08`): o `<g:description>` do feed é texto, e precisa exatamente
 * desta redução. Reimplementá-la em `core/shopping` seria a segunda escrita de "HTML vira texto" —
 * o defeito que esta arquitetura existe para não ter. Continua sendo **extração**, nunca
 * sanitização: a saída nunca volta para o DOM, e quem monta `dangerouslySetInnerHTML` segue sendo
 * `sanitizeHtml`, que não mudou.
 */
export const htmlToText = (html: string): string =>
  // Tirar a tag ANTES de decodificar é o que impede um `&lt;script&gt;` escrito como literal pela
  // dona de virar `<script>` e ser removido como se fosse marcação de verdade.
  decodeHtmlEntities(String(html ?? '').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()

const toText = htmlToText

interface Heading {
  level: number
  start: number
  end: number
  key: string
}

/**
 * Os headings do texto, em ordem.
 *
 * A `RegExp` nasce **dentro** da função de propósito: um objeto com a flag `g` no escopo do módulo
 * carrega `lastIndex` entre chamadas, e a segunda chamada começaria do meio do texto anterior.
 */
const headings = (html: string): Heading[] => {
  const re = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi
  const saida: Heading[] = []
  let match: RegExpExecArray | null

  while ((match = re.exec(html)) !== null) {
    saida.push({
      level: Number(match[1]),
      start: match.index,
      end: match.index + match[0].length,
      key: faqQuestionKey(toText(match[2])),
    })
  }
  return saida
}

export interface FaqBlockRange {
  /** Índice do `<` do heading. */
  start: number
  /** Índice logo após o último caractere do bloco. */
  end: number
  /** O que há entre o fim do heading e o fim do bloco. */
  inner: string
}

/**
 * Onde o bloco começa e termina, ou `null`.
 *
 * O fim é o **próximo heading de nível menor ou igual** ao do próprio bloco, ou o fim do texto.
 * Medido no catálogo real: **685** descrições terminam o bloco num outro `<h3>` (quase sempre
 * `Observações importantes`) e **2** o têm como último bloco. Um `<h4>` dentro do FAQ não o fecharia,
 * que é a semântica certa de documento.
 */
export const faqBlockRange = (html: string | null | undefined): FaqBlockRange | null => {
  const texto = String(html ?? '')
  if (texto === '') return null

  const lista = headings(texto)
  const indice = lista.findIndex(h => h.key === FAQ_HEADING_KEY)
  if (indice === -1) return null

  const cabecalho = lista[indice]
  const proximo = lista.slice(indice + 1).find(h => h.level <= cabecalho.level)
  const end = proximo ? proximo.start : texto.length

  return { start: cabecalho.start, end, inner: texto.slice(cabecalho.end, end) }
}

/**
 * Os pares do bloco, como **texto**.
 *
 * O catálogo real usa **dois arranjos** para a mesma coisa, e ler só o primeiro perde 312 pares em
 * silêncio:
 *
 * ```html
 * <!-- A (617 produtos) -->  <p><strong>P</strong><br>R</p><p><strong>P</strong><br>R</p>
 * <!-- B (70 produtos)  -->  <p><strong>P</strong><br />R<br /><strong>P</strong><br />R</p>
 * ```
 *
 * Um padrão só cobre os dois porque a âncora é o `<strong>`, e o fim de cada resposta é o
 * **próximo `<strong>`**, o `</p>` ou o fim do bloco — não o `</p>` sozinho. `<br>` e `<br />` valem
 * igual: os dois aparecem no catálogo.
 */
export const extractFaqPairs = (html: string | null | undefined): FaqPair[] => {
  const range = faqBlockRange(html)
  if (!range) return []

  const re = /<strong\b[^>]*>([\s\S]*?)<\/strong\s*>\s*<br\s*\/?>\s*([\s\S]*?)(?=<strong\b|<\/p\s*>|$)/gi
  const pares: FaqPair[] = []
  let match: RegExpExecArray | null

  while ((match = re.exec(range.inner)) !== null) {
    const question = toText(match[1])
    const answer = toText(match[2])
    if (question !== '' && answer !== '') pares.push({ question, answer })
  }
  return pares
}

/** O bloco existe **e produziu par**? É o que o aviso do painel pergunta (`FAQ-27`). */
export const hasFaqBlock = (html: string | null | undefined): boolean =>
  extractFaqPairs(html).length > 0

/**
 * A descrição sem o bloco de FAQ.
 *
 * **Só remove quando houve par extraível** (`FAQ-06`). Um heading "Perguntas frequentes" com prosa
 * solta embaixo é texto que a dona escreveu e que nenhuma pergunta do cadastro está repetindo —
 * removê-lo seria apagar conteúdo da página em troca de nada.
 *
 * Entrada sem bloco volta **idêntica**, e nunca lança.
 */
export const stripFaqBlock = (html: string | null | undefined): string => {
  const texto = String(html ?? '')
  const range = faqBlockRange(texto)
  if (!range || extractFaqPairs(texto).length === 0) return texto

  // A emenda pode deixar duas quebras coladas onde havia bloco; colapsá-las evita um espaço extra
  // entre `Especificações` e `Observações importantes` no HTML que vai para o sanitizador.
  return (texto.slice(0, range.start) + texto.slice(range.end)).replace(/\s*\n\s*\n\s*/g, '\n').trim()
}
