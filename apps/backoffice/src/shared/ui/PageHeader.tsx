import { ArrowLeft } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { cn } from '@estrelinha/ui/lib/utils'

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
        /*
          `h-11 w-11` sobrepõe o `h-10 w-10` do `size="icon"` — 44px, o piso de alvo de toque.
          Este prop **nunca teve consumidor** até a feature 55, então subir a medida aqui não move um
          pixel em nenhuma outra tela do painel; e quem o usa é justamente o cabeçalho de voltar do
          CELULAR, onde o alvo é o dedo. Medido no design system: `size="icon"` é 40×40.
        */
        <Button
          variant="ghost"
          size="icon"
          className="h-11 w-11"
          onClick={backTo}
          aria-label="Voltar"
        >
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
