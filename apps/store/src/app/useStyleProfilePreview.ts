// O lado da LOJA da ponte da prévia do perfil de estilo — mais um canal sobre o mesmo `?preview=1`,
// irmão de `widgets/announcement-bar/model/useAnnouncementPreview`.
//
// A régua de recepção é a dos outros canais: a mensagem tem de vir do PAI e ter o carimbo deste
// canal. A loja só veste a paleta; quem exige origem exata é o painel, que é o lado que age.

import { useEffect, useMemo, useState } from 'react'
import { isPreviewWindow } from '@estrelinha/core/home'
import {
  STYLE_PROFILE_PREVIEW_SOURCE,
  parseStyleProfilePreviewMessage,
  type StyleProfile,
} from '@estrelinha/core/appearance'

export interface StyleProfilePreview {
  /** Ligado só com `?preview=1` **e** dentro de um iframe. */
  preview: boolean
  /** O perfil escolhido no painel e ainda não salvo — `null` é "ainda não chegou". */
  draft: StyleProfile | null
}

const READY = { source: STYLE_PROFILE_PREVIEW_SOURCE, type: 'ready' } as const

/** A origem do painel, do `document.referrer` — o `ready` nunca sai com `'*'`. */
const origemDoPai = (): string | null => {
  try {
    const referrer = typeof document === 'undefined' ? '' : document.referrer
    return referrer ? new URL(referrer).origin : null
  } catch {
    return null
  }
}

export const useStyleProfilePreview = (): StyleProfilePreview => {
  // Lido uma vez, do `window` — a mesma resposta que o `App.tsx` e as outras pontes dão.
  const preview = useMemo(
    () =>
      typeof window !== 'undefined' &&
      isPreviewWindow(window.location.search, window.parent !== window),
    [],
  )

  const [draft, setDraft] = useState<StyleProfile | null>(null)

  useEffect(() => {
    if (!preview) return

    const aoReceber = (event: MessageEvent) => {
      if (event.source !== window.parent) return
      const mensagem = parseStyleProfilePreviewMessage(event.data)
      if (mensagem?.type === 'draft') setDraft(mensagem.profile)
    }

    window.addEventListener('message', aoReceber)

    const origem = origemDoPai()
    if (origem) window.parent.postMessage(READY, origem)

    return () => window.removeEventListener('message', aoReceber)
  }, [preview])

  return { preview, draft }
}
