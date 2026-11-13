// A prévia do cartão do celular (173 px) com a faixa da campanha colada no pé da foto — o que a dona
// vê enquanto digita o texto do selo e escolhe as cores.
//
// A faixa tem 30 px, ponta a ponta, e duas partes: o texto (ocupa o resto; cor de destaque sobre a
// faixa; não quebra, e o excesso é cortado sem reticências) e o percentual (cor da faixa sobre o
// destaque). O preço é o de `core` (`campaignUnitPrice`), o mesmo que a loja vai cobrar.

import { campaignPercentBadge, campaignUnitPrice } from '@estrelinha/core/campaigns'
import { formatPrice } from '@estrelinha/core/formatters'
import { PREVIEW_FALLBACK_PERCENT, PREVIEW_PIECE, drawnBadgeText, drawnColors } from './badgeColors'

interface Props {
  text: string
  band: string
  accent: string
  /** O maior percentual da campanha, ou `null` sem nenhum. */
  percent: number | null
}

const CampaignCardPreview = ({ text, band, accent, percent }: Props) => {
  const cores = drawnColors(band, accent)
  const texto = drawnBadgeText(text)
  const pct = percent ?? PREVIEW_FALLBACK_PERCENT
  const preco = campaignUnitPrice(PREVIEW_PIECE.price, null, pct)
  return (
    <div data-testid="previa-do-cartao" className="w-[173px] shrink-0">
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-[20px] bg-muted">
        <div
          role="img"
          aria-label={`${texto}, ${pct}% de desconto`}
          data-testid="faixa-da-campanha"
          className="absolute inset-x-0 bottom-0 flex h-[30px]"
        >
          <span
            aria-hidden="true"
            data-testid="faixa-texto"
            className="flex min-w-0 flex-1 items-center overflow-hidden whitespace-nowrap pl-[12px] pr-[8px] text-[11px] font-bold uppercase tracking-[0.08em]"
            style={{ backgroundColor: cores.band, color: cores.accent }}
          >
            {texto}
          </span>
          <span
            aria-hidden="true"
            data-testid="faixa-percentual"
            className="flex shrink-0 items-center px-[11px] text-[13px] font-bold"
            style={{ backgroundColor: cores.accent, color: cores.band }}
          >
            {campaignPercentBadge(pct)}
          </span>
        </div>
      </div>
      <p className="mt-2 line-clamp-2 text-[13px] leading-tight text-foreground">{PREVIEW_PIECE.name}</p>
      <p className="mt-1 text-[12px] text-muted-foreground line-through">
        <span className="sr-only">De </span>
        {formatPrice(preco.full)}
      </p>
      <p data-testid="previa-preco" className="text-[15px] font-bold text-foreground">
        {formatPrice(preco.charged)}
      </p>
    </div>
  )
}

export default CampaignCardPreview
