// Feature 84 — a porta do Claude, NEUTRA (design §2, A9, `AD-004`).
//
// O handler e os testes conhecem SÓ isto: um pedido de JSON estruturado e o desfecho dele. O SDK
// oficial da Anthropic é importado num arquivo só (`_shared/claude.ts`), que o vitest nunca carrega —
// o molde é `PushSender`/`webPush.ts` da feature 79. Trocar de SDK, de versão ou de modelo é trocar
// aquele arquivo (ou quem chama); este não muda.
//
// Sem import nenhum: alcançável pelo Deno por caminho relativo e pelo vitest.

/** O que quem chama decide. Modelo e esforço moram em quem chama, não na porta (Tech Decisions). */
export interface ClaudeJsonRequest {
  model: string
  effort: 'low' | 'medium' | 'high'
  maxTokens: number
  system: string
  user: string
  /** JSON Schema cru, enviado em `output_config.format` com `type: 'json_schema'`. */
  schema: Record<string, unknown>
  /** Um orçamento de tempo para a chamada inteira, criado por quem chama (`AD-008`). */
  signal: AbortSignal
}

export interface ClaudeUsage {
  input: number
  output: number
}

/**
 * O desfecho, sem tipo do SDK:
 *  - `ok`: o modelo terminou e o texto parseou como JSON (a régua de conteúdo é de quem chama);
 *  - `refusal`: `stop_reason: "refusal"` — o conteúdo nem é lido (A8);
 *  - `truncated`: `stop_reason: "max_tokens"`;
 *  - `invalid`: sem bloco de texto, ou texto que não é JSON;
 *  - `upstream`: a chamada não voltou — prazo, 5xx/529 depois da retentativa do SDK, rede, abort.
 */
export type ClaudeJsonResult =
  | { kind: 'ok'; json: unknown; usage: ClaudeUsage }
  | { kind: 'refusal' | 'truncated' | 'invalid'; usage: ClaudeUsage }
  | { kind: 'upstream'; status: number | null }

export type ClaudeJson = (req: ClaudeJsonRequest) => Promise<ClaudeJsonResult>
