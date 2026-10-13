import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * `RET-15` (feature `63`) — pedido de retirada no escritório não gera etiqueta do Melhor Envio.
 *
 * ## O que este guarda NÃO faz mais (rodada 3)
 *
 * A action `create` saiu de `melhor-envio/index.ts` para `melhor-envio/handlers.ts` (`AD-004`), com
 * o client, a chamada à API e o remetente injetados. A regra em si — pedido de retirada ⇒ 422
 * `pickup_order`, ZERO chamadas à API e nenhuma gravação; o pedido dos Correios chega ao carrinho —
 * é provada EXECUTANDO, em `melhor-envio/__tests__/handlers.test.ts`. Ordem das chamadas, condição do
 * `if`, `return`, argumento do portão, coluna no `select`: tudo isso agora é consequência medida, e a
 * régua de fonte que tentava enumerar as formas sintáticas foi aposentada — cada rodada de
 * verificação achava uma forma nova que passava por ela.
 *
 * ## O que sobra para a fonte
 *
 * Só o que execução nenhuma no vitest alcança, porque `index.ts` não carrega fora do Deno:
 *
 *  1. `index.ts` importa `handleCreate` de `./handlers.ts` (com extensão), não declara um
 *     `handleCreate` próprio, e o `case "create"` o chama com `{ supabase: adminClient(), meFetch,
 *     sender: ME_SENDER }` e o `body` — o client real, a função real e o remetente real;
 *  2. `meFetch` é uma função declarada no próprio `index.ts` que chama `fetch` (a real, não um dublê);
 *  3. `handlers.ts` importa `pickupGate` de `./pickupGate.ts`, e TODO import dele é relativo com
 *     `.ts` — o Deno não resolve outra forma, e um import de `esm.sh` tiraria o handler do vitest;
 *  4. dentro de `handleCreate`, o `body` é lido UMA vez, desestruturando exatamente `order_id` e
 *     `service_id`. É o que torna genérico o que o teste de execução só amostra: nenhuma flag do
 *     corpo chega a decidir nada (as rodadas 1–3 mediram três jeitos de uma flag desligar a recusa);
 *  5. o portão importa `isPickupOrder` do arquivo do dono, por caminho relativo com extensão.
 *
 * Percorre a **AST do TypeScript**: comentário e string ficam de fora por construção.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const INDEX = resolve(HERE, '../../melhor-envio/index.ts')
const HANDLERS = resolve(HERE, '../../melhor-envio/handlers.ts')
const PORTAO = resolve(HERE, '../../melhor-envio/pickupGate.ts')
const DONO = '../../../packages/core/src/shipping/pickup.ts'

const parse = (codigo: string): ts.SourceFile =>
  ts.createSourceFile('x.ts', codigo.replace(/\r\n/g, '\n'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)

function importDe(fonte: ts.SourceFile, nome: string): string | null {
  for (const st of fonte.statements) {
    if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier)) {
      const nomes = st.importClause?.namedBindings
      if (nomes && ts.isNamedImports(nomes) && nomes.elements.some((e) => e.name.text === nome)) {
        return st.moduleSpecifier.text
      }
    }
  }
  return null
}

function funcaoDeTopo(fonte: ts.SourceFile, nome: string): ts.FunctionDeclaration | null {
  for (const st of fonte.statements) {
    if (ts.isFunctionDeclaration(st) && st.name?.text === nome && st.body) return st
  }
  return null
}

function todos(no: ts.Node, pred: (n: ts.Node) => boolean): ts.Node[] {
  const achados: ts.Node[] = []
  const visitar = (n: ts.Node) => {
    if (pred(n)) achados.push(n)
    ts.forEachChild(n, visitar)
  }
  visitar(no)
  return achados
}

const chamaPeloNome = (nome: string) => (n: ts.Node) =>
  ts.isCallExpression(n) && ts.isIdentifier(n.expression) && n.expression.text === nome

/** O inicializador (como texto) da propriedade `chave` — shorthand vale como o próprio nome. */
function propriedade(objeto: ts.Node, chave: string, fonte: ts.SourceFile): string | null {
  if (!ts.isObjectLiteralExpression(objeto)) return null
  for (const p of objeto.properties) {
    if (ts.isShorthandPropertyAssignment(p) && p.name.text === chave) return chave
    if (ts.isPropertyAssignment(p) && ts.isIdentifier(p.name) && p.name.text === chave) {
      return p.initializer.getText(fonte).trim()
    }
  }
  return null
}

/** A fiação do `index.ts`, como predicado — a asserção e os sensores chamam a MESMA função. */
function fiacaoDoIndex(codigo: string): string | null {
  const fonte = parse(codigo)
  if (importDe(fonte, 'handleCreate') !== './handlers.ts') return 'handleCreate não vem de ./handlers.ts, com extensão'
  if (todos(fonte, (n) => ts.isFunctionDeclaration(n) && n.name?.text === 'handleCreate').length > 0) {
    return 'index.ts declara um handleCreate próprio'
  }
  const chamadas = todos(fonte, chamaPeloNome('handleCreate')) as ts.CallExpression[]
  if (chamadas.length !== 1) return `handleCreate chamado ${chamadas.length} vezes no index.ts`
  const chamada = chamadas[0]
  let caso: ts.Node | undefined = chamada.parent
  while (caso && !ts.isCaseClause(caso)) caso = caso.parent
  if (!caso || !ts.isCaseClause(caso) || !ts.isStringLiteralLike(caso.expression) || caso.expression.text !== 'create') {
    return 'handleCreate não é chamado no case "create"'
  }
  const [deps, corpo] = chamada.arguments
  if (chamada.arguments.length !== 2 || !deps || !corpo) return 'handleCreate não recebe (deps, body)'
  if (!ts.isIdentifier(corpo) || corpo.text !== 'body') return 'o segundo argumento não é o body da requisição'
  if (!ts.isObjectLiteralExpression(deps) || deps.properties.length !== 3) return 'as deps não são exatamente três'
  if (propriedade(deps, 'supabase', fonte) !== 'adminClient()') return 'supabase não é o adminClient() real'
  if (propriedade(deps, 'meFetch', fonte) !== 'meFetch') return 'meFetch não é a função real do index.ts'
  if (propriedade(deps, 'sender', fonte) !== 'ME_SENDER') return 'sender não é o ME_SENDER real'
  const meFetch = funcaoDeTopo(fonte, 'meFetch')
  if (!meFetch) return 'meFetch não é uma função declarada no index.ts'
  if (todos(meFetch, chamaPeloNome('fetch')).length === 0) return 'meFetch não chama fetch'
  return null
}

/** O lado do handler, como predicado. */
function fronteiraDoHandler(codigo: string, portao: string): string | null {
  const fonte = parse(codigo)
  for (const st of fonte.statements) {
    if (ts.isImportDeclaration(st) && ts.isStringLiteral(st.moduleSpecifier)) {
      const esp = st.moduleSpecifier.text
      if (!esp.startsWith('.') || !esp.endsWith('.ts')) return `import fora do alcance do Deno/vitest: ${esp}`
    }
  }
  if (importDe(fonte, 'pickupGate') !== './pickupGate.ts') return 'pickupGate não vem de ./pickupGate.ts, com extensão'
  const funcao = funcaoDeTopo(fonte, 'handleCreate')
  if (!funcao) return 'handleCreate não encontrado'
  const corpoParam = funcao.parameters[1]
  if (!corpoParam || !ts.isIdentifier(corpoParam.name)) return 'handleCreate não recebe o body como segundo parâmetro'
  const nomeBody = corpoParam.name.text
  // Uso = o identificador como VALOR. `deps.x.body` (nome de propriedade) e `{ body: 1 }` não são.
  const usos = todos(
    funcao.body!,
    (n) =>
      ts.isIdentifier(n) &&
      n.text === nomeBody &&
      !(ts.isPropertyAccessExpression(n.parent) && n.parent.name === n) &&
      !(ts.isPropertyAssignment(n.parent) && n.parent.name === n) &&
      !(ts.isBindingElement(n.parent) && n.parent.propertyName === n),
  )
  if (usos.length !== 1) return `o body é lido ${usos.length} vezes em handleCreate`
  const decl = usos[0].parent
  if (!ts.isVariableDeclaration(decl) || decl.initializer !== usos[0] || !ts.isObjectBindingPattern(decl.name)) {
    return 'o body não é lido por desestruturação'
  }
  const campos = decl.name.elements.map((e) =>
    e.dotDotDotToken ? '...' : ((e.propertyName ?? e.name) as ts.Identifier).text,
  )
  if (JSON.stringify([...campos].sort()) !== JSON.stringify(['order_id', 'service_id'])) {
    return `o body fornece mais que order_id e service_id: ${JSON.stringify(campos)}`
  }
  if (importDe(parse(portao), 'isPickupOrder') !== DONO) {
    return 'o portão não importa isPickupOrder do arquivo do dono, com extensão'
  }
  return null
}

/** Troca exatamente uma ocorrência — lança se o alvo sumiu, para o sensor não virar no-op. */
function trocar(base: string, de: string, para: string): string {
  const n = base.split(de).length - 1
  if (n !== 1) throw new Error(`alvo encontrado ${n} vezes: ${de}`)
  return base.replace(de, para)
}

const INDEX_CERTO = [
  'import { handleCreate } from "./handlers.ts"',
  'const ME_SENDER = {}',
  'async function meFetch(p: string) { return await fetch(p) }',
  'Deno.serve(async (req) => {',
  '  const body = await req.json()',
  '  switch (action) {',
  '    case "create":',
  '      return await handleCreate({ supabase: adminClient(), meFetch, sender: ME_SENDER }, body)',
  '  }',
  '})',
].join('\n')

const PORTAO_CERTO = [
  `import { isPickupOrder } from "${DONO}"`,
  'export function pickupGate(order: any) {',
  '  return isPickupOrder(order) ? { status: 422, error: "pickup_order" } : null',
  '}',
].join('\n')

const HANDLER_CERTO = [
  'import { corsHeaders } from "../_shared/http.ts"',
  'import { pickupGate } from "./pickupGate.ts"',
  'export async function handleCreate(deps: any, body: any) {',
  '  const { order_id, service_id } = body',
  '  return [order_id, service_id, deps.x.body, corsHeaders, pickupGate]',
  '}',
].join('\n')

describe('retiradaSemEtiqueta — a fiação nos arquivos reais', () => {
  const index = readFileSync(INDEX, 'utf8')
  const handlers = readFileSync(HANDLERS, 'utf8')
  const portao = readFileSync(PORTAO, 'utf8')

  it('âncoras: os três arquivos foram lidos e têm o que a régua procura', () => {
    expect(index.length).toBeGreaterThan(1000)
    expect(handlers.length).toBeGreaterThan(1000)
    expect(portao).toContain('export function pickupGate')
    expect(funcaoDeTopo(parse(handlers), 'handleCreate')).not.toBeNull()
    expect(funcaoDeTopo(parse(index), 'meFetch')).not.toBeNull()
  })

  it('index.ts delega create ao handler com o client, a API e o remetente reais', () => {
    expect(fiacaoDoIndex(index)).toBeNull()
  })

  it('handlers.ts: imports alcançáveis, o portão do arquivo dele, e o body só fornece order_id e service_id', () => {
    expect(fronteiraDoHandler(handlers, portao)).toBeNull()
  })
})

describe('retiradaSemEtiqueta — sensores (a régua discrimina)', () => {
  it('os esqueletos certos passam', () => {
    expect(fiacaoDoIndex(INDEX_CERTO)).toBeNull()
    expect(fronteiraDoHandler(HANDLER_CERTO, PORTAO_CERTO)).toBeNull()
  })

  it('index: o import sem extensão, ou um handleCreate próprio, reprova', () => {
    expect(fiacaoDoIndex(trocar(INDEX_CERTO, './handlers.ts"', './handlers"'))).toMatch(/handlers\.ts/)
    expect(
      fiacaoDoIndex(trocar(INDEX_CERTO, 'const ME_SENDER = {}', 'const ME_SENDER = {}\nasync function handleCreate() {}')),
    ).toMatch(/próprio/)
  })

  it('index: a chamada só em comentário ou string não conta (LF e CRLF)', () => {
    const comentado = trocar(
      INDEX_CERTO,
      '      return await handleCreate({ supabase: adminClient(), meFetch, sender: ME_SENDER }, body)',
      '      // return await handleCreate({ supabase: adminClient(), meFetch, sender: ME_SENDER }, body)\n      return "handleCreate(x)"',
    )
    expect(fiacaoDoIndex(comentado)).toMatch(/0 vezes/)
    expect(fiacaoDoIndex(comentado.replace(/\n/g, '\r\n'))).toMatch(/0 vezes/)
  })

  it('index: fora do case "create" reprova', () => {
    expect(fiacaoDoIndex(trocar(INDEX_CERTO, 'case "create":', 'case "print":'))).toMatch(/case "create"/)
  })

  it('index: deps trocadas por dublê, ausentes ou a mais reprovam', () => {
    expect(fiacaoDoIndex(trocar(INDEX_CERTO, 'meFetch, sender', 'meFetch: async () => ({}), sender'))).toMatch(
      /meFetch não é/,
    )
    expect(fiacaoDoIndex(trocar(INDEX_CERTO, 'supabase: adminClient()', 'supabase: {}'))).toMatch(/supabase não é/)
    expect(fiacaoDoIndex(trocar(INDEX_CERTO, 'sender: ME_SENDER', 'sender: {}'))).toMatch(/sender não é/)
    expect(fiacaoDoIndex(trocar(INDEX_CERTO, ', sender: ME_SENDER }', ' }'))).toMatch(/três/)
    expect(fiacaoDoIndex(trocar(INDEX_CERTO, 'sender: ME_SENDER }', 'sender: ME_SENDER, force: true }'))).toMatch(
      /três/,
    )
    expect(fiacaoDoIndex(trocar(INDEX_CERTO, 'ME_SENDER }, body)', 'ME_SENDER }, { ...body, force: true })'))).toMatch(
      /body/,
    )
  })

  it('index: meFetch que não chama fetch, ou não declarado, reprova', () => {
    expect(fiacaoDoIndex(trocar(INDEX_CERTO, 'return await fetch(p)', 'return {}'))).toMatch(/não chama fetch/)
    expect(fiacaoDoIndex(trocar(INDEX_CERTO, 'async function meFetch', 'async function outra'))).toMatch(
      /não é uma função declarada/,
    )
  })

  it('handler: import de esm.sh, sem extensão ou por alias reprova', () => {
    expect(
      fronteiraDoHandler(
        trocar(HANDLER_CERTO, 'import { corsHeaders }', 'import x from "https://esm.sh/y@1"\nimport { corsHeaders }'),
        PORTAO_CERTO,
      ),
    ).toMatch(/alcance/)
    expect(fronteiraDoHandler(trocar(HANDLER_CERTO, 'http.ts"', 'http"'), PORTAO_CERTO)).toMatch(/alcance/)
    expect(
      fronteiraDoHandler(trocar(HANDLER_CERTO, '"../_shared/http.ts"', '"@estrelinha/core/x.ts"'), PORTAO_CERTO),
    ).toMatch(/alcance/)
  })

  it('handler: o portão de outro arquivo, ou o portão sem o dono, reprova', () => {
    expect(fronteiraDoHandler(trocar(HANDLER_CERTO, './pickupGate.ts"', './outro.ts"'), PORTAO_CERTO)).toMatch(
      /pickupGate não vem/,
    )
    expect(fronteiraDoHandler(HANDLER_CERTO, trocar(PORTAO_CERTO, 'shipping/pickup.ts"', 'shipping/index.ts"'))).toMatch(
      /dono/,
    )
  })

  it('handler: uma segunda leitura do body (flag, alias, spread) reprova; deps.x.body não é o body', () => {
    const comFlag = trocar(HANDLER_CERTO, '  return [', '  if (body?.force) return null\n  return [')
    expect(fronteiraDoHandler(comFlag, PORTAO_CERTO)).toMatch(/2 vezes/)
    const alias = trocar(HANDLER_CERTO, '  return [', '  const b = body\n  return [')
    expect(fronteiraDoHandler(alias, PORTAO_CERTO)).toMatch(/2 vezes/)
    const campoAMais = trocar(HANDLER_CERTO, '{ order_id, service_id } = body', '{ order_id, service_id, force } = body')
    expect(fronteiraDoHandler(campoAMais, PORTAO_CERTO)).toMatch(/mais que/)
    const resto = trocar(HANDLER_CERTO, '{ order_id, service_id } = body', '{ order_id, service_id, ...resto } = body')
    expect(fronteiraDoHandler(resto, PORTAO_CERTO)).toMatch(/mais que/)
    const semDesestruturar = trocar(HANDLER_CERTO, 'const { order_id, service_id } = body', 'const tudo = body')
    expect(fronteiraDoHandler(semDesestruturar, PORTAO_CERTO)).toMatch(/desestruturação/)
  })

  it('handler: sem handleCreate, a âncora acusa em vez de aprovar', () => {
    expect(fronteiraDoHandler(trocar(HANDLER_CERTO, 'function handleCreate', 'function criar'), PORTAO_CERTO)).toMatch(
      /não encontrado/,
    )
  })
})
