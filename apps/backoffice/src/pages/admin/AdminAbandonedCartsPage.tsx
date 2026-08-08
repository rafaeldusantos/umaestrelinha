import { useState } from 'react'
import { ShoppingCart, TrendingUp, AlertCircle, DollarSign, Search, Eye } from 'lucide-react'
import { useAdminAbandonedCarts, STATUS_LABELS, STATUS_COLORS } from '@/entities/abandoned-cart/api/useAdminAbandonedCarts'
import { PageHeader, StatCard, AdminTable, type AdminColumn } from '@/shared/ui'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Badge } from '@estrelinha/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@estrelinha/ui/select'
import { formatPrice, formatRelativeDate } from '@estrelinha/core/formatters'
import AbandonedCartDetailDialog from '@/features/abandoned-cart-detail/ui/AbandonedCartDetailDialog'
import type { DbAbandonedCart, AbandonedCartStatus } from '@estrelinha/supabase/types/abandonedCart'

const AdminAbandonedCartsPage = () => {
  const { carts, loading, metrics, filters, setFilters, deleteCart } = useAdminAbandonedCarts()
  const [selected, setSelected] = useState<DbAbandonedCart | null>(null)

  const columns: AdminColumn<DbAbandonedCart>[] = [
    {
      key: 'customer', header: 'Cliente',
      cell: c => (
        <div>
          <div className="font-medium text-foreground">{c.customer_name || '—'}</div>
          <div className="text-xs text-muted-foreground">{c.customer_email}</div>
        </div>
      ),
    },
    { key: 'items', header: 'Itens', align: 'center', cell: c => <span className="text-muted-foreground">{c.items.length}</span> },
    { key: 'subtotal', header: 'Valor', align: 'right', cell: c => <span className="font-semibold">{formatPrice(c.subtotal)}</span> },
    {
      key: 'coupon_code', header: 'Cupom',
      cell: c => c.coupon_code ? (
        <span className="inline-flex items-center rounded-md bg-estrelinha-admin-violet/10 text-estrelinha-admin-violet font-mono text-xs px-2 py-0.5 border border-estrelinha-admin-violet/20">
          {c.coupon_code}
        </span>
      ) : <span className="text-muted-foreground">—</span>,
    },
    {
      key: 'status', header: 'Status', align: 'center',
      cell: c => <Badge variant="outline" className={STATUS_COLORS[c.status]}>{STATUS_LABELS[c.status]}</Badge>,
    },
    { key: 'last_activity_at', header: 'Última atividade', cell: c => <span className="text-muted-foreground text-xs">{formatRelativeDate(c.last_activity_at)}</span> },
    {
      key: 'actions', header: 'Ações', align: 'center',
      cell: c => (
        <Button size="icon" variant="ghost" onClick={() => setSelected(c)}>
          <Eye className="w-4 h-4" />
        </Button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        title="Carrinhos Abandonados"
        subtitle="Acompanhe carrinhos não finalizados e oportunidades de recuperação"
      />

      {/* Métricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={ShoppingCart} label="Total capturados" value={metrics.total.toString()} accent="text-estrelinha-admin-violet" />
        <StatCard
          icon={AlertCircle}
          label="Em aberto"
          value={(metrics.active + metrics.abandoned).toString()}
          subtitle={formatPrice(metrics.abandonedValue) + ' em risco'}
          accent="text-orange-500"
        />
        <StatCard
          icon={TrendingUp}
          label="Taxa de recuperação"
          value={`${metrics.recoveryRate.toFixed(1)}%`}
          subtitle={`${metrics.recovered} recuperados`}
          accent="text-emerald-500"
        />
        <StatCard
          icon={DollarSign}
          label="Receita recuperada"
          value={formatPrice(metrics.recoveredValue)}
          subtitle={metrics.avgTicket > 0 ? `Ticket médio ${formatPrice(metrics.avgTicket)}` : undefined}
          accent="text-estrelinha-admin-pink"
        />
      </div>

      {/* Filtros */}
      <div className="space-y-3 mb-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por email ou nome..."
            className="pl-9"
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <Select
            value={filters.status}
            onValueChange={(v) => setFilters({ ...filters, status: v as AbandonedCartStatus | 'all' })}
          >
            <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="active">Ativo</SelectItem>
              <SelectItem value="abandoned">Abandonado</SelectItem>
              <SelectItem value="recovered">Recuperado</SelectItem>
              <SelectItem value="lost">Perdido</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={filters.hasReminder}
            onValueChange={(v) => setFilters({ ...filters, hasReminder: v as 'all' | 'yes' | 'no' })}
          >
            <SelectTrigger className="w-[180px] h-9"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Lembrete (todos)</SelectItem>
              <SelectItem value="yes">Com lembrete enviado</SelectItem>
              <SelectItem value="no">Sem lembrete</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabela */}
      {loading ? (
        <div className="p-12 text-center text-muted-foreground">Carregando...</div>
      ) : (
        <AdminTable
          columns={columns}
          data={carts}
          rowKey={c => c.id}
          empty={{
            icon: ShoppingCart,
            message: 'Nenhum carrinho abandonado registrado ainda.',
            hint: 'Os carrinhos serão capturados automaticamente quando clientes adicionarem itens estando logados ou preencherem email no checkout.',
          }}
          footer={<span>{carts.length} carrinho(s)</span>}
        />
      )}

      <AbandonedCartDetailDialog
        cart={selected}
        open={!!selected}
        onOpenChange={(o) => !o && setSelected(null)}
        onDelete={(id) => deleteCart.mutate(id)}
      />
    </div>
  )
}

export default AdminAbandonedCartsPage
