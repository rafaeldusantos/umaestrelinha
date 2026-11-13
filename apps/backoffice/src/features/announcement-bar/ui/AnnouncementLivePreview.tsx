// O palco da prévia da faixa de avisos: a LOJA de verdade, num iframe — o terceiro palco do painel,
// no molde de `MenuLivePreview` e `HomeLivePreview`. O painel nunca desenha a faixa: quem desenha é a
// loja, com o rascunho que a ponte entrega (`previaUnica.test.ts`).
//
// Os dois tamanhos são os de `previewFrame` (390 × 844 e 1024 × 768), e a conta da escala é de lá.
// Trocar de dispositivo não toca no `src`; recarregar remonta o nó por `key`.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Maximize2, Minimize2, Monitor, RefreshCw, Smartphone } from 'lucide-react'
import type { AnnouncementSettings } from '@estrelinha/core/announcements'
import {
  PREVIEW_DEVICES,
  previewFrame,
  previewMetrics,
  previewSrc,
  type PreviewDevice,
} from '@estrelinha/core/home'
import { cn } from '@estrelinha/ui/lib/utils'
import { STORE_URL, storeOrigin } from '@/shared/lib/storeOrigin'
import { useFullscreenStage } from '@/shared/lib/useFullscreenStage'
import { useAnnouncementsPreviewBridge } from '../model/useAnnouncementsPreviewBridge'

interface Props {
  /** A faixa como a tela a tem agora, na forma gravável. */
  draft: AnnouncementSettings
  /** O aviso que a prévia mostra (começa em zero). */
  mostrar: number
}

const AnnouncementLivePreview = ({ draft, mostrar }: Props) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const palcoRef = useRef<HTMLDivElement>(null)

  const [caixa, setCaixa] = useState({ width: 0, height: 0 })
  const [recarga, setRecarga] = useState(0)
  // Abre no celular: é onde a faixa tem duas linhas, e onde ~90% das clientes a veem.
  const [device, setDevice] = useState<PreviewDevice>('mobile')

  const origem = useMemo(() => storeOrigin(), [])
  const src = useMemo(() => (STORE_URL ? previewSrc(STORE_URL) : null), [])

  const { aoCarregar } = useAnnouncementsPreviewBridge({ iframeRef, origin: origem, draft, mostrar })

  useEffect(() => {
    const alvo = palcoRef.current
    if (!alvo || typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(([entrada]) => {
      const { width, height } = entrada.contentRect
      setCaixa({ width, height })
    })
    observer.observe(alvo)
    return () => observer.disconnect()
  }, [])

  const { cheia, entrar, sair, classes: classesDaTelaCheia } = useFullscreenStage()
  const frame = previewFrame(device, caixa, cheia)
  const { width, height, scale: escala } = frame
  const recarregar = useCallback(() => setRecarga(n => n + 1), [])

  return (
    <section
      data-testid="palco-previa-faixa"
      data-fullscreen={cheia ? 'true' : undefined}
      className={cn(
        'flex h-full min-h-[520px] flex-col overflow-hidden rounded-2xl border border-border bg-card',
        classesDaTelaCheia,
      )}
    >
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            aria-hidden
            className={cn('h-1.5 w-1.5 shrink-0 rounded-full', src ? 'bg-emerald-500' : 'bg-muted-foreground')}
          />
          <h3 className="shrink-0 font-heading text-sm font-bold text-foreground">Loja</h3>
          <span className="truncate text-xs text-muted-foreground">loja real · rascunho ao vivo</span>
        </div>

        <div
          role="group"
          aria-label="Dispositivo da prévia"
          className="flex shrink-0 items-center gap-0.5 rounded-xl bg-muted p-0.5"
        >
          {(['mobile', 'desktop'] as const).map(chave => {
            const Icone = chave === 'mobile' ? Smartphone : Monitor
            const ativo = device === chave
            return (
              <button
                key={chave}
                type="button"
                data-testid={`dispositivo-${chave}`}
                aria-pressed={ativo}
                onClick={() => setDevice(chave)}
                className={cn(
                  'flex min-h-11 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold',
                  ativo ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icone className="h-3.5 w-3.5" aria-hidden />
                {PREVIEW_DEVICES[chave].label}
              </button>
            )
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span data-testid="metrica-previa-faixa" className="text-xs tabular-nums text-muted-foreground">
            {previewMetrics(frame)}
          </span>
          {src && (
            <button
              type="button"
              onClick={cheia ? sair : entrar}
              aria-label={cheia ? 'Sair da tela cheia' : 'Tela cheia'}
              className="flex h-11 items-center gap-1.5 rounded-lg border border-border px-2.5 text-xs font-semibold text-muted-foreground hover:bg-muted"
            >
              {cheia ? <Minimize2 className="h-4 w-4" aria-hidden /> : <Maximize2 className="h-4 w-4" aria-hidden />}
              {cheia ? 'Sair' : 'Tela cheia'}
            </button>
          )}
          <button
            type="button"
            aria-label="Recarregar a prévia"
            onClick={recarregar}
            className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
          </button>
          {src && (
            <a
              href={src.replace(/\?preview=1$/, '')}
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir a loja em nova aba"
              className="flex h-11 w-11 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          )}
        </div>
      </header>

      <div ref={palcoRef} className="flex min-h-0 flex-1 items-start justify-center overflow-hidden bg-muted/50 p-5">
        {src ? (
          <div
            data-testid="caixa-previa-faixa"
            style={{ width: width * escala, height: height * escala }}
            className="shrink-0 overflow-hidden"
          >
            <iframe
              key={recarga}
              ref={iframeRef}
              src={src}
              title="Prévia da faixa de avisos na loja"
              width={width}
              height={height}
              data-device={device}
              onLoad={aoCarregar}
              style={{
                width,
                height,
                transform: `scale(${escala})`,
                transformOrigin: 'top left',
                border: 0,
                display: 'block',
                backgroundColor: '#FFFFFF',
              }}
            />
          </div>
        ) : (
          <div
            data-testid="previa-faixa-sem-loja"
            className="max-w-sm rounded-xl border border-dashed border-input bg-card p-5 text-center"
          >
            <p className="text-sm font-semibold text-foreground">A prévia precisa do endereço da loja</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Defina <code className="rounded bg-muted px-1 py-0.5">VITE_STORE_URL</code> em{' '}
              <code className="rounded bg-muted px-1 py-0.5">apps/backoffice/.env</code> e recarregue o painel.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Os avisos continuam editáveis — só a prévia depende disto.</p>
          </div>
        )}
      </div>
    </section>
  )
}

export default AnnouncementLivePreview
