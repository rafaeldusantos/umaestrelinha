// A campanha de desconto na linha da lista de produtos: o nome e o percentual de cada campanha
// aberta em que a peça está. O texto quebra linha em vez de cortar — o percentual nunca some.

import type { RowCampaignMark } from '../model/campaignMarks'

interface Props {
  marks: RowCampaignMark[]
}

const CampaignMarksCell = ({ marks }: Props) => {
  if (marks.length === 0) return null
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {marks.map(mark => (
        <span
          key={mark.campaignId}
          className="max-w-full break-words rounded-full border border-border bg-muted px-1.5 text-[11px] font-medium leading-5 text-foreground"
        >
          {`${mark.name} · ${mark.percent}%`}
        </span>
      ))}
    </div>
  )
}

export default CampaignMarksCell
