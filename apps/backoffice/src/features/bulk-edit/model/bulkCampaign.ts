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

/**
 * O que o "Desfazer" do lote regrava: as peças que o lote mudou, agrupadas pela marcação que cada
 * uma tinha NAQUELA campanha antes dele — o percentual, ou `null` (não estava na campanha, e volta a
 * não estar). Peça que já estava como o lote a deixou não entra: não há o que voltar nela.
 *
 * O estado de antes vem das linhas selecionadas (a seleção guarda a linha, com as marcações lidas da
 * lista), e a volta é a mesma porta das marcações, um grupo por chamada.
 */
export interface CampaignUndoGroup {
  campaignId: string
  percent: number | null
  productIds: string[]
}

export const campaignUndoGroups = (
  rows: { id: string; campaigns?: { campaign_id: string; percent: number }[] }[],
  choice: BulkCampaignChoice,
): CampaignUndoGroup[] => {
  const grupos = new Map<number | null, string[]>()
  const vistos = new Set<string>()
  for (const row of rows) {
    if (vistos.has(row.id)) continue
    vistos.add(row.id)
    const antes = (row.campaigns ?? []).find(m => m.campaign_id === choice.campaignId)?.percent ?? null
    if (antes === choice.percent) continue
    grupos.set(antes, [...(grupos.get(antes) ?? []), row.id])
  }
  return [...grupos].map(([percent, productIds]) => ({ campaignId: choice.campaignId, percent, productIds }))
}
