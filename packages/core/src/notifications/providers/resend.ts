// Feature 42 — o adaptador do Resend: `postToResend` + `classifyResendFailure`, que viviam em
// `send-email/sender.ts`, atrás da interface `NotificationProvider`.
//
// Só o canal e-mail. O `from`, a chave e o endpoint entram na criação (`createResendProvider(env)`);
// o `fetch` e o `signal` entram por envio, porque são do motor — o dublê nos testes e o orçamento de
// tempo do caixa.

import type { NotificationProvider, ProviderContext, ProviderOutcome, RenderedMessage } from './types.ts'

export const RESEND_ENDPOINT = 'https://api.resend.com/emails'

export interface ResendEnv {
  apiKey: string
  /** `Nome <e@x.com>` ou `e@x.com`. Validado pelo motor ANTES de qualquer envio (`CFG-03`). */
  from: string
}

/**
 * RSD-01: cada desfecho do provedor tem seu slug, para o log dizer O QUE aconteceu em vez de
 * "falhou". Nenhum deles retenta dentro da requisição (RSD-02).
 *
 * A shape do JSON de erro do Resend foi MEDIDA na T4 desta feature: `{ statusCode, name, message }`
 * — e `message` ecoa dado da requisição (o domínio, o destinatário). `name` é lido defensivamente e
 * pode vir nulo. O 403 é o que se bate em dev: chave sem domínio verificado só entrega para o dono
 * da conta.
 */
export function classifyResendFailure(status: number, body: unknown): string {
  const name = nameOf(body)
  if (status === 401) return 'resend_unauthorized'
  if (status === 403) return 'resend_forbidden'
  if (status === 409) return 'resend_duplicate'
  if (status === 429) {
    return name === 'daily_quota_exceeded' || name === 'monthly_quota_exceeded'
      ? 'resend_quota_exceeded'
      : 'resend_rate_limited'
  }
  // 400 (`validation_error`, `invalid_idempotency_key`) e 422 (`invalid_from_address`) são a mesma
  // classe: pedido malformado. Retentar um payload inválido é laço infinito.
  if (status === 400 || status === 422) return 'resend_invalid'
  if (status >= 500) return 'resend_unavailable'
  return 'resend_failed'
}

const nameOf = (body: unknown): string | null =>
  body !== null && typeof body === 'object' && typeof (body as { name?: unknown }).name === 'string'
    ? (body as { name: string }).name
    : null

export function createResendProvider(env: ResendEnv): NotificationProvider {
  return {
    channel: 'email',
    classifyFailure: classifyResendFailure,

    async send(message: RenderedMessage, ctx: ProviderContext): Promise<ProviderOutcome> {
      let res: Response
      try {
        res = await ctx.fetch(RESEND_ENDPOINT, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.apiKey}`,
            'Content-Type': 'application/json',
            // Terceira camada de dedupe, de graça: o Resend replica a resposta original por 24h.
            'Idempotency-Key': message.idempotencyKey,
          },
          body: JSON.stringify({
            from: env.from,
            to: message.to,
            subject: message.subject ?? '',
            html: message.html ?? '',
            text: message.text,
          }),
          signal: ctx.signal,
        })
      } catch (err) {
        // O `signal` é do motor: abortado ⇒ o orçamento do caixa acabou, não a rede caiu.
        const aborted = ctx.signal.aborted
        return {
          ok: false,
          reason: aborted ? 'resend_timeout' : 'resend_unavailable',
          detail: aborted ? 'timeout: o orçamento de tempo acabou antes da resposta' : messageOf(err),
        }
      }

      const body = (await res.json().catch(() => null)) as { id?: unknown; name?: unknown; message?: unknown } | null

      // Qualquer 2xx é sucesso: medido na T4, o Resend responde 200 — mas a documentação não fixa o
      // status, e comparar com 200 quebraria em silêncio se ele passasse a responder 201.
      if (res.ok) {
        const id = typeof body?.id === 'string' ? body.id : ''
        if (id === '') return { ok: false, reason: 'resend_no_id', detail: '2xx sem `id` no corpo', http: res.status }
        return { ok: true, id }
      }

      const name = nameOf(body)
      const texto = typeof body?.message === 'string' ? body.message : 'sem corpo'
      return {
        ok: false,
        reason: classifyResendFailure(res.status, body),
        detail: `${res.status} ${name ?? 'sem name'}: ${texto}`,
        http: res.status,
      }
    },
  }
}

const messageOf = (err: unknown): string => (err instanceof Error ? err.message : String(err))
