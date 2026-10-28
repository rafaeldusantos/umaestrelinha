// Feature 84 (`SIA-10`, `SIA-17`, `SIA-18`, `SIA-20`, `SIA-22`, `SIA-23`) — o pedido de sugestão de
// SEO, visto do painel.
//
// O painel não conhece o modelo nem a chave: ele chama a edge function `seo-suggest`, que exige
// admin, e traduz a resposta para um desfecho com MOTIVO. A tradução é por status e pelo `reason` do
// corpo — `functions.invoke` devolve `error` para qualquer status ≥ 400 e descarta o corpo, que só
// chega lendo o `context` do `FunctionsHttpError` (o mesmo cuidado de `useAdminUsers.ts`).

import { supabase } from '@estrelinha/supabase/client'
import type { SeoSuggestionReason } from '../model/copy'

/** O corpo que a function aceita (`parseBody` de `seo-suggest/handlers.ts`). */
export interface SeoSuggestionInput {
  /** `null` quando o produto ainda não foi salvo — serve só para tirá-lo dos exemplos. */
  productId: string | null
  name: string
  /** HTML do formulário; a function o reduz a texto. */
  description: string
  categoryIds: string[]
  relatedIds: string[]
  requiresMaterial: boolean
}

export type SeoSuggestionOutcome =
  | { kind: 'ok'; title: string; description: string }
  | { kind: 'error'; reason: SeoSuggestionReason }

const REASONS_DO_SERVIDOR: readonly SeoSuggestionReason[] = [
  'not_configured',
  'limited',
  'bad_request',
  'off_rules',
  'refusal',
  'truncated',
  'upstream',
]

/** O status pelo qual a resposta é lida quando o corpo não diz o motivo. */
const porStatus = (status: number): SeoSuggestionReason => {
  if (status === 401 || status === 403) return 'forbidden'
  if (status === 503) return 'not_configured'
  if (status === 429) return 'limited'
  if (status === 400) return 'bad_request'
  // 404 (function fora do ar), 5xx e qualquer outro: a sugestão não veio.
  return 'upstream'
}

const motivoDoErro = async (erro: unknown): Promise<SeoSuggestionReason> => {
  const contexto = (erro as { context?: unknown })?.context as
    | { status?: unknown; json?: () => Promise<unknown> }
    | undefined
  // Sem uma resposta HTTP no `context` (FunctionsFetchError, FunctionsRelayError): rede.
  if (!contexto || typeof contexto.status !== 'number') return 'network'
  const status = contexto.status
  // 401/403 decidem pelo status: o corpo deles é `{ error }`, sem `reason`.
  if (status === 401 || status === 403) return 'forbidden'
  if (typeof contexto.json === 'function') {
    try {
      const corpo = (await contexto.json()) as { reason?: unknown } | null
      const reason = corpo?.reason
      if (typeof reason === 'string' && (REASONS_DO_SERVIDOR as readonly string[]).includes(reason)) {
        return reason as SeoSuggestionReason
      }
    } catch {
      // Corpo ilegível (o 404 do gateway, um proxy): o status decide.
    }
  }
  return porStatus(status)
}

export async function requestSeoSuggestion(input: SeoSuggestionInput): Promise<SeoSuggestionOutcome> {
  const body: SeoSuggestionInput = {
    productId: input.productId,
    name: input.name,
    description: input.description,
    categoryIds: input.categoryIds,
    relatedIds: input.relatedIds,
    requiresMaterial: input.requiresMaterial,
  }
  let resposta: { data: unknown; error: unknown }
  try {
    resposta = await supabase.functions.invoke('seo-suggest', { body })
  } catch {
    return { kind: 'error', reason: 'network' }
  }
  if (resposta.error) return { kind: 'error', reason: await motivoDoErro(resposta.error) }

  const dado = resposta.data as { title?: unknown; description?: unknown } | null
  if (!dado || typeof dado.title !== 'string' || typeof dado.description !== 'string') {
    // 200 sem a forma combinada: a sugestão não veio — nunca um campo preenchido com lixo.
    return { kind: 'error', reason: 'upstream' }
  }
  return { kind: 'ok', title: dado.title, description: dado.description }
}
