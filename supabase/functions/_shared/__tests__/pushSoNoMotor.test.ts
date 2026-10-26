import { readFileSync, readdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * Feature 79 (T12, design §6, R1/R5) — a biblioteca de Web Push mora num arquivo SÓ, e a tabela das
 * inscrições tem donos contados.
 *
 * Quatro réguas, todas pela AST do TypeScript (comentário e prosa ficam de fora por construção — a
 * régua mede uso, não menção):
 *
 *  1. O especificador da biblioteca aparece SÓ em `_shared/webPush.ts`, e com a versão exata
 *     (`@0.5.0`). Uma segunda importação, ou uma versão solta, faria duas cifras conviverem.
 *  2. `_shared/webPush.ts` é importado SÓ pelos três `index.ts` que montam o envio (o motor nas duas
 *     functions que o rodam, e a porta das inscrições, que manda o aviso de teste e devolve a chave
 *     pública). O vitest nunca o
 *     carrega (o `jsr:` não resolve no Node), então um handler que o importasse derrubaria a suíte —
 *     e um index a mais que o importasse seria um terceiro ponto de fiação sem prova.
 *  3. `createWebPushSender(` é CHAMADO nos três `index.ts`. É a metade da fiação que o vitest não
 *     alcança (R5); a do meio — o repasse em `fireTrigger` — é provada por comportamento em
 *     `mercado-pago/__tests__/handlers.test.ts`.
 *  4. A string `push_subscriptions` aparece, em código de produção das functions, só nos donos: o
 *     motor (`send-notification/push.ts`) e a porta (`atelie-avisos/handlers.ts`, entrada da T13).
 */

const FUNCTIONS = resolve(dirname(fileURLToPath(import.meta.url)), '../..')
const REPO = resolve(FUNCTIONS, '../..')

const BIBLIOTECA = 'jsr:@negrel/webpush'
const VERSAO = 'jsr:@negrel/webpush@0.5.0'
const ADAPTADOR = '_shared/webPush.ts'
const INDEXES = ['atelie-avisos/index.ts', 'mercado-pago/index.ts', 'send-notification/index.ts']
const DONOS_DA_TABELA = ['atelie-avisos/handlers.ts', 'send-notification/push.ts']

interface Arquivo {
  nome: string
  fonte: string
}

/** Todo `.ts`/`.tsx` sob `raiz`, com o caminho relativo a `base`. `node_modules` fica fora. */
function varrer(raiz: string, base: string, comTestes: boolean): Arquivo[] {
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
        if (!comTestes && e.name === '__tests__') continue
        andar(caminho)
        continue
      }
      if (!/\.(ts|tsx)$/.test(e.name)) continue
      if (!comTestes && /\.test\.tsx?$/.test(e.name)) continue
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

/** A string aparece num literal (simples, template sem substituição, ou pedaço de template)? */
export function citaEmLiteral(fonte: string, texto: string): boolean {
  const sf = parse(fonte, 'x.ts')
  let achou = false
  const visitar = (n: ts.Node) => {
    if (
      (ts.isStringLiteralLike(n) || ts.isTemplateHead(n) || ts.isTemplateMiddle(n) || ts.isTemplateTail(n)) &&
      n.text.includes(texto)
    ) {
      achou = true
    }
    ts.forEachChild(n, visitar)
  }
  visitar(sf)
  return achou
}

/** O especificador resolve para o adaptador? (relativo, a partir do arquivo que importa) */
const apontaParaOAdaptador = (deArquivo: string, spec: string): boolean => {
  if (!spec.startsWith('.')) return false
  const alvo = resolve(FUNCTIONS, dirname(deArquivo), spec).slice(FUNCTIONS.length + 1).replace(/\\/g, '/')
  return alvo === ADAPTADOR || alvo === ADAPTADOR.replace(/\.ts$/, '')
}

const funcoes = varrer(FUNCTIONS, FUNCTIONS, true)
const funcoesProducao = varrer(FUNCTIONS, FUNCTIONS, false)
const foraDasFunctions = [
  ...['apps/store/src', 'apps/backoffice/src', 'apps/mobile-adm/src', 'packages'].flatMap((d) =>
    varrer(join(REPO, d), REPO, true),
  ),
]

describe('pushSoNoMotor — âncoras', () => {
  it('a varredura leu as functions e os apps (contagem)', () => {
    expect(funcoes.length).toBeGreaterThanOrEqual(40)
    expect(funcoesProducao.map((a) => a.nome)).toEqual(
      expect.arrayContaining([ADAPTADOR, ...INDEXES, ...DONOS_DA_TABELA, '_shared/pushOutcome.ts']),
    )
    expect(foraDasFunctions.length).toBeGreaterThanOrEqual(500)
    expect(foraDasFunctions.some((a) => a.nome.startsWith('apps/mobile-adm/src/'))).toBe(true)
    expect(foraDasFunctions.some((a) => a.nome.startsWith('packages/core/src/'))).toBe(true)
  })

  it('o adaptador IMPORTA a biblioteca — senão a régua 1 aprovaria sobre o nada', () => {
    const adaptador = funcoes.find((a) => a.nome === ADAPTADOR)!
    expect(especificadores(adaptador.fonte)).toContain(VERSAO)
  })
})

describe('pushSoNoMotor — as réguas', () => {
  it('1. a biblioteca só é importada por `_shared/webPush.ts`, na versão 0.5.0 exata', () => {
    const importadores = [...funcoes, ...foraDasFunctions]
      .filter((a) => especificadores(a.fonte, a.nome).some((s) => s.startsWith(BIBLIOTECA)))
      .map((a) => a.nome)
    expect(importadores).toEqual([ADAPTADOR])

    const adaptador = funcoes.find((a) => a.nome === ADAPTADOR)!
    expect(especificadores(adaptador.fonte).filter((s) => s.startsWith(BIBLIOTECA))).toEqual([VERSAO])
  })

  it('2. `_shared/webPush.ts` só é importado pelos três `index.ts`', () => {
    const importadores = funcoes
      .filter((a) => especificadores(a.fonte, a.nome).some((s) => apontaParaOAdaptador(a.nome, s)))
      .map((a) => a.nome)
      .sort()
    expect(importadores).toEqual(INDEXES)
  })

  it.each(INDEXES)('3. %s CHAMA `createWebPushSender(`', (nome) => {
    const arquivo = funcoes.find((a) => a.nome === nome)!
    expect(chama(arquivo.fonte, 'createWebPushSender')).toBe(true)
  })

  it('4. `push_subscriptions` só é citada, em produção, pelos donos', () => {
    const citantes = funcoesProducao.filter((a) => citaEmLiteral(a.fonte, 'push_subscriptions')).map((a) => a.nome).sort()
    expect(citantes).toEqual([...DONOS_DA_TABELA].sort())
  })
})

describe('pushSoNoMotor — sensores', () => {
  it('a régua 1 acusa uma segunda importação e uma versão solta', () => {
    expect(especificadores(`import { x } from 'jsr:@negrel/webpush'`)).toEqual(['jsr:@negrel/webpush'])
    expect(especificadores(`const m = await import('jsr:@negrel/webpush@0.5.0')`)).toEqual([VERSAO])
    expect(especificadores(`export { y } from 'jsr:@negrel/webpush@^0.5.0'`)[0].startsWith(BIBLIOTECA)).toBe(true)
  })

  it('a régua 1 NÃO lê comentário, com CRLF e com LF', () => {
    for (const eol of ['\r\n', '\n']) {
      const fonte = [`// import { x } from 'jsr:@negrel/webpush@0.5.0'`, `/* from 'jsr:@negrel/webpush' */`, `const a = 1`].join(eol)
      expect(especificadores(fonte)).toEqual([])
    }
  })

  it('a régua 2 resolve o caminho relativo (de outro diretório e sem extensão)', () => {
    expect(apontaParaOAdaptador('checkout/handlers.ts', '../_shared/webPush.ts')).toBe(true)
    expect(apontaParaOAdaptador('_shared/outro.ts', './webPush.ts')).toBe(true)
    expect(apontaParaOAdaptador('checkout/handlers.ts', '../_shared/webPush')).toBe(true)
    expect(apontaParaOAdaptador('checkout/handlers.ts', '../_shared/pushOutcome.ts')).toBe(false)
  })

  it('a régua 3 exige CHAMADA: importar sem chamar, ou citar em comentário, não basta', () => {
    expect(chama(`import { createWebPushSender } from '../_shared/webPush.ts'`, 'createWebPushSender')).toBe(false)
    expect(chama(`// createWebPushSender({ keys })`, 'createWebPushSender')).toBe(false)
    expect(chama(`const w = await createWebPushSender({ keys: k, subject: s })`, 'createWebPushSender')).toBe(true)
  })

  it('a régua 4 acusa literal e template, e não acusa comentário', () => {
    expect(citaEmLiteral(`deps.supabase.from('push_subscriptions')`, 'push_subscriptions')).toBe(true)
    expect(citaEmLiteral('const t = `push_subscriptions`', 'push_subscriptions')).toBe(true)
    expect(citaEmLiteral('const t = `x ${a} push_subscriptions`', 'push_subscriptions')).toBe(true)
    expect(citaEmLiteral(`// from('push_subscriptions')\r\nconst a = 1`, 'push_subscriptions')).toBe(false)
  })
})
