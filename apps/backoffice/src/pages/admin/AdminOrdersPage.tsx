import { useState } from 'react'
import { Eye, Search, Download, CalendarIcon, X } from 'lucide-react'
import { useAdminOrders, ORDER_STATUSES, STATUS_LABELS } from '@/entities/order/api/useAdminOrders'
import OrderDetailDialog from '@/features/order-management/ui/OrderDetailDialog'
import StatusBadge from '@/entities/order/ui/StatusBadge'
import PaymentStatusBadge from '@/entities/order/ui/PaymentStatusBadge'
import { PageHeader, AdminTable, Pagination, type AdminColumn } from '@/shared/ui'
import { Button } from '@nanapin/ui/button'
import { Input } from '@nanapin/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@nanapin/ui/select'
import { Popover, PopoverContent, PopoverTrigger } from '@nanapin/ui/popover'
import { Calendar } from '@nanapin/ui/calendar'
import { formatPrice } from '@nanapin/core/formatters'
import { exportOrdersCsv } from '@/features/export-orders/lib/exportCsv'
import { cn } from '@nanapin/ui/lib/utils'
import { format } from 'date-fns'
import type { DbOrder } from '@nanapin/supabase/types'

const AdminOrdersPage = () => {
  const {
    orders, loading, statusFilter, setStatusFilter,
    searchQuery, setSearchQuery,
    dateFrom, setDateFrom, dateTo, setDateTo,
    paymentFilter, setPaymentFilter,
    page, setPage, totalPages, totalCount,
    statusCounts,
    getOrderItems, updateStatus, getStatusHistory, getNotes,
    cancelOrder, addTrackingCode, addNote,
  } = useAdminOrders()
  const [selected, setSelected] = useState<DbOrder | null>(null)

  const allCount = Object.values(statusCounts).reduce((a, b) => a + b, 0)

  const columns: AdminColumn<DbOrder>[] = [
    { key: 'order_number', header: '#Pedido', cell: o => <span className="font-medium">{o.order_number}</span> },
    { key: 'customer_name', header: 'Cliente', cell: o => <span className="text-muted-foreground">{o.customer_name}</span> },
    { key: 'total', header: 'Valor', align: 'right', cell: o => <span className="font-semibold">{formatPrice(o.total)}</span> },
    { key: 'status', header: 'Status', align: 'center', cell: o => <StatusBadge status={o.status} /> },
    { key: 'payment_status', header: 'Pagamento', align: 'center', cell: o => <PaymentStatusBadge status={o.payment_status} /> },
    {
      key: 'coupon_code', header: 'Cupom',
      cell: o => o.coupon_code ? (
        <span className="inline-flex items-center rounded-md bg-nana-violet/10 text-nana-violet font-mono text-xs px-2 py-0.5 border border-nana-violet/20">
          {o.coupon_code}
        </span>
      ) : <span className="text-muted-foreground">—</span>,
    },
    { key: 'tracking_code', header: 'Rastreio', cell: o => <span className="text-muted-foreground font-mono text-xs">{o.tracking_code ?? '—'}</span> },
    { key: 'created_at', header: 'Data', align: 'right', cell: o => <span className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString('pt-BR')}</span> },
    {
      key: 'actions', header: 'Ações', align: 'center',
      cell: o => (
        <Button size="icon" variant="ghost" onClick={() => setSelected(o)}>
          <Eye className="w-4 h-4" />
        </Button>
      ),
    },
  ]

  const footer = (
    <>
      <span>{totalCount} pedido(s)</span>
      <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
    </>
  )

  return (
    <div>
      <PageHeader
        title="Pedidos"
        actions={
          <Button variant="outline" size="sm" onClick={() => exportOrdersCsv(orders)} disabled={orders.length === 0}>
            <Download className="w-4 h-4 mr-1" /> Exportar CSV
          </Button>
        }
      />

      {/* Search + Filters */}
      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por número ou cliente..."
            className="pl-9"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[150px] justify-start text-left font-normal", !dateFrom && "text-muted-foreground")}>
                <CalendarIcon className="w-4 h-4 mr-1" />
                {dateFrom ? format(dateFrom, 'dd/MM/yyyy') : 'Data início'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("w-[150px] justify-start text-left font-normal", !dateTo && "text-muted-foreground")}>
                <CalendarIcon className="w-4 h-4 mr-1" />
                {dateTo ? format(dateTo, 'dd/MM/yyyy') : 'Data fim'}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar mode="single" selected={dateTo} onSelect={setDateTo} className="p-3 pointer-events-auto" />
            </PopoverContent>
          </Popover>

          <Select value={paymentFilter} onValueChange={setPaymentFilter}>
            <SelectTrigger className="w-[160px] h-9">
              <SelectValue placeholder="Pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos pagamentos</SelectItem>
              <SelectItem value="pix">PIX</SelectItem>
              <SelectItem value="credit_card">Cartão de Crédito</SelectItem>
              <SelectItem value="boleto">Boleto</SelectItem>
              <SelectItem value="manual">Manual</SelectItem>
            </SelectContent>
          </Select>

          {(dateFrom || dateTo || paymentFilter !== 'all' || searchQuery) && (
            <Button variant="ghost" size="sm" onClick={() => { setDateFrom(undefined); setDateTo(undefined); setPaymentFilter('all'); setSearchQuery('') }}>
              <X className="w-4 h-4 mr-1" /> Limpar filtros
            </Button>
          )}
        </div>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <Button size="sm" variant={statusFilter === 'all' ? 'default' : 'outline'} onClick={() => setStatusFilter('all')}>
          Todos ({allCount})
        </Button>
        {ORDER_STATUSES.map(s => (
          <Button key={s} size="sm" variant={statusFilter === s ? 'default' : 'outline'} onClick={() => setStatusFilter(s)}>
            {STATUS_LABELS[s]} ({statusCounts[s] ?? 0})
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Carregando...</div>
      ) : (
        <AdminTable
          columns={columns}
          data={orders}
          rowKey={o => o.id}
          empty={{ message: 'Nenhum pedido encontrado.' }}
          footer={footer}
        />
      )}

      <OrderDetailDialog
        open={!!selected}
        onOpenChange={() => setSelected(null)}
        order={selected}
        onStatusChange={updateStatus}
        getItems={getOrderItems}
        getStatusHistory={getStatusHistory}
        getNotes={getNotes}
        onCancel={cancelOrder}
        onAddTracking={addTrackingCode}
        onAddNote={addNote}
      />
    </div>
  )
}

export default AdminOrdersPage
