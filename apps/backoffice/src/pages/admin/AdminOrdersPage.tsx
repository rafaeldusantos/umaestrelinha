import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarIcon, Columns3, Download, Eye, MessageCircle, Printer, Search, ShoppingCart } from 'lucide-react'
import { format } from 'date-fns'
import { toast } from 'sonner'

import { formatPrice, formatRelativeDate } from '@estrelinha/core/formatters'
import { MATERIAL_STATUS_LABELS, queueAge, queueAgeLabel, toMaterialStatus } from '@estrelinha/core/material'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Checkbox } from '@estrelinha/ui/checkbox'
import { Calendar } from '@estrelinha/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@estrelinha/ui/popover'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@estrelinha/ui/select'
import { cn } from '@estrelinha/ui/lib/utils'

import { useAdminOrders, ORDER_STATUSES, STATUS_LABELS } from '@/entities/order/api/useAdminOrders'
import { useAdminOrderList } from '@/entities/order/api/useAdminOrderList'
import {
  MATERIAL_QUEUE_STATES,
  MATERIAL_TILES,
  MATERIAL_TILE_STATES,
  ORDER_VIEWS,
  QUEUE_TILES,
  SEARCH_DEBOUNCE_MS,
  activeOrderFilterCount,
  clearFiltersLabel,
  defaultOrderQuery,
  emptyOrderFilters,
  rangeLabel,
  rowQueueAge,
  purchaseOrdinalLabel,
  queueSince,
  type AdminOrderRow,
  type OrderFilters,
  type OrderQuery,
  type OrderSortKey,
} from '@/entities/order/api/orderQuery'
import StatusBadge from '@/entities/order/ui/StatusBadge'
import PaymentStatusBadge from '@/entities/order/ui/PaymentStatusBadge'
import MaterialStatusBadge from '@/entities/order/ui/MaterialStatusBadge'
import QueueAge from '@/entities/order/ui/QueueAge'
import OrderFilterChips from '@/features/order-list/ui/OrderFilterChips'
import OrderBulkBar from '@/features/order-list/ui/OrderBulkBar'
import QueueTiles from '@/features/order-list/ui/QueueTiles'
import { runMaterialBulk, bulkSummary } from '@/features/order-list/model/bulkMaterial'
import { rowSummary } from '@/features/order-list/model/rowSummary'
import {
  ORDER_LIST_COLUMNS, isOrderColumnVisible, useOrderColumnPrefs,
} from '@/features/order-list/model/columns'
import { exportLabel, exportOrdersCsv } from '@/features/export-orders/lib/exportCsv'
import { chargeMaterialUrl } from '@/features/order-list/model/chargeMaterial'
import { openPickSlips } from '@/features/pick-slip'
import { PageHeader, AdminTable, Pagination, type AdminColumn } from '@/shared/ui'

/**
 * A listagem de pedidos — `PED-04`..`PED-23`.
 *
 * ---------------------------------------------------------------------------------------------
 * A ORDEM DA TELA É A ORDEM DA PERGUNTA
 * ---------------------------------------------------------------------------------------------
 * O cabeçalho diz **o que cobra**, não o que existe: "12 esperando alguma coisa sua · o mais antigo
 * há 9 dias". Depois vêm os quatro contadores clicáveis, e só então a lista. A versão anterior abria
 * com "Pedidos" e 148 linhas — verdadeiro e inútil.
 *
 * ---------------------------------------------------------------------------------------------
 * O QUE MUDOU DE DONO
 * ---------------------------------------------------------------------------------------------
 * A leitura da listagem saiu de `useAdminOrders` e virou `useAdminOrderList`: filtro, busca,
 * ordenação, paginação e **as contagens** agora são todos do servidor, e concordam entre si. As
 * escritas (transição de material, status, rastreio, nota) continuam em `useAdminOrders` — a
 * feature muda **onde** são chamadas, nunca o que fazem.
 *
 * ---------------------------------------------------------------------------------------------
 * O MOBILE É CARTÃO, NÃO TABELA (D8)
 * ---------------------------------------------------------------------------------------------
 * ~90% dos acessos da loja vêm de celular, e a fila é consultada com o envelope na mão. Abaixo de
 * `md` a tabela some e cada pedido vira um cartão com **a ação primária daquele estado** ocupando a
 * largura em 44px. As duas faixas roláveis (contadores e visões) rolam DENTRO do próprio container:
 * quem não pode encolher é a trilha, não o item, e o body nunca rola na horizontal.
 */
const AdminOrdersPage = () => {
  const [query, setQuery] = useState<OrderQuery>(defaultOrderQuery)
  const [searchInput, setSearchInput] = useState('')
  // A seleção guarda a **LINHA**, não o id (`PLS-06`/`D5`): sem os valores atuais não há como
  // nomear no resumo quais pedidos não passaram, nem gerar folha de separação sem reler o banco.
  const [selection, setSelection] = useState<Map<string, AdminOrderRow>>(new Map())
  const [busy, setBusy] = useState(false)

  const { prefs, toggle, setDensity } = useOrderColumnPrefs()
  const { setMaterialStatus, updateStatus } = useAdminOrders()
  const {
    rows, total, loading, error, viewCounts, tileCounts, oldestWaitingAt, refetch, fetchAllFiltered,
  } = useAdminOrderList(query)

  // `PED-10` — debounce de 300 ms. Sem ele, cada tecla dispara uma consulta paginada mais seis
  // contagens; com a busca alcançando cinco colunas, isso é sete `ilike` por caractere.
  useEffect(() => {
    const id = setTimeout(
      () => setQuery(q => (q.search === searchInput ? q : { ...q, search: searchInput, page: 1 })),
      SEARCH_DEBOUNCE_MS,
    )
    return () => clearTimeout(id)
  }, [searchInput])

  const setFilters = useCallback((next: OrderFilters) => {
    setQuery(q => ({ ...q, filters: next, page: 1 }))
    setSelection(new Map())
  }, [])

  const filtrosAtivos = activeOrderFilterCount(query.filters, query.search)

  const limparTudo = useCallback(() => {
    // `PED-04` — limpa **tudo**, inclusive status, material e a visão. O botão antigo zerava quatro
    // dos sete eixos e nem aparecia quando os três que faltavam eram os únicos ligados.
    setSearchInput('')
    setQuery(q => ({ ...q, filters: { ...emptyOrderFilters(), view: 'tudo' }, search: '', page: 1 }))
    setSelection(new Map())
  }, [])

  const naFilaDeMaterial = query.filters.view === 'fila-material'
  const tiles = naFilaDeMaterial ? MATERIAL_TILES : QUEUE_TILES

  // Na fila, os quatro contadores viram os quatro ESTADOS, e as contagens saem das visões já lidas
  // pelo hook — nenhuma consulta a mais para desenhar a mesma informação de outro jeito.
  const contagemDosTiles = useMemo(() => {
    if (!naFilaDeMaterial) return tileCounts
    return Object.fromEntries(
      MATERIAL_TILES.map((tile, i) => [
        tile.id,
        rows.filter(r => r.material_status === MATERIAL_TILE_STATES[i]).length,
      ]),
    )
  }, [naFilaDeMaterial, tileCounts, rows])

  const toggleRow = (row: AdminOrderRow) => {
    setSelection(atual => {
      const next = new Map(atual)
      if (next.has(row.id)) next.delete(row.id)
      else next.set(row.id, row)
      return next
    })
  }

  const togglePagina = () => {
    setSelection(atual => {
      const todasNaPagina = rows.every(r => atual.has(r.id))
      if (todasNaPagina) return new Map()
      return new Map(rows.map(r => [r.id, r]))
    })
  }

  const selecionarTodosDoFiltro = async () => {
    setBusy(true)
    try {
      const todos = await fetchAllFiltered()
      setSelection(new Map(todos.map(r => [r.id, r])))
    } catch (e) {
      // `readAllPages` LANÇA quando a leitura trunca. Selecionar "os N do filtro" e receber menos
      // que N em silêncio seria agir sobre um conjunto que ninguém pediu.
      toast.error(e instanceof Error ? e.message : 'Não foi possível ler o filtro inteiro')
    } finally {
      setBusy(false)
    }
  }

  const selecionadas = [...selection.values()]

  const marcarMaterialRecebido = async () => {
    setBusy(true)
    const resultado = await runMaterialBulk(selecionadas, 'material_recebido', (id, status) =>
      setMaterialStatus(id, status).then(r => ({ ok: r.ok, reason: r.reason })),
    )
    setBusy(false)
    setSelection(new Map())
    await refetch()

    // Recusa NÃO é erro: é o caso esperado quando outra aba já atualizou o pedido.
    const resumo = bulkSummary(resultado)
    if (resultado.failed > 0) toast.error(resumo)
    else toast.success(resumo)
  }

  const avancarStatus = async () => {
    setBusy(true)
    let mudou = 0
    for (const row of selecionadas) {
      const proximo = PROXIMO_STATUS[row.status]
      if (!proximo) continue
      const { error: erro } = await updateStatus(row.id, proximo)
      if (!erro) mudou += 1
    }
    setBusy(false)
    setSelection(new Map())
    await refetch()
    toast.success(`${mudou} pedido(s) avançaram de status`)
  }

  const exportar = async () => {
    setBusy(true)
    try {
      // `PED-05` — o FILTRO inteiro, e não a página. O botão promete o total; se a leitura truncar,
      // `readAllPages` lança e ninguém baixa um arquivo menor achando que é o completo.
      exportOrdersCsv(await fetchAllFiltered())
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Não foi possível exportar o filtro')
    } finally {
      setBusy(false)
    }
  }

  const cobrarMaterial = () => {
    // `Out of Scope`: régua automática de cobrança é política de relacionamento num negócio
    // memorial, e é decisão da Adri. O que a tela oferece é **um clique com o texto pronto**.
    for (const row of selecionadas.slice(0, 5)) window.open(chargeMaterialUrl(row, row.customer_phone), '_blank')
    if (selecionadas.length > 5) {
      toast.message(`Abri as 5 primeiras. O navegador bloqueia mais que isso de uma vez.`)
    }
  }

  const sortBy = (key: string) => {
    setQuery(q => ({
      ...q,
      sort: {
        key: key as OrderSortKey,
        dir: q.sort.key === key && q.sort.dir === 'desc' ? 'asc' : 'desc',
      },
      page: 1,
    }))
  }

  const visivel = (id: Parameters<typeof isOrderColumnVisible>[1]) => isOrderColumnVisible(prefs, id)

  const columns: AdminColumn<AdminOrderRow>[] = [
    {
      key: 'select',
      header: (
        <Checkbox
          checked={rows.length > 0 && rows.every(r => selection.has(r.id))}
          onCheckedChange={togglePagina}
          aria-label="Selecionar a página"
        />
      ),
      cell: o => (
        <Checkbox
          checked={selection.has(o.id)}
          onCheckedChange={() => toggleRow(o)}
          aria-label={`Selecionar pedido ${o.order_number}`}
        />
      ),
    },
    {
      key: 'queue',
      header: 'Pedido',
      sortable: true,
      cell: o => (
        <span className="block">
          <Link to={`/admin/pedidos/${o.id}`} className="font-medium hover:underline">
            #{o.order_number}
          </Link>
          {/* A idade DO PEDIDO, sempre presente — todo pedido tem uma. O degrau vem da fila de
              material quando o pedido está nela; um pedido que não espera material nenhum ainda
              tem idade, e escondê-la deixava a coluna com um travessão sem explicação. */}
          <span className="block">
            <QueueAge age={rowQueueAge(o) ?? queueAge(o.created_at)} since={queueSince(o)} />
          </span>
        </span>
      ),
    },
  ]

  if (visivel('cliente')) {
    columns.push({
      key: 'customer',
      header: 'Cliente',
      sortable: true,
      cell: o => (
        <span className="block">
          {/* `PED-21` — a linha liga ao cliente. Antes não havia caminho de pedido para pessoa. */}
          {o.customer_id ? (
            <Link
              to={`/admin/clientes/${o.customer_id}`}
              className="font-medium text-primary hover:underline"
            >
              {o.customer_name}
            </Link>
          ) : (
            <span className="font-medium">{o.customer_name}</span>
          )}
          <span className="block text-xs text-muted-foreground">
            {/* `PED-21` — a ordinal muda o tom de tudo: quem está na terceira compra já confiou
                duas vezes, e saber isso antes de escrever importa num negócio memorial. */}
            {purchaseOrdinalLabel(o.purchase_ordinal)
              ? `${purchaseOrdinalLabel(o.purchase_ordinal)} · ${o.customer_email}`
              : o.customer_email}
          </span>
        </span>
      ),
    })
  }

  if (visivel('valor')) {
    columns.push({
      key: 'total',
      header: 'Valor',
      align: 'right',
      sortable: true,
      cell: o => <span className="font-semibold">{formatPrice(o.total)}</span>,
    })
  }

  if (visivel('status')) {
    columns.push({
      key: 'status', header: 'Status', align: 'center',
      cell: o => <StatusBadge status={o.status} />,
    })
  }

  if (visivel('pagamento')) {
    columns.push({
      key: 'payment', header: 'Pagamento', align: 'center',
      cell: o => <PaymentStatusBadge status={o.payment_status} />,
    })
  }

  if (visivel('material')) {
    columns.push({
      key: 'material',
      header: 'Material',
      align: 'center',
      cell: o => {
        const naFila = rowQueueAge(o)
        return (
          <span className="block">
            <MaterialStatusBadge status={o.material_status} />
            {/* "parado há N dias" mora aqui, sob o selo do material: é a fila do MATERIAL que está
                parada, não o pedido. Só o terceiro degrau escreve isso. */}
            {naFila?.tier === 'stale' && (
              <span className="mt-0.5 block text-[11px] font-medium text-estrelinha-admin-amber">
                {queueAgeLabel(naFila)}
              </span>
            )}
            {o.material_tracking_code && (
              <span className="mt-0.5 block text-[11px] text-muted-foreground">
                {o.material_tracking_code}
              </span>
            )}
          </span>
        )
      },
    })
  }

  if (visivel('rastreio')) {
    columns.push({
      key: 'tracking',
      header: 'Rastreio',
      cell: o =>
        o.tracking_code ? (
          <span className="font-mono text-xs">{o.tracking_code}</span>
        ) : o.status === 'shipped' ? (
          // Enviado sem código é falha silenciosa: o e-mail "sua joia foi postada" não saiu.
          <span className="text-xs font-medium text-estrelinha-admin-amber">sem código</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    })
  }

  columns.push({
    key: 'actions',
    header: 'Ações',
    align: 'center',
    cell: o => (
      <span className="inline-flex gap-1">
        <Button asChild size="icon" variant="ghost" className="h-9 w-9">
          <Link to={`/admin/pedidos/${o.id}`} aria-label={`Abrir pedido ${o.order_number}`}>
            <Eye className="h-4 w-4" />
          </Link>
        </Button>
        <Button
          size="icon" variant="ghost" className="h-9 w-9"
          aria-label={`Cobrar material de ${o.customer_name}`}
          onClick={() => window.open(chargeMaterialUrl(o, o.customer_phone), '_blank')}
        >
          <MessageCircle className="h-4 w-4" />
        </Button>
      </span>
    ),
  })

  const precisaDeAcao = viewCounts['precisa-acao'] ?? 0
  const idadeDoMaisAntigo = oldestWaitingAt ? rowQueueAge({
    created_at: oldestWaitingAt, material_received_at: null, material_status: 'aguardando_material',
  }) : null

  return (
    <div>
      <PageHeader
        title="Pedidos"
        // O subtítulo é a única frase da tela que resume a fila. Diz o que cobra e há quanto tempo.
        //
        // O número é o da visão `Precisa de ação` — a UNIÃO dos três tiles acionáveis, contada pelo
        // servidor —, e **não a soma deles**. Somar contaria duas vezes quem está em dois tiles ao
        // mesmo tempo: um pedido pago que ainda espera o envelope aparece em "aguardando" e não
        // deveria aparecer em "a separar". Medido no navegador com 8 pedidos: a soma dizia 7, e a
        // aba logo abaixo dizia 4. Duas frases sobre a mesma coisa, discordando na mesma tela.
        subtitle={
          precisaDeAcao > 0
            ? `${precisaDeAcao} esperando alguma coisa sua${idadeDoMaisAntigo ? ` · o mais antigo ${queueAgeLabel(idadeDoMaisAntigo)}` : ''}`
            : 'Nada esperando você agora'
        }
        actions={
          <span className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="min-h-[44px] md:min-h-0" onClick={exportar} disabled={busy || total === 0}>
              <Download className="mr-1 h-4 w-4" /> {exportLabel(total)}
            </Button>
            <Button
              size="sm"
              className="min-h-[44px] md:min-h-0"
              onClick={() => openPickSlips(selecionadas.length > 0 ? selecionadas : rows)}
              disabled={rows.length === 0}
            >
              <Printer className="mr-1 h-4 w-4" /> Folha de separação
            </Button>
          </span>
        }
      />

      <QueueTiles
        tiles={tiles}
        counts={contagemDosTiles}
        oldestWaitingAt={oldestWaitingAt}
        filters={query.filters}
        onApply={setFilters}
      />

      {/* Visões. Rolam dentro do container — no mobile a trilha é que rola, nunca o body. */}
      <div className="-mx-1 mb-3 flex items-center gap-1 overflow-x-auto px-1" role="tablist">
        {ORDER_VIEWS.map(view => (
          <button
            key={view.id}
            type="button"
            role="tab"
            aria-selected={query.filters.view === view.id}
            onClick={() => setFilters({ ...query.filters, view: view.id })}
            className={cn(
              'flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors',
              query.filters.view === view.id
                ? 'bg-estrelinha-admin-card font-medium shadow-sm ring-1 ring-border'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {view.label}
            <span className="text-xs tabular-nums opacity-70">{viewCounts[view.id] ?? 0}</span>
          </button>
        ))}
      </div>

      {/* Busca e filtros */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[240px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchInput}
            onChange={e => setSearchInput(e.target.value)}
            placeholder="Número, cliente, e-mail ou rastreio..."
            className="h-11 pl-9"
            aria-label="Buscar pedidos"
          />
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn('h-11', !query.filters.dateFrom && 'text-muted-foreground')}>
              <CalendarIcon className="mr-1 h-4 w-4" />
              {query.filters.dateFrom ? format(new Date(query.filters.dateFrom), 'dd/MM/yyyy') : 'Data início'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={query.filters.dateFrom ? new Date(query.filters.dateFrom) : undefined}
              onSelect={d => setFilters({ ...query.filters, dateFrom: d ? d.toISOString() : null })}
              className="pointer-events-auto p-3"
            />
          </PopoverContent>
        </Popover>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className={cn('h-11', !query.filters.dateTo && 'text-muted-foreground')}>
              <CalendarIcon className="mr-1 h-4 w-4" />
              {query.filters.dateTo ? format(new Date(query.filters.dateTo), 'dd/MM/yyyy') : 'Data fim'}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={query.filters.dateTo ? new Date(query.filters.dateTo) : undefined}
              onSelect={d => {
                if (!d) return setFilters({ ...query.filters, dateTo: null })
                const fim = new Date(d)
                fim.setHours(23, 59, 59, 999)
                setFilters({ ...query.filters, dateTo: fim.toISOString() })
              }}
              className="pointer-events-auto p-3"
            />
          </PopoverContent>
        </Popover>

        {/* Os dois eixos de pagamento são SEPARADOS e nomeados: `payment_status` (aprovado,
            pendente) e `payment_method` (pix, cartão). O filtro antigo misturava os dois num
            controle só rotulado "Pagamento", e por isso não dava para perguntar "quais Pix ainda
            não foram aprovados?" — que é justamente o quarto contador do topo. */}
        <Select
          value={query.filters.paymentStatuses[0] ?? 'all'}
          onValueChange={v =>
            setFilters({ ...query.filters, paymentStatuses: v === 'all' ? [] : [v] })
          }
        >
          <SelectTrigger className="h-11 w-[170px]"><SelectValue placeholder="Pagamento" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo pagamento</SelectItem>
            <SelectItem value="approved">Aprovado</SelectItem>
            <SelectItem value="pending">Pendente</SelectItem>
            <SelectItem value="rejected">Recusado</SelectItem>
            <SelectItem value="refunded">Estornado</SelectItem>
            <SelectItem value="expired">Expirado</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={query.filters.materialStatuses.length === 1 ? query.filters.materialStatuses[0] : 'all'}
          onValueChange={v =>
            setFilters({ ...query.filters, materialStatuses: v === 'all' ? [] : [v] })
          }
        >
          <SelectTrigger className="h-11 w-[190px]"><SelectValue placeholder="Material" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todo material</SelectItem>
            {MATERIAL_QUEUE_STATES.map(s => (
              <SelectItem key={s} value={s}>{MATERIAL_STATUS_LABELS[toMaterialStatus(s)]}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="h-11">
              <Columns3 className="mr-1 h-4 w-4" /> Colunas
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56">
            <p className="mb-2 text-xs font-medium uppercase text-muted-foreground">Colunas</p>
            {ORDER_LIST_COLUMNS.map(col => (
              <label
                key={col.id}
                className="flex min-h-[44px] cursor-pointer items-center gap-2 text-sm"
              >
                <Checkbox
                  checked={isOrderColumnVisible(prefs, col.id)}
                  disabled={col.fixed}
                  onCheckedChange={() => toggle(col.id)}
                />
                {col.label}
              </label>
            ))}
            <p className="mb-1 mt-3 text-xs font-medium uppercase text-muted-foreground">Densidade</p>
            <Select value={prefs.density} onValueChange={v => setDensity(v as 'confortavel' | 'compacta')}>
              <SelectTrigger className="h-11"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="confortavel">Confortável</SelectItem>
                <SelectItem value="compacta">Compacta</SelectItem>
              </SelectContent>
            </Select>
          </PopoverContent>
        </Popover>
      </div>

      {filtrosAtivos > 0 && (
        <div className="mb-3">
          <OrderFilterChips
            filters={query.filters}
            search={query.search}
            onChange={setFilters}
            onClearSearch={() => setSearchInput('')}
            onClearAll={limparTudo}
            clearLabel={clearFiltersLabel(filtrosAtivos)}
          />
        </div>
      )}

      {selection.size > 0 && (
        <OrderBulkBar
          count={selection.size}
          total={total}
          busy={busy}
          onMaterialReceived={marcarMaterialRecebido}
          onAdvanceStatus={avancarStatus}
          onPickSlips={() => openPickSlips(selecionadas)}
          onChargeMaterial={cobrarMaterial}
          onExport={() => exportOrdersCsv(selecionadas)}
          onSelectAll={selecionarTodosDoFiltro}
          onClear={() => setSelection(new Map())}
        />
      )}

      {/* `PED-08` — erro de leitura APARECE. Antes caía no estado vazio, e "Nenhum pedido
          encontrado" é a frase para "o filtro não casou nada", não para "o banco não respondeu". */}
      {error && (
        <div
          role="alert"
          className="mb-3 rounded-xl border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Carregando...</div>
      ) : (
        <>
          {/* Desktop: tabela. */}
          <div className={cn('hidden md:block', prefs.density === 'compacta' && '[&_td]:py-1 [&_th]:py-1')}>
            <AdminTable
              columns={columns}
              data={rows}
              rowKey={o => o.id}
              sortKey={query.sort.key}
              sortDir={query.sort.dir}
              onSort={sortBy}
              empty={{
                icon: ShoppingCart,
                message: error ? 'A lista não pôde ser carregada.' : 'Nenhum pedido neste filtro.',
                hint: filtrosAtivos > 0 ? 'Limpe os filtros para ver todos.' : undefined,
              }}
              footer={
                <span className="flex flex-wrap items-center gap-3">
                  <span>{rangeLabel(query.page, query.pageSize, total)}</span>
                  <Select
                    value={String(query.pageSize)}
                    onValueChange={v => setQuery(q => ({ ...q, pageSize: Number(v), page: 1 }))}
                  >
                    <SelectTrigger className="h-9 w-[100px]"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {[10, 25, 50].map(n => (
                        <SelectItem key={n} value={String(n)}>{n}/pág</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </span>
              }
            />
          </div>

          {/* Mobile: cartão com a ação primária do estado, em 44px e na largura inteira (D8). */}
          <ul className="space-y-3 md:hidden">
            {rows.map(o => {
              const resumo = rowSummary(o)
              const idade = rowQueueAge(o)

              return (
                <li key={o.id} className="rounded-xl border border-border bg-estrelinha-admin-card p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      {/* `min-h-[44px]` mesmo sendo texto: no cartao do celular este link e o
                          caminho para o pedido, e um alvo de 24px na bancada com o envelope na mao
                          erra. `flex items-center` mantem a linha onde estava (PED-23). */}
                      <Link
                        to={`/admin/pedidos/${o.id}`}
                        className="flex min-h-[44px] items-center truncate font-medium hover:underline"
                      >
                        {o.customer_name}
                      </Link>
                      <p className="truncate text-xs text-muted-foreground">
                        #{o.order_number}
                        {purchaseOrdinalLabel(o.purchase_ordinal)
                          ? ` · ${purchaseOrdinalLabel(o.purchase_ordinal)}`
                          : ''}{' '}
                        · {formatRelativeDate(o.created_at)}
                      </p>
                    </div>
                    <span className="shrink-0 font-semibold">{formatPrice(o.total)}</span>
                  </div>

                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <StatusBadge status={o.status} />
                    <MaterialStatusBadge status={o.material_status} />
                    {idade && <QueueAge age={idade} since={queueSince(o)} />}
                  </div>

                  {resumo.blocker && (
                    <p className="mt-2 text-xs text-muted-foreground">{resumo.blocker}</p>
                  )}

                  <div className="mt-3 flex items-center gap-2">
                    {resumo.actionLabel ? (
                      <Button
                        className="min-h-[44px] flex-1"
                        disabled={busy}
                        onClick={async () => {
                          if (resumo.action === 'registrar-recebimento') {
                            await setMaterialStatus(o.id, 'material_recebido')
                            await refetch()
                          } else {
                            window.location.assign(`/admin/pedidos/${o.id}`)
                          }
                        }}
                      >
                        {resumo.actionLabel}
                      </Button>
                    ) : (
                      <Button asChild variant="outline" className="min-h-[44px] flex-1">
                        <Link to={`/admin/pedidos/${o.id}`}>Abrir pedido</Link>
                      </Button>
                    )}
                    <Button
                      size="icon"
                      variant="outline"
                      className="h-11 w-11 shrink-0"
                      aria-label={`Cobrar material de ${o.customer_name}`}
                      onClick={() => window.open(chargeMaterialUrl(o, o.customer_phone), '_blank')}
                    >
                      <MessageCircle className="h-4 w-4" />
                    </Button>
                  </div>
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

/**
 * O próximo status de cada estado — o que o lote "Avançar status" aplica.
 *
 * `delivered` e `cancelled` não têm próximo: são fim de linha, e um lote que os "avançasse" faria
 * pedido entregue voltar a andar.
 */
const PROXIMO_STATUS: Record<string, string | undefined> = {
  pending: 'paid',
  paid: 'separating',
  separating: 'shipped',
  shipped: 'delivered',
}

export default AdminOrdersPage
export { ORDER_STATUSES, STATUS_LABELS }
