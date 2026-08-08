import { Clock, ArrowRight } from 'lucide-react'
import { STATUS_LABELS } from '@/entities/order/api/useAdminOrders'
import StatusBadge from './StatusBadge'
import type { DbOrderStatusHistory } from '@estrelinha/supabase/types'

interface Props {
  history: DbOrderStatusHistory[]
  loading?: boolean
}

const OrderTimeline = ({ history, loading }: Props) => {
  if (loading) return <p className="text-sm text-muted-foreground py-4 text-center">Carregando...</p>
  if (history.length === 0) return <p className="text-sm text-muted-foreground py-4 text-center">Nenhuma alteração de status registrada.</p>

  return (
    <div className="relative space-y-0">
      {history.map((entry, i) => (
        <div key={entry.id} className="flex gap-3 pb-4 last:pb-0">
          <div className="flex flex-col items-center">
            <div className="w-8 h-8 rounded-full bg-nana-elevated border border-nana-border flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4 text-nana-violet" />
            </div>
            {i < history.length - 1 && <div className="w-px flex-1 bg-nana-border mt-1" />}
          </div>
          <div className="flex-1 min-w-0 pt-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              {entry.from_status && <StatusBadge status={entry.from_status} />}
              {entry.from_status && <ArrowRight className="w-3 h-3 text-muted-foreground" />}
              <StatusBadge status={entry.to_status} />
            </div>
            {entry.note && <p className="text-sm text-muted-foreground mt-1">{entry.note}</p>}
            <p className="text-xs text-muted-foreground mt-1">
              {new Date(entry.created_at).toLocaleString('pt-BR')}
            </p>
          </div>
        </div>
      ))}
    </div>
  )
}

export default OrderTimeline
