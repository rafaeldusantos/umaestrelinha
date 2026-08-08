// RFN-02 (A27) — excluir em massa, com o que vai sumir na tela antes de sumir.
//
// Duas etapas de propósito. A primeira é **conhecimento prévio**: mostra nome, preço e status de
// cada produto que será excluído. A segunda é **atrito deliberado**: exige a palavra `EXCLUIR`
// digitada, porque não existe desfazer aqui — o `useUndoBuffer` restaura VALORES, e linha apagada
// não tem valor para restaurar.

import { useEffect, useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@estrelinha/ui/dialog'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { Label } from '@estrelinha/ui/label'
import { formatPrice } from '@estrelinha/core/formatters'
import { statusCell } from '@/features/product-list/model/rowSummary'
import type { AdminListRow } from '@/entities/product/api/productQuery'
import { CONFIRM_WORD, matchesConfirmWord, PREVIEW_LIMIT } from '../model/confirmDelete'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  rows: AdminListRow[]
  onConfirm: () => void
  deleting?: boolean
}

const BulkDeleteDialog = ({ open, onOpenChange, rows, onConfirm, deleting = false }: Props) => {
  const [step, setStep] = useState<1 | 2>(1)
  const [typed, setTyped] = useState('')

  // Reabrir sempre começa da lista: pular direto para a confirmação seria transformar o atrito
  // deliberado em decoração.
  useEffect(() => {
    if (open) {
      setStep(1)
      setTyped('')
    }
  }, [open])

  const preview = rows.slice(0, PREVIEW_LIMIT)
  const rest = rows.length - preview.length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] w-[560px] max-w-[95vw] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" aria-hidden="true" />
            Excluir {rows.length} produto{rows.length === 1 ? '' : 's'}?
          </DialogTitle>
        </DialogHeader>

        {step === 1 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Esta ação não pode ser desfeita. Confira o que será excluído:
            </p>
            <ul className="divide-y divide-border rounded-xl border border-border" aria-label="Produtos que serão excluídos">
              {preview.map(row => (
                <li key={row.id} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{row.name}</span>
                  <span className="shrink-0 text-muted-foreground">{formatPrice(row.price)}</span>
                  <span className="w-20 shrink-0 text-right text-xs text-muted-foreground">
                    {statusCell(row).label}
                  </span>
                </li>
              ))}
            </ul>
            {rest > 0 && (
              <p className="text-xs text-muted-foreground">e mais {rest} produto{rest === 1 ? '' : 's'}</p>
            )}
            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="button" variant="outline" className="border-destructive/30 text-destructive" onClick={() => setStep(2)}>
                Continuar
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-foreground">
              Para confirmar a exclusão de <strong>{rows.length} produto{rows.length === 1 ? '' : 's'}</strong>,
              digite <strong>{CONFIRM_WORD}</strong> abaixo.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="confirm-delete">Confirmação</Label>
              <Input
                id="confirm-delete"
                autoFocus
                value={typed}
                placeholder={CONFIRM_WORD}
                onChange={event => setTyped(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-3 pt-1">
              <Button type="button" variant="outline" onClick={() => setStep(1)}>
                Voltar
              </Button>
              <Button
                type="button"
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                disabled={!matchesConfirmWord(typed) || deleting}
                onClick={onConfirm}
              >
                Excluir {rows.length} produto{rows.length === 1 ? '' : 's'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export default BulkDeleteDialog
