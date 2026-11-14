// O lado do PAINEL da ponte da prévia do perfil de estilo — mais uma ponte sobre o mesmo `?preview=1`,
// irmã de `announcement-bar/model/useAnnouncementsPreviewBridge`.
//
// Uma mensagem só sai pelo canal de `core/appearance`: o perfil escolhido e ainda não salvo. Sempre
// com a origem EXATA da loja, nunca `'*'`. E o painel só aceita o aperto de mão de quem tem a origem
// certa E é a janela do próprio iframe.

import { useCallback, useEffect, useRef, type RefObject } from 'react'
import {
  STYLE_PROFILE_PREVIEW_SOURCE,
  parseStyleProfilePreviewMessage,
  type StyleProfile,
} from '@estrelinha/core/appearance'

interface Params {
  iframeRef: RefObject<HTMLIFrameElement>
  /** A origem exata da loja. `null` desliga a ponte. */
  origin: string | null
  /** O perfil que a prévia veste. */
  profile: StyleProfile
}

export interface StyleProfilePreviewBridgeApi {
  /** O `onLoad` do iframe: entrega o perfil mesmo sem o aperto de mão da loja. */
  aoCarregar: () => void
}

export const useStyleProfilePreviewBridge = ({
  iframeRef,
  origin,
  profile,
}: Params): StyleProfilePreviewBridgeApi => {
  const profileRef = useRef(profile)
  profileRef.current = profile

  const entregar = useCallback(() => {
    const janela = iframeRef.current?.contentWindow
    if (!janela || !origin) return
    janela.postMessage(
      { source: STYLE_PROFILE_PREVIEW_SOURCE, type: 'draft', profile: profileRef.current },
      origin,
    )
  }, [iframeRef, origin])

  // O `ready` da loja — origem exata E a janela do próprio iframe.
  useEffect(() => {
    if (!origin) return
    const aoReceber = (event: MessageEvent) => {
      if (event.origin !== origin) return
      if (event.source !== iframeRef.current?.contentWindow) return
      if (parseStyleProfilePreviewMessage(event.data)?.type !== 'ready') return
      entregar()
    }
    window.addEventListener('message', aoReceber)
    return () => window.removeEventListener('message', aoReceber)
  }, [origin, iframeRef, entregar])

  // O perfil mudou com a prévia aberta: entrega de novo.
  useEffect(() => {
    entregar()
  }, [profile, entregar])

  return { aoCarregar: entregar }
}
