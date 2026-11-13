// As campanhas das páginas de `/admin/campanhas`, para o dublê do client. O relógio dos testes é
// 20/11/2026 12:00 (UTC): a Black Friday está em vigência, o Natal agendado, o Dia das Mães
// encerrado e o Inverno desligado.

import type { DbCampaign, DbCampaignPercentUsage } from '@estrelinha/supabase/types/campaign'

export const AGORA = new Date('2026-11-20T12:00:00.000Z')

const linha = (over: Partial<DbCampaign> & Pick<DbCampaign, 'id' | 'name'>): DbCampaign => ({
  badge_text: over.name.slice(0, 14),
  band_color: '#161514',
  accent_color: '#C2A063',
  starts_at: '2026-11-13T03:00:00.000Z',
  ends_at: '2026-12-01T03:00:00.000Z',
  active: true,
  created_at: '2026-11-01T00:00:00.000Z',
  updated_at: '2026-11-01T00:00:00.000Z',
  ...over,
})

/** 13/11 00:00 a 30/11 23:59 (Brasília), ligada, 10 · 15 · 20. */
export const BLACK_FRIDAY = linha({ id: 'bf', name: 'Black Friday', badge_text: 'BLACK FRIDAY' })
/** 01/12 a 24/12, ligada: agendada. */
export const NATAL = linha({
  id: 'natal',
  name: 'Natal',
  starts_at: '2026-12-01T03:00:00.000Z',
  ends_at: '2026-12-25T03:00:00.000Z',
})
/** Maio: encerrada. */
export const MAES = linha({
  id: 'maes',
  name: 'Dia das Mães',
  starts_at: '2026-05-01T03:00:00.000Z',
  ends_at: '2026-05-11T03:00:00.000Z',
})
/** Janeiro, desligada. */
export const INVERNO = linha({
  id: 'inverno',
  name: 'Inverno',
  active: false,
  band_color: '#23303A',
  accent_color: '#B8945F',
  starts_at: '2027-01-05T03:00:00.000Z',
  ends_at: '2027-01-20T03:00:00.000Z',
})

export const USO: DbCampaignPercentUsage[] = [
  { campaign_id: 'bf', percent: 10, products: 3 },
  { campaign_id: 'bf', percent: 15, products: 12 },
  { campaign_id: 'bf', percent: 20, products: 0 },
  { campaign_id: 'natal', percent: 10, products: 1 },
  { campaign_id: 'maes', percent: 15, products: 4 },
  { campaign_id: 'inverno', percent: 5, products: 0 },
]
