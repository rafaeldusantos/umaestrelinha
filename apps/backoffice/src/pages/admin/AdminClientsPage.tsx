import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Download, Eye, MessageCircle, Search, Users } from 'lucide-react'
import { toast } from 'sonner'

import { formatPrice } from '@estrelinha/core/formatters'
import { MATERIAL_KINDS, MATERIAL_KIND_LABELS } from '@estrelinha/core/material'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@estrelinha/ui/select'
import { cn } from '@estrelinha/ui/lib/utils'

import { useAdminCustomerList } from '@/entities/customer/api/useAdminCustomerList'
import {
  CUSTOMER_SEARCH_DEBOUNCE_MS,
  CUSTOMER_VIEWS,
  activeCustomerFilterCount,
  defaultCustomerQuery,
  emptyCustomerFilters,
  lastPurchaseLabel,
  rangeLabel,
  type CustomerFilters,
  type CustomerListRow,
  type CustomerQuery,
  type CustomerSortKey,
} from '@/entities/customer/api/customerQuery'
import { exportCustomersCsv, customerExportLabel } from '@/features/customer-detail/lib/exportCsv'
import { PageHeader, AdminTable, Pagination, type AdminColumn } from '@/shared/ui'

/**
 * A listagem de Clientes — `CLI-01`..`CLI-07`, `CLI-12`, `CLI-15`.
 *
 * ---------------------------------------------------------------------------------------------
 * DE CADASTRO PARA RETRATO (D6)
 * ---------------------------------------------------------------------------------------------
 * A tela tinha 54 linhas e quatro colunas — nome, e-mail, contagem de pedidos, data de cadastro —
 * e não respondia **nenhuma** das três perguntas que fazem alguém abri-la: quanto essa pessoa já
 * gastou, quando comprou pela última vez, e se ela já confiou um material. As três viram coluna,
 * não clique.
 *
 * ---------------------------------------------------------------------------------------------
 * O CRITÉRIO DO DINHEIRO ESTÁ ESCRITO NA TELA (CLI-04)
 * ---------------------------------------------------------------------------------------------
 * `Gastou` e `Ticket` somam **só `payment_status = 'approved'`**, e o cartão diz isso em texto. Um
 * número de dinheiro que inclui Pix expirado não é um número de dinheiro — e um critério que só
 * existe na spec é um número com dois donos silenciosos.
 *
 * ---------------------------------------------------------------------------------------------
 * A CONVIDADA É UMA LINHA
 * ---------------------------------------------------------------------------------------------
 * `public.customers` só recebe linha do trigger de signup, então quem comprou como convidada nunca
 * aparecia aqui. A tela lê `customer_list`, que une as duas origens — e é o que torna o filtro
 * `conta/convidada` e a visão `Possíveis duplicadas` possíveis de responder.
 */
const AdminClientsPage = () => {
  const [query, setQuery] = useState<CustomerQuery>(defaultCustomerQuery)
  const [searchInput, setSearchInput] = useState('')
  const [busy, setBusy] = useState(false)

  const { rows, total, loading, error, portrait, fetchAllFiltered } = useAdminCustomerList(query)

  useEffect(() => {
    const id = setTimeout(
      () => setQuery(q => (q.search === searchInput ? q : { ...q, search: searchInput, page: 1 })),
      CUSTOMER_SEARCH_DEBOUNCE_MS,
    )
    return () => clearTimeout(id)
  }, [searchInput])

  const setFilters = useCallback((next: CustomerFilters) => {
    setQuery(q => ({ ...q, filters: next, page: 1 }))
  }, [])

  const filtrosAtivos = activeCustomerFilterCount(query.filters, query.search)

  const sortBy = (key: string) =>
    setQuery(q => ({
      ...q,
      sort: {
        key: key as CustomerSortKey,
        dir: q.sort.key === key && q.sort.dir === 'desc' ? 'asc' : 'desc',
      },
      page: 1,
    }))

  const exportar = async () => {
    setBusy(true)
    try {
      exportCustomersCsv(await fetchAllFiltered())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível exportar o filtro')
    } finally {
      setBusy(false)
    }
  }

  const pct = (n: number) => (portrait.total > 0 ? Math.round((n / portrait.total) * 100) : 0)

  const tiles = [
    {
      id: 'voltaram',
      label: 'Voltaram a comprar',
      valor: String(portrait.voltaram),
      extra: `${pct(portrait.voltaram)}% da base`,
      hint: 'Quem volta costuma voltar para outra data',
      accent: true,
    },
    {
      id: 'material',
      label: 'Confiaram material',
      valor: String(portrait.confiaramMaterial),
      extra: `${pct(portrait.confiaramMaterial)}%`,
      hint: 'Cinzas, leite, cabelo, pelo, dente',
      accent: false,
    },
    {
      id: 'gasto',
      label: 'Gasto médio por pessoa',
      valor: formatPrice(portrait.gastoMedio),
      extra: '',
      // O critério mora ao lado do número, e não só na spec.
      hint: 'Só pedidos pagos entram na conta',
      accent: false,
    },
    {
      id: 'novas',
      label: 'Novas no mês',
      valor: String(portrait.novasNoMes),
      extra: '',
      hint: 'Primeira compra no mês',
      accent: false,
    },
  ]

  const columns: AdminColumn<CustomerListRow>[] = [
    {
      key: 'name',
      header: 'Cliente',
      sortable: true,
      cell: c => (
        <span className="block">
          <Link to={`/admin/clientes/${c.id}`} className="font-medium text-primary hover:underline">
            {c.name?.trim() || '(sem nome)'}
          </Link>
          <span className="block text-xs text-muted-foreground">
            {c.email} · {c.has_account ? 'conta' : 'convidada'}
            {c.same_email_count > 1 && (
              <span className="ml-1 text-estrelinha-admin-amber">
                · {c.same_email_count} cadastros com este e-mail
              </span>
            )}
          </span>
        </span>
      ),
    },
    {
      key: 'orders',
      header: 'Pedidos',
      align: 'center',
      sortable: true,
      // `CLI-05` — conta o que virou dinheiro. Antes somava abandono junto, e a tela dizia que
      // alguém tinha 4 pedidos quando 3 eram Pix expirado.
      cell: c => c.orders_paid,
    },
    {
      key: 'spent',
      header: 'Gastou',
      align: 'right',
      sortable: true,
      cell: c => (c.orders_paid > 0 ? <span className="font-semibold">{formatPrice(c.total_spent)}</span> : <span className="text-muted-foreground">—</span>),
    },
    {
      key: 'ticket',
      header: 'Ticket',
      align: 'right',
      sortable: true,
      // `null` e não `0` quando nunca houve pedido pago: "R$ 0,00" é uma afirmação falsa sobre quem
      // nunca comprou, e um travessão é a verdade.
      cell: c => (c.avg_ticket !== null ? formatPrice(c.avg_ticket) : <span className="text-muted-foreground">—</span>),
    },
    {
      key: 'last',
      header: 'Última compra',
      sortable: true,
      cell: c => {
        const ultima = lastPurchaseLabel(c)
        return (
          <span className="block">
            <span className="text-sm">{ultima.text}</span>
            {ultima.open && (
              <span className="block text-xs text-estrelinha-admin-amber">em aberto</span>
            )}
          </span>
        )
      },
    },
    {
      key: 'material',
      header: 'Material',
      cell: c =>
        c.material_kinds.length > 0 ? (
          <span className="flex flex-wrap gap-1">
            {c.material_kinds.map(k => (
              <span
                key={k}
                className="rounded-md border border-estrelinha-admin-violet/20 bg-estrelinha-admin-violet/10 px-2 py-0.5 text-xs text-estrelinha-admin-violet"
              >
                {MATERIAL_KIND_LABELS[k as keyof typeof MATERIAL_KIND_LABELS] ?? k}
              </span>
            ))}
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      key: 'actions',
      header: 'Ações',
      align: 'center',
      cell: c => (
        <span className="inline-flex gap-1">
          <Button asChild size="icon" variant="ghost" className="h-9 w-9">
            <Link to={`/admin/clientes/${c.id}`} aria-label={`Abrir ficha de ${c.name}`}>
              <Eye className="h-4 w-4" />
            </Link>
          </Button>
          {c.phone && (
            <Button
              size="icon" variant="ghost" className="h-9 w-9"
              aria-label={`Falar com ${c.name} no WhatsApp`}
              onClick={() => window.open(`https://wa.me/55${c.phone!.replace(/\D/g, '')}`, '_blank')}
            >
              <MessageCircle className="h-4 w-4" />
            </Button>
          )}
        </span>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Clientes"
        subtitle={`${portrait.compraram} pessoas compraram alguma vez · ${portrait.confiaramMaterial} confiaram um material à Adri`}
        actions={
          <Button variant="outline" size="sm" className="min-h-[44px] md:min-h-0" onClick={exportar} disabled={busy || total === 0}>
            <Download className="mr-1 h-4 w-4" /> {customerExportLabel(total)}
          </Button>
        }
      />

      {/* Retrato da base. Rola dentro do container no mobile — a trilha é que rola. */}
      <div
        className="-mx-1 mb-4 flex gap-3 overflow-x-auto px-1 pb-1"
        role="group"
        aria-label="Retrato da base"
      >
        {tiles.map(tile => (
          <div
            key={tile.id}
            className={cn(
              'w-[240px] shrink-0 rounded-xl border bg-estrelinha-admin-card p-4',
              tile.accent
                ? 'border-l-4 border-l-estrelinha-admin-violet border-y-border border-r-border'
                : 'border-border',
            )}
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              {tile.label}
            </p>
            <p className="mt-1 flex items-baseline gap-2">
              <span className="text-2xl font-semibold tabular-nums">{tile.valor}</span>
              {tile.extra && (
                <span className="text-xs font-medium text-estrelinha-admin-violet">{tile.extra}</span>
              )}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{tile.hint}</p>
          </div>
        ))}
      </div>

      <div className="-mx-1 mb-3 flex items-center gap-1 overflow-x-auto px-1" role="tablist">
        {CUSTOMER_VIEWS.map(view => (
          <button
            key={view.id}
            type="button"
            role="tab"
            aria-selected={query.filters.view === view.id}
            onClick={() => setFilters({ ...query.filters, view: view.id })}
            className={cn(
              'min-h-[44px] shrink-0 rounded-lg px-3 text-sm transition-colors',
              query.filters.view === view.id
                ? 'bg-estrelinha-admin-card font-medium shadow-sm ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground',
              // A visão de duplicadas usa o âmbar porque é a única que aponta um PROBLEMA.
              view.id === 'duplicadas' && query.filters.view !== view.id && 'text-estrelinha-admin-amber',
            )}
          >
            {view.label}
          </button>
        ))}
      </div>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Nome, e-mail, telefone ou CPF..."
            className="h-11 pl-9"
            aria-label="Buscar clientes"
          />
        </div>

        <Select
          value={query.filters.materialKinds[0] ?? 'all'}
          onValueChange={v => setFilters({ ...query.filters, materialKinds: v === 'all' ? [] : [v] })}
        >
          <SelectTrigger className="h-11 w-[170px]"><SelectValue placeholder="Material" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo material</SelectItem>
            {MATERIAL_KINDS.map(k => (
              <SelectItem key={k} value={k}>{MATERIAL_KIND_LABELS[k]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={query.filters.lastPurchase}
          onValueChange={v => setFilters({ ...query.filters, lastPurchase: v as CustomerFilters['lastPurchase'] })}
        >
          <SelectTrigger className="h-11 w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Qualquer data</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
            <SelectItem value="180d+">Há mais de 6 meses</SelectItem>
            <SelectItem value="nunca">Nunca comprou</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={query.filters.account}
          onValueChange={v => setFilters({ ...query.filters, account: v as CustomerFilters['account'] })}
        >
          <SelectTrigger className="h-11 w-[170px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Conta ou convidada</SelectItem>
            <SelectItem value="conta">Só com conta</SelectItem>
            <SelectItem value="convidada">Só convidadas</SelectItem>
          </SelectContent>
        </Select>

        {filtrosAtivos > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="h-11"
            onClick={() => {
              setSearchInput('')
              setQuery(q => ({ ...q, filters: emptyCustomerFilters(), search: '', page: 1 }))
            }}
          >
            Limpar {filtrosAtivos === 1 ? 'o filtro' : `os ${filtrosAtivos}`}
          </Button>
        )}
      </div>

      {error && (
        <div role="alert" className="mb-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Carregando...</div>
      ) : (
        <>
          <div className="hidden md:block">
            <AdminTable
              columns={columns}
              data={rows}
              rowKey={c => c.id}
              sortKey={query.sort.key}
              sortDir={query.sort.dir}
              onSort={sortBy}
              empty={{ icon: Users, message: 'Nenhuma cliente neste filtro.' }}
              footer={<span>{rangeLabel(query.page, query.pageSize, total)}</span>}
            />
          </div>

          <ul className="space-y-3 md:hidden">
            {rows.map(c => {
              const ultima = lastPurchaseLabel(c)
              return (
                <li key={c.id} className="rounded-xl border border-border bg-estrelinha-admin-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link
                        to={`/admin/clientes/${c.id}`}
                        className="flex min-h-[44px] items-center truncate font-medium hover:underline"
                      >
                        {c.name?.trim() || '(sem nome)'}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">{c.email}</p>
                    </div>
                    <span className="shrink-0 text-right">
                      <span className="block font-semibold">
                        {c.orders_paid > 0 ? formatPrice(c.total_spent) : '—'}
                      </span>
                      <span className="block text-xs text-muted-foreground">{ultima.text}</span>
                    </span>
                  </div>
                  <Button asChild variant="outline" className="mt-3 min-h-[44px] w-full">
                    <Link to={`/admin/clientes/${c.id}`}>Abrir ficha</Link>
                  </Button>
                </li>
              )
            })}
            <li className="pt-1 text-center text-xs text-muted-foreground">
              {rangeLabel(query.page, query.pageSize, total)}
            </li>
          </ul>

          <Pagination
            page={query.page}
            totalPages={Math.max(1, Math.ceil(total / query.pageSize))}
            onPageChange={p => setQuery(q => ({ ...q, page: p }))}
          />
        </>
      )}
    </div>
  )
}

export default AdminClientsPage
