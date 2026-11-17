// A campanha que já tem outro bloco "Joias em oferta" — no seletor do editor e na colisão da
// gravação, com a MESMA frase de `core`.

import { describe, expect, it } from 'vitest'
import { campaignOffersTakenText, type HomeSection } from '@estrelinha/core/home'
import { campaignCollisionText, campaignsTaken, isCampaignCollision } from '../campaignOffersTaken'

const secao = (id: string, position: number, over: Partial<HomeSection> = {}): HomeSection => ({
  id,
  type: 'campaign_offers',
  position,
  active: true,
  config: {},
  items: [],
  campaign_id: null,
  ...over,
})

const SECOES: HomeSection[] = [
  secao('hero', 1, { type: 'hero' }),
  secao('natal', 2, { campaign_id: 'c-natal', config: { title: 'Presentes de Natal' } }),
  secao('maes', 3, { campaign_id: 'c-maes' }),
  secao('esta', 4, { campaign_id: 'c-pascoa' }),
]

const nomeDa = (id: string) => ({ 'c-natal': 'Natal 2026', 'c-maes': 'Dia das Mães' })[id] ?? ''

describe('campaignsTaken — as campanhas que outro bloco já usa', () => {
  it('cada uma com a posição e o título do outro bloco; a do próprio bloco não conta', () => {
    const tomadas = campaignsTaken(SECOES, 'esta', nomeDa)
    expect([...tomadas.keys()].sort()).toEqual(['c-maes', 'c-natal'])
    expect(tomadas.get('c-natal')).toBe(campaignOffersTakenText(2, 'Presentes de Natal'))
    // Sem título da dona, o bloco aparece com o nome da campanha.
    expect(tomadas.get('c-maes')).toBe(campaignOffersTakenText(3, 'Dia das Mães'))
    expect(tomadas.has('c-pascoa')).toBe(false)
  })

  it('a posição é a da lista da Home, não a coluna crua', () => {
    const fora = [secao('b', 50, { campaign_id: 'c-natal' }), secao('a', 10, { type: 'hero' }), secao('esta', 60)]
    expect(campaignsTaken(fora, 'esta', nomeDa).get('c-natal')).toBe(campaignOffersTakenText(2, 'Natal 2026'))
  })
})

describe('a colisão do índice "um bloco por campanha"', () => {
  const colisao = {
    code: '23505',
    message: 'duplicate key value violates unique constraint "home_sections_campaign_offers_campaign_idx"',
  }

  it('é reconhecida pelo código E pelo nome do índice', () => {
    expect(isCampaignCollision(colisao)).toBe(true)
    expect(isCampaignCollision({ code: '23505', message: 'duplicate key value violates unique constraint "home_sections_unique_types_idx"' })).toBe(false)
    expect(isCampaignCollision({ message: colisao.message })).toBe(false)
    expect(isCampaignCollision(null)).toBe(false)
  })

  it('vira a frase do seletor, com o bloco que já tem a campanha', () => {
    expect(campaignCollisionText(SECOES, 'esta', 'c-natal', nomeDa)).toBe(
      campaignOffersTakenText(2, 'Presentes de Natal'),
    )
  })

  it('sem o outro bloco na lista, não há frase a montar', () => {
    expect(campaignCollisionText(SECOES, 'esta', 'c-outra', nomeDa)).toBeNull()
  })
})
