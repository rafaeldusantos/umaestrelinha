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
//
// **O desenho é o da lista de Pedidos, de propósito** (2026-11-01): a tabela é o `AdminTable` (cartão
// com borda, cabeçalho em caixa alta, zebra, coluna "Ações" com o olho), o estado é selo
// (`ProposalStateBadge`, no molde do `StatusBadge`), o cartão do celular tem o mesmo corpo do cartão
// do pedido (nome como alvo de 44px, número · data, total, selos, ação na largura inteira) e os
// esqueletos são os mesmos. São duas abas da mesma tela: dois desenhos de lista ali liam como
// duas telas.

import { Link } from 'react-router-dom'
import { ClipboardList, Eye } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { formatPrice } from '@estrelinha/core/formatters'
import { formatOrderNumber } from '@estrelinha/core/orders'
import { ActionButton, AdminTable, CardSkeleton, EmptyState, TableSkeleton, type AdminColumn } from '@/shared/ui'
import { useProposalList, type ProposalListItem } from '../api/proposalsApi'
import { PROPOSAL_BUILDER_PATH, PROPOSAL_PAGE_PATH, PROPOSALS_EMPTY, PROPOSALS_READ_FAILED } from '../model/copy'
import { formatDate } from '../model/format'
import ProposalStateBadge from './ProposalStateBadge'

/** O pedido que a proposta virou — só na concluída, e só com o pedido gravado. */
const Pedido = ({ p }: { p: ProposalListItem }) =>
  p.state === 'completed' && p.order_id ? (
    <Link
      to={`/admin/pedidos/${p.order_id}`}
      className="inline-flex min-h-11 items-center text-xs font-medium text-primary hover:underline md:min-h-0"
    >
      Pedido {p.order_number ? formatOrderNumber(p.order_number) : ''}
    </Link>
  ) : null

const contagem = (n: number) => (n === 1 ? '1 pedido montado' : `${n} pedidos montados`)

const colunas: AdminColumn<ProposalListItem>[] = [
  {
    key: 'number',
    header: 'Número',
    cell: (p) => (
      <Link to={PROPOSAL_PAGE_PATH(p.id)} className="font-medium hover:underline">
        {p.number}
      </Link>
    ),
  },
  {
    key: 'customer',
    header: 'Cliente',
    cell: (p) => (
      <span className="block min-w-0">
        <span className="block font-medium">{p.customer_name}</span>
        {p.customer_email && (
          <span className="block break-all text-xs text-muted-foreground">{p.customer_email}</span>
        )}
      </span>
    ),
  },
  {
    key: 'total',
    header: 'Total',
    align: 'right',
    cell: (p) => <span className="font-semibold tabular-nums">{formatPrice(p.items_total)}</span>,
  },
  {
    key: 'created',
    header: 'Criada em',
    cell: (p) => <span className="whitespace-nowrap">{formatDate(p.created_at)}</span>,
  },
  {
    key: 'state',
    header: 'Estado',
    align: 'center',
    cell: (p) => (
      <span className="flex flex-col items-center gap-0.5">
        <ProposalStateBadge state={p.state} />
        <Pedido p={p} />
      </span>
    ),
  },
  {
    key: 'actions',
    header: 'Ações',
    align: 'center',
    cell: (p) => (
      <Button asChild size="icon" variant="ghost" className="h-9 w-9">
        <Link to={PROPOSAL_PAGE_PATH(p.id)} aria-label={`Abrir o pedido montado ${p.number}`}>
          <Eye className="h-4 w-4" />
        </Link>
      </Button>
    ),
  },
]

const ProposalsList = () => {
  const { data, isLoading, error, refetch, isFetching } = useProposalList()
  const lista = data ?? []

  // A primeira carga é esqueleto — tabela no computador, cartões no celular —, como na lista de Pedidos.
  if (isLoading && !data) {
    return (
      <div aria-busy="true" aria-label="Carregando os pedidos montados">
        <div className="hidden md:block"><TableSkeleton rows={6} cols={6} /></div>
        <div className="space-y-3 md:hidden">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
      </div>
    )
  }

  if (error && !data) {
    return (
      <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
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
        icon={ClipboardList}
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
        <div
          role="alert"
          className="mb-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {PROPOSALS_READ_FAILED} Mostrando a última leitura.
        </div>
      )}

      {/* Desktop: a mesma tabela da lista de Pedidos. */}
      <div className="hidden md:block">
        <AdminTable
          columns={colunas}
          data={lista}
          rowKey={(p) => p.id}
          footer={<span>{contagem(lista.length)}</span>}
        />
      </div>

      {/* Mobile: o mesmo cartão do pedido. */}
      <ul aria-label="Pedidos montados" className="space-y-3 md:hidden">
        {lista.map((p) => (
          <li key={p.id} className="rounded-xl border border-border bg-estrelinha-admin-card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <Link
                  to={PROPOSAL_PAGE_PATH(p.id)}
                  className="flex min-h-[44px] items-center truncate font-medium hover:underline"
                >
                  {p.customer_name}
                </Link>
                <p className="truncate text-xs text-muted-foreground">
                  {p.number} · Criada em {formatDate(p.created_at)}
                </p>
              </div>
              <span className="shrink-0 font-semibold tabular-nums">{formatPrice(p.items_total)}</span>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              <ProposalStateBadge state={p.state} />
              <Pedido p={p} />
            </div>

            <div className="mt-3">
              <Button asChild variant="outline" className="h-auto min-h-[44px] w-full min-w-0 whitespace-normal">
                <Link to={PROPOSAL_PAGE_PATH(p.id)}>Abrir o pedido montado</Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default ProposalsList
