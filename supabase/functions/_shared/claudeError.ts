// Feature 84 — a tradução do ERRO do SDK da Anthropic, PURA (conserto r2 do Verifier, N04).
//
// `claude.ts` importa o pacote e o vitest nunca o carrega (`AD-004`). A tradução do erro morava lá
// sem teste, e trocar "o estouro dos 15 s" por `refusal` deixava a suíte verde — a 502 "tente de
// novo" viraria 422 "o modelo recusou". Aqui ela é pura: as classes do SDK chegam INJETADAS (o
// adaptador passa o próprio `Anthropic`, que as carrega como estáticas), e o teste passa as suas.
//
// A decisão é por CLASSE (`instanceof`), nunca pelo texto da mensagem. Erro nenhum do SDK é recusa:
// recusa é `stop_reason`, e só `messageToResult` a lê.
//
// Só o `import type` da porta, por caminho relativo com extensão: alcançável pelo Deno e pelo vitest.

import type { ClaudeJsonResult } from './claudePort.ts'

// deno-lint-ignore no-explicit-any
type Classe = abstract new (...args: any[]) => unknown

/** As três classes de erro do SDK que esta tradução distingue. */
export interface ClaudeErrorClasses {
  /** O `signal` abortou — o orçamento de quem chama estourou. */
  APIUserAbortError: Classe
  /** Sem conexão, ou o `timeout` por tentativa (`APIConnectionTimeoutError` é filha desta). */
  APIConnectionError: Classe
  /** A API respondeu com erro HTTP (5xx/529 depois da retentativa, 4xx). */
  APIError: Classe
}

export function errorToResult(err: unknown, classes: ClaudeErrorClasses): ClaudeJsonResult {
  if (err instanceof classes.APIUserAbortError) return { kind: 'upstream', status: null }
  if (err instanceof classes.APIConnectionError) return { kind: 'upstream', status: null }
  if (err instanceof classes.APIError) {
    const status = (err as { status?: unknown }).status
    return { kind: 'upstream', status: typeof status === 'number' ? status : null }
  }
  return { kind: 'upstream', status: null }
}
