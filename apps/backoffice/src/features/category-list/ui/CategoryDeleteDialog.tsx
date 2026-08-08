// RFN-09 / T57 — excluir categoria dizendo o estrago ANTES.
//
// Mesmo molde da `BulkDeleteDialog` da T44 (prévia + palavra digitada), com a diferença que importa
// aqui: o colateral de apagar uma categoria não é ela sumir, é **o produto perder a etiqueta**. O
// `on delete cascade` de `product_categories` remove os vínculos em silêncio; o admin precisa ver
// quantos são antes, porque não há desfazer.

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@estrelinha/ui/dialog'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { CONFIRM_WORD, matchesConfirmWord, PREVIEW_LIMIT } from '@/features/bulk-edit/model/confirmDelete'
import type { DeletionImpact } from '../model/categoryTree'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  impact: DeletionImpact
  onConfirm: () => void
  deleting?: boolean
}

const CategoryDeleteDialog = ({ open, onOpenChange, impact, onConfirm, deleting = false }: Props) => {
  const [step, setStep] = useState<1 | 2>(1)
  const [typed, setTyped] = useState('')

  useEffect(() => {
    if (open) {
      setStep(1)
      setTyped('')
    }
  }, [open])

  const preview = impact.rows.slice(0, PREVIEW_LIMIT)
  const rest = impact.rows.length - preview.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[560px] max-w-[95vw] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
            Excluir {impact.categories} categoria{impact.categories === 1 ? '' : 's'}?
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Esta ação não pode ser desfeita.
              {impact.subcategories > 0 && (
                <>
                  {' '}Inclui <strong>{impact.subcategories} subcategoria{impact.subcategories === 1 ? '' : 's'}</strong>,
                  que a seleção arrastou junto.
                </>
              )}
            </p>

            <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-foreground">
              <strong>{impact.productLinks} vínculo{impact.productLinks === 1 ? '' : 's'} com produtos</strong> {' '}
              {impact.productLinks === 1 ? 'será removido' : 'serão removidos'}. Os produtos continuam
              existindo — só deixam de aparecer nessa{impact.categories === 1 ? '' : 's'} categoria{impact.categories === 1 ? '' : 's'}.
            </p>

            <ul className="divide-y divide-border rounded-xl border border-border" aria-label="Categorias que serão excluídas">
              {preview.map(row => (
                <li key={row.category.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">
                    {row.depth > 0 && <span className="mr-1 text-muted-foreground">↳</span>}
                    {row.category.name}
                  </span>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {row.ownCount} produto{row.ownCount === 1 ? '' : 's'}
                  </span>
                </li>
              ))}
            </ul>
            {rest > 0 && (
              <p className="text-xs text-muted-foreground">e mais {rest} categoria{rest === 1 ? '' : 's'}</p>
            )}

            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button type="button" variant="outline" className="border-destructive/30 text-destructive" onClick={() => setStep(2)}>
                Continuar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              Para confirmar a exclusão de{' '}
              <strong>{impact.categories} categoria{impact.categories === 1 ? '' : 's'}</strong>,
              digite <strong>{CONFIRM_WORD}</strong> abaixo.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-delete-categoria">Confirmação</Label>
              <Input
                id="confirm-delete-categoria"
                autoFocus
                value={typed}
                placeholder={CONFIRM_WORD}
                onChange={event => setTyped(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>Voltar</Button>
              <Button
                type="button"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={!matchesConfirmWord(typed) || deleting}
                onClick={onConfirm}
              >
                Excluir {impact.categories} categoria{impact.categories === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default CategoryDeleteDialog
