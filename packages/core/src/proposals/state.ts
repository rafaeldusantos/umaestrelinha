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
  /**
   * Renovar gera link novo e mata o antigo (LNK-05). Só a expirada renova (LNK-06) — e a aberta/vista
   * cujo link não está disponível (gravada sem cifra, ou sem a chave configurada): para ela, renovar é
   * o único jeito de ter um link para mandar (o recuo da proposta sem cifra).
   */
  renew: boolean
  /** O rótulo de renovar: "Renovar prazo" na expirada, "Gerar link novo" no recuo; `null` sem renovar. */
  renewLabel: ProposalRenewLabel | null
  cancel: boolean
  /** Duplicar vale em qualquer estado (DUP-01). */
  duplicate: boolean
  /** Concluída leva ao pedido (LNK-04). */
  viewOrder: boolean
}

export const RENEW_EXPIRED_LABEL = 'Renovar prazo'
export const RENEW_WITHOUT_LINK_LABEL = 'Gerar link novo'
export type ProposalRenewLabel = typeof RENEW_EXPIRED_LABEL | typeof RENEW_WITHOUT_LINK_LABEL

export interface ProposalActionsInput {
  /**
   * O link desta proposta pode ser mostrado agora (o `get` o devolveu). Ausente vale `false`: sem a
   * certeza de ter o link, a aberta oferece gerar um novo, que é o comportamento seguro.
   */
  linkAvailable?: boolean
}

export function proposalActions(state: ProposalState, input: ProposalActionsInput = {}): ProposalActions {
  const aberta = state === 'open' || state === 'viewed'
  const expirada = state === 'expired'
  const semLink = aberta && input.linkAvailable !== true
  return {
    edit: aberta,
    renew: expirada || semLink,
    renewLabel: expirada ? RENEW_EXPIRED_LABEL : semLink ? RENEW_WITHOUT_LINK_LABEL : null,
    cancel: aberta,
    duplicate: true,
    viewOrder: state === 'completed',
  }
}
