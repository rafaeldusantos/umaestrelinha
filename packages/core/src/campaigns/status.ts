// Campanhas de desconto — os quatro estados da lista do painel.
//
// Encerrada vence o interruptor: a campanha cujo fim passou está encerrada, ligada ou não (é o que
// a dona precisa ler na lista). Antes do fim, desligada vence a data. Ligada e antes do início é
// agendada; dentro da vigência, `isCampaignLive`.
//
// Folha alcançável pelo Deno.

import type { CampaignWindow, Instant } from './types.ts'
import { instantMs, isCampaignLive } from './live.ts'

export type CampaignStatus = 'em-vigencia' | 'agendada' | 'encerrada' | 'desligada'

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  'em-vigencia': 'Em vigência',
  agendada: 'Agendada',
  encerrada: 'Encerrada',
  desligada: 'Desligada',
}

export function campaignStatus(campaign: CampaignWindow, now: Instant): CampaignStatus {
  const agora = instantMs(now)
  if (agora >= instantMs(campaign.ends_at)) return 'encerrada'
  if (!campaign.active) return 'desligada'
  if (isCampaignLive(campaign, agora)) return 'em-vigencia'
  return 'agendada'
}
