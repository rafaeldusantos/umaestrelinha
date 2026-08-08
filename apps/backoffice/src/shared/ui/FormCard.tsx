import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@nanapin/ui/card'
import { cn } from '@nanapin/ui/lib/utils'

interface Props {
  title?: string
  description?: string
  /**
   * Slot à direita do título — badge, contagem ou link.
   *
   * Os artboards do produto usam esse canto em quase todo card (`3 selecionadas`, `4 de 6`,
   * `Abrir ↗`), e sem o slot cada tela improvisaria o próprio cabeçalho.
   */
  action?: React.ReactNode
  footer?: React.ReactNode
  className?: string
  contentClassName?: string
  children: React.ReactNode
}

const FormCard = ({ title, description, action, footer, className, contentClassName, children }: Props) => (
  <Card className={cn('rounded-2xl', className)}>
    {(title || description || action) && (
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {title && <CardTitle className="font-heading text-lg">{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {action && <div className="shrink-0">{action}</div>}
        </div>
      </CardHeader>
    )}
    <CardContent className={cn(!title && !description && 'pt-6', 'space-y-4', contentClassName)}>
      {children}
    </CardContent>
    {footer && <CardFooter>{footer}</CardFooter>}
  </Card>
)

export default FormCard
