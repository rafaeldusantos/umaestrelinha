// A porta HTTP da `customer-parse` — ler contato e endereço de um texto colado (a conversa do WhatsApp).
//
//   POST { text, mode: 'contact_and_address' | 'address' }
//     200 { contact?, address, found }   — `contact` só existe no modo `contact_and_address`
//     400 { reason: 'bad_request' } · 401/403 (requireAdmin) · 405 · 413 { reason: 'too_long' }
//     422 { reason: 'refusal' | 'truncated' | 'invalid' } · 429 { reason: 'limited' }
//     502 { reason: 'upstream' } · 503 { reason: 'not_configured' }
//
// A ordem é requisito: o papel primeiro (nada antes do `requireAdmin` toca o modelo nem o teto), a
// chave ausente responde 503, o teto é por CONTA, e só então o corpo é lido.
//
// A leitura é rascunho: esta function NÃO grava nada, e o texto colado não fica em lugar nenhum — nem
// no log, que leva só o tamanho e o desfecho. O que o modelo devolve passa pela conferência de
// `core/customers/parse.ts`; o que não confere volta vazio. Saída cortada ou recusada é desfecho
// próprio, nunca campo.
//
// `verify_jwt = false` no config.toml com autorização MANUAL aqui (`requireAdmin`, dono único em
// `_shared/auth.ts`): a anon key publicada é um JWT válido do projeto e passaria pelo gateway.

export { corsHeaders } from '../_shared/http.ts'
import { json, preflight } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/auth.ts'
import type { RateLimiter } from '../_shared/rateLimit.ts'
import type { ClaudeJson } from '../_shared/claudePort.ts'
import {
  CUSTOMER_PARSE_MODES,
  CUSTOMER_PARSE_TEXT_MAX,
  type CustomerParseMode,
  parseCustomerText,
  parsedFieldCount,
} from '../../../packages/core/src/customers/parse.ts'
import { PARSE_EFFORT, PARSE_MAX_TOKENS, PARSE_MODEL, PARSE_SCHEMA, buildParsePrompt } from './prompt.ts'

export interface Deps {
  /** Client com a service role — só o `requireAdmin` o usa. */
  supabase: any
  /** A porta do Claude, ou `null` quando `ANTHROPIC_API_KEY` não está configurada. */
  claude: ClaudeJson | null
  /** O teto por conta: 30 leituras a cada 10 minutos. */
  limiter: RateLimiter
  /** Relógio em ms, injetável. */
  now?: () => number
}

/** O orçamento da chamada ao modelo: estourou, é "fora do ar". */
export const PARSE_BUDGET_MS = 15_000

type Result =
  | 'ok'
  | 'refusal'
  | 'truncated'
  | 'invalid'
  | 'upstream'
  | 'limited'
  | 'not_configured'
  | 'bad_request'
  | 'too_long'

/** Uma linha de log por chamada. Nunca o texto, nunca o que foi lido, nunca a chave. */
function log(entry: Record<string, unknown>) {
  console.log(JSON.stringify({ fn: 'customer-parse', ...entry }))
}

type Corpo = { kind: 'ok'; text: string; mode: CustomerParseMode } | { kind: 'too_long'; chars: number } | { kind: 'bad' }

function lerCorpo(raw: unknown): Corpo {
  if (!raw || typeof raw !== 'object') return { kind: 'bad' }
  const b = raw as Record<string, unknown>
  if (typeof b.text !== 'string') return { kind: 'bad' }
  if (!CUSTOMER_PARSE_MODES.includes(b.mode as CustomerParseMode)) return { kind: 'bad' }
  if (b.text.length > CUSTOMER_PARSE_TEXT_MAX) return { kind: 'too_long', chars: b.text.length }
  if (b.text.trim() === '') return { kind: 'bad' }
  return { kind: 'ok', text: b.text, mode: b.mode as CustomerParseMode }
}

export async function route(deps: Deps, req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight()
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  const auth = await requireAdmin(deps, req, 'customer-parse')
  if (!auth.ok) return json({ error: auth.error }, auth.status)
  const userId = auth.userId

  const relogio = deps.now ?? (() => Date.now())
  const inicio = relogio()
  const fim = (result: Result, extra: Record<string, unknown> = {}) =>
    log({ userId, result, ms: relogio() - inicio, ...extra })

  if (deps.claude === null) {
    fim('not_configured')
    return json({ reason: 'not_configured' }, 503)
  }

  if (!deps.limiter.hit(userId)) {
    fim('limited')
    return json({ reason: 'limited' }, 429)
  }

  let corpo: Corpo
  try {
    corpo = lerCorpo(JSON.parse(await req.text()))
  } catch {
    corpo = { kind: 'bad' }
  }
  if (corpo.kind === 'too_long') {
    fim('too_long', { chars: corpo.chars })
    return json({ reason: 'too_long' }, 413)
  }
  if (corpo.kind !== 'ok') {
    fim('bad_request')
    return json({ reason: 'bad_request' }, 400)
  }

  const { text, mode } = corpo
  const prompt = buildParsePrompt(text, mode)
  const controle = new AbortController()
  const prazo = setTimeout(() => controle.abort(), PARSE_BUDGET_MS)

  try {
    const r = await deps.claude({
      model: PARSE_MODEL,
      effort: PARSE_EFFORT,
      maxTokens: PARSE_MAX_TOKENS,
      system: prompt.system,
      user: prompt.user,
      schema: PARSE_SCHEMA[mode],
      signal: controle.signal,
    })
    const base = { chars: text.length, mode }

    if (r.kind === 'upstream') {
      fim('upstream', { ...base, status: r.status })
      return json({ reason: 'upstream' }, 502)
    }
    const usage = { inputTokens: r.usage.input, outputTokens: r.usage.output }
    if (r.kind !== 'ok') {
      fim(r.kind, { ...base, ...usage })
      return json({ reason: r.kind }, 422)
    }
    if (!r.json || typeof r.json !== 'object' || Array.isArray(r.json)) {
      fim('invalid', { ...base, ...usage })
      return json({ reason: 'invalid' }, 422)
    }

    const lido = parseCustomerText(r.json, mode)
    const found = parsedFieldCount(lido)
    fim('ok', { ...base, ...usage, found })
    return json(mode === 'address' ? { address: lido.address, found } : { contact: lido.contact, address: lido.address, found })
  } finally {
    clearTimeout(prazo)
  }
}
