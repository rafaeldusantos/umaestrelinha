import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { isPreviewWindow } from '@estrelinha/core/home'
import { useAnalyticsSettings, useStoreSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { OPT_OUT_PARAM, readOptOutParam } from '@estrelinha/core/visits'
import { useCookieConsentStore } from '@/entities/cookie-consent'
import {
  ensureVisitorId,
  forgetVisitorId,
  isOptedOut,
  markerAllowsCall,
  postVisit,
  readMarker,
  saveClock,
  setOptOut,
  visitCounterState,
  visitRefusal,
  type VisitContext,
} from '@/shared/lib/visits'

/**
 * Feature 71 — o contador de visitas únicas da loja (`VIS-16`..`VIS-25`, `VIS-42`).
 *
 * Montado no `App.tsx` **fora das `Routes`** (o checkout e o 404 também contam) e **só fora da
 * prévia do painel**, ao lado do `AnalyticsLoader`. Ele é independente da medição do GA4: decide por
 * `visitRefusal`, que não recebe nada do GA4 (`contadorSemGa.test.ts`).
 *
 * **A chamada sai fora do caminho crítico** (`VIS-17`): nada de rede na montagem nem na navegação;
 * a tentativa é agendada para quando o navegador estiver ocioso.
 *
 * **O que impede a duplicata é o servidor** (uma linha por id e dia, `on conflict do nothing`). O
 * marcador só evita chamadas: relógio errado custa no máximo uma chamada a mais ou um atraso, nunca
 * uma visita a mais.
 */

/** Falhas desta aba: a primeira dá direito a mais UMA tentativa, na próxima navegação (`VIS-18`). */
const FALHAS_MAX = 2

const AVISO_SEM_CONTAR = 'Este navegador não é mais contado nas visitas da loja.'
const AVISO_CONTANDO = 'Este navegador voltou a ser contado nas visitas da loja.'

interface Configuracao {
  settingsLoaded: boolean
  productionHost: string
}

/** O contexto da decisão, lido NO INSTANTE da tentativa — nunca guardado da montagem. */
function contexto(cfg: Configuracao): VisitContext {
  const nav = typeof navigator === 'undefined' ? null : navigator
  return {
    production: import.meta.env.PROD === true,
    preview: isPreviewWindow(window.location.search, window.parent !== window),
    settingsLoaded: cfg.settingsLoaded,
    productionHost: cfg.productionHost,
    hostname: window.location.hostname,
    statistics: useCookieConsentStore.getState().statistics,
    optedOut: isOptedOut(),
    webdriver: nav?.webdriver === true,
    userAgent: nav?.userAgent ?? '',
  }
}

/** Relê a escolha de cookies (outra aba pode ter recusado, `VIS-25`) e decide. */
function podeChamar(cfg: Configuracao): boolean {
  useCookieConsentStore.getState().syncFromStorage()
  return visitRefusal(contexto(cfg)) === null
}

async function tentar(cfg: Configuracao): Promise<void> {
  if (!podeChamar(cfg)) return
  const lido = readMarker()
  if (lido.estado === 'indisponivel') return
  if (!markerAllowsCall(lido.estado === 'presente' ? lido.marker : null, Date.now())) return
  if (visitCounterState.emVoo || visitCounterState.falhas >= FALHAS_MAX) return

  visitCounterState.emVoo = true
  try {
    // A recusa pode chegar enquanto a trava do id espera: a decisão é refeita DENTRO da trava, antes
    // de criar o id (`VIS-24`, `VIS-42`) — decidir só depois impediria a chamada, mas deixaria
    // gravado um código criado depois da recusa.
    const id = await ensureVisitorId(() => podeChamar(cfg))
    if (!id) return
    // E de novo depois: a criação não tem `await`, mas a decisão de rede é a última palavra.
    if (!podeChamar(cfg)) return
    const r = await postVisit(id)
    const comRelogio = r.ate !== undefined && r.agora !== undefined
    if ((r.status === 200 || r.status === 429) && comRelogio) saveClock(r.ate, r.agora)
    else visitCounterState.falhas += 1
  } finally {
    visitCounterState.emVoo = false
  }
}

type JanelaOciosa = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number
  cancelIdleCallback?: (handle: number) => void
}

/**
 * Agenda fora do caminho crítico e devolve o cancelamento:
 * - com `requestIdleCallback`, quando o navegador estiver ocioso (com prazo de 5 s);
 * - sem ele e com o documento já carregado — a troca de rota da SPA, sempre depois do `load` —,
 *   num `setTimeout(…, 0)`: um ouvinte novo de `load` nunca dispararia;
 * - sem ele e com a página ainda carregando, depois do `load`.
 */
function agendar(fn: () => void): () => void {
  const w = window as JanelaOciosa
  if (typeof w.requestIdleCallback === 'function') {
    const h = w.requestIdleCallback(fn, { timeout: 5000 })
    return () => w.cancelIdleCallback?.(h)
  }
  if (document.readyState === 'complete') {
    const t = window.setTimeout(fn, 0)
    return () => window.clearTimeout(t)
  }
  let t: number | undefined
  const aoCarregar = () => {
    t = window.setTimeout(fn, 0)
  }
  window.addEventListener('load', aoCarregar, { once: true })
  return () => {
    window.removeEventListener('load', aoCarregar)
    if (t !== undefined) window.clearTimeout(t)
  }
}

const VisitCounter = () => {
  const { pathname, search, hash } = useLocation()
  const navigate = useNavigate()
  const { production_host } = useAnalyticsSettings()
  // "Terminou de ler" — antes disso o host acima é o PADRÃO, não a configuração (`VIS-22`).
  const { isFetched } = useStoreSettings()

  const cfg = useRef<Configuracao>({ settingsLoaded: false, productionHost: '' })
  cfg.current = { settingsLoaded: isFetched, productionHost: production_host ?? '' }

  // `VIS-42` — declarado ANTES do agendamento: no mesmo commit, a marca é gravada antes de a
  // tentativa ser agendada.
  useEffect(() => {
    const acao = readOptOutParam(search)
    if (acao === null) return
    if (acao === 'on') {
      setOptOut(true)
      forgetVisitorId()
      toast(AVISO_SEM_CONTAR)
    } else {
      setOptOut(false)
      toast(AVISO_CONTANDO)
    }
    const resto = new URLSearchParams(search)
    resto.delete(OPT_OUT_PARAM)
    const s = resto.toString()
    // `replace` pelo router: sem entrada nova no histórico, e com o `location` dele em sincronia.
    navigate({ pathname, search: s ? `?${s}` : '', hash }, { replace: true })
  }, [search, pathname, hash, navigate])

  // `VIS-17` — cada página (e a chegada da configuração) agenda uma tentativa.
  useEffect(() => agendar(() => void tentar(cfg.current)), [pathname, isFetched, production_host])

  return null
}

export default VisitCounter
