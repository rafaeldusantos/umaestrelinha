// As marcações da peça nas campanhas de desconto, como o formulário as tem.
//
// A marcação mora em `product_campaigns` (peça, campanha, percentual), e não em `products`: o preço
// cadastrado nunca muda com a campanha. O formulário carrega as marcações pelo embed da carga, a
// dona escolhe o percentual de cada campanha no cartão da aba de preço, e o Salvar grava SÓ o que
// mudou desde a carga — pela porta única de `entities/campaign` (`setProductsCampaign`), que é a
// única que escreve a tabela.

import { setProductsCampaign } from '@/entities/campaign'

/** Uma marcação: nesta campanha, a peça tem este percentual. */
export interface CampaignMark {
  campaign_id: string
  percent: number
}

/* eslint-disable @typescript-eslint/no-explicit-any */
/** O embed `product_campaigns(campaign_id, percent)` da carga ⇒ as marcações, sem lixo. */
export const campaignMarksFromRow = (row: any): CampaignMark[] =>
  Array.isArray(row?.product_campaigns)
    ? row.product_campaigns
        .filter((m: any) => typeof m?.campaign_id === 'string' && typeof m?.percent === 'number')
        .map((m: any) => ({ campaign_id: m.campaign_id, percent: m.percent }))
    : []
/* eslint-enable @typescript-eslint/no-explicit-any */

/** O percentual da peça na campanha, ou `null` ("Nenhum"). */
export const markedPercent = (marks: readonly CampaignMark[], campaignId: string): number | null =>
  marks.find(m => m.campaign_id === campaignId)?.percent ?? null

/** As marcações com a campanha trocada: `null` tira a peça dela. */
export const withCampaignMark = (
  marks: readonly CampaignMark[],
  campaignId: string,
  percent: number | null,
): CampaignMark[] => {
  const sem = marks.filter(m => m.campaign_id !== campaignId)
  return percent === null ? sem : [...sem, { campaign_id: campaignId, percent }]
}

/** O que mudou desde a carga: cada campanha cujo percentual não é mais o gravado (`null` = tirar). */
export const campaignMarkChanges = (
  next: readonly CampaignMark[],
  saved: readonly CampaignMark[],
): { campaignId: string; percent: number | null }[] => {
  const campanhas = [...new Set([...saved, ...next].map(m => m.campaign_id))]
  return campanhas
    .map(campaignId => ({ campaignId, antes: markedPercent(saved, campaignId), depois: markedPercent(next, campaignId) }))
    .filter(c => c.antes !== c.depois)
    .map(c => ({ campaignId: c.campaignId, percent: c.depois }))
}

/**
 * Grava as marcações que mudaram, depois de o produto existir. Devolve `null` quando deu certo (ou
 * não havia o que gravar), e a frase do erro quando não deu — `string | null`, porque
 * `strictNullChecks` está desligado. Para no primeiro erro, como o resto do save.
 */
export const persistCampaignMarks = async (
  productId: string,
  next: readonly CampaignMark[],
  saved: readonly CampaignMark[],
  write: typeof setProductsCampaign = setProductsCampaign,
): Promise<string | null> => {
  for (const { campaignId, percent } of campaignMarkChanges(next, saved)) {
    try {
      await write([productId], campaignId, percent)
    } catch (e) {
      return e instanceof Error ? e.message : 'A campanha não foi gravada'
    }
  }
  return null
}
