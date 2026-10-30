// Feature `88` · `CRG-02`, `CRG-09` — uma gravação por vez no pedido, e a região viva que a anuncia.
//
// `pendente` é a CHAVE da gravação em curso (`'rastreio'`, `'avancar'`, …), não um booleano: é o que
// deixa só o botão daquela gravação mostrar o gerúndio enquanto os outros ficam desabilitados sem
// indicador. O segundo `rodar` enquanto há um em curso é IGNORADO (devolve `undefined` sem chamar a
// função) — e a trava é uma ref, não o estado: dois cliques no mesmo tique acontecem antes de o React
// renderizar o `pendente`, e só a ref os vê.
//
// A região viva (`aria-live="polite"`) anuncia o gerúndio uma vez ao começar; o resultado é anunciado
// por quem chamou, com `anunciar(texto)`, porque só ele sabe o desfecho que a frase descreve.

import { createElement, useCallback, useRef, useState, type ReactNode } from 'react'

export interface PendingAction {
  /** A chave da gravação em curso, ou `null`. */
  pendente: string | null
  /**
   * Roda `fn` se nenhuma gravação estiver em curso. Devolve o valor de `fn`, ou `undefined` quando foi
   * ignorada. Uma rejeição de `fn` chega a quem chamou, com `pendente` já de volta a `null`.
   */
  rodar: <T>(chave: string, gerundio: string, fn: () => Promise<T>) => Promise<T | undefined>
  /** Põe um texto na região viva — o resultado da gravação. */
  anunciar: (texto: string) => void
  /** O nó da região viva; o chamador o monta uma vez na tela. */
  regiaoViva: ReactNode
}

export function usePendingAction(): PendingAction {
  const [pendente, setPendente] = useState<string | null>(null)
  const [anuncio, setAnuncio] = useState('')
  const emCurso = useRef(false)

  const rodar = useCallback(async <T,>(chave: string, gerundio: string, fn: () => Promise<T>) => {
    if (emCurso.current) return undefined
    emCurso.current = true
    setPendente(chave)
    setAnuncio(gerundio)
    try {
      return await fn()
    } finally {
      emCurso.current = false
      setPendente(null)
    }
  }, [])

  const anunciar = useCallback((texto: string) => setAnuncio(texto), [])

  const regiaoViva = createElement('div', { 'aria-live': 'polite', className: 'sr-only' }, anuncio)

  return { pendente, rodar, anunciar, regiaoViva }
}
