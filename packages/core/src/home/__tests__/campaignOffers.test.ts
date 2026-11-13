import { describe, it, expect } from 'vitest'
import {
  CAMPAIGN_OFFERS_PATH,
  campaignOffersHref,
  campaignOffersIntro,
  campaignPercentCardLabel,
  campaignPercentCards,
} from '../index'

/**
 * O bloco "Joias em oferta" — as frases e os endereços.
 *
 * O bloco não tem campo: tudo o que ele diz vem da campanha em vigência. O que se prova aqui é a
 * escrita que a loja desenha — um cartão por percentual, cada um levando à vitrine recortada.
 */

describe('campaignOffersHref', () => {
  it('sem percentual, a vitrine inteira', () => {
    expect(campaignOffersHref()).toBe('/ofertas')
    expect(campaignOffersHref(null)).toBe('/ofertas')
    expect(CAMPAIGN_OFFERS_PATH).toBe('/ofertas')
  })

  it('com percentual, a vitrine recortada por `?percentual=`', () => {
    expect(campaignOffersHref(15)).toBe('/ofertas?percentual=15')
  })
})

describe('campaignPercentCards', () => {
  it('um cartão por percentual, em ordem crescente e sem repetir', () => {
    expect(campaignPercentCards([20, 10, 15, 10])).toEqual([
      { percent: 10, href: '/ofertas?percentual=10', label: 'Ver as peças com 10% de desconto' },
      { percent: 15, href: '/ofertas?percentual=15', label: 'Ver as peças com 15% de desconto' },
      { percent: 20, href: '/ofertas?percentual=20', label: 'Ver as peças com 20% de desconto' },
    ])
  })

  it('de um a cinco cartões', () => {
    expect(campaignPercentCards([30])).toHaveLength(1)
    expect(campaignPercentCards([5, 10, 15, 20, 25])).toHaveLength(5)
    expect(campaignPercentCards([])).toEqual([])
  })
})

describe('as frases do bloco', () => {
  it('o texto lista os percentuais da campanha', () => {
    expect(campaignOffersIntro([20, 10, 15])).toBe(
      'Peças selecionadas com 10%, 15% e 20% de desconto. O valor de cada joia já aparece com o desconto.',
    )
    expect(campaignOffersIntro([25])).toBe(
      'Peças selecionadas com 25% de desconto. O valor de cada joia já aparece com o desconto.',
    )
  })

  it('o nome acessível do cartão diz o percentual', () => {
    expect(campaignPercentCardLabel(20)).toBe('Ver as peças com 20% de desconto')
  })

  it('tom: nada de contagem regressiva nem de escassez', () => {
    const frases = [campaignOffersIntro([10, 20]), campaignPercentCardLabel(10)].join(' ')
    expect(frases).not.toMatch(/últimas|horas|corra|acaba|restam|só hoje|!/i)
  })
})
