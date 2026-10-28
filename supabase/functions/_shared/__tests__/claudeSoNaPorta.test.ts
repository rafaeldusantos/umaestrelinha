import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * Feature 84 (T09, `SIA-19`, `AD-067`) — o SDK da Anthropic mora num arquivo SÓ, e só a fiação o
 * alcança. Molde: `pushSoNoMotor.test.ts`.
 *
 * Três réguas, pela AST do TypeScript (comentário e prosa ficam de fora por construção — a régua
 * mede uso, não menção):
 *
 *  1. O pacote do SDK é importado SÓ por `_shared/claude.ts`, e na versão exata. Uma segunda
 *     importação, ou uma versão solta, faria duas integrações conviverem — e a `BL-001`/`BL-014`
 *     abririam a terceira.
 *  2. `_shared/claude.ts` é importado SÓ pelo `index.ts` da `seo-suggest`. O vitest nunca o carrega
 *     (o especificador `npm:` não resolve no Node), então um handler que o importasse derrubaria a
 *     suíte — e outro index que o importasse seria fiação sem prova.
 *  3. Esse `index.ts` CHAMA `createClaudeJson(` — a metade da fiação que o vitest não alcança.
 *
 * Este arquivo carrega o nome do pacote nas constantes e nos sensores: é um dos dois guardas que
 * podem (o outro é `claudeSoNoServidor.test.ts`, na suíte da loja).
 */

const FUNCTIONS = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const REPO = resolve(FUNCTIONS, '../..')

const PACOTE = '@anthropic-ai/sdk'
const VERSAO = 'npm:@anthropic-ai/sdk@1.3.0'
const ADAPTADOR = '_shared/claude.ts'
const INDEXES = ['seo-suggest/index.ts']

interface Arquivo {
  nome: string
  fonte: string
}

/** Todo `.ts`/`.tsx` sob `raiz`, com o caminho relativo a `base`. `node_modules` fica fora. */
function varrer(raiz: string, base: string): Arquivo[] {
  const saida: Arquivo[] = []
  const andar = (dir: string) => {
    let entradas
    try {
      entradas = readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }
    for (const e of entradas) {
      const caminho = join(dir, e.name)
      if (e.isDirectory()) {
        if (e.name === 'node_modules' || e.name === 'dist') continue
        andar(caminho)
        continue
      }
      if (!/\.(ts|tsx)$/.test(e.name)) continue
      saida.push({
        nome: caminho.slice(base.length + 1).replace(/\\/g, '/'),
        fonte: readFileSync(caminho, 'utf8'),
      })
    }
  }
  andar(raiz)
  return saida
}

const parse = (fonte: string, nome: string) =>
  ts.createSourceFile(nome, fonte, ts.ScriptTarget.Latest, true, nome.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)

/** Os especificadores de módulo: `import … from`, `export … from` e `import()` dinâmico. */
export function especificadores(fonte: string, nome = 'x.ts'): string[] {
  const sf = parse(fonte, nome)
  const saida: string[] = []
  const visitar = (n: ts.Node) => {
    if ((ts.isImportDeclaration(n) || ts.isExportDeclaration(n)) && n.moduleSpecifier && ts.isStringLiteral(n.moduleSpecifier)) {
      saida.push(n.moduleSpecifier.text)
    }
    if (ts.isCallExpression(n) && n.expression.kind === ts.SyntaxKind.ImportKeyword) {
      const arg = n.arguments[0]
      if (arg && ts.isStringLiteralLike(arg)) saida.push(arg.text)
    }
    ts.forEachChild(n, visitar)
  }
  visitar(sf)
  return saida
}

/** Chamadas `nome(` com callee identificador puro. */
export function chama(fonte: string, nome: string): boolean {
  const sf = parse(fonte, 'x.ts')
  let achou = false
  const visitar = (n: ts.Node) => {
    if (ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === nome) achou = true
    ts.forEachChild(n, visitar)
  }
  visitar(sf)
  return achou
}

/** O especificador (relativo, a partir do arquivo que importa) resolve para o adaptador? */
const apontaParaOAdaptador = (deArquivo: string, spec: string): boolean => {
  if (!spec.startsWith('.')) return false
  const alvo = resolve(FUNCTIONS, dirname(deArquivo), spec).slice(FUNCTIONS.length + 1).replace(/\\/g, '/')
  return alvo === ADAPTADOR || alvo === ADAPTADOR.replace(/\.ts$/, '')
}

const importaOPacote = (a: Arquivo) => especificadores(a.fonte, a.nome).some((s) => s.includes(PACOTE))

const funcoes = varrer(FUNCTIONS, FUNCTIONS)
const foraDasFunctions = ['apps/store/src', 'apps/backoffice/src', 'apps/mobile-adm/src', 'packages'].flatMap((d) =>
  varrer(join(REPO, d), REPO),
)

describe('claudeSoNaPorta — âncoras', () => {
  it('a varredura leu as functions e os apps (contagem)', () => {
    expect(funcoes.length).toBeGreaterThanOrEqual(40)
    expect(funcoes.map((a) => a.nome)).toEqual(
      expect.arrayContaining([ADAPTADOR, ...INDEXES, '_shared/claudePort.ts', '_shared/claudeRequest.ts', '_shared/claudeError.ts', 'seo-suggest/handlers.ts']),
    )
    expect(foraDasFunctions.length).toBeGreaterThanOrEqual(500)
    expect(foraDasFunctions.some((a) => a.nome.startsWith('apps/backoffice/src/'))).toBe(true)
    expect(foraDasFunctions.some((a) => a.nome.startsWith('packages/core/src/'))).toBe(true)
  })

  it('o adaptador IMPORTA o pacote — senão a régua 1 aprovaria sobre o nada', () => {
    const adaptador = funcoes.find((a) => a.nome === ADAPTADOR)!
    expect(especificadores(adaptador.fonte)).toContain(VERSAO)
  })
})

describe('claudeSoNaPorta — as réguas', () => {
  it('1. o SDK só é importado por `_shared/claude.ts`, na versão 1.3.0 exata', () => {
    const importadores = [...funcoes, ...foraDasFunctions].filter(importaOPacote).map((a) => a.nome)
    expect(importadores).toEqual([ADAPTADOR])

    const adaptador = funcoes.find((a) => a.nome === ADAPTADOR)!
    expect(especificadores(adaptador.fonte).filter((s) => s.includes(PACOTE))).toEqual([VERSAO])
  })

  it('2. `_shared/claude.ts` só é importado pelo `index.ts` da seo-suggest', () => {
    const importadores = funcoes
      .filter((a) => especificadores(a.fonte, a.nome).some((s) => apontaParaOAdaptador(a.nome, s)))
      .map((a) => a.nome)
      .sort()
    expect(importadores).toEqual(INDEXES)
  })

  it.each(INDEXES)('3. %s CHAMA `createClaudeJson(`', (nome) => {
    const arquivo = funcoes.find((a) => a.nome === nome)!
    expect(chama(arquivo.fonte, 'createClaudeJson')).toBe(true)
  })
})

describe('claudeSoNaPorta — sensores', () => {
  it('a régua 1 acusa uma segunda importação, por outra CDN e numa versão solta', () => {
    const doente = (fonte: string) => importaOPacote({ nome: 'checkout/handlers.ts', fonte })
    expect(doente(`import Anthropic from 'npm:@anthropic-ai/sdk'`)).toBe(true)
    expect(doente(`import Anthropic from 'https://esm.sh/@anthropic-ai/sdk@1.3.0'`)).toBe(true)
    expect(doente(`const m = await import('npm:@anthropic-ai/sdk@^1.3.0')`)).toBe(true)
    expect(doente(`export { default } from '@anthropic-ai/sdk'`)).toBe(true)
  })

  it('a régua 1 NÃO lê comentário, com CRLF, com LF e com o glob de dois asteriscos', () => {
    const glob = '/' + '**'
    for (const eol of ['\r\n', '\n']) {
      const fonte = [
        `// varre ${glob} inteiro; import Anthropic from 'npm:@anthropic-ai/sdk@1.3.0'`,
        `/* from '@anthropic-ai/sdk' */`,
        `const a = 1`,
      ].join(eol)
      expect(especificadores(fonte)).toEqual([])
    }
  })

  it('o glob num comentário NÃO cega a régua para o import logo abaixo', () => {
    const glob = '/' + '**'
    const fonte = `// varre ${glob} inteiro\nimport Anthropic from 'npm:@anthropic-ai/sdk@1.3.0'\n`
    expect(especificadores(fonte)).toEqual([VERSAO])
  })

  it('INVERSO — a porta neutra e a tradução NÃO são o pacote nem o adaptador', () => {
    expect(importaOPacote({ nome: 'seo-suggest/handlers.ts', fonte: `import type { ClaudeJson } from '../_shared/claudePort.ts'` })).toBe(false)
    expect(apontaParaOAdaptador('seo-suggest/handlers.ts', '../_shared/claudePort.ts')).toBe(false)
    expect(apontaParaOAdaptador('_shared/claude.ts', './claudeResult.ts')).toBe(false)
  })

  it('a régua 2 resolve o caminho relativo (de outro diretório e sem extensão)', () => {
    expect(apontaParaOAdaptador('checkout/handlers.ts', '../_shared/claude.ts')).toBe(true)
    expect(apontaParaOAdaptador('_shared/outro.ts', './claude.ts')).toBe(true)
    expect(apontaParaOAdaptador('checkout/handlers.ts', '../_shared/claude')).toBe(true)
  })

  it('a régua 3 exige CHAMADA: importar sem chamar, ou citar em comentário, não basta', () => {
    expect(chama(`import { createClaudeJson } from '../_shared/claude.ts'`, 'createClaudeJson')).toBe(false)
    expect(chama(`// createClaudeJson(chave)`, 'createClaudeJson')).toBe(false)
    expect(chama(`const c = k ? createClaudeJson(k) : null`, 'createClaudeJson')).toBe(true)
  })
})
