import { describe, expect, it } from 'vitest'
import { CAMPAIGN_STATUS_LABELS, campaignStatus, isCampaignLive } from '../index.ts'

// Black Friday: 13/11 00:00 a 30/11 23:59 em Brasília (UTC−3). `ends_at` é exclusivo: 01/12 00:00.
const BF = { starts_at: '2026-11-13T03:00:00.000Z', ends_at: '2026-12-01T03:00:00.000Z', active: true }

describe('isCampaignLive — início inclusivo, fim exclusivo, desligada nunca vale', () => {
  it('vale no instante exato do início', () => {
    expect(isCampaignLive(BF, '2026-11-13T03:00:00.000Z')).toBe(true)
  })

  it('não vale um milissegundo antes do início', () => {
    expect(isCampaignLive(BF, Date.parse('2026-11-13T03:00:00.000Z') - 1)).toBe(false)
  })

  it('vale no último minuto (30/11 23:59:59.999)', () => {
    expect(isCampaignLive(BF, Date.parse('2026-12-01T03:00:00.000Z') - 1)).toBe(true)
  })

  it('não vale no instante do fim', () => {
    expect(isCampaignLive(BF, new Date('2026-12-01T03:00:00.000Z'))).toBe(false)
  })

  it('desligada não vale nem no meio da vigência', () => {
    expect(isCampaignLive({ ...BF, active: false }, '2026-11-20T12:00:00.000Z')).toBe(false)
  })
})

describe('campaignStatus — os quatro estados', () => {
  it('ligada e dentro da vigência ⇒ Em vigência', () => {
    expect(campaignStatus(BF, '2026-11-20T12:00:00.000Z')).toBe('em-vigencia')
  })

  it('ligada e antes do início ⇒ Agendada', () => {
    expect(campaignStatus(BF, '2026-11-10T12:00:00.000Z')).toBe('agendada')
  })

  it('desligada com fim futuro ⇒ Desligada (antes e durante a vigência)', () => {
    expect(campaignStatus({ ...BF, active: false }, '2026-11-10T12:00:00.000Z')).toBe('desligada')
    expect(campaignStatus({ ...BF, active: false }, '2026-11-20T12:00:00.000Z')).toBe('desligada')
  })

  it('fim passado ⇒ Encerrada, e o encerramento vence o interruptor', () => {
    expect(campaignStatus(BF, '2026-12-01T03:00:00.000Z')).toBe('encerrada')
    expect(campaignStatus({ ...BF, active: false }, '2026-12-05T12:00:00.000Z')).toBe('encerrada')
  })

  it('os rótulos da lista', () => {
    expect(CAMPAIGN_STATUS_LABELS).toEqual({
      'em-vigencia': 'Em vigência',
      agendada: 'Agendada',
      encerrada: 'Encerrada',
      desligada: 'Desligada',
    })
  })
})
