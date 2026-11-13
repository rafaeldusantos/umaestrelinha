// O lado do PAINEL da ponte da prévia da faixa de avisos — a terceira ponte sobre o mesmo `?preview=1`,
// irmã de `home-composition/model/usePreviewBridge` e de `store-menu/model/useMenuPreviewBridge`.
//
// Duas mensagens saem pelo canal de `core/announcements`: o rascunho (com o atraso curto das outras
// pontes, porque acompanha a digitação) e "mostre o aviso N" (sem atraso, porque acompanha o clique).
// Sempre com a origem EXATA da loja: o rascunho leva texto não publicado. E o painel só aceita o
// aperto de mão de quem tem a origem certa E é a janela do próprio iframe.

import { useCallback, useEffect, useRef, type RefObject } from 'react'
import {
  ANNOUNCEMENT_PREVIEW_SOURCE,
  parseAnnouncementPreviewMessage,
  type AnnouncementPreviewMessage,
  type AnnouncementSettings,
} from '@estrelinha/core/announcements'
import { PREVIEW_DEBOUNCE_MS } from '@estrelinha/core/home'

interface Params {
  iframeRef: RefObject<HTMLIFrameElement>
  /** A origem exata da loja. `null` desliga a ponte. */
  origin: string | null
  /** A faixa como a tela a tem agora, já na forma gravável. */
  draft: AnnouncementSettings
  /** O aviso que a prévia deve mostrar (começa em zero). */
  mostrar: number
}

export interface AnnouncementsPreviewBridgeApi {
  /** O `onLoad` do iframe: entrega o rascunho mesmo sem o aperto de mão da loja. */
  aoCarregar: () => void
}

export const useAnnouncementsPreviewBridge = ({
  iframeRef,
  origin,
  draft,
  mostrar,
}: Params): AnnouncementsPreviewBridgeApi => {
  const draftRef = useRef(draft)
  draftRef.current = draft
  const mostrarRef = useRef(mostrar)
  mostrarRef.current = mostrar

  const postar = useCallback(
    (mensagem: AnnouncementPreviewMessage) => {
      const janela = iframeRef.current?.contentWindow
      if (janela && origin) janela.postMessage(mensagem, origin)
    },
    [iframeRef, origin],
  )

  const postarMostrar = useCallback(
    (index: number) => {
      // "Mostre o aviso N" só faz sentido com o aviso na lista: a loja recusaria o índice de fora.
      if (index < 0 || index >= draftRef.current.items.length) return
      postar({ source: ANNOUNCEMENT_PREVIEW_SOURCE, type: 'show', index })
    },
    [postar],
  )

  const entregarTudo = useCallback(() => {
    postar({ source: ANNOUNCEMENT_PREVIEW_SOURCE, type: 'draft', announcements: draftRef.current })
    postarMostrar(mostrarRef.current)
  }, [postar, postarMostrar])

  // Recebe o `ready` da loja — origem exata E a janela do próprio iframe.
  useEffect(() => {
    if (!origin) return
    const aoReceber = (event: MessageEvent) => {
      if (event.origin !== origin) return
      if (event.source !== iframeRef.current?.contentWindow) return
      const mensagem = parseAnnouncementPreviewMessage(event.data, 0)
      if (mensagem?.type !== 'ready') return
      entregarTudo()
    }
    window.addEventListener('message', aoReceber)
    return () => window.removeEventListener('message', aoReceber)
  }, [origin, iframeRef, entregarTudo])

  // O rascunho, com atraso curto. Seguido do aviso a mostrar: um aviso recém-acrescentado só existe
  // do lado da loja depois deste rascunho, e o "mostre" que saiu antes dele foi recusado lá.
  useEffect(() => {
    if (!origin) return
    const timer = window.setTimeout(() => {
      postar({ source: ANNOUNCEMENT_PREVIEW_SOURCE, type: 'draft', announcements: draft })
      postarMostrar(mostrarRef.current)
    }, PREVIEW_DEBOUNCE_MS)
    return () => window.clearTimeout(timer)
  }, [draft, origin, postar, postarMostrar])

  // "Mostre o aviso N", sem atraso.
  useEffect(() => {
    if (!origin) return
    postarMostrar(mostrar)
  }, [mostrar, origin, postarMostrar])

  return { aoCarregar: entregarTudo }
}
