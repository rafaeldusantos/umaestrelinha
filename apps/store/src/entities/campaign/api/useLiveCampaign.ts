// A campanha de desconto em vigência — ou nenhuma.
//
// Quem decide a vigência é o BANCO: a policy pública de `campaigns` só entrega a campanha ligada com
// `starts_at <= now() < ends_at`. A loja nunca a decide com o relógio do navegador (a hora do
// aparelho da cliente pode estar errada, e o preço cobrado é o do servidor). Por isso este hook não
// chama `isCampaignLive`: linha devolvida é campanha valendo.

import { useQuery } from '@tanstack/react-query'
import { supabase } from '@estrelinha/supabase/client'
import { sortedPercents } from '@estrelinha/core/campaigns'
import type { LiveCampaign } from '../model/types'

export const LIVE_CAMPAIGN_KEY = ['campaign', 'live'] as const

/** O `select` da campanha em vigência, com os percentuais que ela oferece. */
export const LIVE_CAMPAIGN_SELECT =
  'id, name, badge_text, band_color, accent_color, ends_at, campaign_percents(percent)'

/** Falha com tipo: a leitura repete em vez de guardar "sem campanha" como sucesso. */
export class LiveCampaignQueryError extends Error {}

const texto = (v: unknown): string => (typeof v === 'string' ? v : '')

/** As linhas cruas → a campanha em vigência. Só há uma ligada por vez (exclusão no banco). */
export const toLiveCampaign = (rows: readonly unknown[]): LiveCampaign | null => {
  for (const raw of rows ?? []) {
    const r = (raw ?? {}) as Record<string, unknown>
    if (typeof r.id !== 'string' || typeof r.badge_text !== 'string') continue
    const percents = Array.isArray(r.campaign_percents)
      ? r.campaign_percents
          .map(p => (p && typeof p === 'object' ? (p as { percent?: unknown }).percent : null))
          .filter((p): p is number => typeof p === 'number' && Number.isFinite(p))
      : []
    return {
      id: r.id,
      name: texto(r.name),
      badge_text: r.badge_text,
      band_color: texto(r.band_color),
      accent_color: texto(r.accent_color),
      ends_at: texto(r.ends_at),
      percents: sortedPercents(percents),
    }
  }
  return null
}

export const liveCampaignQueryOptions = () => ({
  queryKey: LIVE_CAMPAIGN_KEY,
  queryFn: async (): Promise<LiveCampaign | null> => {
    const { data, error } = await supabase.from('campaigns').select(LIVE_CAMPAIGN_SELECT)
    if (error) {
      throw new LiveCampaignQueryError(`carregar campanha: ${error.message ?? 'erro desconhecido'}`)
    }
    return toLiveCampaign((data ?? []) as unknown[])
  },
})

/** A campanha em vigência (`null` = nenhuma), com os estados do React Query. */
export const useLiveCampaign = () => useQuery(liveCampaignQueryOptions())
