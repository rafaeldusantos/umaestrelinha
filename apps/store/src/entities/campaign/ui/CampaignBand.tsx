// A faixa da campanha no pé da foto do cartão: 30 px, ponta a ponta, cortada pelos cantos do
// contêiner da foto (o pai tem `overflow-hidden` e os cantos de 20 px).
//
// Duas partes: o texto do selo (ocupa o resto; cor de destaque sobre a cor da faixa; não quebra, e o
// excesso é cortado sem reticências) e o percentual (cor da faixa sobre o destaque; nunca encolhe).
// As cores vêm da campanha, por `style` — nunca de um token da paleta da loja: mudar a paleta não
// muda o selo.

import { campaignPercentBadge } from '@estrelinha/core/campaigns'
import type { ProductCampaign } from '@estrelinha/supabase/types'

interface Props {
  campaign: Pick<ProductCampaign, 'badge_text' | 'band_color' | 'accent_color'>
  percent: number
}

const CampaignBand = ({ campaign, percent }: Props) => (
  <div
    role="img"
    aria-label={`${campaign.badge_text}, ${percent}% de desconto`}
    data-testid="faixa-da-campanha"
    className="absolute inset-x-0 bottom-0 z-10 flex h-[30px]"
  >
    <span
      aria-hidden="true"
      className="flex min-w-0 flex-1 items-center overflow-hidden whitespace-nowrap pl-[12px] pr-[8px] text-[11px] font-bold uppercase tracking-[0.08em]"
      style={{ backgroundColor: campaign.band_color, color: campaign.accent_color }}
    >
      {campaign.badge_text}
    </span>
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center whitespace-nowrap px-[11px] text-[13px] font-bold"
      style={{ backgroundColor: campaign.accent_color, color: campaign.band_color }}
    >
      {campaignPercentBadge(percent)}
    </span>
  </div>
)

export default CampaignBand
