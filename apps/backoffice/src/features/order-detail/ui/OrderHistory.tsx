import { useEffect, useRef, useState } from 'react'
import { Mail, MessageSquare, RefreshCw, Clock, Send } from 'lucide-react'
import { Input } from '@estrelinha/ui/input'
import { cn } from '@estrelinha/ui/lib/utils'
import { isNotificationEvent, NOTIFICATION_EVENT_NAMES } from '@estrelinha/core/notifications'
import { ActionButton } from '@/shared/ui'
import { devolverFoco } from '@/shared/lib/foco'
import {
  HISTORY_FILTERS, filterHistory, type HistoryEvent, type HistoryKind,
} from '../model/history'

interface Props {
  events: HistoryEvent[]
  /** `false` = a nota não foi salva: o campo mantém o texto (`CRG-05`). */
  onAddNote: (note: string) => Promise<boolean | void>
  /**
   * O "Reenviar" da linha de falha E o avião da linha pulada (`AVS-13`): a mesma porta (`action=send`).
   * O terceiro argumento é o id da linha — é por ele que a página acende o estado só nela (`CRG-08`).
   */
  onResendEmail: (event: string, channel: string, id: string) => Promise<void>
  /** Alguma gravação está em curso no pedido (`CRG-02`). */
  busy?: boolean
  /** O id da linha cujo e-mail está saindo agora — só o botão dela mostra o estado (`CRG-08`). */
  reenviando?: string | null
  /** A nota está sendo salva — "Salvando nota…" no botão. */
  anotando?: boolean
  /**
   * Conserto do QA (`A-14`): a leitura dos e-mails do pedido falhou. O Histórico diz isso, com
   * "Tentar de novo" — nunca "Nada por aqui ainda.", que seria uma afirmação sobre o que não foi lido.
   */
  emailsError?: boolean
  onRetryEmails?: () => void | Promise<void>
}

/** A linha principal de um e-mail que falhou: legível. O erro técnico fica no detalhe recolhido (`A-15`). */
export const TENTATIVA_FALHOU = 'A tentativa de envio falhou'

const nomeDoEmail = (ev: HistoryEvent): string =>
  ev.emailType && isNotificationEvent(ev.emailType) ? NOTIFICATION_EVENT_NAMES[ev.emailType] : ev.title

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
const OrderHistory = ({
  events, onAddNote, onResendEmail, busy = false, reenviando = null, anotando = false,
  emailsError = false, onRetryEmails,
}: Props) => {
  const [filtro, setFiltro] = useState<HistoryKind | 'all'>('all')
  const [nota, setNota] = useState('')
  const secao = useRef<HTMLElement>(null)

  // Conserto do QA (foco): depois do avião ou do "Reenviar", o foco volta ao botão da MESMA linha; se
  // ele sumiu (o e-mail saiu e a linha virou "enviado"), à linha; se a linha sumiu, ao título do bloco.
  // Num efeito: só depois do commit o botão está reabilitado.
  const [focarLinha, setFocarLinha] = useState<{ id: string } | null>(null)
  useEffect(() => {
    if (!focarLinha) return
    const linha = secao.current?.querySelector(`[data-linha="${CSS.escape(focarLinha.id)}"]`) ?? null
    devolverFoco(
      linha?.querySelector('button') ?? null,
      () => linha,
      () => secao.current?.querySelector('h2') ?? null,
    )
    setFocarLinha(null)
  }, [focarLinha, events])

  // Conserto do reteste (`BUG-20261030-foco-cai-no-body-ao-reler-e-ao-dispensar`): o "Tentar de novo"
  // da leitura dos e-mails some com o aviso quando a releitura dá certo. O foco fica nele se ele
  // continua (a leitura falhou de novo); senão, vai ao título do bloco. Num efeito, pelo mesmo motivo
  // do de cima: só depois do commit se sabe se o aviso continua na tela.
  const tentarDeNovo = useRef<HTMLButtonElement>(null)
  const [focarAposReler, setFocarAposReler] = useState(false)
  useEffect(() => {
    if (!focarAposReler) return
    devolverFoco(tentarDeNovo.current, () => secao.current?.querySelector('h2') ?? null)
    setFocarAposReler(false)
  }, [focarAposReler, emailsError, events])

  const enviar = async (ev: HistoryEvent) => {
    await onResendEmail(ev.emailType!, ev.emailChannel ?? 'email', ev.id)
    setFocarLinha({ id: ev.id })
  }

  const visiveis = filterHistory(events, filtro)

  const icone = (kind: HistoryKind) =>
    kind === 'email' ? Mail : kind === 'note' ? MessageSquare : Clock

  return (
    <section ref={secao} className="rounded-xl border border-border bg-estrelinha-admin-card p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-heading text-lg font-semibold">Histórico</h2>
        {/* Conserto do QA (`BUG-20261030-pedido-rola-de-lado-com-fonte-200`): sem `flex-wrap`, com a
            fonte a 200 % em 390 a fileira media 589 px e a página inteira rolava para o lado. */}
        <div className="flex min-w-0 max-w-full flex-wrap gap-1" role="tablist" aria-label="Filtrar histórico">
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
        <ActionButton
          className="h-11"
          disabled={busy || nota.trim() === ''}
          pending={anotando}
          pendingLabel="Salvando nota…"
          onClick={async () => {
            const salvou = await onAddNote(nota.trim())
            if (salvou !== false) setNota('')
          }}
        >
          Anotar
        </ActionButton>
      </div>

      {emailsError && (
        <div
          role="alert"
          className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <span className="min-w-0 flex-1">Não consegui ler os e-mails deste pedido.</span>
          {onRetryEmails && (
            <ActionButton
              ref={tentarDeNovo}
              variant="outline"
              size="sm"
              alvo44
              pendingLabel="Lendo…"
              onClick={async () => {
                await onRetryEmails()
                setFocarAposReler(true)
              }}
            >
              Tentar de novo
            </ActionButton>
          )}
        </div>
      )}

      {visiveis.length === 0 ? (
        emailsError ? null :
        <p className="py-6 text-center text-sm text-muted-foreground">Nada por aqui ainda.</p>
      ) : (
        <ol className="space-y-3">
          {visiveis.map(ev => {
            // Feature `88` (`AVS-12`): a linha PULADA não é falha — foi escolha da Adri. Tom neutro,
            // o avião no lugar do ícone e, ao lado, o botão que manda o e-mail agora.
            const pulado = ev.kind === 'email' && ev.emailSkipped === true
            const Icone = pulado ? Send : icone(ev.kind)
            const falhou = ev.kind === 'email' && ev.emailSent === false && !pulado
            const emCurso = reenviando === ev.id

            return (
              <li key={ev.id} className="flex gap-3" data-linha={ev.id} data-pulado={pulado ? 'true' : undefined}>
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
                  {falhou && ev.emailType ? (
                    // `A-15` (conserto do QA): a linha principal é legível; o erro cru do provedor vai
                    // para o detalhe técnico, recolhido.
                    <>
                      <p className="text-sm text-destructive">{TENTATIVA_FALHOU}</p>
                      {ev.detail && (
                        <details className="text-xs text-muted-foreground">
                          <summary className="cursor-pointer">Detalhe técnico</summary>
                          <p className="break-words">{ev.detail}</p>
                        </details>
                      )}
                    </>
                  ) : ev.detail && (
                    <p className={cn('text-sm', falhou ? 'text-destructive' : 'text-muted-foreground')}>
                      {ev.detail}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    {new Date(ev.at).toLocaleString('pt-BR')}
                  </p>

                  {falhou && ev.emailType && (
                    <ActionButton
                      size="sm"
                      variant="outline"
                      className="mt-1.5 min-h-[44px]"
                      disabled={busy}
                      pending={emCurso}
                      pendingLabel="Reenviando…"
                      onClick={() => enviar(ev)}
                    >
                      <RefreshCw className="mr-1 h-3.5 w-3.5" /> Reenviar
                    </ActionButton>
                  )}
                </div>

                {pulado && ev.emailType && (
                  <ActionButton
                    size="icon"
                    variant="outline"
                    className={cn('h-11 min-w-11 shrink-0', emCurso ? 'w-auto px-3' : 'w-11')}
                    aria-label={`Enviar agora o e-mail “${nomeDoEmail(ev)}” para a cliente`}
                    title={`Enviar “${nomeDoEmail(ev)}” agora`}
                    disabled={busy}
                    pending={emCurso}
                    pendingLabel="Enviando…"
                    onClick={() => enviar(ev)}
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                  </ActionButton>
                )}
              </li>
            )
          })}
        </ol>
      )}
    </section>
  )
}

export default OrderHistory
