// O id e a origem da presença na loja.
//
// **O único arquivo do repositório que cita as duas chaves de armazenamento da presença.** O guarda
// de dono único recusa a chave em qualquer outro arquivo de `apps/*/src`, testes inclusos (eles
// importam as constantes).
//
// O id é o da PRESENÇA, não o do contador de visitas (`shared/lib/visits`), e não se liga a ele: é
// aleatório (`crypto.randomUUID`), por navegador e por dia. O marcador é `{ v: 1, id, ate, em }`, no
// molde do contador: `ate` é o prazo do servidor (a próxima meia-noite de Brasília) convertido para o
// relógio LOCAL por duração (`Date.now() + (ate − agora)`), e `em` é o instante local da gravação.
// Vencido o prazo — ou com o relógio voltado para antes de `em` —, nasce um id novo. O cliente nunca
// calcula o dia.
//
// A origem é a FAIXA (`sourceBucket`) calculada no pouso — a primeira página da aba —, e nunca o
// referrer ou o endereço: ela é capturada em memória na montagem e só vai ao `sessionStorage` quando
// um pulso é permitido (com aceite de estatística).

import { isVisitorId } from '@estrelinha/core/visits'
import { PRESENCE_SOURCES, type PresenceSource } from '@estrelinha/core/visits'
import { sourceBucket } from '@estrelinha/core/live'

export const PRESENCE_KEY = 'estrelinha-presenca'
/** `sessionStorage`: a faixa de origem desta aba. */
export const PRESENCE_SOURCE_KEY = 'estrelinha-presenca-origem'

interface PresenceMarker {
  v: 1
  id: string
  ate: number | null
  em: number | null
}

const numeroOuNulo = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null)

/** `undefined` ⇒ o armazenamento lançou; `null` ⇒ sem marcador válido. */
function ler(): PresenceMarker | null | undefined {
  let cru: string | null
  try {
    cru = localStorage.getItem(PRESENCE_KEY)
  } catch {
    return undefined
  }
  if (cru === null) return null
  try {
    const d = JSON.parse(cru) as Record<string, unknown>
    if (!d || typeof d !== 'object' || d.v !== 1 || !isVisitorId(d.id)) return null
    return { v: 1, id: d.id as string, ate: numeroOuNulo(d.ate), em: numeroOuNulo(d.em) }
  } catch {
    return null
  }
}

function escrever(m: PresenceMarker): boolean {
  try {
    localStorage.setItem(PRESENCE_KEY, JSON.stringify(m))
    return true
  } catch {
    return false
  }
}

const vigente = (m: PresenceMarker, agora: number): boolean =>
  m.ate === null || m.em === null || (m.em <= agora && agora < m.ate)

/**
 * O id da presença deste navegador, criado quando não há um vigente. `null` quando não dá para
 * guardar (armazenamento que lança ou recusa, ou sem `crypto.randomUUID`) — nunca um id só em
 * memória, que faria cada página virar uma pessoa nova.
 */
export function ensurePresenceId(): string | null {
  const atual = ler()
  if (atual === undefined) return null
  const agora = Date.now()
  if (atual && vigente(atual, agora)) return atual.id

  const cripto = (globalThis as { crypto?: { randomUUID?: () => string } }).crypto
  if (typeof cripto?.randomUUID !== 'function') return null
  const id = cripto.randomUUID()
  if (!isVisitorId(id)) return null
  if (!escrever({ v: 1, id, ate: null, em: null })) return null
  const relido = ler()
  return relido && relido.id === id ? id : null
}

/**
 * Grava o prazo que o servidor devolveu, convertido por duração. Relê o marcador e só toca
 * `ate`/`em`: uma resposta que chega depois da recusa nunca traz o id de volta.
 */
export function savePresenceClock(ateServidor: number, agoraServidor: number): void {
  if (!Number.isFinite(ateServidor) || !Number.isFinite(agoraServidor)) return
  const atual = ler()
  if (!atual) return
  const agora = Date.now()
  escrever({ ...atual, ate: agora + (ateServidor - agoraServidor), em: agora })
}

// --- A origem --------------------------------------------------------------------------------

let origemDoPouso: PresenceSource | null = null

const ehFaixa = (v: unknown): v is PresenceSource =>
  typeof v === 'string' && (PRESENCE_SOURCES as readonly string[]).includes(v)

function origemGuardada(): PresenceSource | null {
  try {
    const v = sessionStorage.getItem(PRESENCE_SOURCE_KEY)
    return ehFaixa(v) ? v : null
  } catch {
    return null
  }
}

const mesmoHost = (referrer: string, host: string): boolean => {
  try {
    const de = new URL(referrer).host.toLowerCase().replace(/^www\./, '')
    return de !== '' && de === host.toLowerCase().replace(/^www\./, '')
  } catch {
    return false
  }
}

/**
 * Captura a faixa do pouso, EM MEMÓRIA. Chamada na montagem; só vale a primeira vez na aba (a já
 * guardada no `sessionStorage`, ou a já capturada, vence). O referrer da própria loja não é origem.
 */
export function captureLandingSource(referrer: string, search: string, host: string): void {
  if (origemDoPouso !== null || origemGuardada() !== null) return
  const externo = referrer && !mesmoHost(referrer, host) ? referrer : null
  let utm: string | null = null
  try {
    utm = new URLSearchParams(search).get('utm_source')
  } catch {
    utm = null
  }
  origemDoPouso = sourceBucket(externo, utm)
}

/** A faixa de origem desta aba, guardada no `sessionStorage` (só a faixa). Sem pouso, `direto`. */
export function landingSource(): PresenceSource {
  const guardada = origemGuardada()
  if (guardada) return guardada
  const faixa = origemDoPouso ?? 'direto'
  try {
    sessionStorage.setItem(PRESENCE_SOURCE_KEY, faixa)
  } catch {
    // Sem armazenamento, a memória do módulo vale pela aba.
  }
  return faixa
}

/** A recusa de cookies: apaga o id e a origem, na mesma ação. */
export function forgetPresence(): void {
  origemDoPouso = null
  try {
    localStorage.removeItem(PRESENCE_KEY)
  } catch {
    // nada a apagar
  }
  try {
    sessionStorage.removeItem(PRESENCE_SOURCE_KEY)
  } catch {
    // nada a apagar
  }
}

/** Um pulso em voo por vez. Mora aqui, ao lado das chaves, para haver UM lugar a zerar entre testes. */
export const presenceState = { emVoo: false }

export function resetPresenceForTests(): void {
  origemDoPouso = null
  presenceState.emVoo = false
}
