// Feature 39 — o lado do PAINEL da ponte da prévia do menu (`NAV-44`, `NAV-47`).
//
// Irmão de `home-composition/model/usePreviewBridge.ts`, e não uma cópia dele: o que difere é o
// payload — lá vão seções, aqui vai a curadoria. O que é genérico (o parâmetro do modo, a escala, a
// medida do quadro, o endereço) mora em `@estrelinha/core/home` e é importado, nunca reescrito.
//
// **O painel é o lado ESTRITO dos dois, e a assimetria tem motivo.** A loja só desenha o que recebe;
// o painel **age** — ele muda a seleção da tela de quem está trabalhando. Uma mensagem forjada aceita
// aqui mexe no trabalho da Adri; aceita lá, no máximo, desenha um menu errado dentro de um iframe que
// não é nosso. Daí as duas réguas: aqui exige-se **origem exata E a janela do próprio iframe**; lá
// basta ser o pai.

import { useCallback, useEffect, useRef, type RefObject } from 'react'
import {
  MENU_PREVIEW_SOURCE,
  parseMenuPreviewMessage,
  type MenuPreviewDraft,
  type MenuPreviewMessage,
} from '@estrelinha/core/menu'
// O debounce é o genérico da feature 25, importado e não reescrito: o rascunho da home e o do menu
// acompanham a mesma coisa (edição contínua), e dois números divergiriam sem nada quebrar.
import { PREVIEW_DEBOUNCE_MS } from '@estrelinha/core/home'

interface Params {
  iframeRef: RefObject<HTMLIFrameElement>
  /** A origem exata da loja. `null` desliga a ponte (sem `VITE_STORE_URL` não há iframe). */
  origin: string | null
  /** As duas fontes do menu, como a tela as tem agora. */
  draft: MenuPreviewDraft
  /** Qual painel a prévia deve abrir — a entrada selecionada na lista. */
  openId: string | null
}

export interface MenuPreviewBridgeApi {
  /**
   * O `onLoad` do iframe.
   *
   * **É a entrega que não depende do `ready`**, e ela existe porque a loja só posta o aperto de mão
   * quando consegue deduzir a origem do painel pelo referrer — com `Referrer-Policy: no-referrer` ela
   * fica calada de propósito, em vez de postar para `'*'`. Aqui o lado que **conhece** a origem certa
   * entrega assim que o documento carrega, e a prévia nunca fica em branco esperando.
   */
  aoCarregar: () => void
}

export const useMenuPreviewBridge = ({
  iframeRef,
  origin,
  draft,
  openId,
}: Params): MenuPreviewBridgeApi => {
  // Refs e não deps do efeito da escuta: reassinar `message` a cada clique na lista perderia
  // mensagens no intervalo entre remover e reinstalar o ouvinte.
  const draftRef = useRef(draft)
  draftRef.current = draft
  const openIdRef = useRef(openId)
  openIdRef.current = openId

  const postar = useCallback(
    (mensagem: MenuPreviewMessage) => {
      const janela = iframeRef.current?.contentWindow
      // `origin` e **nunca** `'*'`: o rascunho leva a curadoria da loja, e um alvo curinga a
      // entregaria a qualquer documento que tivesse tomado o lugar do iframe.
      if (janela && origin) janela.postMessage(mensagem, origin)
    },
    [iframeRef, origin],
  )

  const entregarTudo = useCallback(() => {
    postar({ source: MENU_PREVIEW_SOURCE, type: 'draft', draft: draftRef.current })
    postar({ source: MENU_PREVIEW_SOURCE, type: 'open', itemId: openIdRef.current })
  }, [postar])

  // --- Recebe: `ready` -------------------------------------------------------------------------
  useEffect(() => {
    if (!origin) return

    const aoReceber = (event: MessageEvent) => {
      // Dupla checagem. A origem sozinha não basta: outra aba da própria loja, aberta como popup,
      // teria a origem certa e não é a prévia. A janela sozinha também não: um documento hostil que
      // tivesse trocado o `src` do iframe seria a mesma janela.
      if (event.origin !== origin) return
      if (event.source !== iframeRef.current?.contentWindow) return

      // O canal da home chega nesta mesma janela quando as duas telas estão abertas, e é o carimbo
      // (`MENU_PREVIEW_SOURCE`) que os separa — não o `type`, que é `ready` nos dois.
      const mensagem = parseMenuPreviewMessage(event.data)
      if (mensagem?.type !== 'ready') return

      // Responder na hora é o que impede o menu em branco do outro lado: em modo prévia a loja não
      // desenha o menu do banco, e o primeiro rascunho é o que ela tem.
      entregarTudo()
    }

    window.addEventListener('message', aoReceber)
    return () => window.removeEventListener('message', aoReceber)
  }, [origin, iframeRef, entregarTudo])

  // --- Envia: o rascunho, com debounce ---------------------------------------------------------
  useEffect(() => {
    if (!origin) return
    const timer = window.setTimeout(
      () => postar({ source: MENU_PREVIEW_SOURCE, type: 'draft', draft }),
      PREVIEW_DEBOUNCE_MS,
    )
    return () => window.clearTimeout(timer)
  }, [draft, origin, postar])

  // --- Envia: qual painel abrir, SEM debounce ---------------------------------------------------
  // O rascunho acompanha gravação e aguenta 200ms. A seleção acompanha o clique na lista, e 200ms
  // ali seriam lidos como travamento — o painel abriria depois de a Adri já ter clicado na próxima.
  useEffect(() => {
    if (!origin) return
    postar({ source: MENU_PREVIEW_SOURCE, type: 'open', itemId: openId })
  }, [openId, origin, postar])

  return { aoCarregar: entregarTudo }
}
