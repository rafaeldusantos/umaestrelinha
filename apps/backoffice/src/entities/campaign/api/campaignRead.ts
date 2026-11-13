// A leitura das campanhas do painel: a lista (com os percentuais e o uso de cada um) e quantas
// linhas de pedido usaram uma campanha.
//
// O admin lê tudo pela RLS (`has_role`); a loja, que lê pela policy pública, só veria a em vigência.

import { useQuery, type QueryClient } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import type { DbCampaign, DbCampaignPercentUsage } from '@estrelinha/supabase/types/campaign'
import { campaignsOpenForMarking, toAdminCampaigns, type AdminCampaign } from '../model/campaign'

export const CAMPAIGNS_KEY = ['admin-campaigns'] as const

export const CAMPAIGN_COLUMNS =
  'id, name, badge_text, band_color, accent_color, starts_at, ends_at, active, created_at, updated_at'

export const fetchCampaigns = async (): Promise<AdminCampaign[]> => {
  const [campanhas, uso] = await Promise.all([
    supabase.from('campaigns').select(CAMPAIGN_COLUMNS).order('starts_at', { ascending: false }),
    supabase.from('campaign_percent_usage').select('campaign_id, percent, products'),
  ])
  if (campanhas.error) throw new Error(campanhas.error.message)
  if (uso.error) throw new Error(uso.error.message)
  return toAdminCampaigns((campanhas.data ?? []) as DbCampaign[], (uso.data ?? []) as DbCampaignPercentUsage[])
}

export const useCampaigns = () => {
  const query = useQuery({ queryKey: CAMPAIGNS_KEY, queryFn: fetchCampaigns })
  return {
    campaigns: query.data ?? [],
    loading: query.isLoading,
    error: query.error ? (query.error as Error).message : null,
    refetch: query.refetch,
  }
}

/** As agendadas e a em vigência, na ordem do início — as que o cadastro da peça oferece. */
export const useCampaignsOpenForMarking = () => {
  const { campaigns, loading, error } = useCampaigns()
  return { campaigns: campaignsOpenForMarking(campaigns, Date.now()), loading, error }
}

/** Quantas linhas de pedido usaram a campanha. Mais que zero ⇒ ela não se apaga. */
export const fetchCampaignOrderCount = async (campaignId: string): Promise<number> => {
  const { count, error } = await supabase
    .from('order_items')
    .select('id', { count: 'exact', head: true })
    .eq('campaign_id', campaignId)
  if (error) throw new Error(error.message)
  return count ?? 0
}

export const useCampaignOrderCount = (campaignId: string | null) => {
  const query = useQuery({
    queryKey: ['admin-campaign-orders', campaignId],
    queryFn: () => fetchCampaignOrderCount(campaignId as string),
    enabled: !!campaignId,
  })
  return { orders: query.data ?? null, loading: query.isLoading && !!campaignId }
}

/** Depois de gravar: a lista, os percentuais e o uso relidos. */
export const invalidateCampaigns = (client: QueryClient) => client.invalidateQueries({ queryKey: CAMPAIGNS_KEY })
