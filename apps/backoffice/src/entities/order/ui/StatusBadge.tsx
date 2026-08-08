import { STATUS_LABELS } from '@/entities/order/api/useAdminOrders'

const statusStyles: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  paid: 'bg-green-50 text-green-800 border-green-200',
  separating: 'bg-orange-50 text-orange-800 border-orange-200',
  shipped: 'bg-blue-50 text-blue-800 border-blue-200',
  delivered: 'bg-nana-elevated text-nana-violet border-nana-border',
  cancelled: 'bg-red-50 text-red-800 border-red-200',
}

const StatusBadge = ({ status }: { status: string }) => (
  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusStyles[status] ?? 'bg-muted text-muted-foreground border-border'}`}>
    {STATUS_LABELS[status] ?? status}
  </span>
)

export default StatusBadge
