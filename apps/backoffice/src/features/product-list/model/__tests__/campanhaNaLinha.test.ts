import { describe, expect, it } from 'vitest'
import type { DbCampaign } from '@estrelinha/supabase/types/campaign'
import { campaignsForList, rowCampaignMarks } from '../campaignMarks'

// Quais campanhas a lista de produtos oferece no filtro, e o que a linha diz da peça marcada.

const AGORA = '2026-11-20T12:00:00Z'

const campanha = (over: Partial<DbCampaign>): DbCampaign => ({
  id: 'x', name: 'X', badge_text: 'X', band_color: '#000000', accent_color: '#FFFFFF',
  starts_at: '2026-11-01T03:00:00Z', ends_at: '2026-12-01T03:00:00Z', active: true,
  created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z',
  ...over,
})

const natal = campanha({ id: 'natal', name: 'Natal', starts_at: '2026-12-10T03:00:00Z', ends_at: '2026-12-26T03:00:00Z' })
const bf = campanha({ id: 'bf', name: 'Black Friday', starts_at: '2026-11-15T03:00:00Z', ends_at: '2026-12-01T03:00:00Z' })
const maes = campanha({ id: 'maes', name: 'Dia das Mães', starts_at: '2026-05-01T03:00:00Z', ends_at: '2026-05-11T03:00:00Z' })
const desligada = campanha({ id: 'off', name: 'Desligada', active: false })
const TODAS = [natal, maes, bf, desligada]

describe('as campanhas do filtro da lista', () => {
  it('são as agendadas e a em vigência, na ordem do início', () => {
    expect(campaignsForList(TODAS, AGORA, null).map(c => c.id)).toEqual(['bf', 'natal'])
  })

  it('a campanha do endereço entra mesmo encerrada, depois das outras — o "Ver as peças" de uma encerrada não abre um filtro sem nome', () => {
    expect(campaignsForList(TODAS, AGORA, 'maes').map(c => c.id)).toEqual(['bf', 'natal', 'maes'])
  })

  it('a campanha do endereço que já está na lista não se repete', () => {
    expect(campaignsForList(TODAS, AGORA, 'bf').map(c => c.id)).toEqual(['bf', 'natal'])
  })
})

describe('a campanha na linha da peça', () => {
  it('diz o nome e o percentual de cada campanha aberta em que a peça está', () => {
    const marcas = [
      { campaign_id: 'natal', percent: 10 },
      { campaign_id: 'bf', percent: 15 },
    ]
    expect(rowCampaignMarks(marcas, TODAS, AGORA, null)).toEqual([
      { campaignId: 'bf', name: 'Black Friday', percent: 15 },
      { campaignId: 'natal', name: 'Natal', percent: 10 },
    ])
  })

  it('a marcação de campanha encerrada ou desligada não aparece — a não ser a da campanha filtrada', () => {
    const marcas = [{ campaign_id: 'maes', percent: 20 }, { campaign_id: 'off', percent: 5 }]
    expect(rowCampaignMarks(marcas, TODAS, AGORA, null)).toEqual([])
    expect(rowCampaignMarks(marcas, TODAS, AGORA, 'maes')).toEqual([
      { campaignId: 'maes', name: 'Dia das Mães', percent: 20 },
    ])
  })

  it('peça sem marcação, ou campanha ainda não carregada, não diz nada', () => {
    expect(rowCampaignMarks([], TODAS, AGORA, null)).toEqual([])
    expect(rowCampaignMarks(undefined, TODAS, AGORA, null)).toEqual([])
    expect(rowCampaignMarks([{ campaign_id: 'bf', percent: 15 }], [], AGORA, 'bf')).toEqual([])
  })
})
