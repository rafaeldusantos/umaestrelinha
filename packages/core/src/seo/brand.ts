/**
 * O nome da loja no `<title>` — feature 62, `MTA-02`.
 *
 * Folha sem import nenhum: a edge function `product-page` alcança este arquivo por caminho relativo.
 */
export const STORE_BRAND = 'Uma Estrelinha'

const JA_TEM_MARCA = /uma\s+estrelinha/i

/**
 * A abreviação que a curadoria da Nuvemshop usa no fim do título (`… | UE`). Medido em 2026-10-06:
 * 166 dos 686 `seo_title` terminam assim — é a marca, escrita curta, e sufixar de novo produziria
 * `… | UE | Uma Estrelinha`.
 */
const ABREVIACAO_DA_MARCA = /\|\s*UE\s*$/

/**
 * O título com a marca — **só quando ele ainda não a traz** (A2).
 *
 * Medido: 247 títulos curados já terminam em `| Uma Estrelinha`. Sufixar às cegas daria a marca
 * duas vezes na aba e no resultado de busca. O título nunca é cortado (A5): quem corta é o buscador,
 * e cortar aqui esconderia da dona o que ela escreveu.
 */
export const brandedTitle = (titulo: string | null | undefined): string => {
  const limpo = String(titulo ?? '').replace(/\s+/g, ' ').trim()
  if (limpo === '') return STORE_BRAND
  if (JA_TEM_MARCA.test(limpo) || ABREVIACAO_DA_MARCA.test(limpo)) return limpo
  return `${limpo} | ${STORE_BRAND}`
}
