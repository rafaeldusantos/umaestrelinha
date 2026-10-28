import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { type MessageLike, messageToResult } from '../claudeResult.ts'

// Feature 84 (T05, `SIA-23`, A8, A10) — a tradução da resposta do modelo.
//
// A régua que importa é a ORDEM: `stop_reason` decide antes de o conteúdo ser lido. Os casos de
// recusa e de corte carregam um `content` que, se lido, daria outro desfecho — senão "não leu" seria
// verdadeiro nos dois mundos.

const USO = { input_tokens: 1200, output_tokens: 80 }
const OK_JSON = '{"title":"Pingente Estrela","description":"Uma joia feita à mão."}'

const msg = (m: Partial<MessageLike>): MessageLike => ({
  stop_reason: 'end_turn',
  content: [],
  usage: USO,
  ...m,
})

describe('messageToResult', () => {
  it('end_turn com JSON válido ⇒ ok, com o json parseado e o usage', () => {
    expect(messageToResult(msg({ content: [{ type: 'text', text: OK_JSON }] }))).toEqual({
      kind: 'ok',
      json: { title: 'Pingente Estrela', description: 'Uma joia feita à mão.' },
      usage: { input: 1200, output: 80 },
    })
  })

  it('refusal ⇒ refusal, com content vazio', () => {
    expect(messageToResult(msg({ stop_reason: 'refusal', content: [] }))).toEqual({
      kind: 'refusal',
      usage: { input: 1200, output: 80 },
    })
  })

  it('refusal ⇒ refusal SEM ler o content (um JSON válido ali seria ok se lido)', () => {
    const conteudo = [{ type: 'text', text: OK_JSON }]
    const espiao = new Proxy(conteudo, {
      get() {
        throw new Error('o content foi lido numa recusa')
      },
    })
    expect(messageToResult(msg({ stop_reason: 'refusal', content: espiao })).kind).toBe('refusal')
  })

  it('max_tokens ⇒ truncated, mesmo com um JSON parseável no texto', () => {
    expect(messageToResult(msg({ stop_reason: 'max_tokens', content: [{ type: 'text', text: OK_JSON }] }))).toEqual({
      kind: 'truncated',
      usage: { input: 1200, output: 80 },
    })
  })

  it('model_context_window_exceeded ⇒ truncated, mesmo com um JSON parseável no texto', () => {
    expect(
      messageToResult(msg({ stop_reason: 'model_context_window_exceeded', content: [{ type: 'text', text: OK_JSON }] })),
    ).toEqual({ kind: 'truncated', usage: { input: 1200, output: 80 } })
  })

  it('texto que não é JSON ⇒ invalid', () => {
    expect(messageToResult(msg({ content: [{ type: 'text', text: 'Título: Pingente' }] }))).toEqual({
      kind: 'invalid',
      usage: { input: 1200, output: 80 },
    })
  })

  it('sem bloco text ⇒ invalid', () => {
    expect(messageToResult(msg({ content: [{ type: 'thinking' }] })).kind).toBe('invalid')
    expect(messageToResult(msg({ content: [] })).kind).toBe('invalid')
  })

  it('blocos de thinking antes do text são ignorados', () => {
    const r = messageToResult(
      msg({ content: [{ type: 'thinking', text: 'não é isto' }, { type: 'text', text: OK_JSON }] }),
    )
    expect(r).toEqual({
      kind: 'ok',
      json: { title: 'Pingente Estrela', description: 'Uma joia feita à mão.' },
      usage: { input: 1200, output: 80 },
    })
  })

  it('usage ausente vira zero, nunca NaN', () => {
    expect(messageToResult(msg({ usage: null, content: [{ type: 'text', text: OK_JSON }] }))).toMatchObject({
      usage: { input: 0, output: 0 },
    })
  })
})

// A porta e a tradução são alcançáveis pelo Deno e pelo vitest: a porta não importa nada; a tradução
// importa só os TIPOS da porta, por caminho relativo com extensão. Nenhum pacote.
describe('claudePort.ts e claudeResult.ts — sem pacote', () => {
  const SHARED = resolve(dirname(fileURLToPath(import.meta.url)), '..')

  const imports = (arquivo: string) => {
    const fonte = readFileSync(resolve(SHARED, arquivo), 'utf8')
    const sf = ts.createSourceFile(arquivo, fonte, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
    return sf.statements
      .filter((s): s is ts.ImportDeclaration | ts.ExportDeclaration =>
        (ts.isImportDeclaration(s) || ts.isExportDeclaration(s)) && !!s.moduleSpecifier,
      )
      .map((s) => ({
        spec: (s.moduleSpecifier as ts.StringLiteral).text,
        soTipo: ts.isImportDeclaration(s) ? !!s.importClause?.isTypeOnly : !!s.isTypeOnly,
      }))
  }

  it('claudePort.ts não importa nada', () => {
    expect(imports('claudePort.ts')).toEqual([])
  })

  it('claudeResult.ts importa só os tipos da porta, com `.ts`', () => {
    expect(imports('claudeResult.ts')).toEqual([{ spec: './claudePort.ts', soTipo: true }])
  })
})
