// O selo da campanha EM LINHA: o da página do produto (acima do nome) e o da sacola (no lugar do
// chip de desconto). É a mesma faixa do cartão em 26 px, com cantos de 6 px; o texto com folga
// 10/9 px e o percentual em 12 px com folga 9 px.
//
// As cores vêm da campanha, por `style` — nunca de um token da paleta da loja —, e são usadas
// cruzadas: o texto na cor de destaque sobre a faixa, o percentual na cor da faixa sobre o destaque.

import { campaignPercentBadge } from '@estrelinha/core/campaigns'
import type { ProductCampaign } from '@estrelinha/supabase/types'

interface Props {
  campaign: Pick<ProductCampaign, 'badge_text' | 'band_color' | 'accent_color'>
  percent: number
  className?: string
}

const CampaignBadgeInline = ({ campaign, percent, className }: Props) => (
  <span
    role="img"
    aria-label={`${campaign.badge_text}, ${percent}% de desconto`}
    data-testid="selo-em-linha"
    className={`inline-flex h-[26px] max-w-full shrink-0 items-stretch overflow-hidden rounded-[6px] align-middle ${className ?? ''}`}
  >
    <span
      aria-hidden="true"
      className="flex min-w-0 items-center overflow-hidden whitespace-nowrap pl-[10px] pr-[9px] text-[11px] font-bold uppercase tracking-[0.08em]"
      style={{ backgroundColor: campaign.band_color, color: campaign.accent_color }}
    >
      {campaign.badge_text}
    </span>
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center whitespace-nowrap px-[9px] text-[12px] font-bold"
      style={{ backgroundColor: campaign.accent_color, color: campaign.band_color }}
    >
      {campaignPercentBadge(percent)}
    </span>
  </span>
)

export default CampaignBadgeInline
