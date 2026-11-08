// A origem do pedido que nasceu de uma proposta (feature 89, `HIS-02`).
//
// "Pedido montado · P-0001", com link para a proposta, no subtítulo do pedido; e a linha
// "Desconto combinado — {motivo}" no Pagamento. O número e o motivo moram em `order_proposals`, que o
// navegador não lê (RLS sem policy, `SEG-05`): vêm da function `order-proposals?action=get`, pela
// mesma consulta (`useProposal`) que a página da proposta usa. O VALOR do desconto é do pedido
// (`orders.manual_discount`), que é o que foi cobrado.
//
// Os dois só são montados quando o pedido TEM `proposal_id`: o pedido da loja continua exatamente
// como antes, sem consulta nova.

import { Link } from 'react-router-dom'
import { formatPrice } from '@estrelinha/core/formatters'
import { useProposal } from '../api/proposalsApi'
import { MANUAL_DISCOUNT_LABEL, ORDER_ORIGIN_PREFIX, PROPOSAL_PAGE_PATH } from '../model/copy'

/**
 * O que o pedido sabe da proposta. `DbOrder` (em `packages/supabase`) ainda não declara as duas
 * colunas da migration da `89`; a página lê `select('*')`, então elas chegam.
 */
// SPEC_DEVIATION: a T20 pede `DbOrder.proposal_id`/`manual_discount`, mas `packages/supabase` não é
// arquivo desta parte (propriedade `apps/backoffice/**`). O tipo local descreve as duas colunas até
// o dono de `packages/supabase` acrescentá-las.
export interface PedidoComOrigem {
  proposal_id?: string | null
  manual_discount?: number | string | null
}

export const ProposalOriginLine = ({ proposalId }: { proposalId: string }) => {
  const { data } = useProposal(proposalId)
  const numero = data?.proposal?.number
  return (
    <span data-testid="origem-do-pedido">
      {' · '}
      <Link to={PROPOSAL_PAGE_PATH(proposalId)} className="text-primary underline">
        {numero ? `${ORDER_ORIGIN_PREFIX} · ${numero}` : ORDER_ORIGIN_PREFIX}
      </Link>
    </span>
  )
}

export const ManualDiscountRow = ({ proposalId, amount }: { proposalId: string; amount: number }) => {
  const { data } = useProposal(proposalId)
  const motivo = data?.proposal?.manual_discount_reason?.trim()
  return (
    <div data-testid="desconto-combinado" className="flex flex-wrap justify-between gap-x-3">
      <dt className="text-muted-foreground">
        {motivo ? `${MANUAL_DISCOUNT_LABEL} — ${motivo}` : MANUAL_DISCOUNT_LABEL}
      </dt>
      <dd className="shrink-0">− {formatPrice(amount)}</dd>
    </div>
  )
}
