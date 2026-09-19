// As portas HTTP da `send-notification`. Cinco, e cada uma existe por um chamador diferente:
//
//   ?action=trigger  · backoffice (admin) — "isto aconteceu com o pedido"
//   ?action=send     · backoffice (admin) — "repita ESTA mensagem" (o reenvio do histórico)
//   ?action=notify   · LOJA (dona do pedido) — o único fato que a cliente produz: o rastreio do
//                      material que ela postou
//   ?action=preview  · painel (admin) — renderiza um rascunho NÃO salvo, sem tocar em nada
//   ?action=config-check · SENSOR externo (feature `52`) — "com o que esta produção está
//                      configurada para enviar". É a ÚNICA porta sem autorização, e a razão está
//                      escrita em `configCheck`: nenhum campo dela é segredo.
//
// A `mercado-pago` NÃO passa por aqui — ela importa `dispatch.ts` direto, no mesmo processo
// (`AD-005`). Um hop HTTP entre duas functions do mesmo deploy exigiria inventar auth interna
// (comparar bearer com a service-role key — credencial de acesso TOTAL ao banco usada como bearer do
// privilégio mais fraco do sistema) e pagaria um segundo cold start no caminho do PIX.
//
// `verify_jwt = false` no config.toml com autorização MANUAL aqui: `verify_jwt = true` seria teatro
// de segurança, porque a anon key pública É um JWT válido do projeto e passaria pelo gateway. O que
// importa é o papel — e papel só se checa dentro do handler.

import {
  type NotificationEvent,
  CUSTOMER_TRIGGERS,
  isNotificationEvent,
  isNotificationTrigger,
  limitsRefusal,
  notificationCopyRefusal,
  resolveEventSettings,
  variablesRefusal,
} from '../../../packages/core/src/notifications/index.ts'
import { type NotificationDeps, dispatchEventFull, dispatchTrigger } from './dispatch.ts'
import { type EmailOrder, isValidFrom } from './render/layout.ts'
import { renderEmail } from './render/email.ts'
import { buildVars } from './render/vars.ts'
import { SAMPLE_ORDER } from './render/sample.ts'

export type Deps = NotificationDeps

// Feature `49`: dono único em `_shared/http.ts`. Reexportados para não quebrar import existente.
export { corsHeaders, json } from '../_shared/http.ts'
import { corsHeaders, json } from '../_shared/http.ts'

function log(entry: Record<string, unknown>) {
  console.log(JSON.stringify(entry))
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type AuthOutcome = { ok: true; userId: string } | { ok: false; status: number; error: string }

/**
 * EML-03/EML-04. Três casos fecham o acesso do navegador da loja:
 *  - sem header            → 401
 *  - anon key como bearer  → é JWT válido do projeto mas NÃO tem `sub`, então `getUser` erra → 401
 *  - cliente logado        → `getUser` passa, `has_role` é falso → 403
 *
 * A checagem de papel usa o client SERVICE-ROLE e a função canônica `has_role`, a mesma que toda
 * policy de admin do schema usa — não uma leitura própria de `user_roles`, para não criar uma segunda
 * definição de "admin". Falha da RPC fecha o acesso (403) e loga distinto, para não virar mistério.
 */
async function requireAdmin(deps: Deps, req: Request): Promise<AuthOutcome> {
  const user = await currentUser(deps, req)
  if (!user) return { ok: false, status: 401, error: 'Não autenticado' }

  const { data: isAdmin, error: roleError } = await deps.supabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'admin',
  })
  if (roleError) {
    log({ action: 'send-notification', status: 'admin_check_failed', message: String(roleError.message ?? roleError) })
    return { ok: false, status: 403, error: 'Acesso restrito ao admin' }
  }
  if (isAdmin !== true) return { ok: false, status: 403, error: 'Acesso restrito ao admin' }

  return { ok: true, userId: user.id }
}

async function currentUser(deps: Deps, req: Request): Promise<{ id: string } | null> {
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (jwt === '') return null

  const { data, error } = await deps.supabase.auth.getUser(jwt)
  const user = data?.user
  if (error || !user?.id) return null
  return { id: user.id }
}

/**
 * A porta da CLIENTE. Autoriza pelo MESMO predicado da RPC `set_material_tracking`: o pedido é dela
 * se `customer_id` aponta para a linha de `customers` do usuário logado.
 *
 * "Não é seu" e "não existe" respondem **igual** (404), de propósito e pelo mesmo motivo da RPC:
 * distinguir os dois entregaria a existência de pedidos alheios a quem tentasse ids ao acaso.
 */
async function requireOrderOwner(deps: Deps, req: Request, orderId: string): Promise<AuthOutcome> {
  const user = await currentUser(deps, req)
  if (!user) return { ok: false, status: 401, error: 'Não autenticado' }

  const { data: customer } = await deps.supabase
    .from('customers')
    .select('id')
    .eq('user_id', user.id)
    .maybeSingle()

  if (!customer?.id) return { ok: false, status: 404, error: 'Pedido não encontrado' }

  const { data: order } = await deps.supabase
    .from('orders')
    .select('id, customer_id')
    .eq('id', orderId)
    .maybeSingle()

  if (!order || order.customer_id !== customer.id) {
    return { ok: false, status: 404, error: 'Pedido não encontrado' }
  }

  return { ok: true, userId: user.id }
}

function orderIdOf(body: any): string | null {
  const id = body?.order_id
  return typeof id === 'string' && UUID_RE.test(id) ? id : null
}

// ACTION: send — repete UMA mensagem de UM pedido (o reenvio do histórico).
// O corpo aceita `{ order_id, event, channel? }`. `to`, `subject`, `html` e `from` mandados pelo
// chamador são ignorados: o destinatário vem do banco, lido com a service role (EML-01).
export async function send(deps: Deps, req: Request, body: any): Promise<Response> {
  const auth = await requireAdmin(deps, req)
  if (!auth.ok) return json({ error: auth.error }, auth.status)

  // `type` continua aceito ao lado de `event`: durante a janela de deploy o bundle antigo do painel
  // ainda manda o nome velho, e recusá-lo faria o reenvio parar de funcionar por alguns minutos.
  const event = body?.event ?? body?.type
  if (!isNotificationEvent(event)) {
    return json({ error: `event inválido: ${String(event)}` }, 400)
  }

  const orderId = orderIdOf(body)
  if (!orderId) return json({ error: 'order_id ausente ou não é um uuid' }, 400)

  const channel = typeof body?.channel === 'string' ? body.channel : undefined
  const { found, results } = await dispatchEventFull(deps, { orderId, event, channel })

  if (!found) return json({ error: 'Pedido não encontrado' }, 404)

  const primeiro = results[0]
  if (!primeiro) return json({ sent: false, results: [] })

  if ('precondition' in primeiro) {
    // 422 e não 400: o pedido existe e a requisição é bem-formada — o ESTADO é que ainda não
    // permite. O backoffice trata isso como esperado (o par status+rastreio completa em duas ações).
    return json({ error: `Pedido não está no estado exigido (${primeiro.precondition})`, results }, 422)
  }
  if (primeiro.ok) return json({ sent: true, id: primeiro.id, results })
  if ('skipped' in primeiro) return json({ sent: false, skipped: primeiro.skipped, results })

  // Falha do provedor. 200 porque a requisição DO CHAMADOR foi bem-formada; o fracasso do envio vai
  // no corpo e no log, e a linha em `order_notifications` fica em `failed` para auditoria.
  return json({ sent: false, reason: primeiro.reason, results })
}

// ACTION: trigger — "isto aconteceu". Quais mensagens saem é decisão de `core` (`AD-032`).
export async function trigger(deps: Deps, req: Request, body: any): Promise<Response> {
  const auth = await requireAdmin(deps, req)
  if (!auth.ok) return json({ error: auth.error }, auth.status)
  return await runTrigger(deps, body)
}

// ACTION: notify — a porta da CLIENTE. Mesmo motor, autorização por dono do pedido, e um recorte
// FECHADO de gatilhos: ampliá-lo é ampliar o que uma cliente logada consegue fazer a loja enviar.
export async function notify(deps: Deps, req: Request, body: any): Promise<Response> {
  const orderId = orderIdOf(body)
  if (!orderId) return json({ error: 'order_id ausente ou não é um uuid' }, 400)

  const auth = await requireOrderOwner(deps, req, orderId)
  if (!auth.ok) return json({ error: auth.error }, auth.status)

  if (!CUSTOMER_TRIGGERS.includes(body?.trigger)) {
    return json({ error: `trigger não permitido nesta porta: ${String(body?.trigger)}` }, 400)
  }

  return await runTrigger(deps, body)
}

async function runTrigger(deps: Deps, body: any): Promise<Response> {
  if (!isNotificationTrigger(body?.trigger)) {
    return json({ error: `trigger inválido: ${String(body?.trigger)}` }, 400)
  }

  const orderId = orderIdOf(body)
  if (!orderId) return json({ error: 'order_id ausente ou não é um uuid' }, 400)

  const report = await dispatchTrigger(deps, { orderId, trigger: body.trigger })
  if (!report.orderFound) return json({ error: 'Pedido não encontrado' }, 404)

  return json({
    sent: report.results.some((r) => r.ok),
    trigger: report.trigger,
    results: report.results,
  })
}

// ACTION: preview — renderiza um RASCUNHO, e não toca em nada.
//
// É o que faz a prévia do painel ser a própria function que envia (`AD-019`/`PNL-05`): um segundo
// renderizador no backoffice seria o "defeito 01" — a dona aprovaria um desenho e a cliente
// receberia outro. Não reivindica linha, não chama provedor, não grava.
export async function preview(deps: Deps, req: Request, body: any): Promise<Response> {
  const auth = await requireAdmin(deps, req)
  if (!auth.ok) return json({ error: auth.error }, auth.status)

  const event = body?.event
  if (!isNotificationEvent(event)) return json({ error: `event inválido: ${String(event)}` }, 400)

  const channel = body?.channel ?? 'email'
  if (channel !== 'email') return json({ error: `channel inválido: ${String(channel)}` }, 400)

  // O rascunho vem do painel campo a campo; o que ele não mandou cai no gravado, e o que ninguém
  // gravou cai no default. É `resolveEventSettings` com uma camada a mais.
  const settings = await readNotificationSettings(deps)
  const gravado = resolveEventSettings(settings.notifications, event as NotificationEvent, 'email')
  const fields = { ...gravado.fields, ...(body?.draft ?? {}) }

  const recusa = draftRefusal(event as NotificationEvent, fields)
  if (recusa) return json({ error: recusa }, 422)

  const order = await previewOrder(deps, body?.order_id)
  const vars = buildVars(event as NotificationEvent, order, {
    storeUrl: deps.env.storePublicUrl,
    adminUrl: deps.env.adminPublicUrl,
    whatsapp: settings.general?.whatsapp,
    enderecoAtelie: settings.atelie,
  })

  const rendered = renderEmail(event as NotificationEvent, order, fields, vars)
  return json({ ...rendered, sample: !orderIdOf({ order_id: body?.order_id }) })
}

/** A régua completa do rascunho, na ordem em que se explica: variável, tom, tamanho. */
export function draftRefusal(event: NotificationEvent, fields: any): string | null {
  const textos: string[] = [
    fields.subject,
    fields.heading,
    fields.lead,
    ...(Array.isArray(fields.extra) ? fields.extra : []),
    fields.cta_label,
  ].filter((t) => typeof t === 'string')

  for (const texto of textos) {
    const variavel = variablesRefusal(texto)
    if (variavel) return variavel
  }
  for (const texto of textos) {
    const tom = notificationCopyRefusal(texto, { event, channel: 'email' })
    if (tom) return tom
  }
  return limitsRefusal(fields, 'email')
}

async function readNotificationSettings(deps: Deps) {
  const { data } = await deps.supabase
    .from('store_settings')
    .select('key, value')
    .in('key', ['notifications', 'general', 'material'])

  const saida: any = {}
  for (const row of (data ?? []) as { key: string; value: any }[]) {
    if (row?.key === 'notifications') saida.notifications = row.value
    if (row?.key === 'general') saida.general = row.value
    if (row?.key === 'material') {
      const m = row.value ?? {}
      saida.atelie = [m.recipient, [m.street, m.number].filter(Boolean).join(', '), m.complement, m.neighborhood, [m.city, m.state].filter(Boolean).join(' - '), m.zip]
        .map((p: unknown) => String(p ?? '').trim())
        .filter((p) => p !== '')
        .join('\n')
    }
  }
  return saida
}

/**
 * O pedido da prévia: o de exemplo por padrão, ou um real quando a dona quer conferir um caso.
 *
 * O padrão é o de exemplo de propósito — a tela de configuração não é lugar de mostrar o nome, o
 * endereço e a compra de uma cliente real.
 */
async function previewOrder(deps: Deps, orderId: unknown): Promise<EmailOrder> {
  const id = orderIdOf({ order_id: orderId })
  if (!id) return SAMPLE_ORDER

  const { data } = await deps.supabase
    .from('orders')
    .select(
      'id, order_number, customer_name, customer_email, status, payment_status, paid_at, tracking_code, shipping_carrier, material_status, material_tracking_code, subtotal, shipping_cost, discount, pix_discount, total, address_street, address_number, address_complement, address_neighborhood, address_city, address_state, address_zip, order_items ( product_name, size, finish, quantity, unit_price )',
    )
    .eq('id', id)
    .maybeSingle()

  return (data as EmailOrder) ?? SAMPLE_ORDER
}

/**
 * O remetente de caixa-de-areia, reexportado de `core` — **não** declarado aqui.
 *
 * Na primeira escrita desta porta (T1) o literal existia nos dois lugares, com um comentário
 * dizendo que tudo bem porque a régua decide pelo endereço. Tudo bem até alguém trocar um só. A
 * T8 deu dono único a ele (`core/notifications/sender.ts`), junto com a composição do remetente.
 */
export { DEFAULT_SENDER_FROM as DEFAULT_RESEND_FROM } from '../../../packages/core/src/notifications/index.ts'
import { DEFAULT_SENDER_FROM as DEFAULT_RESEND_FROM } from '../../../packages/core/src/notifications/index.ts'

/** O endereço de caixa-de-areia do Resend. Nenhum envio real de produção sai dele. */
const RESEND_SANDBOX_ADDRESS = 'onboarding@resend.dev'

function isDefaultFrom(from: string): boolean {
  const trimmed = from.trim()
  if (trimmed === DEFAULT_RESEND_FROM) return true

  // O que importa é o ENDEREÇO, não a frase inteira: `Loja <onboarding@resend.dev>` entrega
  // exatamente igual ao default e precisa acender o mesmo alarme. Régua por literal deixaria essa
  // forma passar como se fosse remetente de produção.
  const angled = trimmed.match(/^.*<([^>]*)>$/)
  const address = (angled ? angled[1] : trimmed).trim().toLowerCase()
  return address === RESEND_SANDBOX_ADDRESS
}

/**
 * ACTION: config-check — com o que ESTA produção está configurada para enviar (`DLV-05`).
 *
 * Existe para que o sensor diário (`email-check.yml`) prove **o valor que a produção usa** contra o
 * Resend, em vez de provar um valor escrito no próprio sensor. O apagão de 2026-09-06 estava num
 * secret do Supabase, não na conta Resend: um probe com o remetente escrito nele mesmo teria ficado
 * verde pelos treze dias em que nenhum e-mail saiu.
 *
 * **Síncrona, e não toca no client do Supabase de propósito**: um sensor que dependesse do Postgres
 * confundiria "o e-mail quebrou" com "o banco caiu" — e a segunda resposta manda procurar no lugar
 * errado.
 *
 * **Sem autenticação, e o porquê** (`DLV-10`): nenhum campo desta resposta é segredo. O `from` viaja
 * no cabeçalho de todo e-mail que a loja manda, as duas URLs são públicas, e os outros três são
 * booleanos. Exigir papel de admin obrigaria o workflow a carregar um JWT de administradora — uma
 * credencial de verdade — para ler o que não é credencial nenhuma.
 *
 * **O que a resposta NUNCA carrega**: a chave, nem o valor, nem prefixo, nem tamanho; e o endereço
 * de `RESEND_DEV_REDIRECT_TO`, do qual sai só o booleano — ele é o e-mail de uma pessoa.
 *
 * 200 sempre, inclusive com a configuração ruim: é diagnóstico, não autorização. Um 4xx aqui faria o
 * sensor não conseguir distinguir "a produção está mal configurada" de "a function está fora".
 */
export function configCheck(deps: Deps): Response {
  const from = String(deps.env?.resendFrom ?? '')

  return json({
    from,
    // A MESMA régua que o motor aplica antes de enviar (`CFG-03`). Reimplementá-la aqui faria o
    // sensor aprovar um remetente que o envio recusa — o guarda verde sobre o cano fechado.
    from_valid: isValidFrom(from),
    from_is_default: isDefaultFrom(from),
    has_api_key: String(deps.env?.resendApiKey ?? '').trim() !== '',
    // `String(...)` e não o valor cru: `undefined` some do JSON e a resposta perderia a chave —
    // o sensor leria "campo ausente" como se fosse "campo vazio".
    store_public_url: String(deps.env?.storePublicUrl ?? ''),
    admin_public_url: String(deps.env?.adminPublicUrl ?? ''),
    dev_redirect_active: String(deps.env?.resendDevRedirectTo ?? '').trim() !== '',
  })
}

export async function route(deps: Deps, req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}

    switch (action) {
      case 'send':
        return await send(deps, req, body)
      case 'trigger':
        return await trigger(deps, req, body)
      case 'notify':
        return await notify(deps, req, body)
      case 'preview':
        return await preview(deps, req, body)
      case 'config-check':
        return configCheck(deps)
      default:
        return json({ error: 'action inválida. Use: send, trigger, notify, preview, config-check' }, 400)
    }
  } catch (err) {
    log({ action: 'error', message: err instanceof Error ? err.message : String(err) })
    return json({ error: err instanceof Error ? err.message : 'Erro interno' }, 500)
  }
}
