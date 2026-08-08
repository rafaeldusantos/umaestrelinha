import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@estrelinha/ui/dialog'
import { Button } from '@estrelinha/ui/button'
import { Textarea } from '@estrelinha/ui/textarea'
import { AlertTriangle } from 'lucide-react'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  orderNumber: string
  onConfirm: (reason: string) => Promise<void>
}

const OrderCancelDialog = ({ open, onOpenChange, orderNumber, onConfirm }: Props) => {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)

  const handleConfirm = async () => {
    if (!reason.trim()) return
    setSaving(true)
    await onConfirm(reason.trim())
    setSaving(false)
    setReason('')
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Cancelar Pedido #{orderNumber}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Esta ação não pode ser desfeita. O pedido será marcado como cancelado.
          </p>
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            <p className="text-sm font-medium text-destructive">Informe o motivo do cancelamento:</p>
          </div>
          <Textarea
            placeholder="Ex: Cliente solicitou cancelamento por telefone..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            rows={3}
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Voltar</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={saving || !reason.trim()}>
            {saving ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default OrderCancelDialog
