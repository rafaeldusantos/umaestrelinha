// ZOM-02..06 — o visualizador das imagens do produto, aberto pelo card Resumo.
//
// É um `Dialog` do Radix controlado pelo índice: `null` ⇒ fechado. O Radix prende o foco e fecha
// com `Esc`. Não há `DialogTrigger` — quem abre é o botão da imagem, lá no Resumo —, e sem ele o
// Radix devolveria o foco ao `<body>` ao fechar (o padrão dele é focar o trigger, e o trigger é
// nulo). Por isso o elemento focado no instante da abertura é guardado em `origem` e recebe o
// foco de volta no `onCloseAutoFocus` (ZOM-05).
//
// O `DialogContent` do pacote traz um botão "Close" próprio (em inglês, 16px — abaixo dos 44 de
// ZOM-06). Ele é escondido pela classe abaixo e substituído pelo "Fechar" deste arquivo. As
// classes de grid do conteúdo (`grid-cols-1`, guardado por `dialogGridTrack`) não são tocadas.

import { useEffect, useRef } from 'react'
import { ChevronLeft, ChevronRight, X } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@estrelinha/ui/dialog'
import { cn } from '@estrelinha/ui/lib/utils'
import { renditionUrl } from '@estrelinha/core/media'
import type { ProductImage } from '@estrelinha/supabase/types'
import { SWIPE_PX } from '../model/mediaSummary'

/** A largura pedida à rendição: grande o bastante para a tela cheia de um computador. */
const LIGHTBOX_WIDTH = 1600

/** Os três controles têm alvo de 44px ou mais (ZOM-06). */
const CONTROL =
  'inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white'

interface ImageLightboxProps {
  images: ProductImage[]
  index: number | null
  onIndexChange: (index: number) => void
  onClose: () => void
}

export default function ImageLightbox({ images, index, onIndexChange, onClose }: ImageLightboxProps) {
  const total = images.length
  const fora = index !== null && index >= total
  const aberto = index !== null && !fora

  // Edge case "imagem removida": a imagem aberta deixou de existir por outra via ⇒ fecha.
  useEffect(() => {
    if (fora) onClose()
  }, [fora, onClose])

  const inicioDoGesto = useRef<number | null>(null)
  // Um arrasto que trocou de imagem termina com um `click` no mesmo alvo; sem esta trava, soltar
  // o dedo sobre o fundo fecharia o visualizador logo depois de trocar.
  const gestoTrocou = useRef(false)
  // ZOM-05: quem tinha o foco quando o visualizador abriu (a imagem do Resumo).
  const origem = useRef<HTMLElement | null>(null)

  if (!aberto) return null

  const atual = images[index]
  const varias = total > 1
  // ZOM-03: laço circular nos dois sentidos.
  const proxima = () => onIndexChange((index + 1) % total)
  const anterior = () => onIndexChange((index - 1 + total) % total)
  const alt = atual.alt?.trim() ?? ''

  return (
    <Dialog open onOpenChange={abrir => !abrir && onClose()}>
      <DialogContent
        aria-describedby={undefined}
        className={cn(
          'left-0 top-0 h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 gap-0 border-0 bg-[#0E091A]/[0.94] p-0 shadow-none sm:rounded-none',
          // Sem animação de entrada: o conteúdo ocupa a tela, e deslizar de metade da largura
          // (a animação do pacote) seria movimento sem razão — e nada a desligar no `motion-reduce:`.
          'data-[state=open]:animate-none data-[state=closed]:animate-none motion-reduce:animate-none',
          // O "Close" do pacote é o último filho do conteúdo; o "Fechar" daqui o substitui.
          '[&>button:last-child]:hidden',
        )}
        onOpenAutoFocus={() => {
          // O `FocusScope` dispara isto antes de mover o foco: `activeElement` ainda é a origem.
          origem.current = document.activeElement instanceof HTMLElement ? document.activeElement : null
        }}
        onCloseAutoFocus={e => {
          e.preventDefault()
          origem.current?.focus()
          origem.current = null
        }}
        onKeyDown={e => {
          if (!varias) return
          if (e.key === 'ArrowRight') {
            e.preventDefault()
            proxima()
          } else if (e.key === 'ArrowLeft') {
            e.preventDefault()
            anterior()
          }
        }}
      >
        <DialogTitle className="sr-only">Imagem do produto</DialogTitle>
        <div
          data-testid="lightbox-palco"
          className="relative flex h-[100dvh] w-full touch-pan-y select-none flex-col items-center justify-center gap-3 px-4 py-16"
          onPointerDown={e => {
            inicioDoGesto.current = e.clientX
            gestoTrocou.current = false
          }}
          onPointerUp={e => {
            const inicio = inicioDoGesto.current
            inicioDoGesto.current = null
            if (inicio === null || !varias) return
            const dx = e.clientX - inicio
            // ZOM-04: mais de SWIPE_PX no sentido do gesto. Dedo para a esquerda ⇒ a próxima.
            if (Math.abs(dx) <= SWIPE_PX) return
            gestoTrocou.current = true
            if (dx < 0) proxima()
            else anterior()
          }}
          onClick={e => {
            if (gestoTrocou.current) {
              gestoTrocou.current = false
              return
            }
            // ZOM-05: clique no fundo (não na imagem nem num controle) fecha.
            if (e.target === e.currentTarget) onClose()
          }}
        >
          <img
            src={renditionUrl(atual.url, LIGHTBOX_WIDTH)}
            alt={alt || `Imagem ${index + 1} de ${total}`}
            className="max-h-[calc(100dvh-10rem)] max-w-full object-contain"
            draggable={false}
          />
          <p aria-live="polite" className="text-sm tabular-nums text-white/80">
            {index + 1} / {total}
          </p>
          {alt !== '' && <p className="max-w-prose text-center text-sm text-white">{alt}</p>}

          <button type="button" aria-label="Fechar" onClick={onClose} className={cn(CONTROL, 'absolute right-4 top-4')}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
          {varias && (
            <>
              <button
                type="button"
                aria-label="Anterior"
                onClick={anterior}
                className={cn(CONTROL, 'absolute left-4 top-1/2 -translate-y-1/2')}
              >
                <ChevronLeft className="h-6 w-6" aria-hidden="true" />
              </button>
              <button
                type="button"
                aria-label="Próxima"
                onClick={proxima}
                className={cn(CONTROL, 'absolute right-4 top-1/2 -translate-y-1/2')}
              >
                <ChevronRight className="h-6 w-6" aria-hidden="true" />
              </button>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
