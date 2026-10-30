// Feature `88` · `AVS-02`, `AVS-04`, `AVS-19`, `AVS-22` — a caixa "Avisar a cliente por e-mail", os
// e-mails que ela controla e a frase do que acontece com ela desmarcada.
//
// Separado do diálogo porque o cancelamento põe a MESMA caixa dentro do diálogo dele (`A-03`): duas
// escritas destas frases divergiriam sem nada quebrar.

import { useId } from 'react'
import { Mail, Send } from 'lucide-react'
import { Checkbox } from '@estrelinha/ui/checkbox'
import { cn } from '@estrelinha/ui/lib/utils'
import { NOTIFICATION_EVENT_NAMES, type NotificationEvent } from '@estrelinha/core/notifications'
import type { NoticeEmail } from '../model/types'

interface Props {
  avisar: boolean
  onAvisar: (v: boolean) => void
  disabled?: boolean
  eventos: NoticeEmail[]
  cliente?: string
  lote?: { comEmail: number }
  jaRecebeu?: string | null
  /** Com ele, cada e-mail ganha "Ver o e-mail" (só fora do lote). */
  onVerEmail?: (event: NotificationEvent) => void
}

export const NoticeEmails = ({ avisar, onAvisar, disabled, eventos, cliente, lote, jaRecebeu, onVerEmail }: Props) => {
  const id = useId()
  const quem = lote && lote.comEmail > 1 ? `as ${lote.comEmail} clientes` : 'a cliente'
  const para = lote
    ? lote.comEmail === 1
      ? '1 e-mail:'
      : `${lote.comEmail} e-mails, um para cada cliente:`
    : `Para ${cliente ?? ''}:`

  return (
    <div className="space-y-3">
      <div className="flex min-h-11 items-start gap-3 rounded-lg border border-border bg-muted/40 p-3">
        <Checkbox
          id={id}
          checked={avisar}
          disabled={disabled}
          onCheckedChange={(v) => onAvisar(v === true)}
          className="mt-0.5"
        />
        <label htmlFor={id} className="min-w-0 cursor-pointer text-sm">
          <span className="block font-medium">Avisar {quem} por e-mail</span>
          <span className="block break-words text-muted-foreground">{para}</span>
        </label>
      </div>

      <ul
        data-riscado={avisar ? undefined : 'true'}
        className={cn('space-y-1.5 text-sm', !avisar && 'text-muted-foreground line-through')}
      >
        {eventos.map(({ event, quantos }) => (
          <li key={event} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <span className="flex min-w-0 items-center gap-2">
              <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
              <span>{NOTIFICATION_EVENT_NAMES[event]}</span>
              {quantos ? (
                <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium no-underline">{quantos}</span>
              ) : null}
            </span>
            {onVerEmail && !lote ? (
              <button
                type="button"
                onClick={() => onVerEmail(event)}
                className="min-h-11 text-sm text-primary underline-offset-4 hover:underline"
              >
                Ver o e-mail
              </button>
            ) : null}
          </li>
        ))}
      </ul>

      {jaRecebeu ? <p className="text-sm text-muted-foreground">{jaRecebeu}</p> : null}

      {avisar ? (
        <p className="text-sm text-muted-foreground">
          Desmarque se você já avisou por outro caminho ou só está acertando o registro.
        </p>
      ) : (
        <p className="flex items-start gap-2 text-sm">
          <Send className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          <span>
            {lote ? 'Nenhuma cliente recebe e-mail.' : 'A cliente não recebe e-mail.'} Fica anotado no histórico, com o
            avião para enviar depois se você mudar de ideia.
          </span>
        </p>
      )}
    </div>
  )
}

export default NoticeEmails
