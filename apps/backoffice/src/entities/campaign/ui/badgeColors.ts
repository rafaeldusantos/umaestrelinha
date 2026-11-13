// As cores e o texto que o selo DESENHA: o que a dona digitou, ou o padrão quando o que ela digitou
// ainda não serve (cor fora de `#RRGGBB`, texto vazio). Só a prévia cai no padrão — gravar uma cor
// inválida é recusado antes (`campaignColorsRefusal`).

import { CAMPAIGN_DEFAULT_COLORS, CAMPAIGN_HEX, type CampaignColors } from '@estrelinha/core/campaigns'

export const drawnColors = (band: string, accent: string): CampaignColors =>
  CAMPAIGN_HEX.test(band ?? '') && CAMPAIGN_HEX.test(accent ?? '') ? { band, accent } : CAMPAIGN_DEFAULT_COLORS

/** O texto que sai no selo: o da campanha, ou "Campanha" enquanto ela não tem texto. */
export const drawnBadgeText = (text: string): string => ((text ?? '').trim() === '' ? 'Campanha' : text.trim())

/** A peça de exemplo da prévia do cartão. */
export const PREVIEW_PIECE = { name: 'Joia Afetiva com Dente de Leite', price: 179.9 }

/** Sem percentual na campanha, a prévia mostra 10. */
export const PREVIEW_FALLBACK_PERCENT = 10
