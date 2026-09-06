// Feature 39, `NAV-43`..`NAV-47` — o palco da prévia do menu: **a loja de verdade, num iframe**.
//
// O que existia aqui antes era `MenuBarPreview.tsx`, desenhando a barra do topo à mão com os tokens
// do admin — e a lista fixa que ele consumia anunciava `/crie-seu-botton`, que **nunca foi rota da
// loja**. A tela onde a dona decide o menu mostrava, na lista e na prévia, um item que levaria a 404.
// Era o mesmo defeito que a feature 25 apagou da Home, só que no menu ele nunca tinha saído.
// `previaUnica.test.ts` cobre as duas features e recusa a volta de qualquer segundo desenho.
//
// **O iframe também é o que preserva a separação de tokens.** Renderizar os widgets da loja dentro do
// painel traria `--estrelinha-*` para o mesmo documento de `--estrelinha-admin-*` — o defeito que
// `importOrder.test.ts` e `palette.test.ts` existem para pegar. Outro documento, outra folha.
//
// **Não há alternador de dispositivo aqui, e a ausência é a decisão** (`NAV-37`): o alternador
// Computador/Celular da própria tela governa a edição **e** a prévia. Um segundo, no palco, deixaria
// a Adri editar a curadoria do celular olhando a barra do computador — dois donos de "que dispositivo
// estou conferindo", com a tela mostrando um e ela editando outro, sem nada quebrar.

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ExternalLink, Monitor, RefreshCw, Smartphone } from 'lucide-react'
import {
  menuPreviewDevice,
  type MenuCategory,
  type MenuLink,
  type MenuSurface,
} from '@estrelinha/core/menu'
import { PREVIEW_DEVICES, previewMetrics, previewScale, previewSrc } from '@estrelinha/core/home'
import { STORE_URL, storeOrigin } from '@/shared/lib/storeOrigin'
import { NOME_DA_SUPERFICIE } from '../model/superficie'
import { useMenuPreviewBridge } from '../model/useMenuPreviewBridge'

/** A folga entre o palco e o quadro. Entra na conta da escala, senão o quadro encosta na borda. */
const FOLGA = 40

interface Props {
  /** A superfície em edição — e, por consequência, o dispositivo que o palco mostra. */
  surface: MenuSurface
  /** A árvore inteira, como a tela a tem. Quem filtra por superfície é a loja, com `menuItems`. */
  categories: MenuCategory[]
  links: MenuLink[]
  /** A entrada selecionada na lista: é o painel que a prévia abre. */
  openId: string | null
}

const MenuLivePreview = ({ surface, categories, links, openId }: Props) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const palcoRef = useRef<HTMLDivElement>(null)

  const [caixa, setCaixa] = useState({ width: 0, height: 0 })
  // Recarregar remonta o nó **sem mexer no `src`**: trocar o endereço faria a prévia perder o
  // rascunho já entregue, e o `src` não carrega estado nenhum de propósito.
  const [recarga, setRecarga] = useState(0)

  const origem = useMemo(() => storeOrigin(), [])
  const src = useMemo(() => (STORE_URL ? previewSrc(STORE_URL) : null), [])

  // O rascunho é montado **uma vez por mudança de fonte**: um objeto novo a cada render viraria um
  // `postMessage` por quadro, e o debounce do rascunho não teria o que segurar.
  const draft = useMemo(() => ({ categories, links }), [categories, links])
  const { aoCarregar } = useMenuPreviewBridge({ iframeRef, origin: origem, draft, openId })

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

  const device = menuPreviewDevice(surface)
  const { width, height } = PREVIEW_DEVICES[device]
  // As duas dimensões contam: numa janela baixa, escalar só pela largura deixaria o painel do mega
  // menu fora do palco — e o painel é justamente o que a Adri veio conferir.
  const escala = Math.min(
    previewScale(caixa.width - FOLGA, width),
    previewScale(caixa.height - FOLGA, height),
  )

  const Icone = device === 'mobile' ? Smartphone : Monitor
  const recarregar = useCallback(() => setRecarga(n => n + 1), [])

  return (
    <section
      data-testid="palco-previa-menu"
      className="flex h-full min-h-[520px] flex-col overflow-hidden rounded-2xl border border-border bg-card"
    >
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-border px-4 py-2.5">
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <span
            aria-hidden
            className={`h-1.5 w-1.5 shrink-0 rounded-full ${src ? 'bg-emerald-500' : 'bg-muted-foreground'}`}
          />
          <h2 className="shrink-0 font-heading text-sm font-bold text-foreground">Prévia</h2>
          <span className="truncate text-xs text-muted-foreground">
            loja real · o menu do {NOME_DA_SUPERFICIE[surface]}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {/* O dispositivo é MOSTRADO, não escolhido aqui: quem o troca é o alternador da tela. */}
          <span
            data-testid="dispositivo-previa"
            className="flex items-center gap-1.5 rounded-lg bg-muted px-2.5 py-1.5 text-xs font-semibold text-muted-foreground"
          >
            <Icone className="h-3.5 w-3.5" aria-hidden />
            {PREVIEW_DEVICES[device].label}
          </span>
          <span
            data-testid="metrica-previa-menu"
            className="text-xs tabular-nums text-muted-foreground"
          >
            {previewMetrics(device, escala)}
          </span>
          <button
            type="button"
            aria-label="Recarregar a prévia"
            onClick={recarregar}
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
            data-testid="caixa-previa-menu"
            style={{ width: width * escala, height: height * escala }}
            className="shrink-0 overflow-hidden"
          >
            <iframe
              key={recarga}
              ref={iframeRef}
              src={src}
              title="Prévia do menu da loja"
              width={width}
              height={height}
              data-device={device}
              onLoad={aoCarregar}
              // `width`/`height` de verdade, e redução por `transform`: é o viewport que a loja mede
              // para escolher as media queries dela. **Encolher o iframe em vez de escalá-lo faria a
              // superfície "celular" mostrar a barra do computador** (`NAV-45`) — e a barra do
              // computador é `hidden md:block`, então o erro apareceria como um menu que some.
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
            data-testid="previa-menu-sem-loja"
            className="max-w-sm rounded-xl border border-dashed border-input bg-card p-5 text-center"
          >
            <p className="text-sm font-semibold text-foreground">
              A prévia precisa do endereço da loja
            </p>
            <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">
              Defina <code className="rounded bg-muted px-1 py-0.5">VITE_STORE_URL</code> em{' '}
              <code className="rounded bg-muted px-1 py-0.5">apps/backoffice/.env</code> e recarregue
              o painel. Em dev a loja sobe em{' '}
              <code className="rounded bg-muted px-1 py-0.5">http://localhost:8082</code>.
            </p>
            {/* `NAV-46` — a tela **continua editável** sem a env: a prévia é a única coisa que
                depende dela, e dizer isso evita que a Adri pare de mexer achando que quebrou. */}
            <p className="mt-2 text-xs text-muted-foreground">
              O menu ao lado continua editável — só a prévia depende disto.
            </p>
          </div>
        )}
      </div>
    </section>
  )
}

export default MenuLivePreview
