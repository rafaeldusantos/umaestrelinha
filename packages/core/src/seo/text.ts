/**
 * A descrição de uma página a partir de HTML corrido — feature 62, `MTA-03` (A4).
 *
 * As duas reduções já têm dono em `core/faq` e são reusadas, nunca reescritas: `stripFaqBlock` tira
 * o bloco de perguntas que a feature 28 promoveu a cadastro, e `htmlToText` faz "tag some, entidade
 * vira caractere, espaço colapsa" — a mesma redução que o feed do Google usa.
 *
 * Os dois imports entram por ARQUIVO e com `.ts`: a edge function `product-page` chega aqui por
 * caminho relativo, e o barrel de `core/faq` não é alcançável por Deno.
 */
import { htmlToText, stripFaqBlock } from '../faq/block.ts'

/** O teto da descrição DERIVADA. A curada passa inteira (A5). */
export const DESCRIPTION_MAX = 160

const ELLIPSIS = '…'

/**
 * Corta no limite de palavra, com `…`, sem passar de `max` contando a reticência.
 *
 * Cortar no meio da palavra produz "…leite mater" no resultado de busca. Uma palavra sozinha maior
 * que o teto é cortada onde der — não há limite de palavra para respeitar.
 */
export const summarize = (texto: string | null | undefined, max = DESCRIPTION_MAX): string => {
  const limpo = String(texto ?? '').replace(/\s+/g, ' ').trim()
  if (limpo.length <= max) return limpo

  const janela = limpo.slice(0, max - ELLIPSIS.length)
  // O espaço logo DEPOIS da janela também é limite de palavra: a última palavra coube inteira.
  const fimDePalavra = limpo[janela.length] === ' ' ? janela.length : janela.lastIndexOf(' ')
  const base = fimDePalavra > 0 ? janela.slice(0, fimDePalavra) : janela
  return `${base.replace(/[\s,;:.\-–—]+$/, '')}${ELLIPSIS}`
}

/**
 * HTML de descrição de produto → texto de no máximo `DESCRIPTION_MAX`, sem o bloco de FAQ.
 *
 * `htmlToText` troca cada tag por espaço — certo para não colar palavras de blocos vizinhos, mas
 * deixa `<strong>leite</strong>.` como "leite ." no snippet. O espaço antes de pontuação sai AQUI, e
 * não em `htmlToText`: o feed do Google é o outro leitor dela e não foi pedido para mudar.
 */
export const descriptionFromHtml = (html: string | null | undefined): string =>
  summarize(htmlToText(stripFaqBlock(html)).replace(/\s+([.,;:!?…])/g, '$1'))
