// Desfazer o pagamento registrado à mão: pede o motivo e diz o que volta. Não há caixa de aviso — o
// desfazer não manda e-mail à cliente. O diálogo só fecha DEPOIS do desfecho: falhando, fica aberto
// com a frase e com o motivo digitado.

import { useLayoutEffect, useRef, useState } from 'react'
import { Undo2 } from 'lucide-react'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@estrelinha/ui/dialog'
import { Button } from '@estrelinha/ui/button'
import { Textarea } from '@estrelinha/ui/textarea'
import { MANUAL_PAYMENT_UNDO_REASON_MAX } from '@estrelinha/core/orders'
import { ActionButton } from '@/shared/ui'
import { devolverFoco, tituloDaPagina } from '@/shared/lib/foco'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  /** A gravação. `null` = o diálogo fecha (desfeito, ou recusa que a página já avisou); uma frase = o diálogo fica aberto com ela. */
  onConfirm: (motivo: string) => Promise<string | null>
}

export const UndoManualPaymentDialog = ({ open, onOpenChange, onConfirm }: Props) => {
  const [motivo, setMotivo] = useState('')
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  // Quem abriu ("Desfazer registro") some depois do desfazer: o foco volta a ele, ou ao título.
  const origem = useRef<Element | null>(null)

  useLayoutEffect(() => {
    if (!open) return
    origem.current = document.activeElement
    setErro(null)
  }, [open])

  const vazio = motivo.trim() === ''

  const confirmar = async () => {
    if (vazio || saving) return
    setSaving(true)
    setErro(null)
    let desfecho: string | null
    try {
      desfecho = await onConfirm(motivo.trim())
    } catch {
      desfecho = 'O registro não foi desfeito. O motivo continua aqui — tente de novo.'
    }
    setSaving(false)
    if (desfecho !== null) {
      setErro(desfecho)
      return
    }
    setMotivo('')
    onOpenChange(false)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={v => {
        if (!v && saving) return
        onOpenChange(v)
      }}
    >
      <DialogContent
        className="max-h-[90vh] max-w-md overflow-y-auto"
        onCloseAutoFocus={e => {
          e.preventDefault()
          devolverFoco(origem.current, tituloDaPagina)
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5" aria-hidden="true" />
            Desfazer o pagamento registrado
          </DialogTitle>
        </DialogHeader>
        <div className="min-w-0 space-y-3 text-sm">
          <p className="text-muted-foreground">
            O pedido volta a Pendente e o pagamento à situação de antes do registro. O que foi baixado do
            estoque volta, o uso do cupom é devolvido e o pedido sai das vendas. A observação e os
            comprovantes ficam guardados.
          </p>
          <p className="text-muted-foreground">Nenhum e-mail sai para a cliente.</p>
          <label htmlFor="motivo-desfazer" className="block font-medium">
            Motivo
          </label>
          <Textarea
            id="motivo-desfazer"
            placeholder="Ex: o comprovante era de outro pedido"
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            maxLength={MANUAL_PAYMENT_UNDO_REASON_MAX}
            disabled={saving}
            rows={3}
          />
          {erro ? (
            <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-destructive">
              {erro}
            </div>
          ) : null}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" className="min-h-11" onClick={() => onOpenChange(false)} disabled={saving}>
            Voltar
          </Button>
          <ActionButton
            alvo44
            variant="destructive"
            pending={saving}
            pendingLabel="Desfazendo…"
            onClick={confirmar}
            disabled={vazio}
          >
            Desfazer o registro
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
