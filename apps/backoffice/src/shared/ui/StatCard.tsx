import type { LucideIcon } from 'lucide-react'
import { cn } from '@estrelinha/ui/lib/utils'

interface Props {
  label: string
  value: string | number
  icon?: LucideIcon
  /** classe de cor do ícone, ex.: 'text-nana-violet' */
  accent?: string
  subtitle?: string
  className?: string
}

const StatCard = ({ label, value, icon: Icon, accent, subtitle, className }: Props) => (
  <div className={cn('bg-card rounded-2xl border border-border p-4 hover:border-primary/30 transition-colors', className)}>
    <div className="flex items-start justify-between gap-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      {Icon && <Icon className={cn('w-4 h-4 shrink-0', accent ?? 'text-muted-foreground')} />}
    </div>
    <p className="font-heading text-2xl font-bold text-foreground mt-2">{value}</p>
    {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
  </div>
)

export default StatCard
