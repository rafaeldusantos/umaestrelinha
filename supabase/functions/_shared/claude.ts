// Feature 84 — o adaptador do SDK oficial da Anthropic (design §2, `AD-067`).
//
// É o ÚNICO arquivo do repositório que importa o SDK, com a versão fixada, e só os `index.ts` o
// importam (`claudeSoNaPorta.test.ts` guarda as duas pontas). O vitest nunca o carrega: a montagem
// da chamada mora em `claudeRequest.ts` e a tradução da resposta em `claudeResult.ts`, puras e
// testadas; aqui fica só a chamada.
//
// A forma de `output_config.format` com JSON Schema cru — `{ type: 'json_schema', schema }`, o texto
// JSON chegando num bloco `text`, `additionalProperties: false` obrigatório e a recusa/corte vindo
// por `stop_reason` — foi conferida em 2026-10-27 na documentação viva:
//   https://platform.claude.com/docs/en/build-with-claude/structured-outputs.md
//
// Sem `thinking` (o adaptativo é o padrão do modelo), sem `temperature`, sem prefill: os três dão
// 400 ou não fazem falta nos modelos atuais. Modelo e esforço vêm de quem chama.
//
// Trocar de SDK é trocar este arquivo: o handler conhece só `ClaudeJson`.

import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0'
import type { ClaudeJson } from './claudePort.ts'
import { claudeClientOptions, claudeMessagesArgs } from './claudeRequest.ts'
import { messageToResult } from './claudeResult.ts'
import { errorToResult } from './claudeError.ts'

export function createClaudeJson(apiKey: string): ClaudeJson {
  const client = new Anthropic(claudeClientOptions(apiKey))

  return async (req) => {
    try {
      const [body, options] = claudeMessagesArgs(req)
      const msg = await client.messages.create(body, options)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      return messageToResult(msg as any)
    } catch (err) {
      return errorToResult(err, Anthropic)
    }
  }
}
