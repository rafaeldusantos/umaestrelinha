// Feature `88` · C6 — o diálogo de aviso (`AVS-01`..`AVS-07`, `AVS-19`, `AVS-22`, `CRG-07`).
//
// Decisão `A-02`: uma CAIXA MARCADA "Avisar a cliente por e-mail" e UM botão que confirma a mudança.
// Desmarcar e confirmar grava sem e-mail à cliente — o aviso para a dona sai do mesmo jeito (`A-04`).
// "Voltar", `Esc` e clique fora não gravam nada. Enquanto a gravação corre, nenhum dos três fecha, e o
// diálogo só fecha depois do desfecho: em falha, a frase fica aqui dentro, com a caixa como estava.
//
// O estado (aberto, ocupado, erro, a caixa) mora em `useNoticeGate`; este componente só desenha.

import { useRef } from 'react'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@estrelinha/ui/dialog'
import { Button } from '@estrelinha/ui/button'
import type { NotificationEvent } from '@estrelinha/core/notifications'
import { ActionButton } from '@/shared/ui'
import type { NoticeRequest } from '../model/types'
import { NoticeEmails } from './NoticeEmails'

interface Props {
  pedido: NoticeRequest | null
  aberto: boolean
  ocupado: boolean
  erro: string | null
  avisar: boolean
  onAvisar: (v: boolean) => void
  onConfirmar: () => void
  onVoltar: () => void
  onVerEmail: (event: NotificationEvent) => void
  /** Ao fechar, o foco volta ao botão que abriu o diálogo. */
  onFechou: () => void
}

export const NoticeDialog = ({
  pedido, aberto, ocupado, erro, avisar, onAvisar, onConfirmar, onVoltar, onVerEmail, onFechou,
}: Props) => {
  const titulo = useRef<HTMLHeadingElement>(null)
  if (!pedido) return null

  return (
    <Dialog
      open={aberto}
      // Controlado: com a gravação no ar, o pedido de fechar (`Esc`, clique fora, o "x") é ignorado.
      onOpenChange={(v) => {
        if (!v && !ocupado) onVoltar()
      }}
    >
      <DialogContent
        className="max-h-[90vh] max-w-md overflow-y-auto"
        onOpenAutoFocus={(e) => {
          e.preventDefault()
          titulo.current?.focus()
        }}
        onCloseAutoFocus={(e) => {
          e.preventDefault()
          onFechou()
        }}
      >
        <DialogHeader>
          <DialogTitle ref={titulo} tabIndex={-1} className="outline-none">
            {pedido.titulo}
          </DialogTitle>
          <DialogDescription>{pedido.mudanca}</DialogDescription>
        </DialogHeader>

        <div className="min-w-0 space-y-3">
          {pedido.extra}
          <NoticeEmails
            avisar={avisar}
            onAvisar={onAvisar}
            disabled={ocupado}
            eventos={pedido.eventos}
            cliente={pedido.cliente}
            lote={pedido.lote}
            jaRecebeu={pedido.jaRecebeu}
            onVerEmail={pedido.orderId ? onVerEmail : undefined}
          />
          {pedido.notaDaDona ? <p className="text-sm text-muted-foreground">{pedido.notaDaDona}</p> : null}
          {erro ? (
            <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {erro}
            </div>
          ) : null}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" className="min-h-11" onClick={onVoltar} disabled={ocupado}>
            Voltar
          </Button>
          <ActionButton alvo44 pending={ocupado} pendingLabel={pedido.gerundio} onClick={onConfirmar}>
            {pedido.confirmar}
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default NoticeDialog
