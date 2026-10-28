// Feature 84 — a montagem da chamada ao SDK da Anthropic, SEM o SDK (conserto r1 do Verifier).
//
// `claude.ts` importa o pacote e por isso o vitest nunca o carrega (`AD-004`). O que ele MANDA à API
// paga — `effort`, `output_config.format`, o `signal` do orçamento, `maxRetries` e `timeout` — morava
// lá dentro sem teste nenhum, e trocar qualquer um deixava a suíte verde (V20, V21, V22). Aqui ficam
// as duas montagens, puras; `claude.ts` só as repassa ao SDK.
//
// Só o `import type` da porta, por caminho relativo com extensão: alcançável pelo Deno e pelo vitest.

import type { ClaudeJsonRequest } from './claudePort.ts'

/** Teto por tentativa do SDK; o orçamento da chamada inteira é o `signal` de quem chama. */
export const CLAUDE_TIMEOUT_MS = 15_000

/** Uma retentativa do SDK (Decisão 4 da spec): 5xx/529 tentam de novo uma vez, e só. */
export const CLAUDE_MAX_RETRIES = 1

/** As opções do client do SDK. */
export function claudeClientOptions(apiKey: string): { apiKey: string; maxRetries: number; timeout: number } {
  return { apiKey, maxRetries: CLAUDE_MAX_RETRIES, timeout: CLAUDE_TIMEOUT_MS }
}

/** Os dois argumentos de `client.messages.create`: o corpo e as opções do pedido. */
export function claudeMessagesArgs(req: ClaudeJsonRequest): [
  {
    model: string
    max_tokens: number
    system: string
    messages: { role: 'user'; content: string }[]
    output_config: {
      effort: ClaudeJsonRequest['effort']
      format: { type: 'json_schema'; schema: Record<string, unknown> }
    }
  },
  { signal: AbortSignal },
] {
  return [
    {
      model: req.model,
      max_tokens: req.maxTokens,
      system: req.system,
      messages: [{ role: 'user', content: req.user }],
      output_config: {
        effort: req.effort,
        format: { type: 'json_schema', schema: req.schema },
      },
    },
    { signal: req.signal },
  ]
}
