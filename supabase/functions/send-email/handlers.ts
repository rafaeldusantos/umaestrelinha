// Porta HTTP da `send-email`. Único chamador previsto: o backoffice, para o e-mail de "enviado" e
// para reenvio manual.
//
// A `mercado-pago` NÃO passa por aqui — ela importa `sendOrderEmail` de `sender.ts` direto, no mesmo
// processo (AD-005). Isso é de propósito: um hop HTTP entre duas functions do mesmo deploy exigiria
// inventar auth interna (comparar bearer com a service-role key — credencial de acesso TOTAL ao banco
// usada como bearer do privilégio mais fraco do sistema) e pagaria um segundo cold start no caminho
// do PIX. Sem o hop, a única porta autenticada é esta, e ela é admin-only.
//
// `verify_jwt = false` no config.toml com autorização MANUAL aqui: `verify_jwt = true` seria teatro
// de segurança, porque a anon key pública É um JWT válido do projeto e passaria pelo gateway. O que
// importa é o papel, e papel só se checa dentro do handler.

import { type EmailDeps, sendOrderEmail } from './sender.ts'
import { EMAIL_TYPES, type EmailType } from './templates.ts'

export type Deps = EmailDeps

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

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
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '').trim()
  if (jwt === '') return { ok: false, status: 401, error: 'Não autenticado' }

  const { data, error } = await deps.supabase.auth.getUser(jwt)
  const user = data?.user
  if (error || !user?.id) return { ok: false, status: 401, error: 'Não autenticado' }

  const { data: isAdmin, error: roleError } = await deps.supabase.rpc('has_role', {
    _user_id: user.id,
    _role: 'admin',
  })
  if (roleError) {
    log({ action: 'send-email', status: 'admin_check_failed', message: String(roleError.message ?? roleError) })
    return { ok: false, status: 403, error: 'Acesso restrito ao admin' }
  }
  if (isAdmin !== true) return { ok: false, status: 403, error: 'Acesso restrito ao admin' }

  return { ok: true, userId: user.id }
}

// ACTION: send — dispara UM e-mail transacional de UM pedido.
// O corpo aceita só `{ type, order_id }`. `to`, `subject`, `html` e `from` enviados pelo chamador são
// ignorados: o destinatário vem de `orders.customer_email` lido com a service role (EML-01).
export async function send(deps: Deps, req: Request, body: any): Promise<Response> {
  const auth = await requireAdmin(deps, req)
  if (!auth.ok) return json({ error: auth.error }, auth.status)

  const type = body?.type
  if (!EMAIL_TYPES.includes(type)) {
    return json({ error: `type inválido. Use: ${EMAIL_TYPES.join(', ')}` }, 400)
  }

  const orderId = body?.order_id
  if (typeof orderId !== 'string' || !UUID_RE.test(orderId)) {
    return json({ error: 'order_id ausente ou não é um uuid' }, 400)
  }

  const result = await sendOrderEmail(deps, { orderId, type: type as EmailType })

  if (result.ok) return json({ sent: true, id: result.id })
  if ('notFound' in result) return json({ error: 'Pedido não encontrado' }, 404)
  if ('precondition' in result) {
    // 422 e não 400: o pedido existe e a requisição é bem-formada — o ESTADO é que ainda não permite.
    // O backoffice trata isso como esperado (o par status+rastreio completa em duas ações).
    return json({ error: `Pedido não está no estado exigido (${result.precondition})` }, 422)
  }
  if ('skipped' in result) return json({ sent: false, skipped: result.skipped })

  // Falha do provedor. 200 porque a requisição DO CHAMADOR foi bem-formada; o fracasso do envio vai
  // no corpo e no log, e a linha em `order_emails` fica em `failed` para auditoria.
  return json({ sent: false, reason: result.reason })
}

export async function route(deps: Deps, req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')

    switch (action) {
      case 'send': {
        const body = req.method === 'POST' ? await req.json().catch(() => ({})) : {}
        return await send(deps, req, body)
      }
      default:
        return json({ error: 'action inválida. Use: send' }, 400)
    }
  } catch (err) {
    log({ action: 'error', message: err instanceof Error ? err.message : String(err) })
    return json({ error: err instanceof Error ? err.message : 'Erro interno' }, 500)
  }
}
