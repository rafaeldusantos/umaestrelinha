// Feature 39, `NAV-44` — o lado da LOJA da ponte da prévia do menu.
//
// Em modo prévia a loja não lê o banco para montar o menu: a curadoria chega do painel por
// `postMessage`, com o que a Adri acabou de mexer. É o que faz a prévia mostrar o rascunho e, ao
// mesmo tempo, **ser a loja de verdade** — os mesmos componentes, os mesmos tokens, as mesmas media
// queries. O painel não desenha o menu (`previaUnica.test.ts`).
//
// **A régua daqui é a mais simples que ainda fecha a porta: veio do pai?** A loja só desenha — uma
// mensagem forjada aceita aqui, no máximo, pinta um menu errado dentro de um iframe que não é nosso.
// Quem exige origem exata **e** a janela do próprio iframe é o painel, que é o lado que **age**. A
// assimetria é o desenho da feature 25, e não um descuido herdado.
//
// **`?preview=1` sozinho não muda nada**: o modo exige estar dentro de um iframe. O parâmetro é
// adivinhável e viraliza por link compartilhado; sem a segunda condição, uma cliente com o endereço
// na mão ficaria olhando um header vazio à espera de uma mensagem que nunca chega.

import { useEffect, useMemo, useState } from 'react'
import {
  MENU_PREVIEW_SOURCE,
  parseMenuPreviewMessage,
  type MenuPreviewDraft,
} from '@estrelinha/core/menu'
// **`isPreviewWindow` vem de `core/home` de propósito, e não de uma cópia em `core/menu`.** É o
// genérico da feature 25 — "esta janela é uma prévia" —, e ele responde igual para os dois canais.
// Reescrevê-lo aqui daria dois donos da condição que protege a cliente de um `?preview=1` recebido
// por link; reexportá-lo daria dois caminhos para a mesma função.
import { isPreviewWindow } from '@estrelinha/core/home'

export interface MenuPreviewBridge {
  /** Ligado só com `?preview=1` **e** dentro de um iframe. */
  preview: boolean
  /**
   * A curadoria recebida do painel — ou `null`.
   *
   * `null` é "o rascunho ainda não chegou", e **não** "menu vazio": enquanto ele é `null`, a loja
   * segue lendo o banco. É a diferença que impede o header de piscar entre a barra salva e a do
   * rascunho no primeiro quadro — e, fora do modo prévia, `null` é o estado permanente.
   */
  draft: MenuPreviewDraft | null
  /** Qual painel o palco pediu para abrir. `null` é "nenhum". */
  openId: string | null
}

const READY = { source: MENU_PREVIEW_SOURCE, type: 'ready' } as const

/**
 * A origem do painel, deduzida do `document.referrer` — e é o que permite **nunca** postar com `'*'`.
 *
 * Num iframe cross-origin o referrer chega **só como origem**, que é exatamente o que se precisa
 * aqui: `Referrer-Policy: strict-origin-when-cross-origin` é o padrão dos navegadores e está escrito
 * nos dois `vercel.json` deste repositório. `'*'` entregaria a mensagem a qualquer documento que
 * tivesse tomado o lugar do pai; e ainda que o `ready` não carregue dado nenhum, um alvo curinga é
 * uma porta que não precisa existir.
 *
 * Sem referrer (política `no-referrer`, navegação exótica) devolve `null` e o `ready` **não sai** —
 * a prévia não fica sem rascunho por isso: o palco também posta ao `load` do iframe, que é uma
 * segunda entrega iniciada pelo lado que conhece a origem certa.
 */
const origemDoPai = (): string | null => {
  try {
    const referrer = typeof document === 'undefined' ? '' : document.referrer
    return referrer ? new URL(referrer).origin : null
  } catch {
    return null
  }
}

export const useMenuPreview = (): MenuPreviewBridge => {
  // Lido uma vez, do `window`, e não de `useSearchParams`: este hook precisa dar a mesma resposta
  // que o `App.tsx`, que está **acima** do router. Dois detectores dariam duas respostas no dia em
  // que um deles mudasse.
  const preview = useMemo(
    () =>
      typeof window !== 'undefined' &&
      isPreviewWindow(window.location.search, window.parent !== window),
    [],
  )

  const [draft, setDraft] = useState<MenuPreviewDraft | null>(null)
  const [openId, setOpenId] = useState<string | null>(null)

  useEffect(() => {
    if (!preview) return

    const aoReceber = (event: MessageEvent) => {
      if (event.source !== window.parent) return

      const mensagem = parseMenuPreviewMessage(event.data)
      if (!mensagem) return

      if (mensagem.type === 'draft') setDraft(mensagem.draft)
      else if (mensagem.type === 'open') setOpenId(mensagem.itemId)
    }

    window.addEventListener('message', aoReceber)

    const origem = origemDoPai()
    if (origem) window.parent.postMessage(READY, origem)

    return () => window.removeEventListener('message', aoReceber)
  }, [preview])

  return { preview, draft, openId }
}
