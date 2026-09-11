// Feature 42 — O MOTOR. Substitui `sender.ts`, e a diferença de nome é a diferença de trabalho:
// aquele mandava UM e-mail de UM tipo; este recebe um FATO sobre o pedido, pergunta a `core` que
// eventos ele produz, e entrega cada um em todos os canais registrados e habilitados.
//
// Não sabe o que é HTTP. É chamado pela porta HTTP (`handlers.ts` — backoffice, painel, loja) e
// DIRETO, in-process, pela edge function `mercado-pago` (`AD-005`): um `fetch` entre duas functions
// do mesmo deploy exigiria inventar auth interna e pagaria um segundo cold start no caminho do PIX.
//
// ─── Os três contratos que não se afrouxam ──────────────────────────────────────────────────────
//
// 1. NUNCA LANÇA (`AD-008`). Um throw aqui cairia no catch de `route` da `mercado-pago` e viraria
//    500 no PAGAMENTO — PIX sem QR na tela, ou webhook em erro fazendo o MP retentar para sempre.
//    E-mail que não sai é aceitável; cobrança que falha não é. Todo desfecho volta como `SendResult`.
//
// 2. QUEM CHAMA INFORMA `{ orderId, trigger }` E NADA MAIS (`AD-007`, `AD-032`). Destinatário e
//    conteúdo vêm do banco, lidos com a service role, e o estado do pedido é RELIDO e conferido
//    contra cada evento. É isso que impede tanto relay de spam quanto "pagamento aprovado" de
//    pedido não pago.
//
// 3. O ORÇAMENTO DE TEMPO É COMPARTILHADO. `create-payment` tem 2500 ms para TODAS as notificações
//    daquele gatilho, e a cliente está esperando na tela. O que não couber vira linha `failed:
//    budget_exhausted` — visível no histórico e reenviável —, nunca trabalho em background:
//    `EdgeRuntime.waitUntil` morre no recycle do worker e deixaria linha `pending` órfã.

import {
  type NotificationEvent,
  type NotificationProvider,
  type NotificationSettings,
  type NotificationTrigger,
  type ProviderFailure,
  EVENT_AUDIENCE,
  eventsForTrigger,
  isProviderFailure,
  notificationCopyRefusal,
  preconditionFailure,
  resolveEventSettings,
  variablesRefusal,
} from '../../../packages/core/src/notifications/index.ts'
import { type EmailOrder, isValidFrom } from './render/layout.ts'
import { renderEmail } from './render/email.ts'
import { buildVars } from './render/vars.ts'

/** Recorte do que guardamos em `order_notifications.error` — diagnóstico, sem virar despejo. */
const ERROR_MAX_CHARS = 500

/** Budget padrão de quem não tem ninguém esperando (o webhook do MP). */
const DEFAULT_BUDGET_MS = 8000

/**
 * Abaixo disto não vale começar um envio: o `fetch` sairia só para ser abortado, e o registro diria
 * "falhou no provedor" quando o que faltou foi tempo. Melhor a linha dizer a verdade.
 */
const MIN_SEND_MS = 500

const SETTINGS_KEYS = ['notifications', 'general', 'material']

export interface NotificationEnv {
  resendApiKey: string
  /** `Nome <e@x.com>` ou `e@x.com`. Malformado ⇒ 422 em TODOS os envios, então é validado antes. */
  resendFrom: string
  /** Origem DA LOJA (não do Supabase) — base de `{{link_conta}}` e `{{link_pedido}}`. */
  storePublicUrl: string
  /** Origem do PAINEL — base de `{{link_pedido_admin}}`, só nos e-mails da dona. */
  adminPublicUrl: string
  /**
   * Só dev: substitui o destinatário de E-MAIL e prefixa o assunto com o endereço real.
   * `onboarding@resend.dev` só entrega para o dono da conta Resend (403), então sem isto todo envio
   * local falha e parece integração quebrada. **Vazia em produção** — preenchida, nenhuma cliente
   * recebe.
   */
  resendDevRedirectTo?: string
}

export interface NotificationDeps {
  // Client service-role. `any` pelo mesmo motivo de `mercado-pago/handlers.ts`: o import real vem de
  // esm.sh (Deno) e o dublê implementa só a superfície usada.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
  fetch: typeof globalThis.fetch
  env: NotificationEnv
  /**
   * Os canais que existem NESTE deploy. Um por canal, montados no `index.ts` (que é quem conhece as
   * envs). A feature 43 acrescenta o adaptador da Evolution a esta lista e **não toca em mais nada**
   * deste arquivo — é a prova que `NTF-09` cobra.
   */
  providers: NotificationProvider[]
}

export type SkipReason =
  | 'already_sent'
  | 'disabled'
  | 'no_email'
  | 'no_owner_contact'
  | 'no_opt_in'
  | 'no_phone'
  | 'no_provider'

export type SendResult =
  | { ok: true; event: NotificationEvent; channel: string; id: string }
  | { ok: false; event: NotificationEvent; channel: string | null; notFound: true }
  | { ok: false; event: NotificationEvent; channel: string | null; precondition: string }
  | { ok: false; event: NotificationEvent; channel: string; skipped: SkipReason }
  | { ok: false; event: NotificationEvent; channel: string; reason: string }

/** O que um gatilho produziu — uma entrada por evento × canal tentado. */
export interface DispatchReport {
  trigger: NotificationTrigger
  results: SendResult[]
  /**
   * Distingue "o pedido não existe" de "este gatilho não produz evento neste estado" — os dois dão
   * `results: []`, e só o primeiro é 404 na porta HTTP.
   */
  orderFound: boolean
}

export interface DispatchTriggerOptions {
  orderId: string
  trigger: NotificationTrigger
  budgetMs?: number
}

export interface DispatchEventOptions {
  orderId: string
  event: NotificationEvent
  /** Um canal só (o reenvio explícito do histórico). Ausente ⇒ todos os registrados. */
  channel?: string
  budgetMs?: number
}

/**
 * `whatsapp_opt_in` NÃO entra aqui, e a razão é dura: a coluna só existe a partir da feature 43, e
 * um `select` que nomeia coluna inexistente faz o PostgREST devolver `42703` para a consulta
 * INTEIRA — o pedido viria `null`, o motor registraria `order_not_found` e **nenhuma notificação
 * sairia**, em silêncio, para toda a loja. É o `AD-012` na direção contrária: aqui o tipo não mente,
 * o schema é que ainda não chegou. A `43` acrescenta a coluna na migration dela e o nome nesta
 * lista, no mesmo commit.
 */
const ORDER_COLUMNS = `
  id, order_number, customer_name, customer_email, customer_phone,
  status, payment_status, paid_at, mp_order_id,
  tracking_code, shipping_carrier, material_status, material_tracking_code,
  subtotal, shipping_cost, discount, pix_discount, total,
  address_street, address_number, address_complement, address_neighborhood,
  address_city, address_state, address_zip,
  order_items ( product_name, size, finish, quantity, unit_price )
`

function log(entry: Record<string, unknown>) {
  console.log(JSON.stringify(entry))
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Settings = { notifications?: Partial<NotificationSettings>; general?: any; material?: any }

/**
 * As três chaves numa consulta só. Ler uma por vez seriam três idas ao banco dentro do orçamento do
 * caixa — e as três são pequenas.
 */
async function readSettings(deps: NotificationDeps): Promise<Settings> {
  const { data } = await deps.supabase.from('store_settings').select('key, value').in('key', SETTINGS_KEYS)
  const saida: Settings = {}
  for (const row of (data ?? []) as { key: string; value: unknown }[]) {
    if (row?.key === 'notifications') saida.notifications = row.value as Partial<NotificationSettings>
    if (row?.key === 'general') saida.general = row.value
    if (row?.key === 'material') saida.material = row.value
  }
  return saida
}

/** O endereço do ateliê montado das partes que a dona preenche em `/admin/configuracoes`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function atelieAddress(material: any): string {
  if (!material) return ''
  const rua = [material.street, material.number].filter(Boolean).join(', ')
  const cidade = [material.city, material.state].filter(Boolean).join(' - ')
  return [material.recipient, rua, material.complement, material.neighborhood, cidade, material.zip]
    .map((p: unknown) => String(p ?? '').trim())
    .filter((p) => p !== '')
    .join('\n')
}

/**
 * Para quem vai, por canal. `null` ⇒ não há destinatário, e o motivo distingue o caso: a cliente sem
 * e-mail é dado faltando no pedido; a dona sem e-mail é configuração faltando na loja.
 */
function recipientFor(
  event: NotificationEvent,
  channel: string,
  order: EmailOrder & { customer_email?: string | null },
  settings: Settings,
): { to: string } | { skipped: SkipReason } {
  if (channel !== 'email') return { skipped: 'no_provider' }

  if (EVENT_AUDIENCE[event] === 'owner') {
    const to = String(settings.general?.email ?? '').trim()
    return to === '' ? { skipped: 'no_owner_contact' } : { to }
  }

  const to = String(order.customer_email ?? '').trim()
  return to === '' ? { skipped: 'no_email' } : { to }
}

/**
 * A régua de tom aplicada NA HORA DE ENVIAR, e não só ao salvar (`PNL-04`).
 *
 * O painel recusa antes de gravar, mas a linha do banco pode ter vindo de outro caminho — um
 * `update` direto no Studio, uma migration futura, um bug. Um texto que a régua proíbe não sai:
 * vira linha `failed` com o motivo, e a dona vê no histórico do pedido.
 */
function copyRefusal(event: NotificationEvent, fields: { subject: string; heading: string; lead: string; extra: string[]; cta_label: string }): string | null {
  const textos = [fields.subject, fields.heading, fields.lead, ...(fields.extra ?? []), fields.cta_label]
  for (const texto of textos) {
    const variavel = variablesRefusal(texto)
    if (variavel) return `unknown_variable`
    const tom = notificationCopyRefusal(texto, { event, channel: 'email' })
    if (tom) return `copy_refused`
  }
  return null
}

async function finish(
  deps: NotificationDeps,
  claimId: string,
  messageId: string | null,
  error: string | null,
): Promise<void> {
  const { error: rpcError } = await deps.supabase.rpc('finish_order_notification', {
    p_id: claimId,
    p_provider_message_id: messageId,
    p_error: error === null ? null : error.slice(0, ERROR_MAX_CHARS),
  })
  if (rpcError) {
    log({ action: 'send-notification', status: 'finish_failed', message: String(rpcError.message ?? rpcError) })
  }
}

/**
 * Um evento, em um canal. Já com o pedido e as configurações lidos — quem chama fez isso uma vez
 * para todos os eventos do gatilho, e não uma vez por evento.
 */
async function deliver(
  deps: NotificationDeps,
  provider: NotificationProvider,
  event: NotificationEvent,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: any,
  settings: Settings,
  deadline: number,
): Promise<SendResult> {
  const channel = provider.channel
  const base = { action: 'send-notification', order_id: order.id, event, channel }

  const bloco = resolveEventSettings(settings.notifications, event, 'email')
  if (!bloco.enabled) {
    log({ ...base, status: 'skipped', skipped: 'disabled' })
    return { ok: false, event, channel, skipped: 'disabled' }
  }

  const destino = recipientFor(event, channel, order, settings)
  if ('skipped' in destino) {
    log({ ...base, status: 'skipped', skipped: destino.skipped })
    return { ok: false, event, channel, skipped: destino.skipped }
  }

  // Reivindicação ATÔMICA antes do envio. `null` ⇒ já foi enviado; ver a migration para o porquê de
  // isto não poder ser um upsert no client (`AD-006`).
  const { data: claimId, error: claimError } = await deps.supabase.rpc('claim_order_notification', {
    p_order_id: order.id,
    p_event: event,
    p_channel: channel,
  })

  if (claimError) {
    log({ ...base, status: 'claim_failed', message: String(claimError.message ?? claimError) })
    return { ok: false, event, channel, reason: 'claim_failed' }
  }
  if (!claimId) {
    log({ ...base, status: 'already_sent' })
    return { ok: false, event, channel, skipped: 'already_sent' }
  }

  // O tempo é conferido DEPOIS do claim, de propósito: a linha existe, aparece no histórico e a
  // dona pode reenviar. Sem ela, o que não coube seria invisível.
  const restante = deadline - Date.now()
  if (restante < MIN_SEND_MS) {
    await finish(deps, claimId, null, `budget_exhausted: restavam ${restante}ms`)
    log({ ...base, status: 'budget_exhausted', remaining_ms: restante })
    return { ok: false, event, channel, reason: 'budget_exhausted' }
  }

  const recusa = copyRefusal(event, bloco.fields)
  if (recusa) {
    await finish(deps, claimId, null, `${recusa}: o texto gravado viola a régua de ${event}`)
    log({ ...base, status: recusa })
    return { ok: false, event, channel, reason: recusa }
  }

  const vars = buildVars(event, order as EmailOrder, {
    storeUrl: deps.env.storePublicUrl,
    adminUrl: deps.env.adminPublicUrl,
    whatsapp: settings.general?.whatsapp,
    enderecoAtelie: atelieAddress(settings.material),
  })
  const rendered = renderEmail(event, order as EmailOrder, bloco.fields, vars)

  const redirect = deps.env.resendDevRedirectTo?.trim()
  const to = redirect ? redirect : destino.to
  const subject = redirect ? `[dev → ${destino.to}] ${rendered.subject}` : rendered.subject

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), restante)
  let outcome
  try {
    outcome = await provider.send(
      { channel: 'email', to, subject, html: rendered.html, text: rendered.text, idempotencyKey: `notification:${order.id}:${event}:${channel}` },
      { fetch: deps.fetch, signal: controller.signal },
    )
  } finally {
    clearTimeout(timer)
  }

  if (isProviderFailure(outcome)) {
    const falha = outcome as ProviderFailure
    await finish(deps, claimId, null, falha.detail)
    // Nunca o corpo cru: a mensagem do 403 do Resend ecoa o endereço do destinatário.
    log({ ...base, status: falha.reason, ...(falha.http ? { http: falha.http } : {}) })
    return { ok: false, event, channel, reason: falha.reason }
  }

  await finish(deps, claimId, outcome.id, null)
  log({ ...base, status: 'sent', provider_message_id: outcome.id })
  return { ok: true, event, channel, id: outcome.id }
}

/**
 * Um evento, em todos os canais registrados (ou num só, no reenvio explícito).
 *
 * É a porta do REENVIO — quem chama nomeia a mensagem que quer repetir. O disparo normal é por
 * gatilho (`dispatchTrigger`), e a diferença é deliberada: repetir é dizer qual mensagem; disparar
 * é dizer o que aconteceu.
 */
export async function dispatchEvent(
  deps: NotificationDeps,
  options: DispatchEventOptions,
): Promise<SendResult[]> {
  return (await dispatchEventFull(deps, options)).results
}

/** Igual, mas dizendo se o pedido existe — é o que a porta HTTP precisa para responder 404. */
export async function dispatchEventFull(
  deps: NotificationDeps,
  options: DispatchEventOptions,
): Promise<{ found: boolean; results: SendResult[] }> {
  const budget = options.budgetMs ?? DEFAULT_BUDGET_MS
  return await run(deps, options.orderId, budget, (order, settings, deadline) =>
    forEvent(deps, options.event, order, settings, deadline, options.channel),
  ).catch(() => ({
    found: false,
    results: [{ ok: false, event: options.event, channel: null, precondition: 'unexpected_error' } as SendResult],
  }))
}

/**
 * Um gatilho: `core` decide quais eventos ele produz (`AD-032`), e cada um sai na ordem — cliente
 * antes da dona. Se o orçamento acabar no meio, quem espera é o aviso interno.
 */
export async function dispatchTrigger(
  deps: NotificationDeps,
  options: DispatchTriggerOptions,
): Promise<DispatchReport> {
  const budget = options.budgetMs ?? DEFAULT_BUDGET_MS
  const { found, results } = await run(deps, options.orderId, budget, async (order, settings, deadline) => {
    const saida: SendResult[] = []
    for (const event of eventsForTrigger(options.trigger, order)) {
      saida.push(...(await forEvent(deps, event, order, settings, deadline)))
    }
    return saida
  }).catch(() => ({ found: false, results: [] as SendResult[] }))

  return { trigger: options.trigger, results, orderFound: found }
}

/** A leitura comum: pedido + configurações, uma vez por chamada. */
async function run(
  deps: NotificationDeps,
  orderId: string,
  budgetMs: number,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  body: (order: any, settings: Settings, deadline: number) => Promise<SendResult[]>,
): Promise<{ found: boolean; results: SendResult[] }> {
  const deadline = Date.now() + budgetMs

  try {
    const { data: order } = await deps.supabase.from('orders').select(ORDER_COLUMNS).eq('id', orderId).maybeSingle()
    if (!order) {
      log({ action: 'send-notification', order_id: orderId, status: 'order_not_found' })
      return { found: false, results: [] }
    }

    const settings = await readSettings(deps)
    return { found: true, results: await body(order, settings, deadline) }
  } catch (err) {
    // Rede de segurança do contrato "nunca lança". Se caiu aqui, é bug nosso — registra e devolve.
    log({
      action: 'send-notification',
      order_id: orderId,
      status: 'unexpected_error',
      message: err instanceof Error ? err.message : String(err),
    })
    return { found: false, results: [] }
  }
}

/** Um evento em todos os canais (ou num só), com a pré-condição conferida uma vez. */
async function forEvent(
  deps: NotificationDeps,
  event: NotificationEvent,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  order: any,
  settings: Settings,
  deadline: number,
  channel?: string,
): Promise<SendResult[]> {
  const base = { action: 'send-notification', order_id: order.id, event }

  // CFG-03 antes de tudo: `from` malformado é 422 em todo e-mail, ou seja apagão silencioso.
  if (!isValidFrom(deps.env.resendFrom)) {
    log({ ...base, status: 'invalid_from' })
    return [{ ok: false, event, channel: 'email', reason: 'invalid_from' }]
  }

  const falha = preconditionFailure(event, order, { ownerEmail: settings.general?.email })
  if (falha) {
    // Sai ANTES do claim, de propósito: a tentativa segue retentável quando o estado completar. É o
    // que faz o par "marcar enviado" + "salvar rastreio" funcionar em qualquer ordem (TRG-12).
    log({ ...base, status: 'precondition_failed', precondition: falha })
    return [{ ok: false, event, channel: null, precondition: falha }]
  }

  const canais = deps.providers.filter((p) => channel === undefined || p.channel === channel)
  if (canais.length === 0) {
    log({ ...base, status: 'skipped', skipped: 'no_provider' })
    return [{ ok: false, event, channel: channel ?? 'email', skipped: 'no_provider' }]
  }

  const saida: SendResult[] = []
  for (const provider of canais) saida.push(await deliver(deps, provider, event, order, settings, deadline))
  return saida
}
