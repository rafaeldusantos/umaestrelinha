import type { SituationTone } from '@estrelinha/core/orders'
import { PROPOSAL_STATE_LABELS, type ProposalState } from '@estrelinha/core/proposals'

import Selo from '@/shared/ui/Selo'

/**
 * O selo do pedido montado. O RÓTULO é de `core` (`PROPOSAL_STATE_LABELS`, o mesmo do painel); aqui só
 * o tom: aberta em andamento, concluída em feito, expirada em espera, cancelada neutra.
 */
const tomDe = (estado: ProposalState): SituationTone => {
  if (estado === 'completed') return 'done'
  if (estado === 'expired') return 'wait'
  if (estado === 'open' || estado === 'viewed') return 'progress'
  return 'neutral'
}

const SeloDoMontado = ({ estado }: { estado: ProposalState }) => (
  <Selo tom={tomDe(estado)} dados={{ 'data-estado': estado }}>
    {PROPOSAL_STATE_LABELS[estado]}
  </Selo>
)

export default SeloDoMontado
