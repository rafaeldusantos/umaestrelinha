import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { viewItemEvent } from '@estrelinha/core/analytics'
import type { AnalyticsSettings } from '@estrelinha/supabase/types/settings'
import {
  applyConsent,
  canMeasure,
  flushPendingEvents,
  clearGaCookies,
  gaIds,
  loadGtag,
  resetAnalyticsForTests,
  setAnalyticsSettings,
  setConsentReader,
  setPreviewMode,
  track,
} from '..'

/**
 * Feature 61 · T12 — o dono do gtag.
 *
 * O que se mede é o que SAI para o Google: a fila global (`dataLayer`) e o `<script>` injetado. A
 * asserção nunca é sobre o estado interno do módulo — um `canMeasure()` verdadeiro com nada na fila
 * seria o defeito, não a prova.
 */

type Janela = Window & { dataLayer?: unknown[]; gtag?: (...a: unknown[]) => void } & Record<string, unknown>
const w = () => window as unknown as Janela

const LIGADO: AnalyticsSettings = {
  enabled: true,
  measurement_id: 'G-SQL517XDQZ',
  production_host: 'umaestrelinha.com.br',
}

const EVENTO = viewItemEvent({
  item: { id: 'p-1', nuvemshop_id: 42, name: 'Pingente Estrela', price: 389.9 },
})

/** Os eventos que chegaram à fila, como o gtag.js os leria. */
const eventosNaFila = () =>
  (w().dataLayer ?? [])
    .map(entrada => Array.from(entrada as ArrayLike<unknown>))
    .filter(args => args[0] === 'event')

const scriptsDoGtag = () =>
  Array.from(document.querySelectorAll('script')).filter(s =>
    s.src.startsWith('https://www.googletagmanager.com/gtag/js'),
  )

const apagarCookies = () => {
  for (const parte of document.cookie.split(';')) {
    const nome = parte.trim().split('=')[0]
    if (nome) document.cookie = `${nome}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
  }
}

beforeEach(() => {
  resetAnalyticsForTests()
  delete w().dataLayer
  delete w().gtag
  for (const s of scriptsDoGtag()) s.remove()
  apagarCookies()
  // Produção ligada por padrão nestes casos: o caso "dev" desliga explicitamente.
  vi.stubEnv('PROD', true)
})

afterEach(() => {
  vi.unstubAllEnvs()
})

/** Tudo certo para medir: configuração, gtag carregado. */
const pronto = (settings: AnalyticsSettings = LIGADO) => {
  setAnalyticsSettings(settings)
  loadGtag(settings.measurement_id)
}

describe('loadGtag', () => {
  it('injeta UM script, mesmo chamado duas vezes', () => {
    loadGtag('G-SQL517XDQZ')
    loadGtag('G-SQL517XDQZ')
    expect(scriptsDoGtag()).toHaveLength(1)
    expect(scriptsDoGtag()[0].src).toBe(
      'https://www.googletagmanager.com/gtag/js?id=G-SQL517XDQZ',
    )
    expect(scriptsDoGtag()[0].async).toBe(true)
  })

  const configsNaFila = () =>
    (w().dataLayer ?? [])
      .map(e => Array.from(e as ArrayLike<unknown>))
      .filter(a => a[0] === 'config')

  it('no host de produção: sem page_view automático, sem Google Signals, sem personalização — e SEM traffic_type', () => {
    // jsdom roda em `localhost`; declarar `localhost` como produção é o que põe este caso no ramo real.
    setAnalyticsSettings({ ...LIGADO, production_host: 'localhost' })
    loadGtag('G-SQL517XDQZ')
    const configs = configsNaFila()
    expect(configs).toHaveLength(1)
    expect(configs[0]).toEqual([
      'config',
      'G-SQL517XDQZ',
      {
        send_page_view: false,
        allow_google_signals: false,
        allow_ad_personalization_signals: false,
      },
    ])
  })

  it('fora do host de produção, a CONFIGURAÇÃO leva traffic_type — e com ela os eventos automáticos do GA4 (CMP-08)', () => {
    // Achado da prova em navegador: só os eventos da loja levavam a marca; rolagem, `form_start`
    // e o page_view do histórico entravam como tráfego real a partir da homologação.
    setAnalyticsSettings(LIGADO)
    loadGtag('G-SQL517XDQZ')
    expect(configsNaFila()[0][2]).toEqual({
      send_page_view: false,
      allow_google_signals: false,
      allow_ad_personalization_signals: false,
      traffic_type: 'internal',
    })
  })

  it('a fila recebe `arguments`, não array — é o que o gtag.js distingue', () => {
    loadGtag('G-SQL517XDQZ')
    const primeira = w().dataLayer![0]
    expect(Array.isArray(primeira)).toBe(false)
    expect(Array.from(primeira as ArrayLike<unknown>)[0]).toBe('js')
  })

  // Edge case da spec: "a dona troca o ID no painel ⇒ a loja usa o novo na próxima leitura". Até
  // aqui só o comentário de `loadGtag` afirmava isso. O carregador chama `setAnalyticsSettings` e
  // `loadGtag` de novo a cada leitura (`AnalyticsLoader`), e é essa sequência que se mede aqui.
  it('ID trocado no painel ⇒ configura o NOVO, sem segundo script, e os eventos vão para ele', () => {
    pronto(LIGADO)
    track(EVENTO)
    expect(eventosNaFila().at(-1)?.[2]).toMatchObject({ send_to: 'G-SQL517XDQZ' }) // âncora: o antigo

    const NOVO = { ...LIGADO, measurement_id: 'g-novo12345 ' } // como a dona colaria
    pronto(NOVO)
    track(EVENTO)

    expect(scriptsDoGtag()).toHaveLength(1)
    const ids = configsNaFila().map(c => c[1])
    expect(ids).toEqual(['G-SQL517XDQZ', 'G-NOVO12345'])
    expect(eventosNaFila().at(-1)?.[2]).toMatchObject({ send_to: 'G-NOVO12345' })
    expect(w()['ga-disable-G-NOVO12345']).toBe(false)
  })

  it('ID malformado não injeta nada', () => {
    loadGtag('GTM-K5N4XKF')
    expect(scriptsDoGtag()).toHaveLength(0)
    expect(w().dataLayer).toBeUndefined()
  })
})

describe('track — no-op em cada condição, e o caso positivo ao lado', () => {
  it('POSITIVO: tudo certo ⇒ o evento chega à fila com nome e parâmetros', () => {
    pronto()
    track(EVENTO)
    const eventos = eventosNaFila()
    expect(eventos).toHaveLength(1)
    expect(eventos[0][1]).toBe('view_item')
    expect(eventos[0][2]).toMatchObject({
      ...EVENTO.params,
      send_to: 'G-SQL517XDQZ',
    })
    expect(canMeasure()).toBe(true)
  })

  it('desligado no painel ⇒ nada', () => {
    pronto({ ...LIGADO, enabled: false })
    // `loadGtag` direto injetaria; quem não chama com desligado é o carregador. Aqui a régua é o track.
    track(EVENTO)
    expect(eventosNaFila()).toHaveLength(0)
  })

  it('ID inválido ⇒ nada', () => {
    setAnalyticsSettings({ ...LIGADO, measurement_id: 'UA-1-1' })
    loadGtag('G-SQL517XDQZ') // gtag existe; o que falta é ID válido NA CONFIGURAÇÃO
    track(EVENTO)
    expect(eventosNaFila()).toHaveLength(0)
  })

  it('recusa da cliente ⇒ nada', () => {
    pronto()
    setConsentReader(() => false)
    track(EVENTO)
    expect(eventosNaFila()).toHaveLength(0)
  })

  it('leitor de consentimento que lança ⇒ nada (dúvida não mede)', () => {
    pronto()
    setConsentReader(() => {
      throw new Error('storage')
    })
    track(EVENTO)
    expect(eventosNaFila()).toHaveLength(0)
  })

  it('prévia do painel ⇒ nada', () => {
    pronto()
    setPreviewMode(true)
    track(EVENTO)
    expect(eventosNaFila()).toHaveLength(0)
  })

  it('desenvolvimento/teste ⇒ nada', () => {
    pronto()
    vi.stubEnv('PROD', false)
    track(EVENTO)
    expect(eventosNaFila()).toHaveLength(0)
  })

  it('configuração nunca lida (leitura falhou) ⇒ nada', () => {
    loadGtag('G-SQL517XDQZ')
    track(EVENTO)
    expect(eventosNaFila()).toHaveLength(0)
  })

  it('evento null (busca vazia) ⇒ nada, sem lançar', () => {
    pronto()
    expect(() => track(null)).not.toThrow()
    expect(eventosNaFila()).toHaveLength(0)
  })

  it('gtag que lança (extensão) não vira erro na tela', () => {
    pronto()
    w().gtag = () => {
      throw new Error('bloqueado')
    }
    expect(() => track(EVENTO)).not.toThrow()
  })
})

describe('traffic_type (CMP-08, lado do navegador)', () => {
  it('fora do host de produção, todo evento leva traffic_type=internal', () => {
    // jsdom roda em `localhost`.
    pronto()
    track(EVENTO)
    expect(eventosNaFila()[0][2]).toMatchObject({ traffic_type: 'internal' })
  })

  it('no host de produção, não leva', () => {
    pronto({ ...LIGADO, production_host: window.location.hostname })
    track(EVENTO)
    expect(eventosNaFila()[0][2]).not.toHaveProperty('traffic_type')
  })
})

describe('applyConsent — a bandeira oficial de desligamento', () => {
  it('recusa liga `ga-disable-<ID>`; aceite desliga', () => {
    pronto()
    let aceita = false
    setConsentReader(() => aceita)
    applyConsent()
    expect(w()['ga-disable-G-SQL517XDQZ']).toBe(true)
    aceita = true
    applyConsent()
    expect(w()['ga-disable-G-SQL517XDQZ']).toBe(false)
  })
})

describe('gaIds', () => {
  it('lê client_id de `_ga` e session_id de `_ga_<ID>` no formato novo', () => {
    pronto()
    document.cookie = '_ga=GA1.1.1234567890.1700000000; path=/'
    document.cookie = '_ga_SQL517XDQZ=GS2.1.s1759700000$o3$g1$t1759700100$j60$l0$h0; path=/'
    expect(gaIds()).toEqual({ clientId: '1234567890.1700000000', sessionId: '1759700000' })
  })

  it('lê o session_id no formato antigo', () => {
    pronto()
    document.cookie = '_ga_SQL517XDQZ=GS1.1.1759700000.3.1.1759700100.60.0.0; path=/'
    expect(gaIds().sessionId).toBe('1759700000')
  })

  it('sem cookie (bloqueador, primeira página) ⇒ null, null', () => {
    pronto()
    expect(gaIds()).toEqual({ clientId: null, sessionId: null })
  })

  it('cookie malformado ⇒ null, nunca lixo', () => {
    pronto()
    document.cookie = '_ga=qualquer-coisa; path=/'
    expect(gaIds().clientId).toBeNull()
  })
})

describe('clearGaCookies (AVS-05)', () => {
  it('apaga `_ga` e `_ga_<id>`, e deixa os outros', () => {
    document.cookie = '_ga=GA1.1.1.2; path=/'
    document.cookie = '_ga_SQL517XDQZ=GS2.1.s1; path=/'
    document.cookie = 'outro=fica; path=/'
    clearGaCookies()
    expect(document.cookie).not.toMatch(/(^|;\s*)_ga=/)
    expect(document.cookie).not.toMatch(/_ga_SQL517XDQZ=/)
    expect(document.cookie).toMatch(/outro=fica/)
  })

  it('sensor: sem a chamada, os cookies continuam lá', () => {
    document.cookie = '_ga=GA1.1.1.2; path=/'
    expect(document.cookie).toMatch(/(^|;\s*)_ga=/)
  })
})

describe('a fila de antes da configuração (o primeiro page_view não se perde)', () => {
  it('evento antes da leitura fica guardado, e sai quando a configuração chega LIGADA', () => {
    track(EVENTO)
    expect(eventosNaFila()).toHaveLength(0)
    pronto()
    flushPendingEvents()
    expect(eventosNaFila()).toHaveLength(1)
    expect(eventosNaFila()[0][1]).toBe('view_item')
  })

  it('chegando DESLIGADA, a fila é descartada — e não volta depois', () => {
    track(EVENTO)
    setAnalyticsSettings({ ...LIGADO, enabled: false })
    flushPendingEvents()
    pronto()
    flushPendingEvents()
    expect(eventosNaFila()).toHaveLength(0)
  })

  it('com recusa, a fila é descartada', () => {
    track(EVENTO)
    setConsentReader(() => false)
    pronto()
    flushPendingEvents()
    expect(eventosNaFila()).toHaveLength(0)
  })

  it('na prévia nada entra na fila', () => {
    setPreviewMode(true)
    track(EVENTO)
    setPreviewMode(false)
    pronto()
    flushPendingEvents()
    expect(eventosNaFila()).toHaveLength(0)
  })
})
