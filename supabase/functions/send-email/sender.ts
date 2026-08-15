// Motor de envio. Não sabe o que é HTTP — é chamado tanto pela porta HTTP (`handlers.ts`, usada pelo
// backoffice) quanto DIRETO, in-process, pela edge function `mercado-pago` (AD-005).
//
// Contrato duro: NUNCA LANÇA. Um throw aqui cairia no catch de `route` da `mercado-pago`
// (`handlers.ts:725-728`) e viraria 500 no PAGAMENTO — e-mail que não sai é aceitável, cobrança que
// falha não é. Todo desfecho volta como `SendResult`.
//
// Contrato de segurança: quem chama informa `{ orderId, type }` e NADA MAIS. Destinatário e conteúdo
// vêm do banco, lidos com a service role, e o estado do pedido é RELIDO e conferido contra o tipo.
// É isso que impede tanto relay de spam quanto "pagamento aprovado" de pedido não pago.

import { type EmailOrder, isValidFrom } from './layout.ts'
import { type EmailType, renderEmail } from './templates.ts'

const RESEND_ENDPOINT = 'https://api.resend.com/emails'

/** Budget padrão. Quem chama do caminho do cliente passa menos (ver TRG-07). */
const DEFAULT_TIMEOUT_MS = 8000

/** Recorte do que guardamos em `order_emails.error` — diagnóstico, sem virar despejo. */
const ERROR_MAX_CHARS = 500

export interface EmailEnv {
  resendApiKey: string
  /** `Nome <e@x.com>` ou `e@x.com`. Malformado ⇒ 422 em TODOS os envios, então é validado antes. */
  resendFrom: string
  /** Origem DA LOJA (não do Supabase) — base do link `/conta`. */
  storePublicUrl: string
  /**
   * Só dev: substitui o destinatário e prefixa o assunto com o endereço real.
   * `onboarding@resend.dev` só entrega para o dono da conta Resend (403), então sem isto todo envio
   * local falha e parece integração quebrada.
   */
  resendDevRedirectTo?: string
}

export interface EmailDeps {
  // Client service-role. `any` pelo mesmo motivo de `mercado-pago/handlers.ts`: o import real vem de
  // esm.sh (Deno) e o dublê implementa só a superfície usada.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
  fetch: typeof globalThis.fetch
  env: EmailEnv
}

export type SendResult =
  | { ok: true; id: string }
  | { ok: false; notFound: true }
  | { ok: false; precondition: string }
  | { ok: false; skipped: 'already_sent' }
  | { ok: false; reason: string }

export interface SendOptions {
  orderId: string
  type: EmailType
  timeoutMs?: number
}

const ORDER_COLUMNS = `
  id, order_number, customer_name, customer_email,
  status, payment_status, paid_at, mp_order_id,
  tracking_code, shipping_carrier, material_status,
  subtotal, shipping_cost, discount, pix_discount, total,
  address_street, address_number, address_complement, address_neighborhood,
  address_city, address_state, address_zip,
  order_items ( product_name, size, finish, quantity, unit_price )
`

function log(entry: Record<string, unknown>) {
  console.log(JSON.stringify(entry))
}

/**
 * EML-09: o pedido tem de ESTAR no estado que o e-mail afirma. Sem isto, um bug em qualquer chamador
 * manda "pagamento aprovado" para quem não pagou — pior que spam, é a loja mentindo para a cliente.
 *
 * `order_paid` olha `paid_at`, NÃO `status = 'paid'`: a RPC `apply_payment_approval` escreve
 * `payment_status`/`paid_at` e nunca toca `orders.status`, então um pedido aprovado segue com
 * `status = 'pending'` e a pré-condição óbvia faria o e-mail nunca sair.
 */
export function preconditionFailure(type: EmailType, order: Record<string, unknown>): string | null {
  switch (type) {
    case 'order_received':
      if (order.payment_status !== 'pending') return 'order_not_pending'
      if (!order.mp_order_id) return 'no_mp_order'
      return null
    case 'order_paid':
      if (!order.paid_at) return 'order_not_paid'
      return null
    case 'order_shipped':
      if (order.status !== 'shipped') return 'order_not_shipped'
      if (String(order.tracking_code ?? '').trim() === '') return 'no_tracking_code'
      return null
    // MAT-09. Aqui a pré-condição vale ainda mais do que nas outras: um bug de chamador faria a loja
    // dizer "recebemos suas cinzas" para quem ainda não postou nada. `material_status` é escrito
    // SOMENTE pela RPC guardada `set_material_status`, então este é o estado de verdade — não há um
    // segundo caminho por onde ele possa ter sido gravado errado.
    case 'material_received':
      if (order.material_status !== 'material_recebido') return 'material_not_received'
      return null
  }
}

/**
 * RSD-01: cada desfecho do provedor tem seu slug, para o log dizer O QUE aconteceu em vez de
 * "falhou". Nenhum deles retenta dentro da requisição (RSD-02).
 *
 * A shape do JSON de erro do Resend NÃO é documentada — `name` é lido defensivamente e pode vir
 * nulo. O 403 é o que se bate em dev: chave sem domínio verificado só entrega para o dono da conta.
 */
export function classifyResendFailure(status: number, name: string | null): string {
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

// ---------------------------------------------------------------------------------------
// ROTEIRO MANUAL — API do Resend (T11 da feature 10; registrar o medido em validation.md)
//
// Duas coisas foram declaradas como ASSUMPTION na spec porque a documentação do Resend não as
// traz, e este roteiro existe para fechá-las com valor medido, não com suposição:
//   (A) o CÓDIGO HTTP do sucesso — a página do endpoint mostra o corpo `{ "id": "…" }` mas
//       omite o status. O código aceita qualquer 2xx justamente por isso; medir confirma.
//   (B) a SHAPE do JSON de erro — a página de erros lista status + `name` + mensagem, mas não
//       a estrutura. `classifyResendFailure` lê `name` defensivamente e tolera ausência.
//
// Pré-requisitos:
//   .env da raiz com RESEND_API_KEY (a MESMA do SMTP do auth) e, em dev,
//   RESEND_DEV_REDIRECT_TO = o e-mail dono da conta Resend.
//   supabase stop && supabase start   (secrets novos + arquivos importados novos)
//   Hospedado: supabase secrets set RESEND_API_KEY=... RESEND_FROM=... STORE_PUBLIC_URL=...
//
//   ⚠️ LOCAL: o CLI monta um bind mount POR ARQUIVO importado, calculado na subida do
//   container. Esta function e os arquivos que ela importa (layout.ts, templates.ts e
//   packages/core/src/formatters/price.ts) são novos — sem o restart o worker responde 503
//   "Module not found". Provado no probe de boot: 401 em `?action=send`, 400 em action inválida.
//
//   ⚠️ `onboarding@resend.dev` só entrega para o e-mail DONO da conta Resend. Qualquer outro
//   destinatário volta 403 `validation_error`. É por isso que RESEND_DEV_REDIRECT_TO existe.
//
// CONFERÊNCIA — pela API, que é evidência melhor que o painel:
//   KEY=$(grep '^RESEND_API_KEY=' .env | cut -d= -f2-)
//
//   1) SUCESSO — fecha a assumption (A). Reparar no `-w '%{http_code}'`, é o ponto do teste.
//      curl -s -o /tmp/r.json -w '%{http_code}\n' -X POST https://api.resend.com/emails \
//        -H "Authorization: Bearer $KEY" -H 'Content-Type: application/json' \
//        -H 'Idempotency-Key: roteiro-manual-1' \
//        -d '{"from":"Uma Estrelinha <onboarding@resend.dev>","to":"<dono-da-conta>","subject":"probe","text":"probe"}'
//      Anotar: o status devolvido (200? 201?) e o corpo (`{"id":"..."}`).
//
//   2) ERRO 403 DE SANDBOX — fecha a assumption (B) e confirma o texto que NÃO pode ir para o log.
//      Mesmo curl, mas com `"to":"alguem@que-nao-e-a-conta.com"`.
//      Esperado: 403. Anotar a shape exata do JSON (tem `statusCode`? `name`? `message`?) e
//      confirmar que a mensagem ECOA o endereço do destinatário — é a razão de `sender.ts`
//      logar só o slug e guardar o texto em `order_emails.error`, nunca no log.
//
//   3) IDEMPOTENCY-KEY HONRADO — repetir o curl (1) com a MESMA chave e o MESMO corpo.
//      Esperado: mesmo `id` de volta, sem segundo e-mail entregue (janela de 24h).
//      Repetir com a mesma chave e corpo DIFERENTE → esperado 409 `invalid_idempotent_request`.
//
//   4) PONTA A PONTA, PIX (TRG-08)
//      · checkout → PIX → CTA.
//      · Esperado: e-mail "Pedido NP-… recebido — aguardando o PIX" na caixa do redirect, com
//        assunto prefixado `[dev → <e-mail real>]`.
//      · `select type, status, provider_message_id, attempts from order_emails where order_id='…';`
//        Esperado: uma linha `order_received` / `sent` / id do provedor / attempts=1.
//      · Reemitir o PIX no MESMO pedido → NENHUM e-mail novo, e ainda UMA linha (TRG-10).
//
//   5) PONTA A PONTA, APROVAÇÃO (TRG-01)
//      · pagar o PIX no sandbox → webhook.
//      · Esperado: e-mail "Pagamento aprovado". Reentregar o mesmo webhook → nenhum e-mail novo.
//
//   6) O PAR DO ENVIADO, NAS DUAS ORDENS (TRG-12) — o ponto é que a ordem não importa.
//      · Pedido A: marcar `shipped` (sem código) → nenhum e-mail + dica inline no dialog.
//        Depois salvar o rastreio → e-mail sai, toast "Rastreio salvo e cliente avisado".
//      · Pedido B: salvar o rastreio ANTES → nenhum e-mail. Depois marcar `shipped` → e-mail sai.
//
//   7) RENDERIZAÇÃO — nenhum teste prova isto, só o olho:
//      Gmail no celular e Outlook web. Conferir que o card de 560px não estoura, que o CTA tem
//      alvo de toque confortável, e que a ausência de webfont não quebrou a hierarquia.
//
//   8) CTA DESLOGADA (o motivo de o link ir para /conta, não /pedido/:id)
//      Abrir o e-mail numa janela anônima e clicar. Esperado: `/conta` com o overlay de login —
//      nunca "Pedido não encontrado".
// ---------------------------------------------------------------------------------------
export async function sendOrderEmail(deps: EmailDeps, options: SendOptions): Promise<SendResult> {
  const { orderId, type } = options
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
  const base = { action: 'send-email', order_id: orderId, type }

  try {
    // CFG-03 antes de tudo: `from` malformado é 422 em todo e-mail, ou seja apagão silencioso.
    if (!isValidFrom(deps.env.resendFrom)) {
      log({ ...base, status: 'invalid_from' })
      return { ok: false, reason: 'invalid_from' }
    }

    const { data: order } = await deps.supabase
      .from('orders')
      .select(ORDER_COLUMNS)
      .eq('id', orderId)
      .maybeSingle()

    if (!order) {
      log({ ...base, status: 'order_not_found' })
      return { ok: false, notFound: true }
    }

    const failure = preconditionFailure(type, order)
    if (failure) {
      // Sai ANTES do claim, de propósito: a tentativa segue retentável quando o estado completar.
      // É o que faz o par "marcar enviado" + "salvar rastreio" funcionar em qualquer ordem (TRG-12).
      log({ ...base, status: 'precondition_failed', precondition: failure })
      return { ok: false, precondition: failure }
    }

    // Reivindicação ATÔMICA antes do envio. `null` ⇒ já foi enviado; ver a migration para o porquê
    // de isto não poder ser um upsert no client.
    const { data: claimId, error: claimError } = await deps.supabase.rpc('claim_order_email', {
      p_order_id: orderId,
      p_type: type,
    })

    if (claimError) {
      log({ ...base, status: 'claim_failed', message: String(claimError.message ?? claimError) })
      return { ok: false, reason: 'claim_failed' }
    }
    if (!claimId) {
      log({ ...base, status: 'already_sent' })
      return { ok: false, skipped: 'already_sent' }
    }

    const rendered = renderEmail(type, order as EmailOrder, deps.env.storePublicUrl)

    const realRecipient = String(order.customer_email)
    const redirect = deps.env.resendDevRedirectTo?.trim()
    const recipient = redirect ? redirect : realRecipient
    const subject = redirect ? `[dev → ${realRecipient}] ${rendered.subject}` : rendered.subject

    const outcome = await postToResend(
      deps,
      {
        from: deps.env.resendFrom,
        to: recipient,
        subject,
        html: rendered.html,
        text: rendered.text,
      },
      `order-email:${orderId}:${type}`,
      timeoutMs,
    )

    if (!outcome.ok) {
      await finish(deps, claimId, null, outcome.detail)
      // Nunca o corpo cru: a mensagem do 403 do Resend ecoa o endereço do destinatário.
      log({ ...base, status: outcome.reason, ...(outcome.http ? { http: outcome.http } : {}) })
      return { ok: false, reason: outcome.reason }
    }

    await finish(deps, claimId, outcome.id, null)
    log({ ...base, status: 'sent', provider_message_id: outcome.id })
    return { ok: true, id: outcome.id }
  } catch (err) {
    // Rede de segurança do contrato "nunca lança". Se caiu aqui, é bug nosso — registra e devolve.
    log({ ...base, status: 'unexpected_error', message: err instanceof Error ? err.message : String(err) })
    return { ok: false, reason: 'unexpected_error' }
  }
}

async function finish(deps: EmailDeps, claimId: string, messageId: string | null, error: string | null) {
  const { error: rpcError } = await deps.supabase.rpc('finish_order_email', {
    p_id: claimId,
    p_provider_message_id: messageId,
    p_error: error === null ? null : error.slice(0, ERROR_MAX_CHARS),
  })
  if (rpcError) {
    log({ action: 'send-email', status: 'finish_failed', message: String(rpcError.message ?? rpcError) })
  }
}

type PostOutcome =
  | { ok: true; id: string }
  | { ok: false; reason: string; detail: string; http?: number }

/**
 * TRG-07: `await` limitado por `AbortController` explícito — não `AbortSignal.timeout()`, pelo mesmo
 * motivo já registrado em `useCreatePayment.ts` (fake timers controlam o primeiro, não o segundo), e
 * não trabalho em background: `EdgeRuntime.waitUntil` morre no recycle do worker (`per_worker`) e
 * deixaria linha `pending` órfã, além de não ter precedente algum no repo.
 */
async function postToResend(
  deps: EmailDeps,
  payload: Record<string, unknown>,
  idempotencyKey: string,
  timeoutMs: number,
): Promise<PostOutcome> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  let res: Response
  try {
    res = await deps.fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${deps.env.resendApiKey}`,
        'Content-Type': 'application/json',
        // Terceira camada de dedupe, de graça: o Resend replica a resposta original por 24h.
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
  } catch (err) {
    const aborted = controller.signal.aborted
    return {
      ok: false,
      reason: aborted ? 'resend_timeout' : 'resend_unavailable',
      detail: aborted ? `timeout após ${timeoutMs}ms` : String(err instanceof Error ? err.message : err),
    }
  } finally {
    clearTimeout(timer)
  }

  const body = (await res.json().catch(() => null)) as { id?: string; name?: string; message?: string } | null

  // Qualquer 2xx é sucesso: a página do endpoint mostra o corpo `{ id }` mas NÃO documenta o status,
  // então comparar com 200 é aposta que quebra em silêncio se a API responder 201.
  if (res.ok) {
    const id = typeof body?.id === 'string' ? body.id : ''
    if (id === '') {
      return { ok: false, reason: 'resend_no_id', detail: '2xx sem `id` no corpo', http: res.status }
    }
    return { ok: true, id }
  }

  const name = typeof body?.name === 'string' ? body.name : null
  return {
    ok: false,
    reason: classifyResendFailure(res.status, name),
    detail: `${res.status} ${name ?? 'sem name'}: ${body?.message ?? 'sem corpo'}`,
    http: res.status,
  }
}
