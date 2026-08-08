import type { PaymentStatus } from '@nanapin/supabase/types'

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Recusado',
  refunded: 'Estornado',
  expired: 'Expirado',
  cancelled: 'Cancelado',
}

// 6 estados, cores distintas (PAY-17)
const statusStyles: Record<PaymentStatus, string> = {
  pending: 'bg-amber-50 text-amber-800 border-amber-200',
  approved: 'bg-green-50 text-green-800 border-green-200',
  rejected: 'bg-red-50 text-red-800 border-red-200',
  refunded: 'bg-purple-50 text-purple-800 border-purple-200',
  expired: 'bg-slate-100 text-slate-600 border-slate-200',
  cancelled: 'bg-orange-50 text-orange-800 border-orange-200',
}

const PaymentStatusBadge = ({ status }: { status: PaymentStatus }) => (
  <span
    className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
      statusStyles[status] ?? 'bg-muted text-muted-foreground border-border'
    }`}
  >
    {PAYMENT_STATUS_LABELS[status] ?? status}
  </span>
)

export default PaymentStatusBadge
