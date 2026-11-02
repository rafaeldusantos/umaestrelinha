import { isPreviewWindow } from '@estrelinha/core/home'
import { useCookieConsentStore } from '@/entities/cookie-consent'
import { isOptedOut, type VisitContext } from '@/shared/lib/visits'

/**
 * O contexto da decisão de contar (`visitRefusal`), lido NO INSTANTE da tentativa — nunca guardado
 * da montagem. É um só para o contador de visitas e para o pulso de presença: os dois respondem
 * "este navegador pode ser medido?" com as mesmas fontes (ambiente, prévia, configuração, host,
 * consentimento, a marca de "não contar" e robô), e duas leituras divergiriam sem nada quebrar.
 */
export interface VisitConfig {
  settingsLoaded: boolean
  productionHost: string
}

export function visitContext(cfg: VisitConfig): VisitContext {
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
