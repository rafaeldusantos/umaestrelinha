import { Package, Users, TrendingUp, Clock } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { useAdminStats } from '@/entities/stats/api/useAdminStats'
import { STORE_MOVEMENT_KEY } from '@/entities/stats'
import { ORDERS_REALTIME_CHANNEL, useOrdersRealtime } from '@/entities/order'
import { StoreMovement } from '@/widgets/store-movement'
import StatusBadge from '@/entities/order/ui/StatusBadge'
import SalesChart from '@/widgets/sales-chart/ui/SalesChart'
import AlertsPanel from '@/widgets/alerts-panel/ui/AlertsPanel'
import TopProductsCard from '@/widgets/top-products/ui/TopProductsCard'
import QuickActions from '@/widgets/quick-actions/ui/QuickActions'
import { PageHeader, StatCard, AdminTable, type AdminColumn } from '@/shared/ui'
import { formatPrice } from '@estrelinha/core/formatters'
import { formatOrderNumber } from '@estrelinha/core/orders'

type RecentOrder = ReturnType<typeof useAdminStats>['stats']['recentOrders'][number]

const AdminDashboard = () => {
  const { stats, loading, refetch } = useAdminStats()
  const queryClient = useQueryClient()

  // Feature 71 · `VIS-10 (d)`: UM canal de pedidos (`entities/order`), e o aviso dele relê as duas
  // coisas — as estatísticas e o bloco "Movimento da loja". O bloco continua sendo o único dono da
  // consulta dele; aqui só se invalida a chave.
  useOrdersRealtime(ORDERS_REALTIME_CHANNEL, () => {
    void refetch()
    void queryClient.invalidateQueries({ queryKey: STORE_MOVEMENT_KEY })
  })

  // Feature 71 · `VIS-35` (assunção PENDENTE de confirmação do usuário): "Pedidos Hoje" e "Fat. Hoje"
  // saíram — contavam o dia em UTC e pedido não pago, e o bloco acima responde "hoje" pela régua do
  // banco. Reverter a task 27 devolve os dois.
  const statCards = [
    { label: 'Fat. do Mês', value: formatPrice(stats.monthRevenue), icon: TrendingUp, color: 'text-estrelinha-admin-violet' },
    { label: 'Produtos Ativos', value: stats.activeProducts, icon: Package, color: 'text-estrelinha-admin-cyan' },
    { label: 'Clientes Novos', value: stats.newCustomers, icon: Users, color: 'text-estrelinha-admin-yellow' },
    { label: 'Pendentes', value: stats.pendingOrders, icon: Clock, color: 'text-amber-500' },
  ]

  const orderColumns: AdminColumn<RecentOrder>[] = [
    // O `#` sai do formatador, e por isso o cabeçalho deixou de traze-lo: com os dois, a coluna
    // lia-se "#Pedido / #0170".
    { key: 'order_number', header: 'Pedido', cell: o => <span className="font-medium">{formatOrderNumber(o.order_number)}</span> },
    { key: 'customer_name', header: 'Cliente', cell: o => o.customer_name },
    { key: 'total', header: 'Valor', align: 'right', cell: o => formatPrice(o.total) },
    { key: 'status', header: 'Status', align: 'center', cell: o => <StatusBadge status={o.status} /> },
    { key: 'created_at', header: 'Data', align: 'right', cell: o => <span className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString('pt-BR')}</span> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />

      {/* Feature 71 · `VIS-01`: a primeira seção depois do cabeçalho. */}
      <StoreMovement />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(s => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} accent={s.color} />
        ))}
      </div>

      {/* Chart + Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <SalesChart data={stats.salesData} />
        </div>
        <AlertsPanel lowStock={stats.lowStockProducts} pendingOrders={stats.pendingOrders} />
      </div>

      {/* Top Products + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <TopProductsCard products={stats.topProducts} />
        </div>
        <QuickActions />
      </div>

      {/* Recent Orders */}
      <div className="space-y-3">
        <h2 className="font-heading font-bold text-foreground">Últimos Pedidos</h2>
        {loading ? (
          <div className="p-8 text-center text-muted-foreground text-sm">Carregando...</div>
        ) : (
          <AdminTable
            columns={orderColumns}
            data={stats.recentOrders}
            rowKey={o => o.id}
            empty={{ message: 'Nenhum pedido ainda.' }}
          />
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
