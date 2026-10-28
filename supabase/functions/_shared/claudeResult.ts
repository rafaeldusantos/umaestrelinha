// Feature 84 — a tradução da resposta do modelo, PURA (design §2, `SIA-23`, A8, A10).
//
// Mora separada de `claude.ts` (o único arquivo que importa o SDK) para caber no vitest: quem decide
// "recusou", "veio cortada", "não é JSON" ou "serve" é este arquivo, e ele é testado; o adaptador
// fica fino. Molde: `pushOutcome.ts` ao lado de `webPush.ts`.
//
// A regra que importa: **ramifica por `stop_reason` ANTES de ler `content`**. Numa recusa o conteúdo
// pode vir vazio ou fora do schema, e nunca é lido.
//
// Só um `import type` relativo, com extensão — nenhum pacote.

import type { ClaudeJsonResult, ClaudeUsage } from './claudePort.ts'

/** A forma mínima de uma mensagem da Messages API, no que esta tradução lê. */
export interface MessageLike {
  stop_reason: string | null
  content: Array<{ type: string; text?: string }>
  usage?: { input_tokens?: number; output_tokens?: number } | null
}

const usageOf = (msg: MessageLike): ClaudeUsage => ({
  input: Number(msg.usage?.input_tokens ?? 0),
  output: Number(msg.usage?.output_tokens ?? 0),
})

export function messageToResult(msg: MessageLike): ClaudeJsonResult {
  const usage = usageOf(msg)
  if (msg.stop_reason === 'refusal') return { kind: 'refusal', usage }
  // `model_context_window_exceeded` é o mesmo corte por outro limite: a saída não terminou.
  if (msg.stop_reason === 'max_tokens' || msg.stop_reason === 'model_context_window_exceeded') {
    return { kind: 'truncated', usage }
  }

  // Blocos de `thinking` (o thinking adaptativo) vêm antes do texto e são ignorados.
  const bloco = (msg.content ?? []).find((b) => b?.type === 'text' && typeof b.text === 'string')
  if (!bloco) return { kind: 'invalid', usage }

  try {
    return { kind: 'ok', json: JSON.parse(bloco.text as string), usage }
  } catch {
    return { kind: 'invalid', usage }
  }
}
