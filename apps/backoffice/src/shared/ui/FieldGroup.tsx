import { Label } from '@estrelinha/ui/label'
import { Switch } from '@estrelinha/ui/switch'

interface FieldGroupProps {
  label: string
  hint?: string
  htmlFor?: string
  children: React.ReactNode
}

export const FieldGroup = ({ label, hint, htmlFor, children }: FieldGroupProps) => (
  <div className="space-y-1.5">
    <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">{label}</Label>
    {children}
    {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
  </div>
)

interface ToggleFieldProps {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
  /**
   * Aditivo, opcional — os 7 chamadores de antes da feature `53` não passam nada e continuam
   * idênticos. `Switch` é `h-6 w-11` (24×44): abaixo de 44px de altura como alvo de toque, medido
   * em navegador real em 390px na aba Notificações. O molde é o `TAP_44` da loja (pseudo-elemento
   * `before:` que estende a área CLICÁVEL sem mudar o desenho visual) — nunca importado aqui (ele
   * mora em `apps/store` e criar um segundo dono da medida é o que aquele guarda existe para
   * impedir), então cada chamador que precisar do alvo maior passa a própria classe.
   */
  switchClassName?: string
}

export const ToggleField = ({ label, description, checked, onChange, switchClassName }: ToggleFieldProps) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-3">
    <div className="min-w-0">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    {/* O rótulo é um `<p>`, não um `<Label htmlFor>`, então o switch nascia SEM NOME ACESSÍVEL: um
        leitor de tela anunciava "interruptor, ligado" e nada mais, em todos os toggles do painel.
        `aria-label` é o mínimo que dá nome ao controle sem mexer no desenho. */}
    <Switch aria-label={label} checked={checked} onCheckedChange={onChange} className={switchClassName} />
  </div>
)
