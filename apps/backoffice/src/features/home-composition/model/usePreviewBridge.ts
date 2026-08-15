// Feature 25 — o lado do painel da ponte da prévia.
//
// O painel é o lado **estrito** dos dois, e por um motivo assimétrico: a loja só desenha o que
// recebe; o painel **age** — ele navega, abre editor, muda a rota. Uma mensagem forjada aceita aqui
// mexe na tela de quem está trabalhando; aceita lá, no máximo, desenha uma home errada dentro de um
// iframe que não é nosso.
//
// Daí as duas réguas serem diferentes: aqui exige-se origem exata **e** a janela do próprio iframe;
// lá basta ser o pai.

import { useCallback, useEffect, useRef, type RefObject } from 'react'
import {
  PREVIEW_DEBOUNCE_MS,
  PREVIEW_SOURCE,
  parsePreviewMessage,
  type HomeSection,
  type PreviewMessage,
} from '@estrelinha/core/home'

interface Params {
  iframeRef: RefObject<HTMLIFrameElement>
  /** A origem exata da loja. `null` desliga a ponte (sem `VITE_STORE_URL` não há iframe). */
  origin: string | null
  /** A composição a mandar — já com as edições não salvas do editor aberto por cima. */
  sections: HomeSection[]
  /** O bloco a contornar: o da linha sob o cursor, ou o da seção em edição. */
  highlightId: string | null
  onSelect: (sectionId: string) => void
}

export const usePreviewBridge = ({
  iframeRef,
  origin,
  sections,
  highlightId,
  onSelect,
}: Params) => {
  // Refs e não deps do efeito da escuta: reassinar `message` a cada tecla digitada no editor
  // perderia mensagens no intervalo entre remover e reinstalar o ouvinte.
  const sectionsRef = useRef(sections)
  sectionsRef.current = sections
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect

  const postar = useCallback(
    (mensagem: PreviewMessage) => {
      const janela = iframeRef.current?.contentWindow
      // `origin` e nunca `'*'` (`PRV-07`): o rascunho leva conteúdo que a dona ainda não publicou.
      if (janela && origin) janela.postMessage(mensagem, origin)
    },
    [iframeRef, origin],
  )

  // --- Recebe: `ready` e `select` ------------------------------------------------------------
  useEffect(() => {
    if (!origin) return

    const aoReceber = (event: MessageEvent) => {
      // Dupla checagem (`PRV-08`). A origem sozinha não basta: outra aba da própria loja, aberta
      // como popup, teria a origem certa e não é a prévia. A janela sozinha também não: um
      // documento hostil que tivesse trocado o `src` do iframe seria a mesma janela.
      if (event.origin !== origin) return
      if (event.source !== iframeRef.current?.contentWindow) return

      const mensagem = parsePreviewMessage(event.data)
      if (!mensagem) return

      if (mensagem.type === 'ready') {
        // Responder na hora é o que impede o quadro em branco do outro lado (`PRV-03 AC 3`): a loja
        // não desenha nada até o primeiro rascunho chegar, de propósito.
        postar({ source: PREVIEW_SOURCE, type: 'draft', sections: sectionsRef.current })
      } else if (mensagem.type === 'select') {
        onSelectRef.current(mensagem.sectionId)
      }
    }

    window.addEventListener('message', aoReceber)
    return () => window.removeEventListener('message', aoReceber)
  }, [origin, iframeRef, postar])

  // --- Envia: o rascunho, com debounce ---------------------------------------------------------
  useEffect(() => {
    if (!origin) return
    const timer = window.setTimeout(
      () => postar({ source: PREVIEW_SOURCE, type: 'draft', sections }),
      PREVIEW_DEBOUNCE_MS,
    )
    return () => window.clearTimeout(timer)
  }, [sections, origin, postar])

  // --- Envia: o realce, SEM debounce ------------------------------------------------------------
  // O rascunho acompanha digitação e não precisa de um envio por tecla. O realce acompanha o cursor
  // na lista, e 200 ms ali seriam lidos como travamento — o contorno chegaria depois de o mouse já
  // ter saído da linha.
  useEffect(() => {
    if (!origin) return
    postar({ source: PREVIEW_SOURCE, type: 'highlight', sectionId: highlightId })
  }, [highlightId, origin, postar])
}
