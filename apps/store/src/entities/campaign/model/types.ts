import type { ProductCampaign } from '@estrelinha/supabase/types'

/**
 * A campanha em vigência, como a loja a lê da policy pública de `campaigns` (filtrada por `now()`
 * no banco): o que o selo, a vitrine e o bloco da Home precisam. `ends_at` é EXCLUSIVO — quem
 * mostra a data usa `campaignShowcaseLine`/`lastMinuteOf` de `@estrelinha/core/campaigns`.
 */
export interface LiveCampaign extends Omit<ProductCampaign, 'percent' | 'list_prices'> {
  /** Os percentuais que a campanha oferece, em ordem crescente e sem repetir. */
  percents: number[]
}
