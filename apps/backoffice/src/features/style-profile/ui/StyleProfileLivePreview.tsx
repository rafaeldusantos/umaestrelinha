// O palco da prévia do perfil de estilo: a LOJA de verdade, num iframe — o quarto palco do painel, no
// molde de `AnnouncementLivePreview`. O painel nunca veste a paleta da loja: quem veste é a loja, com
// o perfil que a ponte entrega (`previaUnica.test.ts`). É também o que mantém o painel nas cores dele
// — outro documento, outra folha.
//
// Vive dentro do modal do card, e por isso não tem modo de tela cheia: o modal já é a vista ampliada.
// Os dois tamanhos e a conta da escala são os de `previewFrame`. Trocar de dispositivo não toca no
// `src`.
//
// O endereço pede a Home PUBLICADA (`previewSrc` com `home: 'publicada'`): a ponte deste palco manda
// só o perfil, nunca a composição, e a Home em prévia sem o pedido esperaria um rascunho que não vem.

import { useEffect, useMemo, useRef, useState } from 'react'
import { Monitor, Smartphone } from 'lucide-react'
import type { StyleProfile } from '@estrelinha/core/appearance'
import {
  PREVIEW_DEVICES,
  previewFrame,
  previewMetrics,
  previewSrc,
  type PreviewDevice,
} from '@estrelinha/core/home'
import { cn } from '@estrelinha/ui/lib/utils'
import { STORE_URL, storeOrigin } from '@/shared/lib/storeOrigin'
import { useStyleProfilePreviewBridge } from '../model/useStyleProfilePreviewBridge'

interface Props {
  /** O perfil escolhido e ainda não salvo. */
  profile: StyleProfile
}

const StyleProfileLivePreview = ({ profile }: Props) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const palcoRef = useRef<HTMLDivElement>(null)

  const [caixa, setCaixa] = useState({ width: 0, height: 0 })
  // Abre no celular, como os outros palcos: é onde a cliente vê a loja.
  const [device, setDevice] = useState<PreviewDevice>('mobile')

  const origem = useMemo(() => storeOrigin(), [])
  const src = useMemo(() => (STORE_URL ? previewSrc(STORE_URL, { home: 'publicada' }) : null), [])

  const { aoCarregar } = useStyleProfilePreviewBridge({ iframeRef, origin: origem, profile })

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

  const frame = previewFrame(device, caixa, false)
  const { width, height, scale: escala } = frame

  return (
    <section
      data-testid="palco-previa-perfil"
      className="flex min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card"
    >
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-4 py-2.5">
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
        <span data-testid="metrica-previa-perfil" className="text-xs tabular-nums text-muted-foreground">
          {previewMetrics(frame)}
        </span>
      </header>

      <div
        ref={palcoRef}
        className="flex h-[60vh] min-h-[320px] items-start justify-center overflow-hidden bg-muted/50 p-5"
      >
        {src ? (
          <div style={{ width: width * escala, height: height * escala }} className="shrink-0 overflow-hidden">
            <iframe
              ref={iframeRef}
              src={src}
              title="Prévia da loja com o perfil de estilo"
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
            data-testid="previa-perfil-sem-loja"
            className="max-w-sm rounded-xl border border-dashed border-input bg-card p-5 text-center"
          >
            <p className="text-sm font-semibold text-foreground">A prévia precisa do endereço da loja</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Defina <code className="rounded bg-muted px-1 py-0.5">VITE_STORE_URL</code> em{' '}
              <code className="rounded bg-muted px-1 py-0.5">apps/backoffice/.env</code> e recarregue o painel.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">O perfil continua escolhível — só a prévia depende disto.</p>
          </div>
        )}
      </div>
    </section>
  )
}

export default StyleProfileLivePreview
