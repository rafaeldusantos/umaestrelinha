// Feature 61 — o ÚNICO arquivo da loja que fala com o gtag do Google Analytics 4 (`EVT-15`).
//
// Todo ponto de chamada da loja passa um evento já montado pelos builders puros de
// `@estrelinha/core/analytics` para `track`, e só. Nenhum outro arquivo de `apps/**` escreve na
// fila global do Google nem chama a função global dele — `medicaoComDonoUnico.test.ts` recusa.
//
// **O que este módulo decide, e mais ninguém**: se pode medir. `track` sai só quando as cinco
// condições valem juntas — configuração ligada, ID válido, cliente sem recusa, fora da prévia do
// painel e fora do ambiente de desenvolvimento/teste. Faltando uma, é no-op silencioso.
//
// **A compra não sai daqui.** O `purchase` é do servidor (`AD-047`), e por isso não existe builder
// dele em `core/analytics` para a loja importar.
//
// Mora em `shared` e por isso **não importa `entities/`** (camada acima): a escolha da cliente
// chega por um leitor injetado (`setConsentReader`), registrado por `entities/cookie-consent`.

import {
  measurementIdRefusal,
  normalizeMeasurementId,
  trafficType,
  type AnalyticsEvent,
} from '@estrelinha/core/analytics'
import type { AnalyticsSettings } from '@estrelinha/supabase/types/settings'

type Gtag = (...args: unknown[]) => void

interface JanelaComGoogle {
  dataLayer?: unknown[]
  gtag?: Gtag
  location?: Location
  [flag: string]: unknown
}

const GTAG_SRC = 'https://www.googletagmanager.com/gtag/js?id='

let settings: AnalyticsSettings | null = null
let previewMode = false
let consentReader: () => boolean = () => true
let loadedId: string | null = null

/**
 * Os eventos que chegaram ANTES de a configuração ser lida. O `page_view` da primeira página e o
 * `login` de quem volta do Google acontecem nos primeiros instantes, e `store_settings` pode demorar
 * mais que isso: sem a fila, a primeira página de toda visita se perderia. Com a configuração lida,
 * a fila é enviada (se pode medir) ou descartada (se não pode) — nunca fica pendurada.
 */
const PENDENTES_MAX = 20
let pendentes: AnalyticsEvent[] = []

const janela = (): JanelaComGoogle | null =>
  typeof window === 'undefined' ? null : (window as unknown as JanelaComGoogle)

/**
 * Desenvolvimento e teste nunca medem (`EVT-*`, "nenhum sai em `localhost`, nos testes"). Lido na
 * hora da chamada, e não no carregamento do módulo, para o teste poder ligar o modo de produção.
 */
const ambienteDeProducao = (): boolean => import.meta.env.PROD === true

/** O ID que a configuração pede, normalizado — ou `null` quando ele não serve. */
function idConfigurado(): string | null {
  if (!settings) return null
  const id = normalizeMeasurementId(settings.measurement_id)
  return measurementIdRefusal(id) === null ? id : null
}

function consentiu(): boolean {
  try {
    return consentReader() === true
  } catch {
    // Leitor que lança é dúvida, e na dúvida não se mede.
    return false
  }
}

/** As cinco condições juntas. É a única resposta para "posso medir agora?". */
export function canMeasure(): boolean {
  return (
    settings?.enabled === true &&
    idConfigurado() !== null &&
    consentiu() &&
    !previewMode &&
    ambienteDeProducao()
  )
}

/** A configuração lida de `store_settings.analytics` (`useAnalyticsSettings`). */
export function setAnalyticsSettings(next: AnalyticsSettings | null): void {
  settings = next
}

/**
 * Esvazia a fila de antes da configuração: envia tudo, se pode medir agora, ou descarta. Chamado
 * pelo carregador DEPOIS de `loadGtag`, quando a leitura de `store_settings` terminou.
 */
export function flushPendingEvents(): void {
  const fila = pendentes
  pendentes = []
  if (!canMeasure()) return
  for (const evento of fila) enviar(evento)
}

/** Feature 25 — a loja dentro do iframe do painel nunca mede (`AVS-08`). */
export function setPreviewMode(on: boolean): void {
  previewMode = on
}

/** Quem responde "a cliente deixou medir?" — registrado por `entities/cookie-consent`. */
export function setConsentReader(reader: () => boolean): void {
  consentReader = reader
}

/**
 * Injeta o gtag **uma vez** e configura a propriedade.
 *
 * - `send_page_view: false` — o `page_view` é da loja (`EVT-01`), por mudança de pathname; o
 *   automático contaria a primeira página em dobro.
 * - `allow_google_signals` e `allow_ad_personalization_signals` em `false` — a base legal é
 *   legítimo interesse, que não cobre publicidade.
 *
 * Chamado de novo com o mesmo ID, não faz nada. Com outro ID (a dona trocou no painel), configura
 * o novo sem injetar um segundo script — o `gtag.js` atende qualquer ID depois de carregado.
 */
export function loadGtag(measurementId: string): void {
  const w = janela()
  if (!w || typeof document === 'undefined') return
  const id = normalizeMeasurementId(measurementId)
  if (measurementIdRefusal(id) !== null) return
  if (loadedId === id) return

  if (!w.dataLayer) w.dataLayer = []
  if (typeof w.gtag !== 'function') {
    // A forma oficial do snippet: `arguments`, não um array — o gtag.js distingue os dois.
    w.gtag = function gtag() {
      // eslint-disable-next-line prefer-rest-params
      ;(w.dataLayer as unknown[]).push(arguments)
    }
    w.gtag('js', new Date())
  }
  w[`ga-disable-${id}`] = false
  w.gtag('config', id, {
    send_page_view: false,
    allow_google_signals: false,
    allow_ad_personalization_signals: false,
    // `CMP-08` também para o que o GA4 manda SOZINHO (rolagem, `form_start`, o histórico): sem o
    // parâmetro na configuração, a homologação marcava os eventos da loja e deixava os automáticos
    // entrarem como tráfego real — medido no fecho da 61.
    ...(trafficType(w.location?.hostname, settings?.production_host) === 'internal'
      ? { traffic_type: 'internal' }
      : {}),
  })

  if (!document.querySelector(`script[src^="${GTAG_SRC}"]`)) {
    const script = document.createElement('script')
    script.async = true
    script.src = `${GTAG_SRC}${encodeURIComponent(id)}`
    document.head.appendChild(script)
  }
  loadedId = id
}

/**
 * Reaplica a escolha da cliente ao gtag já carregado. Com recusa, liga a bandeira oficial
 * `ga-disable-<ID>`: sem ela, a medição otimizada do GA4 (rolagem, cliques de saída) continuaria
 * saindo sozinha mesmo com `track` em silêncio (`AVS-05`).
 */
export function applyConsent(): void {
  const w = janela()
  if (!w || !loadedId) return
  w[`ga-disable-${loadedId}`] = !consentiu()
}

/**
 * Envia um evento — ou não faz nada, quando `canMeasure()` diz não. Aceita `null` porque
 * `searchEvent` devolve `null` para termo vazio, e o chamador não precisa testar.
 */
export function track(event: AnalyticsEvent | null): void {
  if (!event || previewMode) return
  if (settings === null) {
    // Configuração ainda não lida: guarda, sem decidir — `flushPendingEvents` decide depois.
    if (pendentes.length < PENDENTES_MAX) pendentes.push(event)
    return
  }
  if (!canMeasure()) return
  enviar(event)
}

function enviar(event: AnalyticsEvent): void {
  const w = janela()
  if (!w || typeof w.gtag !== 'function') return
  const id = idConfigurado()
  const params: Record<string, unknown> = { ...event.params, send_to: id }
  // `CMP-08`, do lado do navegador: fora do host de produção todo evento é interno.
  if (trafficType(w.location?.hostname, settings?.production_host) === 'internal') {
    params.traffic_type = 'internal'
  }
  try {
    w.gtag('event', event.name, params)
  } catch {
    // O gtag bloqueado por extensão não pode virar erro na tela da cliente.
  }
}

function lerCookie(nome: string): string | null {
  if (typeof document === 'undefined') return null
  for (const parte of document.cookie.split(';')) {
    const [k, ...v] = parte.trim().split('=')
    if (k === nome) return decodeURIComponent(v.join('='))
  }
  return null
}

/**
 * O `client_id` e o `session_id` do GA, lidos dos cookies `_ga` e `_ga_<ID>` — o que o servidor
 * precisa para ligar o `purchase` à sessão que o originou (`CMP-01`). `null` quando não há.
 *
 * - `_ga` = `GA1.1.<rand>.<ts>` ⇒ `client_id` = `<rand>.<ts>`.
 * - `_ga_<ID>` = `GS1.1.<sessão>.…` (formato antigo) ou `GS2.1.s<sessão>$o…` (formato novo).
 */
export function gaIds(): { clientId: string | null; sessionId: string | null } {
  const ga = lerCookie('_ga')
  const partes = ga ? ga.split('.') : []
  const clientId =
    partes.length >= 4 && /^\d+$/.test(partes[2]) && /^\d+$/.test(partes[3])
      ? `${partes[2]}.${partes[3]}`
      : null

  const id = idConfigurado() ?? loadedId
  let sessionId: string | null = null
  if (id) {
    const sessao = lerCookie(`_ga_${id.replace(/^G-/, '')}`)
    if (sessao) {
      const novo = /^GS2\.\d+\.s(\d+)/.exec(sessao)
      const antigo = /^GS1\.\d+\.(\d+)\./.exec(sessao)
      sessionId = (novo ?? antigo)?.[1] ?? null
    }
  }
  return { clientId, sessionId }
}

/**
 * Apaga `_ga` e todo `_ga_*` (`AVS-05`). O gtag grava no domínio registrável com ponto na frente
 * (`.umaestrelinha.com.br`), então expira em cada sufixo do host, e também sem domínio.
 */
export function clearGaCookies(): void {
  if (typeof document === 'undefined') return
  const nomes = document.cookie
    .split(';')
    .map(p => p.trim().split('=')[0])
    .filter(n => n === '_ga' || n.startsWith('_ga_'))
  const host = typeof location !== 'undefined' ? location.hostname : ''
  const rotulos = host.split('.')
  const dominios: (string | null)[] = [null]
  for (let i = 0; i < rotulos.length - 1; i += 1) dominios.push(`.${rotulos.slice(i).join('.')}`)

  const expirado = 'expires=Thu, 01 Jan 1970 00:00:00 GMT'
  for (const nome of nomes) {
    for (const dominio of dominios) {
      document.cookie = `${nome}=; ${expirado}; path=/${dominio ? `; domain=${dominio}` : ''}`
    }
  }
}

/** Só para os testes: devolve o módulo ao estado de quem acabou de abrir a página. */
export function resetAnalyticsForTests(): void {
  settings = null
  pendentes = []
  previewMode = false
  consentReader = () => true
  loadedId = null
}

export { cartLineItem, productItem, type AnalyticsList, type CartLineLike } from './items'
// `useTrackList` NÃO é reexportado daqui: ele chama `track` pela porta pública deste módulo, e
// importá-lo de dentro faria o hook falar com o `track` de antes de qualquer dublê de teste.
