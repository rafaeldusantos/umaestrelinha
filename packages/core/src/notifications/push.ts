// Feature 79 — o aviso no celular (Web Push), a regra pura com UM dono (`AD-062`).
//
// Três consumidores em três runtimes: o motor (`send-notification/push.ts`, Deno), a porta das
// inscrições (`atelie-avisos`, Deno) e o app do ateliê (navegador). Os textos de MAN-08, a lista de
// eventos e a validação do que o navegador entrega moram aqui para nenhum dos três reescrever.
//
// Todo especificador relativo leva `.ts` (`import type` incluso) e não há import de pacote: o Deno
// resolve este grafo por caminho relativo. `push.test.ts` caminha o grafo e recusa a volta.

import type { NotificationEvent } from './events.ts'
import { formatOrderNumber } from '../orders/format.ts'
import { formatPrice } from '../formatters/price.ts'

/**
 * Os quatro eventos da dona, na ordem de `NOTIFICATION_EVENTS`. São o `default` e o `check` de
 * `push_subscriptions.events` na migration da `79` — cópia deliberada, guardada por
 * `pushSubscriptionsSchema.test.ts` (suíte da loja), que importa esta constante e lê o `.sql`.
 */
export const PUSH_EVENTS = [
  'owner_order_received',
  'owner_order_paid',
  'owner_payment_rejected',
  'owner_material_incoming',
] as const satisfies readonly NotificationEvent[]

export type PushEvent = (typeof PUSH_EVENTS)[number]

export const isPushEvent = (value: unknown): value is PushEvent =>
  typeof value === 'string' && (PUSH_EVENTS as readonly string[]).includes(value)

/** O que o service worker recebe e mostra (`sw-avisos.js`). */
export interface PushMessage {
  title: string
  body: string
  /** Caminho interno do app — o toque abre aqui (`MAN-03`). */
  url: string
  /** O Android substitui um aviso de mesma tag em vez de empilhar duas cópias. */
  tag: string
}

/** O recorte do pedido que o texto lê. */
export interface PushOrder {
  id: string
  order_number: string | null
  total: number | string | null
}

/**
 * Os textos de `MAN-08`, por extenso. Sem `!` e sem emoji: é um aviso operacional para a dona, e o
 * registro da loja é memorial. `{n}` = `formatOrderNumber`, `{v}` = `formatPrice` (com centavos).
 */
export function pushMessage(event: PushEvent, order: PushOrder): PushMessage {
  const n = formatOrderNumber(order.order_number)
  const v = formatPrice(Number(order.total ?? 0))
  const url = `/pedidos/${order.id}`
  const tag = `pedido-${order.id}-${event}`
  switch (event) {
    case 'owner_order_received':
      return { title: `Pedido ${n} recebido`, body: `${v} · aguardando o PIX`, url, tag }
    case 'owner_order_paid':
      return { title: `Pedido ${n} pago`, body: v, url, tag }
    case 'owner_payment_rejected':
      return { title: `Pagamento recusado no pedido ${n}`, body: v, url, tag }
    case 'owner_material_incoming':
      return { title: `Material a caminho do pedido ${n}`, body: 'A cliente registrou o envio.', url, tag }
  }
}

/** O aviso do botão de teste (`MAN-31`): abre a Início, e não vai a `order_notifications`. */
export const PUSH_TEST_MESSAGE: PushMessage = {
  title: 'Avisos ligados',
  body: 'É assim que os pedidos vão chegar.',
  url: '/',
  tag: 'teste',
}

/** No máximo 10 aparelhos por conta; o 11º despeja o usado há mais tempo (`MAN-28`, A9). */
export const PUSH_SUBSCRIPTION_LIMIT = 10

/** Um aviso de teste a cada 30 s por conta (`MAN-33`). */
export const PUSH_TEST_COOLDOWN_MS = 30_000

/**
 * Os serviços de push aceitos (A10, R2 do Design). O servidor faz POST na URL que o navegador
 * entregou: sem lista, uma conta admin comprometida faria o servidor chamar qualquer host (SSRF).
 * `*.notify.windows.com` é sufixo (só subdomínio); os outros são exatos. Acrescentar um host é uma
 * linha aqui e um caso no teste.
 */
const PUSH_HOSTS_EXATOS = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com']
const PUSH_HOSTS_SUFIXO = ['.notify.windows.com']

/**
 * `null` quando o endpoint pode receber POST do servidor; senão `invalid_url`, `not_https` ou
 * `host_not_allowed`. Porta explícita também é recusada: os serviços de push usam a 443.
 */
export function pushEndpointRefusal(endpoint: string): string | null {
  if (typeof endpoint !== 'string' || endpoint === '') return 'invalid_url'
  let url: URL
  try {
    url = new URL(endpoint)
  } catch {
    return 'invalid_url'
  }
  if (url.protocol !== 'https:') return 'not_https'
  const host = url.hostname.toLowerCase()
  const permitido =
    PUSH_HOSTS_EXATOS.includes(host) || PUSH_HOSTS_SUFIXO.some((s) => host.endsWith(s))
  if (!permitido || url.port !== '' || url.username !== '' || url.password !== '') return 'host_not_allowed'
  return null
}

const BASE64URL = /^[A-Za-z0-9_-]+={0,2}$/

/** Bytes de uma string base64url, ou `null` quando ela não é base64url. */
const bytesDe = (valor: unknown): Uint8Array | null => {
  if (typeof valor !== 'string' || !BASE64URL.test(valor)) return null
  const semPad = valor.replace(/=+$/, '')
  if (semPad.length % 4 === 1) return null
  const b64 = semPad.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (semPad.length % 4)) % 4)
  try {
    return Uint8Array.from(atob(b64), (c) => c.charCodeAt(0))
  } catch {
    return null
  }
}

/**
 * `null` quando as chaves da inscrição têm a forma certa: `p256dh` é um ponto P-256 não comprimido
 * (65 bytes, começando com `0x04`) e `auth` tem 16 bytes. Senão `invalid_p256dh` ou `invalid_auth`.
 */
export function pushKeysRefusal(p256dh: string, auth: string): string | null {
  const ponto = bytesDe(p256dh)
  if (!ponto || ponto.length !== 65 || ponto[0] !== 0x04) return 'invalid_p256dh'
  const segredo = bytesDe(auth)
  if (!segredo || segredo.length !== 16) return 'invalid_auth'
  return null
}

/**
 * `null` quando `events` é uma lista sem repetição de eventos de `PUSH_EVENTS` (vazia vale: é
 * "nenhum aviso neste aparelho"); senão `not_array`, `unknown_event` ou `duplicate_event`.
 */
export function pushEventsRefusal(events: unknown): string | null {
  if (!Array.isArray(events)) return 'not_array'
  if (!events.every(isPushEvent)) return 'unknown_event'
  if (new Set(events).size !== events.length) return 'duplicate_event'
  return null
}
