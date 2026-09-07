// Feature 42 — a interface do provedor (`NTF-09`): a prova de que a feature 43 só acrescenta um
// arquivo.
//
// O motor (`send-notification/dispatch.ts`) itera `REGISTERED_PROVIDERS` e, para cada canal
// registrado E habilitado no evento, reivindica a linha e chama `send`. Ele não sabe o que é Resend
// nem Evolution: sabe que um provedor tem um canal, envia uma mensagem já renderizada dentro de um
// `signal`, e devolve um desfecho classificado por slug. É o que permite testar `resend` e um dublê
// com a MESMA bateria (`providers.test.ts`).

import type { NotificationChannel } from '../settings.ts'

/** A mensagem pronta para sair — o renderizador produz, o provedor consome. */
export interface RenderedMessage {
  channel: NotificationChannel
  to: string
  /** E-mail. */
  subject?: string
  /** E-mail. */
  html?: string
  /** A versão texto do e-mail; o corpo inteiro no WhatsApp. */
  text: string
  /** `notification:${orderId}:${event}:${channel}` — terceira camada de dedupe, no provedor. */
  idempotencyKey: string
}

/**
 * Discriminado por literal booleano de propósito? Não: com `strictNullChecks: false` a união por
 * `ok: true | false` não estreita `reason` no ramo do `else` (TS2339). Quem consome lê `outcome.ok`
 * e, no ramo de falha, faz `(outcome as ProviderFailure)` — ou usa `isProviderFailure`.
 */
export interface ProviderSuccess {
  ok: true
  /** O id do provedor — vai para `order_notifications.provider_message_id`. */
  id: string
}

export interface ProviderFailure {
  ok: false
  /** O slug que vai para o log. Nunca o corpo cru (`NTF-06`). */
  reason: string
  /** O texto para `order_notifications.error` — recortado a 500 pelo motor, nunca logado. */
  detail: string
  http?: number
}

export type ProviderOutcome = ProviderSuccess | ProviderFailure

export const isProviderFailure = (outcome: ProviderOutcome): outcome is ProviderFailure => outcome.ok === false

/** O que o motor injeta em cada envio: o `fetch` (dublê nos testes) e o tempo que resta. */
export interface ProviderContext {
  fetch: typeof globalThis.fetch
  /** Do `AbortController` do motor — o orçamento compartilhado do caixa (`AD-008`). */
  signal: AbortSignal
}

export interface NotificationProvider {
  channel: NotificationChannel
  send(message: RenderedMessage, ctx: ProviderContext): Promise<ProviderOutcome>
  /** Status HTTP + corpo (a shape varia por provedor) → slug. Nunca retenta (`RSD-02`). */
  classifyFailure(status: number, body: unknown): string
}
