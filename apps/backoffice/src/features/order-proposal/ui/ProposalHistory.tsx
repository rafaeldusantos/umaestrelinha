// O histórico da proposta (feature 89, `HIS-01`): criada, editada, link enviado, vista, renovada,
// cancelada, concluída — com data e autor. O mais recente em cima.
//
// O autor é `actor_email`, resolvido pela function; o uuid de `actor` nunca é desenhado (achado da
// prova em navegador da T27 — o painel mostrava o uuid cru).

import { formatDateTime } from '../model/format'
import { FormCard } from '@/shared/ui'
import type { ProposalEvent } from '../api/proposalsApi'
import { PROPOSAL_CHANNEL_LABELS, PROPOSAL_EVENT_LABELS } from '../model/copy'

interface Props {
  events: readonly ProposalEvent[]
}

const ProposalHistory = ({ events }: Props) => {
  const ordem = [...events].sort((a, b) => b.created_at.localeCompare(a.created_at))
  return (
    <FormCard title="Histórico">
      {ordem.length === 0 ? (
        <p className="text-sm text-muted-foreground">Nada registrado ainda.</p>
      ) : (
        <ol aria-label="Histórico da proposta" className="space-y-2">
          {ordem.map((e, i) => {
            const canal = e.channel ? PROPOSAL_CHANNEL_LABELS[e.channel] : null
            return (
              <li key={`${e.kind}-${e.created_at}-${i}`} className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                <span className="font-medium text-foreground">
                  {PROPOSAL_EVENT_LABELS[e.kind] ?? e.kind}
                  {canal ? ` · ${canal}` : ''}
                </span>
                <span className="min-w-0 text-xs text-muted-foreground [overflow-wrap:anywhere]">
                  {formatDateTime(e.created_at)}
                  {e.actor_email ? ` · ${e.actor_email}` : ''}
                </span>
              </li>
            )
          })}
        </ol>
      )}
    </FormCard>
  )
}

export default ProposalHistory
