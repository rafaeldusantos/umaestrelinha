import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

import { type ClaudeErrorClasses, errorToResult } from '../claudeError.ts'

// Feature 84 — conserto r2 do Verifier (N04): a tradução do erro do SDK, sem o SDK.
//
// As classes do dublê repetem a HIERARQUIA do `@anthropic-ai/sdk@1.3.0`, medida no Deno em
// 2026-10-27: `APIUserAbortError` e `APIConnectionError` são FILHAS de `APIError`, e
// `APIConnectionTimeoutError` é filha de `APIConnectionError`. Com classes soltas, a ordem dos
// `instanceof` não importaria — e é ela que impede o aborto de cair no ramo genérico.

class APIError extends Error {
  status: number | undefined
  constructor(status?: number) {
    super('erro da API')
    this.status = status
  }
}
class APIUserAbortError extends APIError {}
class APIConnectionError extends APIError {}
class APIConnectionTimeoutError extends APIConnectionError {}
class InternalServerError extends APIError {}

const CLASSES: ClaudeErrorClasses = { APIUserAbortError, APIConnectionError, APIError }

describe('errorToResult — o erro do SDK vira `upstream`, nunca recusa', () => {
  it('aborto (o orçamento de 15 s estourou) ⇒ upstream sem status', () => {
    expect(errorToResult(new APIUserAbortError(), CLASSES)).toEqual({ kind: 'upstream', status: null })
  })

  it('aborto que carrega um status numérico continua SEM status (o ramo do aborto vem primeiro)', () => {
    expect(errorToResult(new APIUserAbortError(500), CLASSES)).toEqual({ kind: 'upstream', status: null })
  })

  it('timeout por tentativa ⇒ upstream sem status', () => {
    expect(errorToResult(new APIConnectionTimeoutError(), CLASSES)).toEqual({ kind: 'upstream', status: null })
  })

  it('sem conexão ⇒ upstream sem status', () => {
    expect(errorToResult(new APIConnectionError(), CLASSES)).toEqual({ kind: 'upstream', status: null })
  })

  it.each([500, 503, 529, 429, 400])('erro HTTP %i ⇒ upstream com o status', (status) => {
    expect(errorToResult(new InternalServerError(status), CLASSES)).toEqual({ kind: 'upstream', status })
  })

  it('APIError sem status numérico ⇒ upstream sem status', () => {
    expect(errorToResult(new APIError(), CLASSES)).toEqual({ kind: 'upstream', status: null })
    const e = new APIError()
    ;(e as unknown as { status: string }).status = '500'
    expect(errorToResult(e, CLASSES)).toEqual({ kind: 'upstream', status: null })
  })

  it('erro que não é do SDK (e o que nem é Error) ⇒ upstream sem status', () => {
    expect(errorToResult(new TypeError('x'), CLASSES)).toEqual({ kind: 'upstream', status: null })
    expect(errorToResult('texto', CLASSES)).toEqual({ kind: 'upstream', status: null })
    expect(errorToResult(undefined, CLASSES)).toEqual({ kind: 'upstream', status: null })
  })

  it('nenhum erro vira refusal, truncated, invalid ou ok', () => {
    const erros = [
      new APIUserAbortError(),
      new APIConnectionTimeoutError(),
      new APIConnectionError(),
      new InternalServerError(529),
      new APIError(),
      new Error('refusal'),
    ]
    for (const e of erros) expect(errorToResult(e, CLASSES).kind).toBe('upstream')
  })

  it('a decisão é por classe, não pelo texto da mensagem', () => {
    const e = new InternalServerError(503)
    e.message = 'Request was aborted.'
    expect(errorToResult(e, CLASSES)).toEqual({ kind: 'upstream', status: 503 })
  })

  it('o arquivo importa só os tipos da porta, com `.ts` — nenhum pacote', () => {
    const SHARED = resolve(dirname(fileURLToPath(import.meta.url)), '..')
    const fonte = readFileSync(resolve(SHARED, 'claudeError.ts'), 'utf8')
    const sf = ts.createSourceFile('claudeError.ts', fonte, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
    const imports = sf.statements
      .filter((s): s is ts.ImportDeclaration => ts.isImportDeclaration(s))
      .map((s) => ({ spec: (s.moduleSpecifier as ts.StringLiteral).text, soTipo: !!s.importClause?.isTypeOnly }))
    expect(imports).toEqual([{ spec: './claudePort.ts', soTipo: true }])
  })
})
