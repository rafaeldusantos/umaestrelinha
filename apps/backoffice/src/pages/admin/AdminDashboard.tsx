import { Package, ShoppingCart, Users, TrendingUp, DollarSign, Clock } from 'lucide-react'
import { useAdminStats } from '@/entities/stats/api/useAdminStats'
import StatusBadge from '@/entities/order/ui/StatusBadge'
import SalesChart from '@/widgets/sales-chart/ui/SalesChart'
import AlertsPanel from '@/widgets/alerts-panel/ui/AlertsPanel'
import TopProductsCard from '@/widgets/top-products/ui/TopProductsCard'
import QuickActions from '@/widgets/quick-actions/ui/QuickActions'
import { PageHeader, StatCard, AdminTable, type AdminColumn } from '@/shared/ui'
import { formatPrice } from '@nanapin/core/formatters'

type RecentOrder = ReturnType<typeof useAdminStats>['stats']['recentOrders'][number]

const AdminDashboard = () => {
  const { stats, loading } = useAdminStats()

  const statCards = [
    { label: 'Pedidos Hoje', value: stats.ordersToday, icon: ShoppingCart, color: 'text-nana-pink' },
    { label: 'Fat. Hoje', value: formatPrice(stats.revenueToday), icon: DollarSign, color: 'text-emerald-500' },
    { label: 'Fat. do Mês', value: formatPrice(stats.monthRevenue), icon: TrendingUp, color: 'text-nana-violet' },
    { label: 'Produtos Ativos', value: stats.activeProducts, icon: Package, color: 'text-nana-cyan' },
    { label: 'Clientes Novos', value: stats.newCustomers, icon: Users, color: 'text-nana-yellow' },
    { label: 'Pendentes', value: stats.pendingOrders, icon: Clock, color: 'text-amber-500' },
  ]

  const orderColumns: AdminColumn<RecentOrder>[] = [
    { key: 'order_number', header: '#Pedido', cell: o => <span className="font-medium">{o.order_number}</span> },
    { key: 'customer_name', header: 'Cliente', cell: o => o.customer_name },
    { key: 'total', header: 'Valor', align: 'right', cell: o => formatPrice(o.total) },
    { key: 'status', header: 'Status', align: 'center', cell: o => <StatusBadge status={o.status} /> },
    { key: 'created_at', header: 'Data', align: 'right', cell: o => <span className="text-muted-foreground">{new Date(o.created_at).toLocaleDateString('pt-BR')}</span> },
  ]

  return (
    <div className="space-y-6">
      <PageHeader title="Dashboard" />

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
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
