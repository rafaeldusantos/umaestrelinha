// Feature 25 — o palco da prévia: **a loja de verdade, num iframe**.
//
// O que existia aqui antes era `HomePreview.tsx`, 277 linhas redesenhando à mão o que
// `apps/store/src/widgets/home-renderer` (130 linhas) já desenhava. Dois desenhos da mesma Home, em
// apps que não se importam, com a divergência não quebrando nada — build, `tsc` e teste de
// componente passavam com o painel prometendo um arranjo que a loja não renderiza.
//
// **O iframe também é o que preserva a separação de tokens.** Renderizar os widgets da loja dentro
// do painel traria `--estrelinha-*` para o mesmo documento de `--estrelinha-admin-*` — o defeito que
// `importOrder.test.ts` e `palette.test.ts` existem para pegar. Outro documento, outra folha.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Monitor, RefreshCw, Smartphone } from 'lucide-react'
import {
  PREVIEW_DEVICES,
  previewMetrics,
  previewScale,
  previewSrc,
  type HomeSection,
  type PreviewDevice,
} from '@estrelinha/core/home'
import { cn } from '@estrelinha/ui/lib/utils'
import { STORE_URL, storeOrigin } from '@/shared/lib/storeOrigin'
import { usePreviewBridge } from '../model/usePreviewBridge'

/** A folga entre o palco e o quadro. Entra na conta da escala, senão o quadro encosta na borda. */
const FOLGA = 40

interface Props {
  /** A composição a mostrar — já com o que a dona ainda não salvou. */
  sections: HomeSection[]
  highlightId: string | null
  onSelect: (sectionId: string) => void
}

const HomeLivePreview = ({ sections, highlightId, onSelect }: Props) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const palcoRef = useRef<HTMLDivElement>(null)

  const [device, setDevice] = useState<PreviewDevice>('mobile')
  const [caixa, setCaixa] = useState({ width: 0, height: 0 })
  // Recarregar remonta o nó **sem mexer no `src`**: trocar o endereço é o que a T9 não pode fazer,
  // porque o alternador de dispositivo compartilharia o mesmo caminho e cada clique nele perderia o
  // rascunho já entregue.
  const [recarga, setRecarga] = useState(0)

  const origem = useMemo(() => storeOrigin(), [])
  const src = useMemo(() => (STORE_URL ? previewSrc(STORE_URL) : null), [])

  usePreviewBridge({ iframeRef, origin: origem, sections, highlightId, onSelect })

  useEffect(() => {
    const alvo = palcoRef.current
    // jsdom não implementa `ResizeObserver`. Sem ele a caixa fica `0`, e `previewScale` devolve `1` —
    // que é exatamente o que se quer antes de qualquer layout.
    if (!alvo || typeof ResizeObserver === 'undefined') return

    const observer = new ResizeObserver(([entrada]) => {
      const { width, height } = entrada.contentRect
      setCaixa({ width, height })
    })
    observer.observe(alvo)
    return () => observer.disconnect()
  }, [])

  const { width, height } = PREVIEW_DEVICES[device]
  // As duas dimensões contam: numa janela baixa, escalar só pela largura deixaria o rodapé da loja
  // fora do palco, e a dona conferiria uma dobra que não é a dela.
  const escala = Math.min(
    previewScale(caixa.width - FOLGA, width),
    previewScale(caixa.height - FOLGA, height),
  )

  const trocar = useCallback((proximo: PreviewDevice) => setDevice(proximo), [])

  return (
    <section
      data-testid="palco-previa"
      className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-border bg-card"
    >
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            aria-hidden
            className={cn('h-1.5 w-1.5 shrink-0 rounded-full', src ? 'bg-emerald-500' : 'bg-muted-foreground')}
          />
          <h2 className="shrink-0 font-heading text-sm font-bold text-foreground">Prévia</h2>
          <span className="truncate text-xs text-muted-foreground">
            loja real · rascunho ao vivo
          </span>
        </div>

        <div
          role="group"
          aria-label="Dispositivo da prévia"
          className="flex shrink-0 items-center gap-0.5 rounded-xl bg-muted p-0.5"
        >
          {(Object.keys(PREVIEW_DEVICES) as PreviewDevice[]).map(chave => {
            const Icon = chave === 'mobile' ? Smartphone : Monitor
            const ativo = device === chave
            return (
              <button
                key={chave}
                type="button"
                aria-pressed={ativo}
                onClick={() => trocar(chave)}
                className={cn(
                  'flex min-h-9 items-center gap-1.5 rounded-lg px-3 text-xs font-semibold',
                  ativo
                    ? 'bg-card text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground',
                )}
              >
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {PREVIEW_DEVICES[chave].label}
              </button>
            )
          })}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <span data-testid="metrica-previa" className="text-xs tabular-nums text-muted-foreground">
            {previewMetrics(device, escala)}
          </span>
          <button
            type="button"
            aria-label="Recarregar a prévia"
            onClick={() => setRecarga(n => n + 1)}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
          >
            <RefreshCw className="h-4 w-4" aria-hidden />
          </button>
          {src && (
            <a
              href={src.replace(/\?preview=1$/, '')}
              target="_blank"
              rel="noreferrer"
              aria-label="Abrir a loja em nova aba"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted"
            >
              <ExternalLink className="h-4 w-4" aria-hidden />
            </a>
          )}
        </div>
      </header>

      <div
        ref={palcoRef}
        className="flex min-h-0 flex-1 items-start justify-center overflow-hidden bg-muted/50 p-5"
      >
        {src ? (
          // A caixa externa reserva o tamanho **já escalado**; sem ela o `transform` deixaria o
          // layout achando que o quadro ainda tem 1024px e o palco ganharia barra de rolagem.
          <div
            data-testid="caixa-previa"
            style={{ width: width * escala, height: height * escala }}
            className="shrink-0 overflow-hidden"
          >
            <iframe
              key={recarga}
              ref={iframeRef}
              src={src}
              title="Prévia da Home"
              width={width}
              height={height}
              data-device={device}
              // `width`/`height` de verdade, e escala por `transform`: é o viewport que a loja mede
              // para escolher as media queries dela. Encolher o iframe em vez de escalá-lo faria o
              // botão "Computador" mostrar o layout de celular.
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
            data-testid="previa-sem-loja"
            className="max-w-sm rounded-xl border border-dashed border-input bg-card p-5 text-center"
          >
            <p className="text-sm font-semibold text-foreground">A prévia precisa do endereço da loja</p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Defina <code className="rounded bg-muted px-1 py-0.5">VITE_STORE_URL</code> em{' '}
              <code className="rounded bg-muted px-1 py-0.5">apps/backoffice/.env</code> e recarregue o
              painel. Em dev a loja sobe em{' '}
              <code className="rounded bg-muted px-1 py-0.5">http://localhost:8082</code>.
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              A lista ao lado continua funcionando — só a prévia depende disto.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

export default HomeLivePreview
