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
}

export const ToggleField = ({ label, description, checked, onChange }: ToggleFieldProps) => (
  <div className="flex items-center justify-between gap-4 rounded-xl border border-border p-3">
    <div className="min-w-0">
      <p className="text-sm font-medium text-foreground">{label}</p>
      {description && <p className="text-xs text-muted-foreground">{description}</p>}
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
)
