// A porta HTTP da `seo-suggest` — sugerir título e descrição de SEO de uma peça (feature 84).
//
//   POST { productId, name, description, categoryIds, relatedIds, requiresMaterial }
//     200 { title, description, examples }
//     400 { reason: 'bad_request' } · 401/403 (requireAdmin) · 405 · 429 { reason: 'limited' }
//     422 { reason: 'off_rules' | 'refusal' | 'truncated' } · 502 { reason: 'upstream' }
//     503 { reason: 'not_configured' }
//
// A ordem é requisito (`SIA-17`, `SIA-20`, `SIA-18`): nada antes do `requireAdmin` toca o modelo, a
// chave ausente responde 503 antes de qualquer leitura, e o teto é por CONTA (as duas pessoas do
// ateliê podem dividir o IP).
//
// A sugestão é rascunho: esta function NÃO grava nada. Ela lê o contexto, chama a porta do Claude
// (injetada — o SDK nunca entra aqui, `AD-004`) e passa a resposta pela régua determinística de
// `core` (A7). Reprovada, tenta UMA vez mais, e só se sobrarem 5 s do orçamento de 15 s (`AD-008`).
//
// `verify_jwt = false` no config.toml com autorização MANUAL aqui (`requireAdmin`, dono único em
// `_shared/auth.ts`): a anon key publicada é um JWT válido do projeto e passaria pelo gateway.

export { corsHeaders } from '../_shared/http.ts'
import { json, preflight } from '../_shared/http.ts'
import { requireAdmin } from '../_shared/auth.ts'
import type { RateLimiter } from '../_shared/rateLimit.ts'
import type { ClaudeJson, ClaudeJsonResult } from '../_shared/claudePort.ts'
import { stripBrand, suggestionRefusal } from '../../../packages/core/src/seo/suggestion.ts'
import { loadContext } from './examples.ts'
import { SEO_EFFORT, SEO_MAX_TOKENS, SEO_MODEL, SEO_SCHEMA, buildSeoPrompt } from './prompt.ts'

export interface Deps {
  /** Client com a service role — o mesmo que `requireAdmin` usa. Só LÊ. */
  supabase: any
  /** A porta do Claude, ou `null` quando `ANTHROPIC_API_KEY` não está configurada (`SIA-20`). */
  claude: ClaudeJson | null
  /** O teto por conta: 30 a cada 10 minutos (`SIA-18`). */
  limiter: RateLimiter
  /** Relógio em ms, injetável. Padrão `Date.now` (lido a cada chamada, para o relógio falso valer). */
  now?: () => number
}

/** O orçamento da chamada inteira — as duas tentativas cabem nele. */
export const SUGGEST_BUDGET_MS = 15_000
/** A segunda tentativa só começa com pelo menos isto sobrando. */
export const RETRY_MIN_REMAINING_MS = 5_000

export const NAME_MAX = 200
export const RELATED_MAX = 20
export const CATEGORIES_MAX = 10

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type Result = 'ok' | 'off_rules' | 'refusal' | 'truncated' | 'upstream' | 'limited' | 'not_configured' | 'bad_request'

/** Uma linha de log por chamada (`SIA-26`). Nunca o texto do produto, nunca a chave. */
function log(entry: Record<string, unknown>) {
  console.log(JSON.stringify({ fn: 'seo-suggest', ...entry }))
}

interface Body {
  productId: string | null
  name: string
  description: string
  categoryIds: string[]
  relatedIds: string[]
  requiresMaterial: boolean
}

const listaDeUuids = (v: unknown, max: number): string[] | null => {
  if (v === undefined || v === null) return []
  if (!Array.isArray(v) || v.length > max) return null
  return v.every((x) => typeof x === 'string' && UUID.test(x)) ? (v as string[]) : null
}

/** O corpo validado, ou `null` (400). */
function parseBody(raw: unknown): Body | null {
  if (!raw || typeof raw !== 'object') return null
  const b = raw as Record<string, unknown>

  const name = typeof b.name === 'string' ? b.name.trim() : ''
  if (name === '' || name.length > NAME_MAX) return null

  if (b.description !== undefined && b.description !== null && typeof b.description !== 'string') return null

  const productId = b.productId === undefined || b.productId === null ? null : b.productId
  if (productId !== null && !(typeof productId === 'string' && UUID.test(productId))) return null

  // Ausente vale `false`; presente tem de ser booleano — a string "false" não pode virar verdade.
  if (b.requiresMaterial !== undefined && typeof b.requiresMaterial !== 'boolean') return null

  const categoryIds = listaDeUuids(b.categoryIds, CATEGORIES_MAX)
  const relatedIds = listaDeUuids(b.relatedIds, RELATED_MAX)
  if (!categoryIds || !relatedIds) return null

  return {
    productId: productId as string | null,
    name,
    description: typeof b.description === 'string' ? b.description : '',
    categoryIds,
    relatedIds,
    requiresMaterial: b.requiresMaterial === true,
  }
}

/** A sugestão crua do modelo, se tiver a forma; senão `null` (conta como reprovada). */
const comoSugestao = (r: ClaudeJsonResult): { title: string; description: string } | null => {
  if (r.kind !== 'ok') return null
  const j = r.json as Record<string, unknown> | null
  if (!j || typeof j.title !== 'string' || typeof j.description !== 'string') return null
  return { title: j.title, description: j.description }
}

export async function route(deps: Deps, req: Request): Promise<Response> {
  if (req.method === 'OPTIONS') return preflight()
  if (req.method !== 'POST') return json({ error: 'Método não permitido.' }, 405)

  const auth = await requireAdmin(deps, req, 'seo-suggest')
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

  let body: Body | null = null
  try {
    body = parseBody(JSON.parse(await req.text()))
  } catch {
    body = null
  }
  if (!body) {
    fim('bad_request')
    return json({ reason: 'bad_request' }, 400)
  }

  const ctx = await loadContext(deps.supabase, body)
  const prompt = buildSeoPrompt({
    name: body.name,
    description: body.description,
    categoryNames: ctx.categoryNames,
    requiresMaterial: body.requiresMaterial,
    examples: ctx.examples,
  })
  const exampleTitles = ctx.examples.map((e) => e.title)

  const controle = new AbortController()
  const comecoDoOrcamento = relogio()
  const prazo = setTimeout(() => controle.abort(), SUGGEST_BUDGET_MS)

  let attempts = 0
  let inputTokens = 0
  let outputTokens = 0
  const registro = (result: Result) =>
    fim(result, {
      examples: ctx.examples.length,
      attempts,
      inputTokens,
      outputTokens,
      descriptionCut: prompt.descriptionCut,
      ...(ctx.readErrors.length > 0 ? { readErrors: ctx.readErrors } : {}),
    })

  try {
    while (attempts < 2) {
      attempts += 1
      const r = await deps.claude({
        model: SEO_MODEL,
        effort: SEO_EFFORT,
        maxTokens: SEO_MAX_TOKENS,
        system: prompt.system,
        user: prompt.user,
        schema: SEO_SCHEMA,
        signal: controle.signal,
      })
      if (r.kind !== 'upstream') {
        inputTokens += r.usage.input
        outputTokens += r.usage.output
      }

      if (r.kind === 'upstream') {
        registro('upstream')
        return json({ reason: 'upstream' }, 502)
      }
      if (r.kind === 'refusal' || r.kind === 'truncated') {
        registro(r.kind)
        return json({ reason: r.kind }, 422)
      }

      const s = comoSugestao(r)
      if (s && suggestionRefusal(s, exampleTitles, body.name) === null) {
        registro('ok')
        return json({
          title: stripBrand(s.title),
          description: s.description.replace(/\s+/g, ' ').trim(),
          examples: ctx.examples.length,
        })
      }

      const sobra = SUGGEST_BUDGET_MS - (relogio() - comecoDoOrcamento)
      if (sobra < RETRY_MIN_REMAINING_MS) break
    }
    registro('off_rules')
    return json({ reason: 'off_rules' }, 422)
  } finally {
    clearTimeout(prazo)
  }
}
