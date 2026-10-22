import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@estrelinha/ui/lib/utils'

interface Props {
  label: string
  /**
   * O valor. Conteúdo de FRASE (texto ou `<span>`): ele mora dentro de um `<p>`, e um bloco ali
   * seria HTML inválido.
   */
  value: ReactNode
  icon?: LucideIcon
  /** classe de cor do ícone, ex.: 'text-estrelinha-admin-violet' */
  accent?: string
  subtitle?: string
  className?: string
  /**
   * Feature 71 (`VIS-05`): enquanto `true`, um esqueleto ocupa o lugar do valor — NO LUGAR do `<p>`,
   * nunca dentro dele — e o subtítulo não é desenhado. Nenhum `0` aparece antes de o número chegar.
   */
  loading?: boolean
  /** Feature 71 (`VIS-08`): um nó no cabeçalho, ao lado do rótulo (o ⓘ de Visitas únicas). */
  info?: ReactNode
}

// As props da feature 71 são ADITIVAS e OPCIONAIS: sem elas a saída é a mesma de antes — a suíte
// compara o HTML com uma cópia do desenho anterior. Os outros consumidores leem o valor como "o
// segundo `<p>` do cartão" (`AdminPromotionsPage.test.tsx`, `AdminCouponsPage.test.tsx`).
const StatCard = ({ label, value, icon: Icon, accent, subtitle, className, loading, info }: Props) => (
  <div className={cn('bg-card rounded-2xl border border-border p-4 hover:border-primary/30 transition-colors motion-reduce:transition-none', className)}>
    <div className="flex items-start justify-between gap-2">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
      {info ? (
        // O ícone decorativo NÃO recebe toque: o alvo do `info` é 44×44 por margem negativa (−14px de
        // cada lado) e o `gap-2` é de 8px, então o ícone fica 6px DENTRO da borda direita do alvo e,
        // pintado depois, roubava o toque ali — medido em navegador na prova da feature 71
        // (`prova-navegador.md`). Sem eventos, o toque cai no botão que está por baixo.
        <div className="flex shrink-0 items-center gap-2">
          {info}
          {Icon && <Icon className={cn('w-4 h-4 shrink-0 pointer-events-none', accent ?? 'text-muted-foreground')} />}
        </div>
      ) : (
        Icon && <Icon className={cn('w-4 h-4 shrink-0', accent ?? 'text-muted-foreground')} />
      )}
    </div>
    {loading ? (
      <div aria-hidden="true" data-skeleton="valor" className="mt-2 h-8 w-20 rounded-md bg-muted animate-pulse motion-reduce:animate-none" />
    ) : (
      <>
        <p className="font-heading text-2xl font-bold text-foreground mt-2">{value}</p>
        {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
      </>
    )}
  </div>
)

export default StatCard
