// As peças escolhidas num bloco "Joias em oferta", conferidas contra a campanha do bloco.
//
// Regra pura, sem Supabase: quem lê as marcações e as peças é `api/campaignMarks.ts`. Aqui só se
// junta o que foi lido e se diz, por peça, se ela aparece no bloco — e, quando não, por quê. O editor
// do bloco e a linha dele na lista da Home leem estas mesmas respostas e as mesmas frases.
//
// "A campanha baixa o preço desta peça?" NÃO é respondido aqui: é de `@estrelinha/core/campaigns`
// (`campaignLowersPrice`), o mesmo dono que a loja consulta para tirar a peça da vitrine e do bloco.

import { campaignLowersPrice, type VariantListPrice } from '@estrelinha/core/campaigns'

/** Uma marcação: a peça e o percentual dela na campanha. */
export interface CampaignMark {
  product_id: string
  percent: number
}

/** A peça como a conferência a lê: publicação, preço, "de" e as variações com preço próprio. */
export interface CampaignPieceRow {
  id: string
  name: string
  is_active: boolean
  base_price: number | null
  original_price: number | null
  product_variants: VariantListPrice[] | null
}

/**
 * Por que a peça aparece ou não no bloco.
 *
 * - `no-ar` — publicada, marcada na campanha, e a campanha baixa o preço dela: aparece.
 * - `apagada` — saiu do catálogo.
 * - `fora-do-ar` — despublicada; volta se a dona republicar.
 * - `fora-da-campanha` — não está marcada na campanha do bloco.
 * - `nao-barateada` — marcada, mas o desconto não baixa o preço (o "de/por" já vence a campanha).
 */
export type CampaignPieceStatus = 'no-ar' | 'apagada' | 'fora-do-ar' | 'fora-da-campanha' | 'nao-barateada'

export interface CampaignPieceState {
  /** O id da peça, ou `null` quando ela foi apagada do catálogo e a FK zerou o do item. */
  product_id: string | null
  /** O nome do catálogo, ou `null` quando a peça foi apagada. */
  name: string | null
  status: CampaignPieceStatus
}

/**
 * A peça escolhida como o item da seção a guarda: o id e o nome congelado na escolha.
 *
 * Apagar a peça do catálogo zera o `product_id` do item (`on delete set null`) e o item continua na
 * seção — é o `label_snapshot` que ainda diz qual peça era.
 */
export interface ChosenPiece {
  product_id: string | null
  label_snapshot?: string | null
}

const nomeCongelado = (escolhida: ChosenPiece): string | null => escolhida.label_snapshot?.trim() || null

/**
 * O estado de cada peça escolhida, na ordem da lista.
 *
 * Cada escolhida é o id da peça, ou o item da seção inteiro — que é como a peça apagada do catálogo
 * entra na conta: sem id, mas com o nome congelado.
 *
 * As cobranças vêm na ordem em que a loja as aplicaria: existir, estar no ar, estar na campanha, e só
 * então a campanha baixar o preço.
 */
export function campaignPieceStates(
  chosen: readonly (string | ChosenPiece)[],
  marks: readonly CampaignMark[],
  pieces: readonly CampaignPieceRow[],
): CampaignPieceState[] {
  const percentual = new Map(marks.map(m => [m.product_id, m.percent]))
  const porId = new Map(pieces.map(p => [p.id, p]))

  return chosen.map(item => {
    const escolhida: ChosenPiece = typeof item === 'string' ? { product_id: item } : item
    const id = escolhida.product_id?.trim() || null
    const peca = id ? porId.get(id) : undefined
    if (!peca) return { product_id: id, name: nomeCongelado(escolhida), status: 'apagada' }
    const base = { product_id: id, name: peca.name }
    if (!peca.is_active) return { ...base, status: 'fora-do-ar' }
    if (!percentual.has(id)) return { ...base, status: 'fora-da-campanha' }
    const baixa = campaignLowersPrice(
      Number(peca.base_price ?? 0),
      peca.original_price,
      peca.product_variants,
      percentual.get(id),
    )
    return { ...base, status: baixa ? 'no-ar' : 'nao-barateada' }
  })
}

/** “A”, “A” e “B”, “A”, “B” e “C”. */
export const listaDeNomes = (nomes: readonly string[]): string => {
  const entre = nomes.map(n => `“${n}”`)
  if (entre.length <= 1) return entre.join('')
  return `${entre.slice(0, -1).join(', ')} e ${entre[entre.length - 1]}`
}

const nomeDe = (estado: CampaignPieceState): string => estado.name ?? 'peça apagada do catálogo'

/**
 * "1 das 3 saiu do ar: “A”." — a peça despublicada ou apagada, que a loja pula. `null` sem nenhuma.
 */
export const piecesOffAirText = (states: readonly CampaignPieceState[]): string | null => {
  const fora = states.filter(s => s.status === 'fora-do-ar' || s.status === 'apagada')
  if (fora.length === 0) return null
  const nomes = listaDeNomes(fora.map(nomeDe))
  return fora.length === 1
    ? `1 das ${states.length} saiu do ar: ${nomes}. A loja a pula enquanto ela não voltar.`
    : `${fora.length} das ${states.length} saíram do ar: ${nomes}. A loja as pula enquanto elas não voltarem.`
}

/** As marcadas cujo preço a campanha não baixa — não aparecem no bloco. `null` sem nenhuma. */
export const piecesNotLoweredText = (states: readonly CampaignPieceState[]): string | null => {
  const nao = states.filter(s => s.status === 'nao-barateada')
  if (nao.length === 0) return null
  const nomes = listaDeNomes(nao.map(nomeDe))
  return nao.length === 1
    ? `O desconto da campanha não baixa o preço de ${nomes}, e ela não aparece no bloco nem na vitrine da campanha.`
    : `O desconto da campanha não baixa o preço de ${nomes}, e elas não aparecem no bloco nem na vitrine da campanha.`
}

/** As escolhidas que não estão marcadas na campanha do bloco. `null` sem nenhuma. */
export const piecesOutOfCampaignText = (states: readonly CampaignPieceState[]): string | null => {
  const fora = states.filter(s => s.status === 'fora-da-campanha')
  if (fora.length === 0) return null
  const nomes = listaDeNomes(fora.map(nomeDe))
  return fora.length === 1
    ? `${nomes} não está marcada na campanha do bloco, e não aparece nele.`
    : `${nomes} não estão marcadas na campanha do bloco, e não aparecem nele.`
}
