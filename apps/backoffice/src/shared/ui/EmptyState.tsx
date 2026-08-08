import type { LucideIcon } from 'lucide-react'
import { cn } from '@nanapin/ui/lib/utils'

interface Props {
  icon?: LucideIcon
  message: string
  hint?: string
  action?: React.ReactNode
  className?: string
}

const EmptyState = ({ icon: Icon, message, hint, action, className }: Props) => (
  <div className={cn('bg-card rounded-2xl border border-border p-12 text-center', className)}>
    {Icon && <Icon className="w-12 h-12 text-muted-foreground/40 mx-auto mb-3" />}
    <p className="text-muted-foreground">{message}</p>
    {hint && <p className="text-xs text-muted-foreground mt-2">{hint}</p>}
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
)

export default EmptyState
