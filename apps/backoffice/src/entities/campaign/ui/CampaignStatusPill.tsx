// A pílula do estado da campanha: Em vigência (verde), Agendada (azul), Encerrada (cinza) e
// Desligada (âmbar). O estado é de `core` (`campaignStatus`); esta peça só o desenha.

import { CAMPAIGN_STATUS_LABELS, type CampaignStatus } from '@estrelinha/core/campaigns'
import { cn } from '@estrelinha/ui/lib/utils'

const TOM: Record<CampaignStatus, string> = {
  'em-vigencia': 'bg-emerald-500/15 text-emerald-800',
  agendada: 'bg-sky-500/15 text-sky-800',
  encerrada: 'bg-muted text-muted-foreground',
  desligada: 'bg-amber-500/15 text-amber-800',
}

const CampaignStatusPill = ({ status }: { status: CampaignStatus }) => (
  <span
    data-estado={status}
    className={cn('inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-semibold', TOM[status])}
  >
    {CAMPAIGN_STATUS_LABELS[status]}
  </span>
)

export default CampaignStatusPill
