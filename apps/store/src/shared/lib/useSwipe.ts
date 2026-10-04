import { useRef, useState, type TouchEvent } from 'react'

/**
 * Quanto o dedo precisa andar na horizontal para o gesto valer como troca de foto.
 *
 * 48px é pouco mais que o alvo de toque do projeto (44): menos que isso confunde com o toque que
 * abre a tela cheia, e muito mais obriga a arrastar meia foto em 390px.
 */
export const SWIPE_THRESHOLD_PX = 48

/**
 * Quanto o dedo anda antes de o gesto escolher um eixo. Abaixo disso nada se move — é tremor de
 * toque, não intenção.
 */
const AXIS_LOCK_PX = 8

interface Gesture {
  x: number
  y: number
  axis: 'x' | 'y' | null
}

/**
 * Arrastar com o dedo para trocar de foto — a galeria do produto no celular.
 *
 * Por que eventos de toque à mão, e não o `drag` do framer-motion: o gesto precisa **dividir** o
 * dedo com a rolagem da página. Quem decide o eixo é o primeiro movimento: horizontal é nosso,
 * vertical é do navegador, e a página continua rolando com o dedo em cima da foto. O par CSS é
 * `touch-pan-y` no elemento, que entrega o eixo vertical ao navegador sem ele tentar rolar na
 * horizontal ao mesmo tempo.
 *
 * `offset` é o deslocamento ao vivo do dedo, para a foto acompanhar o gesto; volta a zero ao
 * soltar. `consumeSwipe()` responde se o último toque foi um arrasto — o `click` que o navegador
 * eventualmente dispara ao soltar não pode abrir a tela cheia de quem só queria trocar de foto.
 */
export function useSwipe({ onStep, enabled }: { onStep: (delta: 1 | -1) => void; enabled: boolean }) {
  const gesture = useRef<Gesture | null>(null)
  const swiped = useRef(false)
  const [offset, setOffset] = useState(0)

  const onTouchStart = (e: TouchEvent) => {
    // Todo toque novo zera a marca: sem isso, um arrasto cujo `click` o navegador não disparou
    // engoliria o toque SEGUINTE, que é o de quem quer abrir a tela cheia.
    swiped.current = false
    if (!enabled || e.touches.length !== 1) {
      gesture.current = null
      return
    }
    const t = e.touches[0]
    gesture.current = { x: t.clientX, y: t.clientY, axis: null }
  }

  const onTouchMove = (e: TouchEvent) => {
    const g = gesture.current
    if (!g || e.touches.length !== 1) return
    const t = e.touches[0]
    const dx = t.clientX - g.x
    const dy = t.clientY - g.y
    if (g.axis === null) {
      if (Math.abs(dx) < AXIS_LOCK_PX && Math.abs(dy) < AXIS_LOCK_PX) return
      g.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y'
    }
    if (g.axis === 'x') setOffset(dx)
  }

  const onTouchEnd = (e: TouchEvent) => {
    const g = gesture.current
    gesture.current = null
    if (!g || g.axis !== 'x') return
    const t = e.changedTouches[0]
    const dx = t ? t.clientX - g.x : 0
    swiped.current = true
    setOffset(0)
    if (Math.abs(dx) >= SWIPE_THRESHOLD_PX) onStep(dx < 0 ? 1 : -1)
  }

  const onTouchCancel = () => {
    gesture.current = null
    setOffset(0)
  }

  const consumeSwipe = () => {
    const was = swiped.current
    swiped.current = false
    return was
  }

  return {
    offset,
    consumeSwipe,
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel },
  }
}
