import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { blocoDe, devolverFoco, tituloDaPagina, type Alternativa } from '@/shared/lib/foco'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@estrelinha/ui/dialog'
import { Button } from '@estrelinha/ui/button'
import { Textarea } from '@estrelinha/ui/textarea'
import { AlertTriangle, Info } from 'lucide-react'
import { formatOrderNumber } from '@estrelinha/core/orders'
import {
  NOTIFICATION_EVENT_NAMES,
  type CustomerNotice,
  type NotificationEvent,
} from '@estrelinha/core/notifications'
import { NoticeEmails } from '@/features/order-notice'
import { ActionButton } from '@/shared/ui'

interface Props {
  open: boolean
  onOpenChange: (v: boolean) => void
  orderNumber: string
  /**
   * Feature `88` (`AVS-08`): a previsão do cancelamento, feita pela página com `customerNoticeFor` sobre
   * o pedido cancelado. `send` vazio ⇒ sem caixa, e uma linha diz por quê.
   */
  aviso?: CustomerNotice
  /** Os e-mails à cliente que o cancelamento PRODUZ (mesmo desligados) — o nome da linha "desligado". */
  eventosDaCliente?: NotificationEvent[]
  /** O e-mail da cliente (`customer_email`). Vazio ⇒ "sem e-mail no pedido". */
  cliente?: string | null
  /** "Ver o e-mail" (`AVS-22`): a prévia daquele evento com o pedido. */
  onVerEmail?: (event: NotificationEvent) => void
  /**
   * A gravação. `avisarCliente` é a caixa — `undefined` quando não havia caixa (nenhum e-mail previsto:
   * nada a escolher, nada a anotar). `null` = cancelado, o diálogo fecha; uma frase = falhou, o diálogo
   * fica aberto com ela e com o motivo digitado (`CRG-07`).
   */
  onConfirm: (reason: string, avisarCliente: boolean | undefined) => Promise<string | null>
}

const nome = (e: NotificationEvent) => `“${NOTIFICATION_EVENT_NAMES[e]}”`

/**
 * `PED-31` — o diálogo diz **o que cancelar NÃO faz**.
 *
 * Antes ele dizia só "esta ação não pode ser desfeita", que é verdade e é a metade menos útil: quem
 * cancela um pedido pago quer saber se o dinheiro volta e se a peça volta ao estoque. **As duas
 * respostas são não**, e nada na tela dizia isso.
 *
 * O estorno é manual no painel do Mercado Pago, e a reposição de estoque não existe neste código.
 * Descobrir isso depois — pela cliente cobrando o dinheiro — é o pior lugar para descobrir.
 *
 * Feature `88`: a caixa "Avisar a cliente por e-mail" mora DENTRO deste diálogo (`A-03`), pela mesma
 * `NoticeEmails` do portão de aviso; e o diálogo só fecha DEPOIS do desfecho — antes ele fechava e
 * apagava o motivo mesmo quando o cancelamento falhava (`CRG-07`).
 */
const OrderCancelDialog = ({
  open, onOpenChange, orderNumber, aviso, eventosDaCliente = [], cliente, onVerEmail, onConfirm,
}: Props) => {
  const [reason, setReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [avisar, setAvisar] = useState(true)
  const [erro, setErro] = useState<string | null>(null)
  // Conserto do QA (foco): quem abriu o diálogo ("Cancelar pedido") fica desabilitado enquanto o
  // cancelamento grava, e o navegador tira o foco dele. Ao fechar, o foco volta a ele ou ao título.
  const origem = useRef<Element | null>(null)
  const alternativas = useRef<Alternativa[]>([])

  // Antes do foco entrar no diálogo (o `FocusScope` do Radix foca num efeito passivo do filho).
  useLayoutEffect(() => {
    if (!open) return
    origem.current = document.activeElement
    alternativas.current = [blocoDe(origem.current), tituloDaPagina]
  }, [open])

  // A caixa nasce marcada a cada abertura (`A-02`); a escolha nunca vaza de um cancelamento para outro.
  useEffect(() => {
    if (open) {
      setAvisar(true)
      setErro(null)
    }
  }, [open])

  const previstos = aviso?.send ?? []
  const comCaixa = previstos.length > 0

  const handleConfirm = async () => {
    if (!reason.trim() || saving) return
    setSaving(true)
    setErro(null)
    let desfecho: string | null
    try {
      desfecho = await onConfirm(reason.trim(), comCaixa ? avisar : undefined)
    } catch {
      desfecho = 'O pedido não foi cancelado. O motivo continua aqui — tente de novo.'
    }
    setSaving(false)
    if (desfecho !== null) {
      setErro(desfecho)
      return
    }
    setReason('')
    onOpenChange(false)
  }

  const semCaixa = (): string => {
    const ja = aviso?.alreadySent ?? []
    if (ja.length > 0) return `${nome(ja[0])} já tinha sido enviado, não sai de novo.`
    if (String(cliente ?? '').trim() === '') return 'Este pedido não tem e-mail da cliente: nenhum aviso sai.'
    if (eventosDaCliente.length === 0) return 'Nenhum e-mail à cliente sai nesta mudança.'
    return `Nenhum e-mail sai: ${eventosDaCliente.map(nome).join(', ')} está desligado em Configurações → Notificações.`
  }

  return (
    <Dialog
      open={open}
      // Com a gravação no ar, `Esc`, clique fora e o "x" não fecham (`CRG-07`).
      onOpenChange={v => {
        if (!v && saving) return
        onOpenChange(v)
      }}
    >
      <DialogContent
        className="max-h-[90vh] max-w-md overflow-y-auto"
        onCloseAutoFocus={e => {
          e.preventDefault()
          devolverFoco(origem.current, ...alternativas.current)
        }}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            Cancelar Pedido {formatOrderNumber(orderNumber)}
          </DialogTitle>
        </DialogHeader>
        <div className="min-w-0 space-y-3">
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
            aria-label="Motivo do cancelamento"
            placeholder="Ex: Cliente solicitou cancelamento por telefone..."
            value={reason}
            onChange={e => setReason(e.target.value)}
            disabled={saving}
            rows={3}
          />

          {aviso ? (
            comCaixa ? (
              <NoticeEmails
                avisar={avisar}
                onAvisar={setAvisar}
                disabled={saving}
                eventos={previstos.map(event => ({ event }))}
                cliente={cliente ?? undefined}
                onVerEmail={onVerEmail}
              />
            ) : (
              <p className="flex items-start gap-2 text-sm text-muted-foreground">
                <Info className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{semCaixa()}</span>
              </p>
            )
          ) : null}

          {erro ? (
            <div role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
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
            pendingLabel="Cancelando…"
            onClick={handleConfirm}
            disabled={!reason.trim()}
          >
            Confirmar cancelamento
          </ActionButton>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default OrderCancelDialog
