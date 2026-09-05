import { useState } from 'react'
import { Mail, MessageSquare, RefreshCw, Clock } from 'lucide-react'
import { Button } from '@estrelinha/ui/button'
import { Input } from '@estrelinha/ui/input'
import { cn } from '@estrelinha/ui/lib/utils'
import {
  HISTORY_FILTERS, filterHistory, type HistoryEvent, type HistoryKind,
} from '../model/history'

interface Props {
  events: HistoryEvent[]
  onAddNote: (note: string) => Promise<void>
  onResendEmail: (type: string) => Promise<void>
  busy?: boolean
}

/**
 * `PED-27` / `PED-28` — status, e-mails e notas num fluxo só, filtrável.
 *
 * O campo de nota fica **no topo**, e não no fim: escrever é a ação, ler é o contexto. Empurrá-lo
 * para baixo de trinta eventos faria a Adri rolar para anotar.
 *
 * **Cada e-mail mostra se saiu.** Era a informação que não existia em aba nenhuma — e a que decide
 * se a cliente sabe ou não que a joia foi postada. Falha oferece reenviar; o envio continua contido
 * e **nunca reverte estado** (`AD-008`).
 */
const OrderHistory = ({ events, onAddNote, onResendEmail, busy = false }: Props) => {
  const [filtro, setFiltro] = useState<HistoryKind | 'all'>('all')
  const [nota, setNota] = useState('')

  const visiveis = filterHistory(events, filtro)

  const icone = (kind: HistoryKind) =>
    kind === 'email' ? Mail : kind === 'note' ? MessageSquare : Clock

  return (
    <section className="rounded-xl border border-border bg-estrelinha-admin-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold">Histórico</h2>
        <div className="flex gap-1" role="tablist" aria-label="Filtrar histórico">
          {HISTORY_FILTERS.map(f => (
            <button
              key={f.id}
              type="button"
              role="tab"
              aria-selected={filtro === f.id}
              onClick={() => setFiltro(f.id)}
              className={cn(
                'min-h-[44px] rounded-lg px-3 text-sm',
                filtro === f.id ? 'bg-muted font-medium' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4 flex gap-2">
        <Input
          value={nota}
          onChange={e => setNota(e.target.value)}
          placeholder="Escrever uma nota interna..."
          className="h-11"
          aria-label="Nova nota interna"
        />
        <Button
          className="h-11"
          disabled={busy || nota.trim() === ''}
          onClick={async () => {
            await onAddNote(nota.trim())
            setNota('')
          }}
        >
          Anotar
        </Button>
      </div>

      {visiveis.length === 0 ? (
        <p className="py-6 text-center text-sm text-muted-foreground">Nada por aqui ainda.</p>
      ) : (
        <ol className="space-y-3">
          {visiveis.map(ev => {
            const Icone = icone(ev.kind)
            const falhou = ev.kind === 'email' && ev.emailSent === false

            return (
              <li key={ev.id} className="flex gap-3">
                <span
                  className={cn(
                    'mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border',
                    falhou
                      ? 'border-destructive/30 bg-destructive/10 text-destructive'
                      : 'border-border bg-muted text-muted-foreground',
                  )}
                  aria-hidden="true"
                >
                  <Icone className="h-3.5 w-3.5" />
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{ev.title}</p>
                  {ev.detail && (
                    <p className={cn('text-sm', falhou ? 'text-destructive' : 'text-muted-foreground')}>
                      {ev.detail}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(ev.at).toLocaleString('pt-BR')}
                  </p>

                  {falhou && ev.emailType && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-1.5 min-h-[44px]"
                      disabled={busy}
                      onClick={() => onResendEmail(ev.emailType!)}
                    >
                      <RefreshCw className="mr-1 h-3.5 w-3.5" /> Reenviar
                    </Button>
                  )}
                </div>
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

export default OrderHistory
