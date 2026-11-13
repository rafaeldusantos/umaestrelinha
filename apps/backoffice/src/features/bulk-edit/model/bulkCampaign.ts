// A campanha na edição em massa: primeiro a campanha, depois um percentual dela — ou tirar as peças
// da campanha. NÃO é patch de `products`: quem grava é a porta das marcações
// (`setProductsCampaign`, em `entities/campaign`), e o preço da peça não muda.

/** O que a edição em massa pede à porta: a campanha, e o percentual (`null` = tirar). */
export interface BulkCampaignChoice {
  campaignId: string
  campaignName: string
  percent: number | null
}

/** O valor do seletor que tira as peças da campanha. */
export const BULK_CAMPAIGN_REMOVE = 'tirar'

/** As opções do segundo seletor: os percentuais da campanha, e o de tirar. */
export const bulkCampaignOptions = (campaign: { name: string; percents: number[] }): { value: string; label: string }[] => [
  ...campaign.percents.map(p => ({ value: String(p), label: `${campaign.name}: ${p}%` })),
  { value: BULK_CAMPAIGN_REMOVE, label: `Tirar da ${campaign.name}` },
]

/** A escolha completa, ou `null` enquanto falta a campanha ou o percentual. */
export const bulkCampaignChoice = (
  campaign: { id: string; name: string; percents: number[] } | null,
  value: string,
): BulkCampaignChoice | null => {
  if (!campaign || value === '') return null
  if (value === BULK_CAMPAIGN_REMOVE) return { campaignId: campaign.id, campaignName: campaign.name, percent: null }
  const percent = Number(value)
  return campaign.percents.includes(percent) ? { campaignId: campaign.id, campaignName: campaign.name, percent } : null
}
