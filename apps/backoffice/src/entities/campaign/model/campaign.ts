// As campanhas como o painel as lê: a linha da tabela, os percentuais e quantas peças usam cada um.
//
// Regra pura, sem Supabase: quem junta a linha e o uso é este arquivo, e as telas leem o resultado.
// Vigência, estado, preço e recusas NÃO moram aqui — são de `@estrelinha/core/campaigns`.

import { campaignStatus, sortedPercents, type Instant } from '@estrelinha/core/campaigns'
import type { DbCampaign, DbCampaignPercentUsage } from '@estrelinha/supabase/types/campaign'

export interface AdminCampaign extends DbCampaign {
  /** Os percentuais da campanha, em ordem crescente. */
  percents: number[]
  /** Quantas peças usam cada percentual. */
  usage: Record<number, number>
  /** Quantas peças estão marcadas na campanha (a soma do uso). */
  productCount: number
}

/** Junta as campanhas com a contagem por percentual da view de uso. */
export function toAdminCampaigns(rows: DbCampaign[], usage: DbCampaignPercentUsage[]): AdminCampaign[] {
  return rows.map(row => {
    const dela = usage.filter(u => u.campaign_id === row.id)
    const porPercentual: Record<number, number> = {}
    for (const u of dela) porPercentual[u.percent] = u.products
    return {
      ...row,
      percents: sortedPercents(dela.map(u => u.percent)),
      usage: porPercentual,
      productCount: dela.reduce((soma, u) => soma + u.products, 0),
    }
  })
}

/**
 * As campanhas em que uma peça pode ser marcada agora: as agendadas e a em vigência, na ordem do
 * início. A encerrada e a desligada ficam de fora (a marcação delas continua guardada).
 */
export function campaignsOpenForMarking<T extends DbCampaign>(campaigns: T[], now: Instant): T[] {
  return campaigns
    .filter(c => {
      const estado = campaignStatus(c, now)
      return estado === 'agendada' || estado === 'em-vigencia'
    })
    .sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))
}

/** O endereço da lista de produtos filtrada pela campanha (e pelo percentual). */
export const campaignProductsHref = (campaignId: string, percent?: number | null): string =>
  percent === null || percent === undefined
    ? `/admin/produtos?campanha=${encodeURIComponent(campaignId)}`
    : `/admin/produtos?campanha=${encodeURIComponent(campaignId)}&percentual=${percent}`
