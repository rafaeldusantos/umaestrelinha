import { describe, expect, it } from 'vitest'
import { PRODUCT_CAMPAIGNS_EMBED, PRODUCT_CARD_SELECT, PRODUCT_SELECT, mapDbToProduct } from '../mapProduct'
import { BUY_TOGETHER_SELECT } from '../../api/useBuyTogetherData'
import { productItem } from '@/shared/lib/analytics/items'
import { toAnalyticsItem } from '@estrelinha/core/analytics'

// As outras leituras de preço da loja — a busca e as listagens (`PRODUCT_CARD_SELECT`), a página,
// o order bump e o carrinho abandonado (`PRODUCT_SELECT`), o Compre Junto (o enxuto embutido no
// `BUY_TOGETHER_SELECT`) e os eventos do GA4 (`productItem`) — leem o preço EFETIVO porque todas
// passam pelo mapeador com a marcação embutida. Nenhuma recalcula a campanha.

describe('toda leitura de produto da loja traz a marcação de campanha', () => {
  it.each([
    ['as listagens e a busca', PRODUCT_CARD_SELECT],
    ['a página, o order bump e o carrinho abandonado', PRODUCT_SELECT],
    ['o Compre Junto (peça e listas)', BUY_TOGETHER_SELECT],
  ])('%s', (_nome, select) => {
    expect(select).toContain(PRODUCT_CAMPAIGNS_EMBED)
  })

  it('o Compre Junto embute o enxuto nas DUAS pontas — o adicional direto e a peça da lista', () => {
    expect(BUY_TOGETHER_SELECT.split(PRODUCT_CAMPAIGNS_EMBED)).toHaveLength(3)
  })
})

describe('os eventos do GA4 levam o preço efetivo da peça de campanha', () => {
  it('o item da vitrine sai com R$ 167,92, não com os R$ 209,90 cheios', () => {
    const p = mapDbToProduct({
      id: 'p1',
      name: 'Pingente',
      slug: 'pingente',
      base_price: 209.9,
      product_campaigns: [
        {
          percent: 20,
          campaigns: { id: 'c', name: 'Black Friday', badge_text: 'Black Friday', band_color: '#161514', accent_color: '#C2A063', ends_at: '2026-12-01T03:00:00Z' },
        },
      ],
    })
    expect(toAnalyticsItem(productItem(p)).price).toBe(167.92)
  })
})
