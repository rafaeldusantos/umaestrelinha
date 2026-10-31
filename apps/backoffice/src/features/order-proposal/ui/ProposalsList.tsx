// A aba "Montados" da lista de Pedidos (feature 89, `LNK-04`, `A-14`).
//
// Cada proposta com número, cliente, total, criada em e o estado — Aberta, Aberta — vista pela
// cliente, Concluída (com o link do pedido), Expirada, Cancelada. O estado vem do servidor
// (`proposalState`, `core`) e o rótulo de `PROPOSAL_STATE_LABELS`; nada é decidido aqui.
//
// **A releitura não pisca**: o esqueleto é só da primeira carga (sem dado). Com dado na tela, uma
// releitura — ou uma releitura que falhou — mantém as linhas (o defeito da `50`).
//
// Abaixo de `md` cada proposta é um cartão; a partir de `md`, uma tabela. Os dois existem no DOM
// (quem esconde é a media query).

import { Link } from 'react-router-dom'
import { formatPrice } from '@estrelinha/core/formatters'
import { formatOrderNumber } from '@estrelinha/core/orders'
import { PROPOSAL_STATE_LABELS } from '@estrelinha/core/proposals'
import { ActionButton, EmptyState, TableSkeleton } from '@/shared/ui'
import { useProposalList, type ProposalListItem } from '../api/proposalsApi'
import { PROPOSAL_BUILDER_PATH, PROPOSAL_PAGE_PATH, PROPOSALS_EMPTY, PROPOSALS_READ_FAILED } from '../model/copy'
import { formatDate } from '../model/format'

const Pedido = ({ p }: { p: ProposalListItem }) =>
  p.state === 'completed' && p.order_id ? (
    <Link to={`/admin/pedidos/${p.order_id}`} className="font-medium text-primary underline">
      Pedido {p.order_number ? formatOrderNumber(p.order_number) : ''}
    </Link>
  ) : null

const ProposalsList = () => {
  const { data, isLoading, error, refetch, isFetching } = useProposalList()
  const lista = data ?? []

  if (isLoading && !data) return <TableSkeleton />

  if (error && !data) {
    return (
      <div className="space-y-2 rounded-xl border border-border p-4">
        <p role="alert" className="text-sm text-destructive">
          {/* A frase é da aba ("pedidos montados"), não a do cliente da function, que diz "propostas". */}
          {PROPOSALS_READ_FAILED}
        </p>
        <ActionButton variant="outline" alvo44 pending={isFetching} pendingLabel="Lendo…" onClick={() => refetch()}>
          Tentar de novo
        </ActionButton>
      </div>
    )
  }

  if (lista.length === 0) {
    return (
      <EmptyState
        message={PROPOSALS_EMPTY}
        hint="Monte um pedido para uma cliente e mande o link."
        action={
          <Link to={PROPOSAL_BUILDER_PATH} className="inline-flex min-h-11 items-center text-sm font-medium text-primary underline">
            Montar pedido
          </Link>
        }
      />
    )
  }

  return (
    <div data-testid="lista-de-montados">
      {error && (
        <p role="alert" className="mb-2 text-sm text-destructive">
          {PROPOSALS_READ_FAILED} Mostrando a última leitura.
        </p>
      )}

      <ul aria-label="Pedidos montados" className="space-y-2 md:hidden">
        {lista.map((p) => (
          <li key={p.id} className="rounded-xl border border-border bg-estrelinha-admin-card p-3 text-sm">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <Link to={PROPOSAL_PAGE_PATH(p.id)} className="inline-flex min-h-11 items-center font-semibold text-foreground underline">
                {p.number} · {p.customer_name}
              </Link>
              <span className="tabular-nums">{formatPrice(p.items_total)}</span>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2 text-muted-foreground">
              <span>{PROPOSAL_STATE_LABELS[p.state]}</span>
              <span>Criada em {formatDate(p.created_at)}</span>
            </div>
            <Pedido p={p} />
          </li>
        ))}
      </ul>

      <div className="hidden md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs text-muted-foreground">
              <th className="py-2 pr-3 font-medium">Número</th>
              <th className="py-2 pr-3 font-medium">Cliente</th>
              <th className="py-2 pr-3 text-right font-medium">Total</th>
              <th className="py-2 pr-3 font-medium">Criada em</th>
              <th className="py-2 font-medium">Estado</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.id} className="border-b border-border">
                <td className="py-2 pr-3">
                  <Link to={PROPOSAL_PAGE_PATH(p.id)} className="font-medium text-primary underline">
                    {p.number}
                  </Link>
                </td>
                <td className="py-2 pr-3">{p.customer_name}</td>
                <td className="py-2 pr-3 text-right tabular-nums">{formatPrice(p.items_total)}</td>
                <td className="py-2 pr-3">{formatDate(p.created_at)}</td>
                <td className="py-2">
                  <span className="mr-2">{PROPOSAL_STATE_LABELS[p.state]}</span>
                  <Pedido p={p} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ProposalsList
