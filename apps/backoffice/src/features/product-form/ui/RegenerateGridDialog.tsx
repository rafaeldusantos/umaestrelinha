import { Button } from '@nanapin/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@nanapin/ui/dialog'
import { variantLabel } from '@nanapin/core/pricing'
import type { ProductOption } from '@nanapin/supabase/types'
import type { RegeneratePlan } from '../model/gridActions'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  plan: RegeneratePlan
  options: ProductOption[]
  onConfirm: () => void
}

/**
 * O diff de **Regerar do cruzamento** (PFM-08 AC 6).
 *
 * Existe por uma razão só: regerar pode **remover** linhas, e linha removida leva preço, estoque e
 * SKU com ela. Mostrar `N a criar · M a remover` antes de aplicar é a diferença entre uma ação
 * previsível e uma que o admin descobre depois.
 */
const RegenerateGridDialog = ({ open, onOpenChange, plan, options, onConfirm }: Props) => {
  const nothingToDo = plan.toCreate.length === 0 && plan.toRemove.length === 0

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Regerar a grade do cruzamento</DialogTitle>
          <DialogDescription data-testid="regenerate-summary">
            {nothingToDo
              ? 'A grade já corresponde ao cruzamento dos eixos. Nada a fazer.'
              : `${plan.toCreate.length} a criar · ${plan.toRemove.length} a remover`}
          </DialogDescription>
        </DialogHeader>

        {plan.toRemove.length > 0 && (
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <p className="mb-1 font-medium text-foreground">
              Estas linhas saem da grade, com preço e estoque:
            </p>
            <ul className="list-inside list-disc text-muted-foreground">
              {plan.toRemove.map(variant => (
                <li key={variant.id}>{variantLabel(options, variant.option_values) || variant.id}</li>
              ))}
            </ul>
          </div>
        )}

        {plan.toCreate.length > 0 && (
          <p className="text-sm text-muted-foreground">
            As {plan.toCreate.length} linhas novas nascem <strong>pausadas e sem preço</strong> —
            nenhuma entra na loja antes de você dizer quanto custa.
          </p>
        )}

        {plan.toKeep.length > 0 && (
          <p className="text-sm text-muted-foreground">
            {plan.toKeep.length} linha(s) existente(s) ficam intactas, com preço, estoque e SKU.
          </p>
        )}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="button" onClick={onConfirm} disabled={nothingToDo}>
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default RegenerateGridDialog
