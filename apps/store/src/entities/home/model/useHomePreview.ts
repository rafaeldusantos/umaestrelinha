// Feature 25 — o lado da loja da ponte da prévia.
//
// Em modo prévia a loja **não lê o banco**: a composição chega do painel por `postMessage`, com o que
// a dona ainda não salvou. É o que faz a prévia mostrar o rascunho e, ao mesmo tempo, ser a loja de
// verdade — os mesmos componentes, os mesmos tokens, as mesmas media queries.

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  PREVIEW_SOURCE,
  isPreviewWindow,
  parsePreviewMessage,
  type HomeSection,
} from '@estrelinha/core/home'

export interface HomePreviewBridge {
  /** Ligado só com `?preview=1` **e** dentro de um iframe (`PRV-01`). */
  preview: boolean
  /**
   * A composição recebida do painel.
   *
   * Começa `[]`, e **`[]` aqui não é "Home vazia"**: é "o rascunho ainda não chegou". Por isso o piso
   * semeado (`DEFAULT_HOME_COMPOSITION`) não entra neste caminho — ele existe para **erro de
   * leitura**, e em modo prévia não há leitura. Cair nele pintaria a composição salva por um quadro e
   * depois trocaria pela do rascunho, que é exatamente o piscar que a dona leria como bug.
   *
   * O quadro em branco dura o tempo do aperto de mão: o painel responde ao `ready` na hora.
   */
  sections: HomeSection[]
  /** O bloco contornado, escolhido pelo painel (cursor na lista ou seção em edição). */
  highlightId: string | null
  /** Devolve ao painel o bloco que a cliente teria clicado. */
  selectSection: (sectionId: string) => void
}

const READY = { source: PREVIEW_SOURCE, type: 'ready' } as const

export const useHomePreview = (): HomePreviewBridge => {
  // Lido uma vez, do `window`, e não de `useSearchParams`: este hook precisa dar a mesma resposta
  // que o `App.tsx`, que está **acima** do router. Dois detectores dariam duas respostas no dia em
  // que um deles mudasse.
  const preview = useMemo(
    () =>
      typeof window !== 'undefined' &&
      isPreviewWindow(window.location.search, window.parent !== window),
    [],
  )

  const [sections, setSections] = useState<HomeSection[]>([])
  const [highlightId, setHighlightId] = useState<string | null>(null)

  useEffect(() => {
    if (!preview) return

    const aoReceber = (event: MessageEvent) => {
      // A loja só **desenha**, então a régua dela é a mais simples que ainda fecha a porta: veio do
      // pai? A origem não é conferida aqui de propósito — a loja não sabe qual é a do painel, e
      // conferir uma origem que chega da própria URL seria teatro. Quem confere origem é o painel,
      // que é o lado que **age**.
      if (event.source !== window.parent) return

      const mensagem = parsePreviewMessage(event.data)
      if (!mensagem) return

      if (mensagem.type === 'draft') setSections(mensagem.sections)
      else if (mensagem.type === 'highlight') setHighlightId(mensagem.sectionId)
    }

    window.addEventListener('message', aoReceber)
    // O `ready` vai com `'*'` porque a loja não conhece a origem do pai — e pode ir, porque não
    // carrega dado nenhum. O que **nunca** vai com `'*'` é o `draft`, que parte do painel e leva
    // conteúdo não publicado (`PRV-07`).
    window.parent.postMessage(READY, '*')

    return () => window.removeEventListener('message', aoReceber)
  }, [preview])

  const selectSection = useCallback((sectionId: string) => {
    window.parent.postMessage({ source: PREVIEW_SOURCE, type: 'select', sectionId }, '*')
  }, [])

  return { preview, sections, highlightId, selectSection }
}
