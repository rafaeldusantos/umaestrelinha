// Feature 53 (T09) — renderiza a resposta de `?action=preview` SEM RECOMPOR (`ABN-06`). O HTML que
// chega já passou por `notificationDraftRefusal` no servidor; o componente só o entrega ao
// `<iframe sandbox="">`, byte a byte, em `srcDoc`. Nenhuma concatenação de `heading`/`lead` aqui —
// isso seria um segundo desenho do e-mail, dentro do painel, que é o "defeito 01" de novo.

import { useState } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import { cn } from '@estrelinha/ui/lib/utils'

export interface EmailPreviewFrameProps {
  subject?: string
  html?: string
  text?: string
  sample?: boolean
  loading?: boolean
  error?: string
}

/** Os dois únicos números que a spec pede (`ABN-06`) — nunca um terceiro, nunca campo livre. */
const PREVIEW_WIDTHS = [390, 600] as const
type PreviewWidth = (typeof PREVIEW_WIDTHS)[number]

export function EmailPreviewFrame({ subject, html, text, sample, loading, error }: EmailPreviewFrameProps) {
  const [width, setWidth] = useState<PreviewWidth>(390)

  if (loading) {
    return (
      <div
        role="status"
        className="flex h-40 items-center justify-center rounded-xl border border-border text-sm text-muted-foreground"
      >
        <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
        Gerando prévia…
      </div>
    )
  }

  if (error) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
      >
        <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <p>{error}</p>
      </div>
    )
  }

  // Sem carga e sem resultado: nada foi pedido ainda. Quem monta este componente só o faz depois de
  // clicar em "ver prévia" — mas ficar defensivo aqui é mais barato do que confiar no chamador.
  if (html === undefined) return null

  return (
    <div className="space-y-3" data-testid="email-preview-frame">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="group" aria-label="Largura da prévia" className="flex gap-1 rounded-xl border border-border p-1">
          {PREVIEW_WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={width === w}
              data-testid={`preview-width-${w}`}
              onClick={() => setWidth(w)}
              className={cn(
                'flex h-11 min-w-11 items-center justify-center rounded-lg px-3 text-xs font-medium transition-colors',
                width === w
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {w}px
            </button>
          ))}
        </div>

        {sample && (
          <span
            data-testid="preview-sample-badge"
            className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground"
          >
            Prévia de exemplo
          </span>
        )}
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-muted/30 p-3">
        <iframe
          sandbox=""
          srcDoc={html}
          title={subject ?? 'Prévia do e-mail'}
          data-testid="email-preview-iframe"
          style={{ width, height: 480 }}
          className="rounded-lg border border-border bg-white"
        />
      </div>

      {text !== undefined && (
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">Versão texto</p>
          <pre
            data-testid="email-preview-text"
            className="whitespace-pre-wrap rounded-xl border border-border bg-muted/30 p-3 text-xs text-foreground"
          >
            {text}
          </pre>
        </div>
      )}
    </div>
  )
}

export default EmailPreviewFrame
