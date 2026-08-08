import { ArrowLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@nanapin/ui/button'
import { cn } from '@nanapin/ui/lib/utils'

interface Props {
  title: string
  subtitle?: string
  actions?: React.ReactNode
  icon?: LucideIcon
  backTo?: () => void
  className?: string
}

const PageHeader = ({ title, subtitle, actions, icon: Icon, backTo, className }: Props) => (
  <div className={cn('flex items-start justify-between gap-4 flex-wrap mb-6', className)}>
    <div className="flex items-center gap-3 min-w-0">
      {backTo && (
        <Button variant="ghost" size="icon" onClick={backTo} aria-label="Voltar">
          <ArrowLeft className="w-5 h-5" />
        </Button>
      )}
      {Icon && (
        <div className="w-10 h-10 rounded-xl gradient-cta flex items-center justify-center shrink-0">
          <Icon className="w-5 h-5 text-white" />
        </div>
      )}
      <div className="min-w-0">
        <h1 className="font-heading text-2xl font-bold text-foreground truncate">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
      </div>
    </div>
    {actions && <div className="flex items-center gap-2 flex-wrap">{actions}</div>}
  </div>
)

export default PageHeader
