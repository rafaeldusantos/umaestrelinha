// O selo EM LINHA da campanha: o da página da peça e o da sacola, e o que a lista do painel mostra
// antes do nome. As duas cores vêm da campanha, por `style` — nunca de um token da paleta: mudar a
// paleta da loja não muda o selo.
//
// Usadas CRUZADAS: o texto sai na cor de destaque sobre a faixa, e o percentual na cor da faixa sobre
// o destaque.

import { campaignPercentBadge } from '@estrelinha/core/campaigns'
import { drawnBadgeText, drawnColors } from './badgeColors'

interface Props {
  text: string
  band: string
  accent: string
  /** O percentual mostrado (o maior da campanha, na lista). Sem ele, o selo é só o texto. */
  percent: number | null
}

const CampaignBadgeInline = ({ text, band, accent, percent }: Props) => {
  const cores = drawnColors(band, accent)
  const texto = drawnBadgeText(text)
  const nome = percent === null ? texto : `${texto}, ${percent}% de desconto`
  return (
    <span
      role="img"
      aria-label={nome}
      data-testid="selo-em-linha"
      className="inline-flex h-[26px] max-w-full shrink-0 items-stretch overflow-hidden rounded-[6px] align-middle"
    >
      <span
        aria-hidden="true"
        className="flex min-w-0 items-center whitespace-nowrap pl-[10px] pr-[9px] text-[11px] font-bold uppercase tracking-[0.08em]"
        style={{ backgroundColor: cores.band, color: cores.accent }}
      >
        {texto}
      </span>
      {percent !== null && (
        <span
          aria-hidden="true"
          className="flex shrink-0 items-center px-[9px] text-[12px] font-bold"
          style={{ backgroundColor: cores.accent, color: cores.band }}
        >
          {campaignPercentBadge(percent)}
        </span>
      )}
    </span>
  )
}

export default CampaignBadgeInline
