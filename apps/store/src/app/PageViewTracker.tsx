import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { pageViewEvent } from '@estrelinha/core/analytics'
import { track } from '@/shared/lib/analytics'

/** Quanto se espera a página nova trocar o `<title>` antes de enviar com o que houver. */
const ESPERA_DO_TITULO_MS = 500

/**
 * Feature 61 · EVT-01 — um `page_view` por mudança de **pathname**.
 *
 * Irmão do `ScrollToTop`, e pela mesma regra: mudança só de query string não é página nova — a
 * `SearchPage` reescreve `?q=` a cada tecla, e um `page_view` por caractere inflaria o relatório. A
 * medição automática de histórico do GA4 fica desligada (`send_page_view: false` em `loadGtag`, e o
 * passo de operação do Apêndice B).
 *
 * **O título chega depois da rota.** As páginas são `lazy` e quem troca o `<title>` é o efeito da
 * página (`useDocumentMeta`), que roda depois deste. O envio espera a troca — ou
 * `ESPERA_DO_TITULO_MS`, para a página que não declara título —, e a navegação seguinte envia o que
 * estiver pendente antes de começar a sua, para nenhuma página ficar sem `page_view`.
 */
const PageViewTracker = () => {
  const { pathname } = useLocation()
  const anterior = useRef<string | null>(null)

  useEffect(() => {
    if (anterior.current === pathname) return
    anterior.current = pathname

    const location = window.location.href
    const tituloAntes = document.title
    let enviado = false
    let observador: MutationObserver | null = null

    const enviar = () => {
      if (enviado) return
      enviado = true
      observador?.disconnect()
      clearTimeout(prazo)
      track(pageViewEvent({ location, title: document.title }))
    }

    const prazo = setTimeout(enviar, ESPERA_DO_TITULO_MS)
    if (typeof MutationObserver !== 'undefined') {
      observador = new MutationObserver(() => {
        if (document.title !== tituloAntes) enviar()
      })
      observador.observe(document.head, { subtree: true, childList: true, characterData: true })
    }

    return enviar
  }, [pathname])

  return null
}

export default PageViewTracker
