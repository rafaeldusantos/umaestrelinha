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

/**
 * Estende a área CLICÁVEL do `Switch` até 44px de altura, sem mudar um pixel do desenho.
 *
 * O `Switch` do design system é `h-6 w-11` — 24×44, e a altura fica **abaixo do piso de alvo de
 * toque**. Medido em navegador real em 390px na feature 53, que criou o `switchClassName` para
 * corrigir um card e escreveu a classe **dentro** daquele arquivo.
 *
 * A feature 55 precisou do mesmo alvo em mais quatro controles e trouxe a constante para cá, que é a
 * camada que todos eles alcançam — uma segunda escrita da mesma medida é o "defeito 01" no tamanho
 * de uma classe: as duas divergem, as duas renderizam, e ninguém vê.
 *
 * **Continua opt-in**, e isso é de propósito: torná-la padrão mudaria a área clicável dos 7
 * `ToggleField` anteriores à 53, que esta feature não tocou e não mediu.
 *
 * O molde é o `TAP_44` da loja, **nunca importado** — ele mora em `apps/store`, e cruzar apps criaria
 * o segundo dono que aquele guarda existe para impedir.
 */
export const SWITCH_TAP_44 =
  "relative before:absolute before:content-[''] before:-top-[10px] before:-bottom-[10px] before:left-0 before:right-0"

interface ToggleFieldProps {
  label: string
  description?: string
  checked: boolean
  onChange: (v: boolean) => void
  /**
   * Aditivo, opcional — os 7 chamadores de antes da feature `53` não passam nada e continuam
   * idênticos. `Switch` é `h-6 w-11` (24×44): abaixo de 44px de altura como alvo de toque, medido
   * em navegador real em 390px na seção Notificações. O molde é o `TAP_44` da loja (pseudo-elemento
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
