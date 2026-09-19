import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import ts from 'typescript'
import { describe, expect, it } from 'vitest'

/**
 * O `index.ts` de cada edge function chama só o que ele importa ou declara.
 *
 * ## Por que este guarda existe, e o que custou não existir
 *
 * `AD-004` diz que `index.ts` é **só wiring** — env, client, `Deno.serve` — e que a lógica vive em
 * `handlers.ts`, que roda sob vitest. A consequência que ninguém escreveu: **nada carrega o
 * `index.ts`**. Nenhum teste o importa (todos importam `handlers.ts` ou módulos de `core`),
 * `pnpm build` não o vê, `tsc` não o alcança (ele importa de `https://esm.sh` e usa `Deno`), e
 * `pnpm lint` não olha `supabase/`. É o único arquivo do repositório que **nenhuma ferramenta lê**.
 *
 * Medido em 2026-09-19: `mercado-pago/index.ts` chamava `createResendProvider(...)` **sem
 * importá-lo**, desde a feature `42`. Em produção a function devolvia `500 WORKER_ERROR` a
 * **qualquer** requisição, inclusive `OPTIONS` — `create-payment` morto (ninguém consegue pagar) e
 * webhook morto (pagamento que acontecesse não seria registrado). Seis dias, e nada acusou: o
 * defeito estava exatamente no arquivo que nenhuma ferramenta lê.
 *
 * ## A régua, e por que ela usa o compilador
 *
 * A primeira escrita deste guarda era por regex e acusou **oito falsos positivos** — `async` de
 * `async (req) =>`, `Estrelinha` de dentro de uma string com parêntese, nomes em posição de tipo.
 * Guarda que nasce reprovando oito vezes é guarda que alguém desliga.
 *
 * A régua agora percorre a **AST do TypeScript** (já dependência do monorepo) e olha só o que
 * importa: `CallExpression` cujo callee é um `Identifier` puro. Isso exclui string, comentário,
 * tipo, `obj.metodo()` e arrow `async (…) =>` **por construção**, e não por lista de exceções.
 *
 * Deliberadamente **não** é um type-checker: `deno check` seria a régua completa e exige o Deno
 * instalado, que este CI não tem. Esta pega a classe que derrubou o pagamento, em milissegundos e
 * sem dependência nova.
 */

const HERE = dirname(fileURLToPath(import.meta.url))
const FUNCTIONS = resolve(HERE, '../..')

/** Globais do runtime (Deno + web), que não precisam de import. */
const GLOBAIS = new Set([
  'Deno', 'globalThis', 'self', 'fetch', 'crypto', 'atob', 'btoa', 'structuredClone', 'setTimeout', 'clearTimeout',
  'setInterval', 'clearInterval', 'queueMicrotask', 'encodeURIComponent', 'decodeURIComponent',
  'encodeURI', 'decodeURI', 'parseInt', 'parseFloat', 'isNaN', 'isFinite', 'require',
  'String', 'Number', 'Boolean', 'Array', 'Object', 'JSON', 'Math', 'Date', 'RegExp', 'Error',
  'Promise', 'Map', 'Set', 'WeakMap', 'WeakSet', 'Symbol', 'BigInt', 'Proxy', 'Reflect',
  'Response', 'Request', 'Headers', 'URL', 'URLSearchParams', 'TextEncoder', 'TextDecoder',
  'AbortController', 'AbortSignal', 'Uint8Array', 'ArrayBuffer', 'Blob', 'FormData', 'console',
])

function entrypoints(): string[] {
  return readdirSync(FUNCTIONS)
    .filter((nome) => !nome.startsWith('_'))
    .map((nome) => join(FUNCTIONS, nome, 'index.ts'))
    .filter((arquivo) => {
      try {
        return statSync(arquivo).isFile()
      } catch {
        return false
      }
    })
}

const parse = (codigo: string, nome = 'index.ts'): ts.SourceFile =>
  ts.createSourceFile(nome, codigo, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)

/**
 * Tudo que o arquivo liga a um nome: import (nomeado, default, namespace, renomeado), declaração
 * de variável/função/classe, parâmetro e binding de desestruturação — em **qualquer** escopo.
 *
 * Coletar de todo escopo é de propósito: este guarda persegue *nome que não existe em lugar
 * nenhum*, não erro de escopo. Ser permissivo demais produz falso NEGATIVO, que é o custo aceito;
 * ser estrito demais produziria o falso positivo que desliga o guarda.
 */
function nomesLigados(fonte: ts.SourceFile): Set<string> {
  const nomes = new Set<string>()

  const registrarBinding = (nome: ts.BindingName): void => {
    if (ts.isIdentifier(nome)) {
      nomes.add(nome.text)
      return
    }
    for (const el of nome.elements) {
      if (ts.isBindingElement(el)) registrarBinding(el.name)
    }
  }

  const visitar = (node: ts.Node): void => {
    if (ts.isImportDeclaration(node) && node.importClause) {
      const { name, namedBindings } = node.importClause
      if (name) nomes.add(name.text)
      if (namedBindings) {
        if (ts.isNamespaceImport(namedBindings)) nomes.add(namedBindings.name.text)
        else for (const el of namedBindings.elements) nomes.add(el.name.text)
      }
    }
    if (ts.isVariableDeclaration(node)) registrarBinding(node.name)
    if (ts.isParameter(node)) registrarBinding(node.name)
    if ((ts.isFunctionDeclaration(node) || ts.isClassDeclaration(node)) && node.name) {
      nomes.add(node.name.text)
    }
    ts.forEachChild(node, visitar)
  }

  visitar(fonte)
  return nomes
}

/**
 * Os nomes USADOS como valor de topo: `nome(...)`, `new nome(...)` e a **base** de `nome.algo`.
 *
 * A base do property access entrou na rodada 2 da verificação: `Inventado.montar()` é o mesmo
 * defeito — nome que não existe em lugar nenhum — em outra posição sintática, e a primeira escrita
 * o deixava passar. É `L-033` dentro do guarda que existe por causa de `L-033`: régua para um
 * comando da família, irmãos escapando.
 *
 * Nunca o `.algo` em si (isso é propriedade, não binding), nem string, nem comentário, nem tipo —
 * a AST os exclui por construção.
 */
function nomesChamados(fonte: ts.SourceFile): string[] {
  const nomes: string[] = []
  const visitar = (node: ts.Node): void => {
    if ((ts.isCallExpression(node) || ts.isNewExpression(node)) && ts.isIdentifier(node.expression)) {
      nomes.push(node.expression.text)
    }
    if (ts.isPropertyAccessExpression(node) && ts.isIdentifier(node.expression)) {
      nomes.push(node.expression.text)
    }
    ts.forEachChild(node, visitar)
  }
  visitar(fonte)
  return nomes
}

// -------------------------------------------------------------------------------------------
// As envs do remetente — a lacuna que a rodada 2 mediu
// -------------------------------------------------------------------------------------------
//
// A T8 aposentou `RESEND_FROM` e **o secret foi apagado de produção**. Mesmo assim, fazer qualquer
// dos dois entrypoints voltar a lê-la deixava a suíte de `functions` 639/639 VERDE: `senderFrom`
// está bem provado, e o **consumo** dela não tinha régua nenhuma. Um revert, um merge ou um
// cherry-pick que trouxesse a linha antiga faria o remetente cair no `DEFAULT_SENDER_FROM`
// (`onboarding@resend.dev`) — 200 do Resend, entrega só ao dono da conta, nenhuma cliente
// recebendo. É a palavra por palavra do defeito que a feature `52` existe para matar.
//
// `wiringResolve` é a casa certa: ele já lê todos os `index.ts` do disco, e `envOr('RESEND_FROM',…)`
// é um nome perfeitamente LIGADO — a régua de resolução nunca o veria.

/** O nome aposentado, que não pode voltar a nenhum entrypoint. */
const ENV_APOSENTADA = 'RESEND_FROM'

/** As duas metades que substituem — e é `L-036`: as DUAS, senão a régua passa com meia troca. */
const ENVS_DO_REMETENTE = ['RESEND_SENDER_NAME', 'RESEND_SENDER_EMAIL'] as const

/** Os entrypoints que compõem o remetente (os que disparam e-mail). */
const COMPOEM_REMETENTE = ['send-notification', 'mercado-pago']

/** Toda string literal do arquivo — é onde nome de env aparece. */
function literais(fonte: ts.SourceFile): string[] {
  const textos: string[] = []
  const visitar = (node: ts.Node): void => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) textos.push(node.text)
    ts.forEachChild(node, visitar)
  }
  visitar(fonte)
  return textos
}

/**
 * `RESEND_FROM` só é acusada como **literal de código** — a AST ignora comentário por construção,
 * e os dois `index.ts` explicam em prosa por que o nome foi aposentado. Régua que casasse a menção
 * acusaria exatamente o texto que documenta a decisão, pela quarta vez nesta feature.
 */
const citaEnvAposentada = (codigo: string): boolean =>
  literais(parse(codigo)).some((t) => t === ENV_APOSENTADA)

const citaAsDuasMetades = (codigo: string): boolean => {
  const textos = new Set(literais(parse(codigo)))
  return ENVS_DO_REMETENTE.every((nome) => textos.has(nome))
}

/** A régua, como predicado — para a asserção e o sensor chamarem a MESMA função. */
function orfaos(codigo: string): string[] {
  const fonte = parse(codigo)
  const conhecidos = new Set([...nomesLigados(fonte), ...GLOBAIS])
  return [...new Set(nomesChamados(fonte))].filter((nome) => !conhecidos.has(nome))
}

const arquivos = entrypoints()

describe('wiring das edge functions — âncoras', () => {
  it('há um index.ts para CADA diretório de function — âncora derivada, não número cravado', () => {
    // `>= 7` deixava uma function perder o `index.ts` sem a âncora notar, e o número cravado já
    // nasceu errado na documentação (são oito, não sete). Derivar do disco fecha os dois.
    const diretorios = readdirSync(FUNCTIONS).filter((n) => !n.startsWith('_')).filter((n) => {
      try {
        return statSync(join(FUNCTIONS, n)).isDirectory()
      } catch {
        return false
      }
    })
    expect(diretorios.length).toBeGreaterThanOrEqual(8)
    expect(arquivos.length).toBe(diretorios.length)
  })

  it('cada um serve algo, e a AST encontra chamadas nele', () => {
    for (const arquivo of arquivos) {
      const codigo = readFileSync(arquivo, 'utf8')
      expect(codigo, arquivo).toContain('Deno.serve')
      // Sem esta âncora, um parser que devolvesse zero chamada aprovaria TODOS os arquivos.
      expect(nomesChamados(parse(codigo)).length, arquivo).toBeGreaterThan(0)
    }
  })
})

describe('wiring das edge functions — todo nome chamado resolve', () => {
  it.each(arquivos.map((a) => [a.split(/[\\/]/).slice(-2).join('/'), a] as const))(
    '%s',
    (_rotulo, arquivo) => {
      expect(orfaos(readFileSync(arquivo, 'utf8')), `${arquivo}: chamado sem import nem declaração`)
        .toEqual([])
    },
  )
})

describe('wiring das edge functions — as envs do remetente (T8)', () => {
  it.each(arquivos.map((a) => [a.split(/[\\/]/).slice(-2).join('/'), a] as const))(
    '%s não cita a env aposentada',
    (_rotulo, arquivo) => {
      expect(citaEnvAposentada(readFileSync(arquivo, 'utf8')), `${arquivo} voltou a ler ${ENV_APOSENTADA}`)
        .toBe(false)
    },
  )

  it.each(COMPOEM_REMETENTE)('%s cita as DUAS metades do remetente', (slug) => {
    const arquivo = arquivos.find((a) => a.includes(`${slug}`))
    expect(arquivo, `entrypoint de ${slug} não encontrado`).toBeDefined()
    expect(citaAsDuasMetades(readFileSync(arquivo as string, 'utf8'))).toBe(true)
  })
})

describe('wiring das edge functions — sensores', () => {
  const real = readFileSync(resolve(FUNCTIONS, 'mercado-pago/index.ts'), 'utf8')

  it('o defeito REAL de 2026-09-19 é acusado: sem o import, createResendProvider fica órfão', () => {
    const mutado = real.replace(/^\s*createResendProvider,\n/m, '')
    expect(mutado).not.toBe(real)
    expect(orfaos(mutado)).toContain('createResendProvider')
  })

  it('chamada a função inexistente é acusada', () => {
    expect(orfaos('Deno.serve(() => new Response("x"))\nnaoExiste()')).toContain('naoExiste')
  })

  it('MÉTODO de objeto NÃO é acusado', () => {
    expect(orfaos('const a = { get: () => 1 }\na.get()')).toEqual([])
  })

  it('arrow `async (req) =>` NÃO é acusada — era o falso positivo da régua por regex', () => {
    expect(orfaos('Deno.serve(async (req) => new Response(req.url))')).toEqual([])
  })

  it('nome dentro de STRING com parêntese NÃO é acusado — o outro falso positivo', () => {
    expect(orfaos('const ua = "Uma Estrelinha (contato@x.com)"\nconsole.log(ua)')).toEqual([])
  })

  it('menção em COMENTÁRIO não é acusada, com LF e com CRLF', () => {
    expect(orfaos('// chamaria inventada() aqui\nDeno.serve(() => new Response("x"))')).toEqual([])
    expect(orfaos('/* inventada() */\r\nDeno.serve(() => new Response("x"))\r\n')).toEqual([])
  })

  it('import RENOMEADO conta sob o nome novo, e não sob o antigo', () => {
    expect(orfaos('import { algo as apelido } from "./x.ts"\napelido()')).toEqual([])
    expect(orfaos('import { algo as apelido } from "./x.ts"\nalgo()')).toContain('algo')
  })

  it('import default e namespace também contam', () => {
    expect(orfaos('import padrao from "./x.ts"\npadrao()')).toEqual([])
    expect(orfaos('import * as ns from "./x.ts"\nns.f()')).toEqual([])
  })

  it('função declarada depois do uso conta — hoisting é real', () => {
    expect(orfaos('cedo()\nfunction cedo() {}')).toEqual([])
  })

  it('nome não importado usado por PROPERTY ACCESS é acusado — a forma que escapava', () => {
    expect(orfaos('Deno.serve(() => Inventado.montar())')).toContain('Inventado')
  })

  it('e o INVERSO: um objeto local acessado por propriedade não é acusado', () => {
    expect(orfaos('const local = { m: () => 1 }\nDeno.serve(() => local.m())')).toEqual([])
  })

  it('a env aposentada num literal é acusada; em COMENTÁRIO, não', () => {
    expect(citaEnvAposentada(`const x = envOr("${ENV_APOSENTADA}", "y")`)).toBe(true)
    expect(citaEnvAposentada(`// ${ENV_APOSENTADA} foi aposentada\nconst x = 1`)).toBe(false)
  })

  it('MEIA troca REPROVA — as duas metades, não uma (L-036)', () => {
    expect(citaAsDuasMetades('const a = envOptional("RESEND_SENDER_NAME")')).toBe(false)
    expect(
      citaAsDuasMetades(
        'const a = envOptional("RESEND_SENDER_NAME"), b = envOptional("RESEND_SENDER_EMAIL")',
      ),
    ).toBe(true)
  })

  it('o defeito REAL da rodada 2: um entrypoint voltando a ler a env aposentada é acusado', () => {
    const real = readFileSync(resolve(FUNCTIONS, 'send-notification/index.ts'), 'utf8')
    const mutado = real.replace(
      /senderFrom\(envOptional\('RESEND_SENDER_NAME'\), envOptional\('RESEND_SENDER_EMAIL'\)\)/,
      "envOr('RESEND_FROM', DEFAULT_SENDER_FROM)",
    )
    expect(mutado).not.toBe(real)
    expect(citaEnvAposentada(mutado)).toBe(true)
    expect(citaAsDuasMetades(mutado)).toBe(false)
  })
})

/**
 * ## O que este guarda NÃO cobre — declarado, porque comentário omisso encerra a investigação
 *
 * As quatro formas abaixo produzem em produção **o mesmo** `500 WORKER_ERROR` que motivou este
 * arquivo, e passam por ele. Medidas por injeção real na rodada 2 da verificação da `52`:
 *
 * 1. **Import de `core` sem a extensão `.ts`** — o worker morre resolvendo o módulo, antes da
 *    primeira linha. É a classe que `denoReach.test.ts` cobre, mas **só** para `core/checkout`.
 * 2. **Nome não importado usado como VALOR**, sem chamar e sem property access (`const x = Y`).
 *    Cobri-lo exigiria análise de escopo de verdade, e o risco de falso positivo é o que desliga
 *    guarda.
 * 3. **`import { naoExiste } from './handlers.ts'`** — nome que o módulo não exporta. Pegar isso é
 *    resolver o grafo, ou seja, `deno check`.
 * 4. **Erro de tipo em geral** — este guarda nunca foi um type-checker.
 *
 * A régua completa é `deno check` nos entrypoints, e ela exige o Deno instalado, que este CI não
 * tem. Enquanto não tiver, este arquivo cobre a classe que derrubou o pagamento e **declara** o
 * resto em vez de deixar o próximo leitor supor que está coberto.
 */
