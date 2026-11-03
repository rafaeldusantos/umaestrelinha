// O selo do estado de um pedido montado — o mesmo desenho dos selos da lista de Pedidos
// (`StatusBadge`, `PaymentStatusBadge`): pílula com borda, fundo de 50 e texto de 800.
//
// O rótulo é de `PROPOSAL_STATE_LABELS` (`core`); aqui só mora a cor. As cores seguem o vocabulário
// que a lista de Pedidos já ensinou: âmbar espera a cliente, verde concluiu, cinza venceu (como o
// pagamento expirado), vermelho foi cancelado. "Vista pela cliente" é azul: ainda espera, mas andou.

import type { ProposalState } from '@estrelinha/core/proposals'
import { PROPOSAL_STATE_LABELS } from '@estrelinha/core/proposals'

const estilos: Record<ProposalState, string> = {
  open: 'bg-amber-50 text-amber-800 border-amber-200',
  viewed: 'bg-blue-50 text-blue-800 border-blue-200',
  completed: 'bg-green-50 text-green-800 border-green-200',
  expired: 'bg-slate-100 text-slate-600 border-slate-200',
  cancelled: 'bg-red-50 text-red-800 border-red-200',
}

const ProposalStateBadge = ({ state }: { state: ProposalState }) => (
  <span
    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
      estilos[state] ?? 'bg-muted text-muted-foreground border-border'
    }`}
  >
    {PROPOSAL_STATE_LABELS[state] ?? state}
  </span>
)

export default ProposalStateBadge
