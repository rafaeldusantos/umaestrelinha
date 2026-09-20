// Feature 53 (T09) — renderiza a resposta de `?action=preview` SEM RECOMPOR (`ABN-06`). O HTML que
// chega já passou por `notificationDraftRefusal` no servidor; o componente só o entrega ao
// `<iframe sandbox="">`, byte a byte, em `srcDoc`. Nenhuma concatenação de `heading`/`lead` aqui —
// isso seria um segundo desenho do e-mail, dentro do painel, que é o "defeito 01" de novo.
//
// ## A moldura, feature 56 (`LEG-16`)
//
// Os três estados — carregando, erro e prévia — moram agora dentro da MESMA moldura, com uma barra
// que a nomeia. Duas razões, e nenhuma é enfeite:
//
// - **A barra diz o que aquilo é.** Um `<iframe>` de 390px com um e-mail dentro, solto no meio de um
//   formulário, não se explica. "O mesmo e-mail que a cliente recebe" é a frase que responde a
//   pergunta que a prévia existe para responder.
// - **Uma moldura só não pula.** Antes, carregando era uma caixa de 160px, erro era uma caixa
//   vermelha e a prévia era outra coisa — três alturas, três bordas, e a página saltava a cada
//   troca. Agora a moldura é a mesma e o miolo é que muda.
//
// Os botões de largura **não** cabem na barra: eles são `h-11` (`ABN-10`, alvo de toque) e a barra é
// uma faixa de rótulo de ~32px. Eles ficam no corpo, junto do iframe. O selo `Prévia de exemplo`,
// esse sim, sobe — ele é informação SOBRE a prévia, que é o que a barra nomeia.

import { useState, type ReactNode } from 'react'
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

/** `LEG-16` — a frase que nomeia a moldura. Uma só, nos três estados. */
const TITULO_DA_MOLDURA = 'Prévia — o mesmo e-mail que a cliente recebe'

const Moldura = ({ sample, children }: { sample?: boolean; children: ReactNode }) => (
  <div data-testid="email-preview-frame" className="overflow-hidden rounded-xl border border-border">
    {/* `flex-wrap` + piso de largura no título: medido em 390px, sem eles o selo espremia a frase
        em TRÊS linhas quebrando no hífen de "e-mail". Com o piso, quem desce de linha é o selo — que
        é o elemento curto e opcional —, e o título fica em uma ou duas linhas inteiras. */}
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 border-b border-border bg-muted/40 px-3.5 py-2">
      {/* Os dois discos são o sinal de "isto é uma janela, e o que está dentro não é esta tela".
          Decorativos: `aria-hidden`, sem texto, sem função. */}
      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-border" />
      <span aria-hidden className="h-2 w-2 shrink-0 rounded-full bg-border" />
      <p className="ml-1 min-w-[11rem] flex-1 text-[11px] font-medium text-muted-foreground">
        {TITULO_DA_MOLDURA}
      </p>
      {sample && (
        <span
          data-testid="preview-sample-badge"
          className="ml-auto shrink-0 rounded-full bg-muted px-2.5 py-0.5 text-[11px] font-medium text-muted-foreground"
        >
          Prévia de exemplo
        </span>
      )}
    </div>
    <div className="p-3">{children}</div>
  </div>
)

export function EmailPreviewFrame({ subject, html, text, sample, loading, error }: EmailPreviewFrameProps) {
  const [width, setWidth] = useState<PreviewWidth>(390)

  if (loading) {
    return (
      <Moldura>
        <div role="status" className="flex h-40 items-center justify-center text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
          Gerando prévia…
        </div>
      </Moldura>
    )
  }

  if (error) {
    return (
      <Moldura>
        <div
          role="alert"
          className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive"
        >
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
          <p>{error}</p>
        </div>
      </Moldura>
    )
  }

  // Sem carga e sem resultado: nada foi pedido ainda. Quem monta este componente só o faz depois de
  // clicar em "ver prévia" — mas ficar defensivo aqui é mais barato do que confiar no chamador. E é
  // o único caminho que NÃO desenha a moldura: uma moldura vazia prometeria conteúdo que ninguém
  // pediu.
  if (html === undefined) return null

  return (
    <Moldura sample={sample}>
      <div className="space-y-3">
        <div role="group" aria-label="Largura da prévia" className="flex w-fit gap-1 rounded-xl border border-border p-1">
          {PREVIEW_WIDTHS.map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={width === w}
              data-testid={`preview-width-${w}`}
              onClick={() => setWidth(w)}
              className={cn(
                'flex h-11 min-w-11 items-center justify-center rounded-lg px-3 text-xs font-medium transition-colors motion-reduce:transition-none',
                width === w ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-muted',
              )}
            >
              {w}px
            </button>
          ))}
        </div>

        <div className="overflow-x-auto rounded-lg bg-muted/30 p-3">
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
              className="whitespace-pre-wrap rounded-lg border border-border bg-muted/30 p-3 text-xs text-foreground"
            >
              {text}
            </pre>
          </div>
        )}
      </div>
    </Moldura>
  )
}

export default EmailPreviewFrame
