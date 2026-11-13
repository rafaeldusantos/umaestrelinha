// O lado da LOJA da ponte da prévia da faixa de avisos — o terceiro canal sobre o mesmo `?preview=1`,
// irmão de `entities/home/model/useHomePreview` e de `entities/menu/model/useMenuPreview`.
//
// A régua de recepção é a dos outros dois: a mensagem tem de vir do PAI e ter o carimbo deste canal.
// A loja só desenha; quem exige origem exata é o painel, que é o lado que age.

import { useEffect, useMemo, useRef, useState } from 'react'
import { isPreviewWindow } from '@estrelinha/core/home'
import {
  ANNOUNCEMENT_PREVIEW_SOURCE,
  parseAnnouncementPreviewMessage,
  type AnnouncementSettings,
} from '@estrelinha/core/announcements'

export interface AnnouncementPreview {
  /** Ligado só com `?preview=1` **e** dentro de um iframe. */
  preview: boolean
  /** O rascunho recebido do painel — `null` é "ainda não chegou", e aí vale o publicado. */
  draft: AnnouncementSettings | null
  /**
   * "Mostre o aviso N" (posição na lista do rascunho), com um contador que muda a cada pedido: pedir
   * o mesmo aviso duas vezes, depois de a faixa ter andado pelas setas, tem de valer de novo.
   */
  show: { index: number; vez: number } | null
}

const READY = { source: ANNOUNCEMENT_PREVIEW_SOURCE, type: 'ready' } as const

/** A origem do painel, do `document.referrer` — o `ready` nunca sai com `'*'` (molde do menu). */
const origemDoPai = (): string | null => {
  try {
    const referrer = typeof document === 'undefined' ? '' : document.referrer
    return referrer ? new URL(referrer).origin : null
  } catch {
    return null
  }
}

/**
 * @param itemCount quantos avisos a faixa tem agora (o rascunho, ou o publicado enquanto ele não
 *   chega) — "mostre o aviso N" fora da lista é recusado pela régua de `core`.
 */
export const useAnnouncementPreview = (itemCount: number): AnnouncementPreview => {
  // Lido uma vez, do `window` — a mesma resposta que o `App.tsx` e as outras pontes dão.
  const preview = useMemo(
    () =>
      typeof window !== 'undefined' &&
      isPreviewWindow(window.location.search, window.parent !== window),
    [],
  )

  const [draft, setDraft] = useState<AnnouncementSettings | null>(null)
  const [show, setShow] = useState<{ index: number; vez: number } | null>(null)

  // Ref, e não dependência do efeito: o ouvinte não pode ser refeito a cada rascunho, senão uma
  // mensagem que chega no meio da troca se perde.
  const contagem = useRef(itemCount)
  contagem.current = draft ? draft.items.length : itemCount

  useEffect(() => {
    if (!preview) return

    const aoReceber = (event: MessageEvent) => {
      if (event.source !== window.parent) return

      const mensagem = parseAnnouncementPreviewMessage(event.data, contagem.current)
      if (!mensagem) return

      if (mensagem.type === 'draft') {
        contagem.current = mensagem.announcements.items.length
        setDraft(mensagem.announcements)
      } else if (mensagem.type === 'show') {
        const index = mensagem.index
        setShow(atual => ({ index, vez: (atual?.vez ?? 0) + 1 }))
      }
    }

    window.addEventListener('message', aoReceber)

    const origem = origemDoPai()
    if (origem) window.parent.postMessage(READY, origem)

    return () => window.removeEventListener('message', aoReceber)
  }, [preview])

  return { preview, draft, show }
}
