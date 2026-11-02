import { useEffect, useRef } from 'react'
import { useLocation } from 'react-router-dom'
import { useAnalyticsSettings, useStoreSettings } from '@estrelinha/core/hooks/useStoreSettings'
import { PRESENCE_CART_MAX, isPresenceSlug } from '@estrelinha/core/visits'
import { presencePage } from '@estrelinha/core/routes/pageKind'
import { useCookieConsentStore } from '@/entities/cookie-consent'
import { useCartStore } from '@/entities/cart'
import {
  captureLandingSource,
  ensurePresenceId,
  landingSource,
  postPresence,
  presenceState,
  savePresenceClock,
} from '@/shared/lib/presence'
import { visitRefusal } from '@/shared/lib/visits'
import { visitContext, type VisitConfig } from '@/app/visitContext'

/**
 * A presença na loja: enquanto a aba está VISÍVEL, o navegador avisa a cada minuto que está na loja
 * — com o tipo de página, a joia, os itens da sacola e a faixa de origem. Bate também na troca de
 * rota e na mudança da sacola. Em segundo plano não bate nem mantém o relógio ligado.
 *
 * Montado no `App.tsx` ao lado do `VisitCounter`, fora das `Routes` e só fora da prévia. Decide pela
 * MESMA `visitRefusal` (com o mesmo contexto, `visitContext`), relida no instante de cada pulso:
 * sem aceite de estatística, robô, host interno, a marca de "não contar", a prévia ou a configuração
 * ainda chegando, nada sai. Independente do GA4.
 *
 * O id é o da presença (`shared/lib/presence`), nunca o do contador de visitas.
 */

export const PRESENCE_INTERVAL_MS = 60_000

function podeChamar(cfg: VisitConfig): boolean {
  useCookieConsentStore.getState().syncFromStorage()
  return visitRefusal(visitContext(cfg)) === null
}

const visivel = (): boolean => typeof document === 'undefined' || document.visibilityState === 'visible'

const itensDaSacola = (): number => {
  const total = useCartStore.getState().items.reduce((soma, i) => soma + (Number(i.quantity) || 0), 0)
  return Math.max(0, Math.min(PRESENCE_CART_MAX, Math.trunc(total)))
}

async function pulsar(cfg: VisitConfig, pathname: string): Promise<void> {
  if (!visivel() || presenceState.emVoo) return
  if (!podeChamar(cfg)) return
  const id = ensurePresenceId()
  if (!id) return
  const pagina = presencePage(pathname)
  presenceState.emVoo = true
  try {
    const r = await postPresence({
      id,
      page: pagina.kind,
      product: pagina.slug !== null && isPresenceSlug(pagina.slug) ? pagina.slug : null,
      cart: itensDaSacola(),
      source: landingSource(),
    })
    if (r.status === 200 && r.ate !== undefined && r.agora !== undefined) savePresenceClock(r.ate, r.agora)
  } finally {
    presenceState.emVoo = false
  }
}

const PresencePing = () => {
  const { pathname } = useLocation()
  const { production_host } = useAnalyticsSettings()
  const { isFetched } = useStoreSettings()
  const cartItems = useCartStore((s) => s.items)

  const cfg = useRef<VisitConfig>({ settingsLoaded: false, productionHost: '' })
  cfg.current = { settingsLoaded: isFetched, productionHost: production_host ?? '' }
  const caminho = useRef(pathname)
  caminho.current = pathname

  // O pouso: a faixa de origem é capturada uma vez, em memória, na primeira montagem da aba.
  useEffect(() => {
    captureLandingSource(document.referrer, window.location.search, window.location.host)
  }, [])

  // Na troca de rota, na chegada da configuração e na mudança da sacola — fora do caminho crítico.
  useEffect(() => {
    const t = window.setTimeout(() => void pulsar(cfg.current, caminho.current), 0)
    return () => window.clearTimeout(t)
  }, [pathname, isFetched, production_host, cartItems])

  // A cada minuto, só com a aba visível: o relógio é desligado em segundo plano e religado na volta.
  useEffect(() => {
    let relogio: number | undefined
    const ligar = () => {
      if (relogio === undefined) relogio = window.setInterval(() => void pulsar(cfg.current, caminho.current), PRESENCE_INTERVAL_MS)
    }
    const desligar = () => {
      if (relogio !== undefined) window.clearInterval(relogio)
      relogio = undefined
    }
    const aoMudar = () => {
      if (visivel()) {
        ligar()
        void pulsar(cfg.current, caminho.current)
      } else desligar()
    }
    if (visivel()) ligar()
    document.addEventListener('visibilitychange', aoMudar)
    return () => {
      document.removeEventListener('visibilitychange', aoMudar)
      desligar()
    }
  }, [])

  return null
}

export default PresencePing
