// Em que pé está uma proposta (LNK-04, LNK-05, LNK-06). Folha sem import.
//
// "Expirada" é DERIVADA de `expires_at`, nunca gravada: sem cron, e sem um segundo dono de "venceu?".
// A régua é a mesma de `accessGrant` (`core/checkout/guestAccess.ts`): no instante exato de
// `expires_at` o link já não vale. A cópia SQL (a RPC que conclui) tem de usar o mesmo lado.

export type ProposalStatus = 'open' | 'completed' | 'cancelled'
export type ProposalState = 'open' | 'viewed' | 'completed' | 'expired' | 'cancelled'

export interface ProposalStateRow {
  status: ProposalStatus
  expires_at: string | null
  viewed_at: string | null
}

export const PROPOSAL_STATE_LABELS: Record<ProposalState, string> = {
  open: 'Aberta',
  viewed: 'Aberta — vista pela cliente',
  completed: 'Concluída',
  expired: 'Expirada',
  cancelled: 'Cancelada',
}

/** O link ainda vale neste instante? Sem prazo legível, não vale. */
export function proposalLinkValid(expiresAt: string | null | undefined, now: Date): boolean {
  if (!expiresAt) return false
  const limite = new Date(expiresAt).getTime()
  if (Number.isNaN(limite)) return false
  return limite > now.getTime()
}

export function proposalState(row: ProposalStateRow, now: Date): ProposalState {
  if (row.status === 'completed') return 'completed'
  if (row.status === 'cancelled') return 'cancelled'
  if (!proposalLinkValid(row.expires_at, now)) return 'expired'
  return row.viewed_at ? 'viewed' : 'open'
}

export interface ProposalActions {
  /** Editar mantém o link e sobe a versão (LNK-05). */
  edit: boolean
  /** Renovar gera link novo e mata o antigo (LNK-05); a expirada também renova (LNK-06). */
  renew: boolean
  cancel: boolean
  /** Duplicar vale em qualquer estado (DUP-01). */
  duplicate: boolean
  /** Concluída leva ao pedido (LNK-04). */
  viewOrder: boolean
}

export function proposalActions(state: ProposalState): ProposalActions {
  const aberta = state === 'open' || state === 'viewed'
  return {
    edit: aberta,
    renew: aberta || state === 'expired',
    cancel: aberta,
    duplicate: true,
    viewOrder: state === 'completed',
  }
}
