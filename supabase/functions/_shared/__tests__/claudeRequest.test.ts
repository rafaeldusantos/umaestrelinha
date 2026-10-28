import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import type { ClaudeJsonRequest } from '../claudePort.ts'
import { claudeClientOptions, claudeMessagesArgs } from '../claudeRequest.ts'
import { buildSeoPrompt } from '../../seo-suggest/prompt.ts'

// Feature 84 — conserto r1 do Verifier (V20, V21, V22; `SIA-13`, `SIA-14`, `SIA-22`).
//
// O que vai à API paga, montado sem o SDK. As réguas são por IGUALDADE do objeto inteiro, escrito
// por extenso: uma chave a mais, a menos ou trocada reprova. O `signal` é conferido por IDENTIDADE —
// um `AbortSignal` novo no lugar do do orçamento faria o prazo de 15 s deixar de abortar a chamada
// real, e `toEqual` entre dois sinais não abortados passaria.

const SCHEMA = {
  type: 'object',
  properties: { title: { type: 'string' }, description: { type: 'string' } },
  required: ['title', 'description'],
  additionalProperties: false,
}

const pedido = (signal: AbortSignal): ClaudeJsonRequest => ({
  model: 'claude-haiku-5-5',
  effort: 'medium',
  maxTokens: 600,
  system: 'Você escreve o título e a descrição de busca.',
  user: 'Produto: Pingente Estrela',
  schema: SCHEMA,
  signal,
})

describe('claudeClientOptions — as opções do client do SDK', () => {
  it('uma retentativa, 15 s por tentativa, a chave de quem chama', () => {
    expect(claudeClientOptions('sk-teste')).toEqual({ apiKey: 'sk-teste', maxRetries: 1, timeout: 15_000 })
  })
})

describe('claudeMessagesArgs — os argumentos de messages.create', () => {
  it('o corpo inteiro, por igualdade', () => {
    const controle = new AbortController()
    const [corpo] = claudeMessagesArgs(pedido(controle.signal))
    expect(corpo).toEqual({
      model: 'claude-haiku-5-5',
      max_tokens: 600,
      system: 'Você escreve o título e a descrição de busca.',
      messages: [{ role: 'user', content: 'Produto: Pingente Estrela' }],
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: SCHEMA },
      },
    })
  })

  it('o esforço é o de quem chama, nos três valores', () => {
    const s = new AbortController().signal
    for (const effort of ['low', 'medium', 'high'] as const) {
      expect(claudeMessagesArgs({ ...pedido(s), effort })[0].output_config.effort).toBe(effort)
    }
  })

  it('o schema é o MESMO objeto de quem chama', () => {
    const [corpo] = claudeMessagesArgs(pedido(new AbortController().signal))
    expect(corpo.output_config.format.schema).toBe(SCHEMA)
  })

  // Conserto r2 (N09): a fixtura do `user` tinha 25 caracteres, e cortar o conteúdo em 2.000 passava.
  // O `user` real de uma peça com descrição longa (cortada em 4.000 pelo prompt) vai INTEIRO.
  it('o `user` vai inteiro — o de uma descrição longa, já cortada em 4.000 pelo prompt', () => {
    const longa = Array.from({ length: 900 }, (_, i) => `palavra${i}`).join(' ')
    const prompt = buildSeoPrompt({
      name: 'Pingente Estrela',
      description: `<p>${longa}</p>`,
      categoryNames: ['Pingentes'],
      requiresMaterial: false,
      examples: [],
    })
    expect(prompt.descriptionCut).toBe(true)
    expect(prompt.user.length).toBeGreaterThan(3900)
    const [corpo] = claudeMessagesArgs({ ...pedido(new AbortController().signal), user: prompt.user })
    expect(corpo.messages).toEqual([{ role: 'user', content: prompt.user }])
  })

  it('as opções do pedido são só o signal, e é o MESMO signal do orçamento', () => {
    const controle = new AbortController()
    const [, opcoes] = claudeMessagesArgs(pedido(controle.signal))
    expect(Object.keys(opcoes)).toEqual(['signal'])
    expect(opcoes.signal).toBe(controle.signal)
    controle.abort()
    expect(opcoes.signal.aborted).toBe(true)
  })
})

// `claude.ts` não é carregável aqui (`AD-004`). A metade que o vitest não alcança: ele MONTA a
// chamada só por estas duas funções — senão as réguas acima provariam um módulo que ninguém usa.
describe('claude.ts usa as duas montagens (pela AST)', () => {
  const SHARED = resolve(dirname(fileURLToPath(import.meta.url)), '..')
  const fonte = readFileSync(resolve(SHARED, 'claude.ts'), 'utf8')
  const sf = ts.createSourceFile('claude.ts', fonte, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)

  const textos = (pred: (n: ts.Node) => boolean): string[] => {
    const saida: string[] = []
    const visitar = (n: ts.Node) => {
      if (pred(n)) saida.push(n.getText(sf).replace(/\s+/g, ' '))
      ts.forEachChild(n, visitar)
    }
    visitar(sf)
    return saida
  }

  it('o client nasce de `claudeClientOptions(apiKey)`, e de nada mais', () => {
    const novos = textos((n) => ts.isNewExpression(n))
    expect(novos).toEqual(['new Anthropic(claudeClientOptions(apiKey))'])
  })

  it('`messages.create` recebe exatamente o par de `claudeMessagesArgs(req)`', () => {
    const chamadas = textos(
      (n) => ts.isCallExpression(n) && ts.isPropertyAccessExpression(n.expression) && n.expression.name.text === 'create',
    )
    expect(chamadas).toEqual(['client.messages.create(body, options)'])
    const declaracoes = textos((n) => ts.isVariableDeclaration(n) && ts.isArrayBindingPattern(n.name))
    expect(declaracoes).toEqual(['[body, options] = claudeMessagesArgs(req)'])
  })

  // Conserto r2 (N01, N02, N05): as duas réguas acima provam PRESENÇA, não ausência de escrita entre
  // a montagem e o envio — `body.output_config.effort = 'high'` ou `Object.assign(client, …)` depois
  // da montagem passavam, e mascarar o `stop_reason` na volta também. O arquivo inteiro, sem
  // comentário, é fixado por igualdade: uma linha a mais, a menos ou trocada reprova.
  it('o arquivo inteiro, sem comentário, é exatamente a chamada — nada entre a montagem e o envio', () => {
    const impressora = ts.createPrinter({ removeComments: true })
    const statements = sf.statements.map((s) =>
      impressora.printNode(ts.EmitHint.Unspecified, s, sf).replace(/\s+/g, ' '),
    )
    expect(statements).toEqual([
      "import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0';",
      "import type { ClaudeJson } from './claudePort.ts';",
      "import { claudeClientOptions, claudeMessagesArgs } from './claudeRequest.ts';",
      "import { messageToResult } from './claudeResult.ts';",
      "import { errorToResult } from './claudeError.ts';",
      'export function createClaudeJson(apiKey: string): ClaudeJson { ' +
        'const client = new Anthropic(claudeClientOptions(apiKey)); ' +
        'return async (req) => { try { ' +
        'const [body, options] = claudeMessagesArgs(req); ' +
        'const msg = await client.messages.create(body, options); ' +
        'return messageToResult(msg as any); ' +
        '} catch (err) { return errorToResult(err, Anthropic); } }; }',
    ])
  })

  it('o arquivo da montagem importa só os tipos da porta, com `.ts` — nenhum pacote', () => {
    const fonteReq = readFileSync(resolve(SHARED, 'claudeRequest.ts'), 'utf8')
    const sfReq = ts.createSourceFile('claudeRequest.ts', fonteReq, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
    const imports = sfReq.statements
      .filter((s): s is ts.ImportDeclaration => ts.isImportDeclaration(s))
      .map((s) => ({ spec: (s.moduleSpecifier as ts.StringLiteral).text, soTipo: !!s.importClause?.isTypeOnly }))
    expect(imports).toEqual([{ spec: './claudePort.ts', soTipo: true }])
  })
})
