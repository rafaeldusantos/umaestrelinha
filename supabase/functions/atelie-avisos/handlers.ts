// As portas HTTP da `atelie-avisos` — as inscrições do aviso no celular (feature 79, `AD-062`).
//
// ---------------------------------------------------------------------------------------------
// Por que esta function existe
// ---------------------------------------------------------------------------------------------
//
// `push_subscriptions` não tem policy para papel nenhum de cliente (`MAN-23`): nada lê nem grava a
// tabela pelo PostgREST, nem a dona. Toda leitura e escrita passa por AQUI, com a service role, e
// cada ação confere `has_role(admin)` antes de qualquer outra coisa (`requireAdmin`, `_shared/auth.ts`)
// e mexe só nas inscrições DA PRÓPRIA conta — com a única exceção de `MAN-27` (o mesmo endereço do
// navegador gravado por outra conta passa a ser de quem gravou por último).
//
// `verify_jwt = false` no config.toml pela mesma razão da `admin-users`: a anon key publicada é um JWT
// válido e passaria pelo gateway; quem fecha a porta é o papel, conferido dentro do handler.
//
// A regra pura (eventos, textos, validação do que o navegador entrega) vem de
// `core/notifications/push.ts`, a mesma que o motor e o app leem. O envio do aviso de teste chega
// INJETADO (`PushSender`): a biblioteca de Web Push mora só em `_shared/webPush.ts`, que o `index.ts`
// monta — e é por isso que este arquivo roda sob vitest.
//
// O corpo de resposta NUNCA ecoa o endpoint: é credencial de entrega (`MAN-26`). O log traz só o host.

import {
  PUSH_EVENTS,
  PUSH_SUBSCRIPTION_LIMIT,
  PUSH_TEST_MESSAGE,
  pushEndpointRefusal,
  pushEventsRefusal,
  pushKeysRefusal,
} from '../../../packages/core/src/notifications/index.ts'
import type { PushSender } from '../send-notification/push.ts'

export interface Deps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any
  /** O envio real (`_shared/webPush.ts`). Ausente ⇒ o deploy não tem VAPID e `test` responde 503. */
  sender?: PushSender
  /** A chave pública do MESMO par que assina. Ausente ⇒ `config` responde 503 (`MAN-37`). */
  vapidPublicKey?: string
}

// Dono único em `_shared/http.ts` (feature `49`); reexportados, e `http.test.ts` confere a MESMA
// referência.
export { corsHeaders, json } from '../_shared/http.ts'
import { corsHeaders, json } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/auth.ts'

/** Quanto o aviso de teste espera pelo serviço de push antes de dizer que não saiu. */
const TEST_TIMEOUT_MS = 8000

const COLUNAS_DE_ENVIO = 'id, endpoint, p256dh, auth'

function log(entry: Record<string, unknown>) {
  console.log(JSON.stringify(entry))
}

const hostDe = (endpoint: string): string => {
  try {
    return new URL(endpoint).hostname
  } catch {
    return 'invalid'
  }
}

/** O endpoint do corpo, ou `null` quando ele não é uma string não vazia. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const endpointDo = (body: any): string | null =>
  typeof body?.endpoint === 'string' && body.endpoint.trim() !== '' ? body.endpoint : null

const dbError = (action: string) => {
  log({ action: `atelie-avisos:${action}`, status: 'db_error' })
  return json({ error: 'db_error' }, 500)
}

/** ACTION: config — a chave pública para o `applicationServerKey` do navegador. */
async function config(deps: Deps): Promise<Response> {
  if (!deps.vapidPublicKey) return json({ error: 'push_unconfigured' }, 503)
  return json({ applicationServerKey: deps.vapidPublicKey })
}

/**
 * ACTION: status — este navegador está inscrito, PARA ESTA CONTA? Linha de outra conta responde
 * `subscribed: false` (`MAN-36`): a tela mostra "desligado" e ativar de novo regrava.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function status(deps: Deps, userId: string, body: any): Promise<Response> {
  const endpoint = endpointDo(body)
  if (!endpoint) return json({ error: 'invalid_endpoint' }, 400)

  const { data, error } = await deps.supabase
    .from('push_subscriptions')
    .select('user_id, events')
    .eq('endpoint', endpoint)
    .maybeSingle()
  if (error) return dbError('status')

  if (!data || data.user_id !== userId) return json({ subscribed: false, events: [] })
  return json({ subscribed: true, events: data.events ?? [] })
}

/**
 * ACTION: subscribe — grava a inscrição deste navegador (`MAN-25`, `MAN-27`, `MAN-28`).
 *
 * Upsert por `endpoint`: dono novo (ou outra conta) ⇒ a linha passa a ser do chamador com os quatro
 * eventos ligados; mesmo dono ⇒ os eventos que ela escolheu ficam. Depois, a conta com mais de 10
 * aparelhos perde o usado há mais tempo.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function subscribe(deps: Deps, userId: string, body: any): Promise<Response> {
  const endpoint = endpointDo(body)
  if (!endpoint) return json({ error: 'invalid_endpoint' }, 400)
  const recusaEndpoint = pushEndpointRefusal(endpoint)
  if (recusaEndpoint) return json({ error: recusaEndpoint }, 400)
  const p256dh = body?.keys?.p256dh
  const auth = body?.keys?.auth
  const recusaChaves = pushKeysRefusal(typeof p256dh === 'string' ? p256dh : '', typeof auth === 'string' ? auth : '')
  if (recusaChaves) return json({ error: recusaChaves }, 400)

  const { data: atual, error: leituraErro } = await deps.supabase
    .from('push_subscriptions')
    .select('user_id, events')
    .eq('endpoint', endpoint)
    .maybeSingle()
  if (leituraErro) return dbError('subscribe')

  const mesmoDono = !!atual && atual.user_id === userId
  const events: string[] = mesmoDono ? (atual.events ?? [...PUSH_EVENTS]) : [...PUSH_EVENTS]
  const agora = new Date().toISOString()

  const { error: gravacaoErro } = await deps.supabase.from('push_subscriptions').upsert(
    {
      endpoint,
      user_id: userId,
      p256dh,
      auth,
      events,
      // O teto do teste não mora aqui: é da CONTA, em `push_test_claims` (`MAN-33`), então outra
      // conta assumindo o endereço não herda nada, e nada há para zerar.
      last_used_at: agora,
    },
    { onConflict: 'endpoint' },
  )
  if (gravacaoErro) return dbError('subscribe')

  // `MAN-28`: a 11ª inscrição despeja a usada há mais tempo. Mais recente primeiro; sai o que passa
  // do limite.
  const { data: daConta, error: contaErro } = await deps.supabase
    .from('push_subscriptions')
    .select('id, last_used_at')
    .eq('user_id', userId)
    .order('last_used_at', { ascending: false })
  if (contaErro) return dbError('subscribe')
  const excedentes = ((daConta ?? []) as { id: string }[]).slice(PUSH_SUBSCRIPTION_LIMIT).map((l) => l.id)
  if (excedentes.length > 0) {
    const { error } = await deps.supabase.from('push_subscriptions').delete().in('id', excedentes)
    if (error) return dbError('subscribe')
  }

  log({ action: 'atelie-avisos:subscribe', status: 'ok', host: hostDe(endpoint), assumiu: !!atual && !mesmoDono, despejadas: excedentes.length })
  return json({ events })
}

/** ACTION: events — os interruptores deste aparelho (`MAN-14`). Só a linha do chamador. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function events(deps: Deps, userId: string, body: any): Promise<Response> {
  const endpoint = endpointDo(body)
  if (!endpoint) return json({ error: 'invalid_endpoint' }, 400)
  const recusa = pushEventsRefusal(body?.events)
  if (recusa) return json({ error: recusa }, 400)

  const { data, error } = await deps.supabase
    .from('push_subscriptions')
    .update({ events: body.events })
    .eq('endpoint', endpoint)
    .eq('user_id', userId)
    .select('events')
    .maybeSingle()
  if (error) return dbError('events')
  if (!data) return json({ error: 'not_found' }, 404)
  return json({ events: data.events })
}

/** ACTION: unsubscribe — apaga a inscrição deste navegador, da conta. Ausente também é `ok`. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function unsubscribe(deps: Deps, userId: string, body: any): Promise<Response> {
  const endpoint = endpointDo(body)
  if (!endpoint) return json({ error: 'invalid_endpoint' }, 400)

  const { error } = await deps.supabase
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', endpoint)
    .eq('user_id', userId)
  if (error) return dbError('unsubscribe')
  return json({ ok: true })
}

/**
 * ACTION: test — um aviso "Avisos ligados" para ESTE aparelho (`MAN-31`), sem pedido e sem linha em
 * `order_notifications`. O teto de 30 s por conta é a RPC atômica `claim_push_test` (`MAN-33`).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function test(deps: Deps, userId: string, body: any): Promise<Response> {
  const endpoint = endpointDo(body)
  if (!endpoint) return json({ error: 'invalid_endpoint' }, 400)
  if (!deps.sender) return json({ error: 'push_unconfigured' }, 503)

  const { data: linha, error: leituraErro } = await deps.supabase
    .from('push_subscriptions')
    .select(COLUNAS_DE_ENVIO)
    .eq('endpoint', endpoint)
    .eq('user_id', userId)
    .maybeSingle()
  if (leituraErro) return dbError('test')
  if (!linha) return json({ error: 'not_found' }, 404)

  // A linha é desta conta: `false` aqui é o teto de 30 s (a mesma RPC devolveria `false` para um
  // endereço de outra conta, já recusado acima com 404).
  const { data: liberado, error: claimErro } = await deps.supabase.rpc('claim_push_test', {
    p_user_id: userId,
    p_endpoint: endpoint,
  })
  if (claimErro) return dbError('test')
  if (liberado !== true) return json({ error: 'cooldown' }, 429)

  const host = hostDe(endpoint)
  if (pushEndpointRefusal(linha.endpoint) !== null) {
    await deps.supabase.from('push_subscriptions').delete().eq('id', linha.id)
    log({ action: 'atelie-avisos:test', status: 'host_not_allowed', host })
    return json({ error: 'gone' }, 410)
  }

  let desfecho
  try {
    desfecho = await deps.sender.send(
      { endpoint: linha.endpoint, p256dh: linha.p256dh, auth: linha.auth },
      PUSH_TEST_MESSAGE,
      { timeoutMs: TEST_TIMEOUT_MS },
    )
  } catch {
    desfecho = { kind: 'failed' as const, reason: 'sender_threw' }
  }

  if (desfecho.kind === 'gone') {
    await deps.supabase.from('push_subscriptions').delete().eq('id', linha.id)
    log({ action: 'atelie-avisos:test', status: 'gone', host, http: desfecho.http })
    return json({ error: 'gone' }, 410)
  }
  if (desfecho.kind === 'failed') {
    log({ action: 'atelie-avisos:test', status: 'failed', host, reason: desfecho.reason, ...(desfecho.http ? { http: desfecho.http } : {}) })
    return json({ error: 'push_failed' }, 502)
  }

  await deps.supabase.from('push_subscriptions').update({ last_used_at: new Date().toISOString() }).eq('id', linha.id)
  log({ action: 'atelie-avisos:test', status: 'sent', host })
  return json({ ok: true })
}

export async function route(deps: Deps, req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const action = new URL(req.url).searchParams.get('action') ?? ''

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any = {}
  if (req.method !== 'GET') {
    try {
      const texto = await req.text()
      body = texto.trim() === '' ? {} : JSON.parse(texto)
    } catch {
      log({ action: `atelie-avisos:${action}`, status: 'bad_body' })
      return json({ error: 'invalid_body' }, 400)
    }
  }

  const acoes: Record<string, (deps: Deps, userId: string, body: unknown) => Promise<Response>> = {
    config: (d) => config(d),
    status,
    subscribe,
    events,
    unsubscribe,
    test,
  }
  const acao = acoes[action]
  if (!acao) {
    log({ action: `atelie-avisos:${action}`, status: 'unknown_action' })
    return json({ error: 'unknown_action' }, 400)
  }

  // Toda ação, sem exceção, passa pelo papel ANTES de tocar em qualquer coisa (`MAN-23`). `has_role`
  // que erra é 403 e nada é gravado: instabilidade não vira permissão.
  const auth = await requireAdmin(deps, req, 'atelie-avisos')
  if (!auth.ok) return json({ error: auth.error }, auth.status)

  try {
    return await acao(deps, auth.userId, body)
  } catch {
    // Rede de segurança: um throw aqui é bug nosso. A mensagem não sai (poderia ecoar o corpo).
    log({ action: `atelie-avisos:${action}`, status: 'unexpected_error' })
    return json({ error: 'db_error' }, 500)
  }
}
