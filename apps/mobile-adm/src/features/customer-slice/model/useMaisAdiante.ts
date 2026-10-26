import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * A afordância de "há mais ao lado" de uma faixa que rola na horizontal (feature `76`, `MAC-31`): o
 * estado vem da posição REAL de rolagem — `scrollWidth − clientWidth − scrollLeft` —, nunca da
 * contagem de itens, e é relido ao rolar, ao redimensionar e ao mudar o tamanho da própria faixa
 * (fonte do sistema a 130 %/200 % faz três chips deixarem de caber).
 *
 * Em jsdom as medidas são 0, então o estado é `false` ali; a medida de verdade é da prova em navegador
 * (T32). O que o teste de componente prova é a camada (`aria-hidden`) e as classes.
 */
export const useMaisAdiante = () => {
  const faixa = useRef<HTMLDivElement | null>(null)
  const [maisAdiante, setMaisAdiante] = useState(false)

  const medir = useCallback(() => {
    const el = faixa.current
    if (!el) return
    setMaisAdiante(el.scrollWidth - el.clientWidth - el.scrollLeft > 1)
  }, [])

  useEffect(() => {
    const el = faixa.current
    if (!el) return
    medir()
    window.addEventListener('resize', medir)
    const observador = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(medir)
    observador?.observe(el)
    return () => {
      window.removeEventListener('resize', medir)
      observador?.disconnect()
    }
  }, [medir])

  return { faixa, maisAdiante, aoRolar: medir }
}
