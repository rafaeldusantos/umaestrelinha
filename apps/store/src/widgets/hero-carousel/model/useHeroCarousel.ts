import { useCallback, useEffect, useRef, useState } from 'react'
import {
  HERO_CAROUSEL_INTERVAL_MS,
  nextSlideIndex,
  slideIndexFromScroll,
} from '@estrelinha/core/home'

/**
 * O índice, o giro e a pausa do Banner principal (feature 41).
 *
 * **O trilho é um container de rolagem com `scroll-snap`, e não um `translateX` animado.** A escolha
 * paga três ACs de uma vez e sem JS: o arrasto do dedo é o do navegador (`BNR-37`), a rolagem
 * vertical da página **não** é sequestrada, e o teclado continua sendo do navegador. O que sobra para
 * este hook é o que o navegador não faz sozinho — girar, parar de girar, e saber onde parou.
 *
 * **A posição real manda, nunca um contador paralelo** (`BL-028`, o mesmo princípio de
 * `useOverflowAffordance`). A cliente arrasta e o navegador decide onde encaixar, sem passar por
 * aqui: um índice mantido à parte discordaria dele no primeiro arrasto, e as bolinhas passariam a
 * apontar para outro banner.
 */

/**
 * O sistema pediu menos movimento?
 *
 * Escrito aqui, e não pelo `useReducedMotion` do framer-motion, por uma razão de teste: aquele hook
 * guarda o estado num singleton de módulo, decidido na primeira assinatura — e o `setup.ts` da loja
 * fixa `matchMedia` devolvendo `matches: false`. O ramo reduzido ficaria **inalcançável em teste**, e
 * um ramo que nenhum teste alcança é um ramo que ninguém sabe se funciona.
 *
 * `window.matchMedia` é opcional de propósito: nem todo ambiente o tem, e a ausência dele não pode
 * derrubar a Home.
 */
const usePrefersReducedMotion = (): boolean => {
  const [reduzido, setReduzido] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)')
    if (!mq) return

    setReduzido(mq.matches)

    const ouvir = (e: MediaQueryListEvent) => setReduzido(e.matches)
    mq.addEventListener?.('change', ouvir)
    return () => mq.removeEventListener?.('change', ouvir)
  }, [])

  return reduzido
}

export interface HeroCarouselControls {
  /** Qual slide está na frente. Sai da posição de rolagem, nunca de um contador paralelo. */
  index: number
  /** O container de rolagem — é ele que carrega o `scroll-snap`. */
  trackRef: React.MutableRefObject<HTMLDivElement | null>
  goTo: (alvo: number) => void
  next: () => void
  prev: () => void
  /** O sistema pediu menos movimento. A loja não gira sozinha, mas os controles continuam vivos. */
  reduced: boolean
  /**
   * Os ouvintes que pausam o giro, para espalhar na região do carrossel.
   *
   * Vêm juntos porque são **uma** regra ("a cliente está olhando/mexendo, não troque debaixo dela")
   * vista por quatro eventos. Separá-los na tela faria o componente decidir quais aplicar, e o
   * primeiro esquecido seria justamente o de toque — em ~90% dos acessos.
   */
  pauseHandlers: {
    onMouseEnter: () => void
    onMouseLeave: () => void
    onFocus: () => void
    onBlur: () => void
    onPointerDown: () => void
    onPointerUp: () => void
    onPointerCancel: () => void
  }
}

export const useHeroCarousel = (total: number): HeroCarouselControls => {
  const trackRef = useRef<HTMLDivElement | null>(null)
  const [index, setIndex] = useState(0)
  // Duas pausas independentes, e não uma: quem sai do hover não necessariamente soltou o dedo, e
  // quem soltou o dedo não necessariamente tirou o ponteiro. Um booleano só faria o segundo evento
  // apagar a pausa do primeiro.
  const [sobre, setSobre] = useState(false)
  const [tocando, setTocando] = useState(false)
  const reduced = usePrefersReducedMotion()

  const gira = total > 1 && !sobre && !tocando && !reduced

  const goTo = useCallback(
    (alvo: number) => {
      if (!(total > 0)) return
      const destino = Math.min(Math.max(Math.trunc(alvo), 0), total - 1)
      setIndex(destino)

      const trilho = trackRef.current
      // `Element.scrollTo` não existe em jsdom — e não existir não pode derrubar a Home nem a suíte.
      if (!trilho?.scrollTo) return
      const largura = trilho.clientWidth
      if (!(largura > 0)) return

      trilho.scrollTo({
        left: destino * largura,
        // Movimento reduzido troca o slide **na hora**, em vez de deslizar. O controle continua
        // funcionando; o que some é a animação.
        behavior: reduced ? 'auto' : 'smooth',
      })
    },
    [total, reduced],
  )

  const next = useCallback(() => goTo(nextSlideIndex(index, total, 1)), [goTo, index, total])
  const prev = useCallback(() => goTo(nextSlideIndex(index, total, -1)), [goTo, index, total])

  // O índice segue a rolagem. Sem isto, arrastar o dedo moveria o banner e deixaria as bolinhas
  // para trás — o carrossel diria uma coisa e mostraria outra.
  useEffect(() => {
    const trilho = trackRef.current
    if (!trilho) return

    const aoRolar = () => {
      setIndex(atual => {
        const proximo = slideIndexFromScroll(trilho.scrollLeft, trilho.clientWidth, total)
        return proximo === atual ? atual : proximo
      })
    }

    trilho.addEventListener('scroll', aoRolar, { passive: true })
    return () => trilho.removeEventListener('scroll', aoRolar)
  }, [total])

  // O giro. Com um slide (ou nenhum) **nenhum temporizador é criado** — um `setInterval` que troca 0
  // por 0 seria trabalho invisível a cada 6 s, para sempre, em toda visita à Home.
  useEffect(() => {
    if (!gira) return

    const t = setInterval(() => {
      setIndex(atual => {
        const destino = nextSlideIndex(atual, total, 1)
        const trilho = trackRef.current
        if (trilho?.scrollTo) {
          const largura = trilho.clientWidth
          if (largura > 0) trilho.scrollTo({ left: destino * largura, behavior: 'smooth' })
        }
        return destino
      })
    }, HERO_CAROUSEL_INTERVAL_MS)

    return () => clearInterval(t)
  }, [gira, total])

  // A lista encolheu (slide removido, destino que saiu do ar) e o índice ficou apontando para fora.
  useEffect(() => {
    setIndex(atual => (total > 0 ? Math.min(atual, total - 1) : 0))
  }, [total])

  return {
    index,
    trackRef,
    goTo,
    next,
    prev,
    reduced,
    pauseHandlers: {
      onMouseEnter: () => setSobre(true),
      onMouseLeave: () => setSobre(false),
      // `onFocus`/`onBlur` do React são `focusin`/`focusout` no DOM: eles **borbulham**, então
      // ouvi-los na região alcança o foco em qualquer link ou bolinha lá dentro.
      onFocus: () => setSobre(true),
      onBlur: () => setSobre(false),
      onPointerDown: () => setTocando(true),
      onPointerUp: () => setTocando(false),
      onPointerCancel: () => setTocando(false),
    },
  }
}
