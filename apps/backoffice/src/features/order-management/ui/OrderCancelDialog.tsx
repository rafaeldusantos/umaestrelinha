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

/**
 * `PED-31` — o diálogo diz **o que cancelar NÃO faz**.
 *
 * Antes ele dizia só "esta ação não pode ser desfeita", que é verdade e é a metade menos útil: quem
 * cancela um pedido pago quer saber se o dinheiro volta e se a peça volta ao estoque. **As duas
 * respostas são não**, e nada na tela dizia isso.
 *
 * O estorno é manual no painel do Mercado Pago, e a reposição de estoque não existe neste código.
 * Descobrir isso depois — pela cliente cobrando o dinheiro — é o pior lugar para descobrir.
 */
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
            O pedido será marcado como cancelado, e isso não pode ser desfeito.
          </p>

          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3">
            <p className="text-sm font-medium text-destructive">Cancelar aqui NÃO faz duas coisas:</p>
            <ul className="mt-1.5 list-disc space-y-1 pl-4 text-sm text-destructive">
              <li>
                <strong>não estorna no Mercado Pago.</strong> Se o pedido foi pago, a devolução é
                feita à mão no painel deles.
              </li>
              <li>
                <strong>não repõe o estoque.</strong> Se a peça saiu do estoque, ela continua fora.
              </li>
            </ul>
          </div>

          <div className="rounded-lg border border-border bg-muted p-3">
            <p className="text-sm font-medium">Informe o motivo do cancelamento:</p>
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
