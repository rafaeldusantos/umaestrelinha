import { useEffect, useRef } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'
import { pageViewEvent } from '@estrelinha/core/analytics'
import { track } from '@/shared/lib/analytics'
import { onPageMeta } from '@/shared/lib/pageMeta'

/**
 * Quanto se espera a página declarar o próprio metadado antes de enviar com o que houver (A10).
 *
 * Toda página declara (`metaPorRota.test.ts`); o prazo existe para a que nunca chega a declarar — a
 * leitura do produto que trava, por exemplo. Era 500 ms na `61`, e a página de produto leva mais que
 * isso para ter dado: o `page_view` saía com o título da página ANTERIOR.
 */
export const ESPERA_DA_DECLARACAO_MS = 3000

interface Pendente {
  enviar: () => void
  descartar: () => void
}

/**
 * Feature 61 · EVT-01 — um `page_view` por mudança de **pathname**. Feature 62 — com o título **da
 * página para onde se navegou**.
 *
 * Irmão do `ScrollToTop`, e pela mesma regra: mudança só de query string não é página nova — a
 * `SearchPage` reescreve `?q=` a cada tecla, e um `page_view` por caractere inflaria o relatório. A
 * medição automática de histórico do GA4 fica desligada (`send_page_view: false` em `loadGtag`, e o
 * passo de operação do Apêndice B).
 *
 * **O envio espera a página DECLARAR** (`usePageMeta` → `declarePageMeta`), não a primeira troca do
 * `<title>`. A página de produto só sabe o título depois da resposta do banco, e observar o `<title>`
 * mediria qualquer troca — inclusive uma provisória.
 *
 * **Três saídas para uma página que ainda não declarou** quando a navegação seguinte chega:
 * - `REPLACE` ⇒ ela é **descartada** (A11). Página substituída antes de dizer o que é foi redirect —
 *   rota legada, slug antigo, pai errado na URL —, não visita.
 * - `PUSH`/`POP` ⇒ ela sai com o título do momento (comportamento da `61`): a cliente esteve lá.
 * - Desmontar o rastreador ⇒ idem.
 *
 * Este componente fica ANTES das `Routes` no `App.tsx`, e isso importa: no mesmo commit, o efeito
 * dele roda antes do efeito da página, então a assinatura existe quando a declaração chega.
 */
const PageViewTracker = () => {
  const { pathname } = useLocation()
  const navegacao = useNavigationType()
  const anterior = useRef<string | null>(null)
  const pendente = useRef<Pendente | null>(null)

  useEffect(() => {
    if (anterior.current === pathname) return
    anterior.current = pathname

    if (navegacao === 'REPLACE') pendente.current?.descartar()
    else pendente.current?.enviar()

    const location = window.location.href
    let encerrado = false

    const encerrar = () => {
      encerrado = true
      clearTimeout(prazo)
      desassinar()
      pendente.current = null
    }
    const enviar = (title: string) => {
      if (encerrado) return
      encerrar()
      track(pageViewEvent({ location, title }))
    }

    const prazo = setTimeout(() => enviar(document.title), ESPERA_DA_DECLARACAO_MS)
    const desassinar = onPageMeta(declaracao => {
      if (declaracao.pathname === pathname) enviar(declaracao.title)
    })

    pendente.current = {
      enviar: () => enviar(document.title),
      descartar: () => {
        if (!encerrado) encerrar()
      },
    }
  }, [pathname, navegacao])

  useEffect(() => () => pendente.current?.enviar(), [])

  return null
}

export default PageViewTracker
