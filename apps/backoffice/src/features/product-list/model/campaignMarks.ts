// A campanha de desconto na lista de produtos: quais campanhas o filtro oferece, e o que a linha diz
// da peça marcada.
//
// As duas perguntas têm a mesma resposta de "quais campanhas contam aqui": as agendadas e a em
// vigência, na ordem do início (a mesma régua do cadastro da peça), mais a campanha do endereço — o
// "Ver as peças" de uma campanha encerrada abre a lista com ela, e o filtro e a linha precisam saber
// o nome dela.

import type { DbCampaign } from '@estrelinha/supabase/types/campaign'
import type { Instant } from '@estrelinha/core/campaigns'
import { campaignsOpenForMarking } from '@/entities/campaign'

export interface RowCampaignMark {
  campaignId: string
  name: string
  percent: number
}

/** As campanhas do filtro da lista; a do endereço entra no fim, se não estiver entre as abertas. */
export function campaignsForList<T extends DbCampaign>(campaigns: T[], now: Instant, selectedId: string | null): T[] {
  const abertas = campaignsOpenForMarking(campaigns, now)
  if (!selectedId || abertas.some(c => c.id === selectedId)) return abertas
  return [...abertas, ...campaigns.filter(c => c.id === selectedId)]
}

/** As marcações da peça que a linha mostra, na ordem das campanhas do filtro. */
export function rowCampaignMarks(
  marks: { campaign_id: string; percent: number }[] | undefined,
  campaigns: DbCampaign[],
  now: Instant,
  selectedId: string | null,
): RowCampaignMark[] {
  if (!marks || marks.length === 0) return []
  return campaignsForList(campaigns, now, selectedId).flatMap(c => {
    const marca = marks.find(m => m.campaign_id === c.id)
    return marca ? [{ campaignId: c.id, name: c.name, percent: marca.percent }] : []
  })
}
